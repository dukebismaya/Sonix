import './styles/main.css';

import { mountAppShell } from './components/appShell';
import { discoveryFilters } from './services/discovery';
import { createMusicProvider } from './services/providers';
import { AppStore, AppState } from './state/store';
import { Theme, DiscoveryMode, Track, ProviderName } from './types/music';
import { formatDuration, formatRelease } from './utils/format';
import { debounce } from './utils/debounce';

const THEME_STORAGE_KEY = 'sonix:theme';
const CLIENT_STORAGE_KEY = 'sonix:client-id';
const DECK_MODE_STORAGE_KEY = 'sonix:deck-mode';
const MAX_REMOTE_RESULTS = 50;
const root = document.getElementById('app');

if (!root) {
  throw new Error('Root element #app is missing.');
}

const savedTheme = (localStorage.getItem(THEME_STORAGE_KEY) as Theme | null) ?? 'nebula';
const savedClientId = localStorage.getItem(CLIENT_STORAGE_KEY);
const savedDeckMode = (localStorage.getItem(DECK_MODE_STORAGE_KEY) as DeckMode | null) ?? 'online';
const providerName = (process.env.SONIX_PROVIDER as ProviderName | undefined) ?? 'jamendo';
const envClientId = process.env.SONIX_JAMENDO_CLIENT_ID?.trim();
const initialClientId = savedClientId ?? envClientId ?? null;
const store = new AppStore({ theme: savedTheme, clientId: initialClientId, provider: providerName });
const provider = createMusicProvider(providerName, store);
const requiresClientKey = provider.requiresClientId;
const refs = mountAppShell(root);

const audio = new Audio();
audio.crossOrigin = 'anonymous';
audio.preload = 'auto';
audio.volume = store.getState().volume;

const fallbackCover =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">
      <defs>
        <linearGradient id="g" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#8c7bff" />
          <stop offset="100%" stop-color="#ff55b6" />
        </linearGradient>
      </defs>
      <rect width="300" height="300" fill="#080a18"/>
      <circle cx="150" cy="150" r="120" fill="url(#g)" opacity="0.65"/>
      <text x="50%" y="55%" font-size="48" font-family="'Space Grotesk', Helvetica" fill="#ffffff" text-anchor="middle">SONIX</text>
    </svg>`
  );

const deckCopy = {
  tagline: 'Futuristic Sonix relay control room',
  searchPlaceholder: 'Scan the Sonix relay',
  telemetryIdle: 'Hold to sync',
  idleMeta: 'Sonix relay idle',
  statuses: {
    missingKeyPrompt: 'Supply a Relay Access Key to unlock Sonix.',
    missingKeyAction: 'Enter a Relay Access Key first.',
    loading: 'Synchronizing Sonix arrays…',
    buffering: 'Charging buffer cores…',
    unreachable: 'Remote relay unreachable. Try again shortly.',
    missingStream: 'Signal lacks a playable stream. Select another artifact.',
    playbackError: 'Playback aborted. Try a different transmission.',
    emptyMode: 'No transmissions surfaced for this mode.',
    emptyFallback: 'Modulate filters or reset the scan.',
    playingPrefix: 'Streaming · ',
    armedPrefix: 'Armed · ',
    searchPrefix: 'Signal scan · ',
  },
  settings: {
    eyebrow: 'Relay Access Key',
    heading: 'Authorize Sonix Deck',
    description: 'Drop in your access key to sync with the relay.',
    toggle: 'Configure Relay Access',
  },
};

type DeckMode = 'online' | 'local';
let currentDeckMode: DeckMode = 'online';

const localDeckCopy = {
  idleStatus: 'Awaiting local artifacts',
  idleTitle: 'No offline signal armed',
  idleMeta: 'Import a file to begin',
  dropError: 'Only audio files can enter the local deck.',
  loadHint: 'Load audio to start offline playback.',
  buffer: 'Priming local buffer…',
  playbackError: 'Local playback blocked. Try another file.',
};

interface LocalTrack {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  duration: number;
  fileName: string;
}

interface LocalDeckState {
  tracks: LocalTrack[];
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

const localState: LocalDeckState = {
  tracks: [],
  currentIndex: -1,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
};

const localAudio = new Audio();
localAudio.preload = 'metadata';
localAudio.volume = store.getState().volume;

const createLocalId = () => (crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

const sanitize = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

applyTheme(store.getState().theme);
refs.volumeSlider.value = store.getState().volume.toString();
refs.pageSizeSelect.value = store.getState().pageSize.toString();
if (requiresClientKey) {
  refs.clientIdInput.value = store.getState().clientId ?? '';
  refs.settingsToggle.removeAttribute('hidden');
  refs.settingsDrawer.removeAttribute('hidden');
  refs.settingsDrawer.setAttribute('inert', '');
} else {
  refs.settingsToggle.setAttribute('hidden', 'true');
  refs.settingsDrawer.setAttribute('hidden', 'true');
}
applyProviderBranding();
setDeckMode(savedDeckMode, false);

wireInteractions();
wireLocalDeck();
renderPlayer();
renderLocalPlayer();
renderLocalTrackList();
renderLocalStatus();
renderFilters();
renderStatusBanner();
renderTrackList();
bootstrap();

function bootstrap() {
  if (requiresClientKey && !store.getState().clientId) {
    renderStatusBanner();
    toggleSettings(true);
    return;
  }

  loadTracks(store.getState().activeMode);
}

function wireInteractions() {
  refs.modeButtons.forEach((button: HTMLButtonElement) => {
    button.addEventListener('click', () => {
      const mode = button.dataset.mode as DeckMode | undefined;
      if (mode && mode !== currentDeckMode) {
        setDeckMode(mode);
      }
    });
  });

  refs.filterButtons.forEach((button: HTMLButtonElement) => {
    button.addEventListener('click', () => {
      const mode = button.dataset.mode as DiscoveryMode;
      if (!mode || mode === store.getState().activeMode) {
        return;
      }
      store.setActiveMode(mode);
      store.setSearchTerm('');
      store.setPage(0);
      store.setTotalResults(0);
      refs.searchInput.value = '';
      renderFilters();
      renderPagination();
      loadTracks(mode);
    });
  });

  refs.themeButtons.forEach((button: HTMLButtonElement) => {
    button.addEventListener('click', () => {
      const theme = button.dataset.theme as Theme;
      if (!theme) {
        return;
      }
      store.setTheme(theme);
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      applyTheme(theme);
    });
  });

  const debouncedSearch = debounce((term: string) => {
    store.setSearchTerm(term);
    store.setPage(0);
    store.setTotalResults(0);
    renderPagination();
    if (!term) {
      loadTracks(store.getState().activeMode);
      return;
    }
    loadTracks(store.getState().activeMode, term);
  }, 520);

  refs.searchInput.addEventListener('input', (event: Event) => {
    const term = (event.target as HTMLInputElement).value.trim();
    debouncedSearch(term);
  });

  refs.searchInput.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      debouncedSearch.cancel();
      const term = (event.target as HTMLInputElement).value.trim();
      store.setSearchTerm(term);
      store.setPage(0);
      store.setTotalResults(0);
      renderPagination();
      loadTracks(store.getState().activeMode, term);
    }
  });

  refs.pageSizeSelect.addEventListener('change', (event: Event) => {
    const value = Number((event.target as HTMLSelectElement).value);
    const normalized = Number.isFinite(value) && value > 0 ? Math.round(value) : store.getState().pageSize;
    if (normalized === store.getState().pageSize) {
      return;
    }
    store.setPageSize(normalized);
    store.setPage(0);
    store.setTotalResults(0);
    renderPagination();
    refreshTracks();
  });

  refs.pagePrev.addEventListener('click', () => {
    const state = store.getState();
    if (state.loading || state.page === 0) {
      return;
    }
    store.setPage(state.page - 1);
    renderPagination();
    refreshTracks();
  });

  refs.pageNext.addEventListener('click', () => {
    const state = store.getState();
    if (state.loading) {
      return;
    }
    const total = determineDisplayTotal(state);
    const totalPages = total > 0 ? Math.max(1, Math.ceil(total / state.pageSize)) : 1;
    if (state.page >= totalPages - 1) {
      return;
    }
    store.setPage(state.page + 1);
    renderPagination();
    refreshTracks();
  });

  refs.trackList.addEventListener('click', (event: MouseEvent) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-track-index]');
    if (!target) {
      return;
    }
    const index = Number(target.dataset.trackIndex);
    engageTrack(index, true);
  });

  refs.playButton.addEventListener('click', () => {
    if (!store.currentTrack && store.getState().tracks.length) {
      engageTrack(0, true);
      return;
    }

    if (!store.currentTrack) {
      if (requiresClientKey) {
        refs.settingsDrawer.setAttribute('aria-hidden', 'false');
      } else if (!store.getState().tracks.length) {
        loadTracks(store.getState().activeMode);
      }
      return;
    }

    if (audio.paused) {
      audio
        .play()
        .then(() => store.setPlaybackState(true))
        .catch((error) => console.error(error));
    } else {
      audio.pause();
      store.setPlaybackState(false);
    }
  });

  refs.prevButton.addEventListener('click', () => {
    navigateTrack(-1);
  });
  refs.nextButton.addEventListener('click', () => {
    navigateTrack(1);
  });

  refs.volumeSlider.addEventListener('input', (event: Event) => {
    const value = Number((event.target as HTMLInputElement).value);
    store.setVolume(value);
    audio.volume = value;
    localAudio.volume = value;
  });

  refs.timelineBar.addEventListener('pointerdown', (event: PointerEvent) => {
    if (!store.currentTrack) {
      return;
    }

    const pointerMove = (moveEvent: PointerEvent) => scrubTimeline(moveEvent);
    const pointerUp = () => {
      window.removeEventListener('pointermove', pointerMove);
      window.removeEventListener('pointerup', pointerUp);
    };

    scrubTimeline(event);
    window.addEventListener('pointermove', pointerMove);
    window.addEventListener('pointerup', pointerUp, { once: true });
  });

  if (requiresClientKey) {
    refs.settingsToggle.addEventListener('click', () => toggleSettings());

    refs.saveClientButton.addEventListener('click', () => {
      const value = refs.clientIdInput.value.trim();
      if (!value) {
        renderStatusBanner(deckCopy.statuses.missingKeyAction);
        return;
      }
      localStorage.setItem(CLIENT_STORAGE_KEY, value);
      store.setClientId(value);
      toggleSettings(false);
      loadTracks(store.getState().activeMode);
    });
  }

  audio.addEventListener('timeupdate', () => {
    store.setPosition(audio.currentTime, audio.duration);
    renderTimeline();
  });

  audio.addEventListener('loadedmetadata', () => {
    store.setPosition(0, audio.duration);
    renderTimeline();
  });

  audio.addEventListener('ended', () => navigateTrack(1));

  audio.addEventListener('play', () => {
    store.setPlaybackState(true);
    renderPlayer();
    renderStatusBanner();
  });

  audio.addEventListener('pause', () => {
    store.setPlaybackState(false);
    renderPlayer();
    renderStatusBanner();
  });
}

async function loadTracks(mode: DiscoveryMode, searchTerm?: string) {
  if (requiresClientKey && !store.getState().clientId) {
    renderStatusBanner(deckCopy.statuses.missingKeyPrompt);
    return;
  }

  store.setLoading(true);
  store.setError(undefined);
  renderStatusBanner();
  renderTrackListSkeleton();

  try {
    const state = store.getState();
    const effectiveTotal = state.totalResults
      ? Math.min(state.totalResults, MAX_REMOTE_RESULTS)
      : MAX_REMOTE_RESULTS;
    const maxAllowedPage = Math.max(Math.ceil(effectiveTotal / state.pageSize) - 1, 0);
    const activePage = Math.min(state.page, maxAllowedPage);
    if (activePage !== state.page) {
      store.setPage(activePage);
    }

    const rawOffset = activePage * state.pageSize;
    const cappedOffset = Math.min(rawOffset, MAX_REMOTE_RESULTS);
    const remainingAllowance = Math.max(MAX_REMOTE_RESULTS - cappedOffset, 0);

    if (!remainingAllowance) {
      store.setTracks([]);
      store.setTotalResults(Math.min(state.totalResults, MAX_REMOTE_RESULTS));
      renderTrackList();
      renderPagination();
      renderStatusBanner(deckCopy.statuses.emptyFallback);
      return;
    }

    const detectionLimit = Math.min(state.pageSize + 1, remainingAllowance);
    const visibleWindow = Math.min(state.pageSize, remainingAllowance);
    const queryOptions = { limit: detectionLimit, offset: cappedOffset };
    const result = searchTerm
      ? await provider.search(searchTerm, queryOptions)
      : await provider.fetchFeatured(mode, queryOptions);

    const tracks = result.tracks.slice(0, visibleWindow);
    store.setTracks(tracks);

    const providerTotal =
      typeof result.total === 'number' ? Math.min(result.total, MAX_REMOTE_RESULTS) : undefined;
    const hasExtraRecord = result.tracks.length > tracks.length;
    const estimatedTotal = providerTotal
      ? providerTotal
      : hasExtraRecord
      ? MAX_REMOTE_RESULTS
      : cappedOffset + tracks.length;

    const cappedTotal = Math.min(estimatedTotal, MAX_REMOTE_RESULTS);
    store.setTotalResults(cappedTotal);
    renderTrackList();
    renderPlayer();
    renderStatusBanner();
  } catch (error) {
    console.error('Unable to sync Sonix relay', error);
    const message = deckCopy.statuses.unreachable;
    store.setError(message);
    store.setTracks([]);
    store.setTotalResults(0);
    renderStatusBanner(message);
    renderTrackList();
  } finally {
    store.setLoading(false);
    renderTrackList();
    renderPagination();
    renderStatusBanner();
  }
}

function refreshTracks() {
  const state = store.getState();
  const term = state.searchTerm.trim();
  if (term) {
    loadTracks(state.activeMode, term);
  } else {
    loadTracks(state.activeMode);
  }
}

function engageTrack(index: number, autoplay: boolean) {
  store.setCurrentTrack(index);
  const track = store.currentTrack;
  if (!track) {
    return;
  }

  if (!track.streamUrl) {
    renderStatusBanner(deckCopy.statuses.missingStream);
    return;
  }

  audio.pause();
  audio.src = track.streamUrl;
  audio.currentTime = 0;
  audio.load();

  store.setPlaybackState(false);
  renderPlayer();
  renderTrackList();
  renderStatusBanner(deckCopy.statuses.buffering);

  if (autoplay) {
    audio
      .play()
      .then(() => {
        store.setPlaybackState(true);
        renderPlayer();
        renderStatusBanner();
      })
      .catch((error) => {
        console.error('Unable to start playback', error);
        renderStatusBanner(deckCopy.statuses.playbackError);
      });
  } else {
    renderStatusBanner();
  }
}

function navigateTrack(step: number, autoplay = true) {
  const { tracks, currentTrackIndex } = store.getState();
  if (!tracks.length) {
    return;
  }
  let nextIndex = currentTrackIndex + step;
  if (nextIndex >= tracks.length) {
    nextIndex = 0;
  }
  if (nextIndex < 0) {
    nextIndex = tracks.length - 1;
  }
  engageTrack(nextIndex, autoplay);
}

function applyTheme(theme: Theme) {
  document.body.dataset.theme = theme;
  refs.themeButtons.forEach((button: HTMLButtonElement) => {
    button.setAttribute('aria-pressed', String(button.dataset.theme === theme));
  });
  refs.waveBackdrop.style.opacity = theme === 'nebula' ? '0.5' : '0.7';
  refs.telemetryTheme.textContent = theme === 'nebula' ? 'Nebula' : 'Sol';
}

function toggleSettings(forceState?: boolean) {
  if (!requiresClientKey) {
    return;
  }
  const isOpen = refs.settingsDrawer.getAttribute('aria-hidden') === 'false';
  const shouldOpen = typeof forceState === 'boolean' ? forceState : !isOpen;
  if (shouldOpen === isOpen) {
    return;
  }

  refs.settingsDrawer.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');

  if (shouldOpen) {
    refs.settingsDrawer.removeAttribute('inert');
    requestAnimationFrame(() => refs.clientIdInput.focus());
  } else {
    refs.settingsDrawer.setAttribute('inert', '');
    const activeElement = document.activeElement as HTMLElement | null;
    if (activeElement && refs.settingsDrawer.contains(activeElement)) {
      refs.settingsToggle.focus();
    }
  }
}

function renderTrackListSkeleton() {
  if (store.getState().tracks.length) {
    return;
  }
  refs.trackList.dataset.loading = 'true';
  const placeholders = Math.min(store.getState().pageSize, 24);
  refs.trackList.innerHTML = Array.from({ length: placeholders })
    .map(() => '<div class="skeleton"></div>')
    .join('');
  renderPagination();
}

function renderTrackList() {
  const state = store.getState();
  refs.trackList.dataset.loading = state.loading ? 'true' : 'false';

  if (!state.tracks.length) {
    const fallback = deckCopy.statuses.emptyFallback;
    const message = state.error
      ? sanitize(state.error)
      : state.searchTerm
      ? `No transmissions matched "${sanitize(state.searchTerm)}".`
      : deckCopy.statuses.emptyMode;
    refs.trackList.innerHTML = `<div class="track-empty">${message}<br/><small>${fallback}</small></div>`;
    renderPagination();
    return;
  }

  refs.trackList.innerHTML = state.tracks
    .map((track, index) => renderTrackCard(track, index, index === state.currentTrackIndex))
    .join('');
  renderPagination();
}

function renderPagination() {
  const state = store.getState();
  refs.pageSizeSelect.value = state.pageSize.toString();
  const showing = state.tracks.length;
  const total = determineDisplayTotal(state);
  const totalPages = total > 0 ? Math.max(Math.ceil(total / state.pageSize), 1) : 1;
  const safePage = Math.min(state.page, totalPages - 1);
  const pageStart = showing ? safePage * state.pageSize + 1 : 0;
  const rawEnd = showing ? safePage * state.pageSize + showing : 0;
  const pageEnd = total ? Math.min(rawEnd, total) : rawEnd;

  const info = showing
    ? `Page ${safePage + 1} of ${totalPages} · ${pageStart}–${pageEnd} of ${total} transmissions`
    : `Page ${safePage + 1} of ${totalPages} · 0 of ${total} transmissions`;
  refs.pageInfo.textContent = info;

  refs.pagePrev.disabled = state.loading || safePage === 0;
  refs.pageNext.disabled = state.loading || safePage >= totalPages - 1;
}

function renderTrackCard(track: Track, index: number, isActive: boolean) {
  return `
    <article class="track-card ${isActive ? 'is-active' : ''}" data-track-index="${index}" role="listitem">
      <div class="track-card__meta">
        <img src="${track.cover || fallbackCover}" alt="${sanitize(track.title)}" loading="lazy" />
        <div>
          <p class="track-card__title">${sanitize(track.title)}</p>
          <p class="track-card__artist">${sanitize(track.artist)}</p>
        </div>
      </div>
      <div class="track-card__footer">
        <span>${formatDuration(track.duration)}</span>
        <span>${formatRelease(track.releaseDate)}</span>
      </div>
      <button class="ghost-button" type="button">Engage</button>
    </article>
  `;
}

function determineDisplayTotal(state: AppState): number {
  const boundedTotal = Math.max(0, Math.min(state.totalResults, MAX_REMOTE_RESULTS));
  const visibleExtent = Math.min(state.page * state.pageSize + state.tracks.length, MAX_REMOTE_RESULTS);
  return Math.max(boundedTotal, visibleExtent);
}

function renderPlayer() {
  const state = store.getState();
  const track = store.currentTrack;

  if (!track) {
    refs.playerCover.src = fallbackCover;
    refs.playerCover.alt = 'Idle deck';
    refs.playerTitle.textContent = 'Select a track';
    refs.playerMeta.textContent = deckCopy.idleMeta;
    refs.playButton.dataset.icon = '▶';
    refs.playButton.textContent = 'Play';
    refs.currentTime.textContent = '0:00';
    refs.totalTime.textContent = '0:00';
    refs.timelineProgress.style.width = '0%';
    refs.telemetryPlaying.textContent = deckCopy.telemetryIdle;
    return;
  }

  refs.playerCover.src = track.cover || fallbackCover;
  refs.playerCover.alt = `${track.title} artwork`;
  refs.playerTitle.textContent = sanitize(track.title);
  refs.playerMeta.textContent = `${sanitize(track.artist)} · ${sanitize(track.album)}`;
  refs.playButton.dataset.icon = state.isPlaying ? '❚❚' : '▶';
  refs.playButton.textContent = state.isPlaying ? 'Pause' : 'Play';
  const telemetryLabel = track.artist || 'Unknown signal';
  refs.telemetryPlaying.textContent = state.isPlaying
    ? `Streaming ${telemetryLabel}`
    : `Armed ${telemetryLabel}`;

  renderTimeline();
}

function renderTimeline() {
  const state = store.getState();
  const progress = state.duration ? (state.currentTime / state.duration) * 100 : 0;
  refs.timelineProgress.style.width = `${Math.min(100, progress)}%`;
  refs.timelineBar.setAttribute('aria-valuenow', Math.round(progress).toString());
  refs.currentTime.textContent = formatDuration(state.currentTime);
  refs.totalTime.textContent = formatDuration(state.duration);
}

function renderStatusBanner(customMessage?: string) {
  const state = store.getState();
  const activeTrack = store.currentTrack;

  if (customMessage) {
    refs.statusBanner.textContent = customMessage;
    return;
  }

  if (requiresClientKey && !state.clientId) {
    refs.statusBanner.textContent = deckCopy.statuses.missingKeyPrompt;
    return;
  }

  if (state.error) {
    refs.statusBanner.textContent = state.error;
    return;
  }

  if (state.loading) {
    refs.statusBanner.textContent = deckCopy.statuses.loading;
    return;
  }

  if (state.isPlaying && activeTrack) {
    const nowStreaming = activeTrack.artist ? `${activeTrack.artist} — ${activeTrack.title}` : activeTrack.title;
    refs.statusBanner.textContent = `${deckCopy.statuses.playingPrefix}${nowStreaming}`;
    return;
  }

  if (activeTrack) {
    const armedLabel = activeTrack.artist ? `${activeTrack.artist} — ${activeTrack.title}` : activeTrack.title;
    refs.statusBanner.textContent = `${deckCopy.statuses.armedPrefix}${armedLabel}`;
    return;
  }

  if (state.searchTerm) {
    refs.statusBanner.textContent = `${deckCopy.statuses.searchPrefix}"${state.searchTerm}"`;
    return;
  }

  const filter = discoveryFilters[state.activeMode];
  refs.statusBanner.textContent = `${filter.label} · ${filter.description}`;
}

function renderFilters() {
  const { activeMode } = store.getState();
  refs.filterButtons.forEach((button: HTMLButtonElement) => {
    button.classList.toggle('is-active', button.dataset.mode === activeMode);
  });
  refs.telemetryMode.textContent = discoveryFilters[activeMode].label;
}

function scrubTimeline(event: PointerEvent) {
  const rect = refs.timelineBar.getBoundingClientRect();
  const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
  const duration = audio.duration || store.getState().duration;
  if (!duration) {
    return;
  }
  audio.currentTime = ratio * duration;
  store.setPosition(audio.currentTime, duration);
  renderTimeline();
}

function applyProviderBranding() {
  const tagline = document.querySelector('.brand__tagline');
  if (tagline) {
    tagline.textContent = deckCopy.tagline;
  }

  refs.searchInput.placeholder = deckCopy.searchPlaceholder;

  if (requiresClientKey) {
    const settingsEyebrow = refs.settingsDrawer.querySelector('.settings__eyebrow');
    if (settingsEyebrow) {
      settingsEyebrow.textContent = deckCopy.settings.eyebrow;
    }
    const settingsHeading = refs.settingsDrawer.querySelector('[data-copy="settings-heading"]');
    if (settingsHeading) {
      settingsHeading.textContent = deckCopy.settings.heading;
    }
    const settingsCopy = refs.settingsDrawer.querySelector('[data-copy="settings-description"]');
    if (settingsCopy) {
      settingsCopy.textContent = deckCopy.settings.description;
    }
    refs.settingsToggle.textContent = deckCopy.settings.toggle;
  }
}

function setDeckMode(mode: DeckMode, persist = true) {
  currentDeckMode = mode;
  document.body.dataset.deckMode = mode;

  refs.modeButtons.forEach((button: HTMLButtonElement) => {
    const isActive = button.dataset.mode === mode;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  if (persist) {
    localStorage.setItem(DECK_MODE_STORAGE_KEY, mode);
  }

  renderLocalStatus();
  renderStatusBanner();
}

function wireLocalDeck() {
  refs.localCover.src = fallbackCover;

  refs.localBrowseButton.addEventListener('click', () => refs.localFileInput.click());
  refs.localFileInput.addEventListener('change', (event: Event) => {
    const files = (event.target as HTMLInputElement).files;
    importLocalFiles(files);
    refs.localFileInput.value = '';
  });

  const handleDragEnter: EventListener = (event) => {
    event.preventDefault();
    refs.localDropZone.dataset.state = 'active';
  };

  const handleDragLeave: EventListener = (event) => {
    event.preventDefault();
    refs.localDropZone.dataset.state = '';
  };

  const handleDrop: EventListener = (event) => {
    handleDragLeave(event);
    const dragEvent = event as DragEvent;
    importLocalFiles(dragEvent.dataTransfer?.files ?? null);
  };

  refs.localDropZone.addEventListener('dragenter', handleDragEnter);
  refs.localDropZone.addEventListener('dragover', handleDragEnter);
  refs.localDropZone.addEventListener('dragleave', handleDragLeave);
  refs.localDropZone.addEventListener('drop', handleDrop);

  refs.localTrackList.addEventListener('click', (event: MouseEvent) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-local-index]');
    if (!target) {
      return;
    }
    const index = Number(target.dataset.localIndex);
    engageLocalTrack(index, true);
  });

  refs.localPlayButton.addEventListener('click', () => {
    if (localState.currentIndex === -1) {
      if (localState.tracks.length) {
        engageLocalTrack(0, true);
      } else {
        renderLocalStatus(localDeckCopy.loadHint);
      }
      return;
    }

    if (localAudio.paused) {
      localAudio
        .play()
        .catch((error) => {
          console.error('Unable to play local track', error);
          renderLocalStatus(localDeckCopy.playbackError);
        });
    } else {
      localAudio.pause();
    }
  });

  refs.localPrevButton.addEventListener('click', () => navigateLocalTrack(-1));
  refs.localNextButton.addEventListener('click', () => navigateLocalTrack(1));

  refs.localTimelineBar.addEventListener('pointerdown', (event: PointerEvent) => {
    if (localState.currentIndex === -1) {
      return;
    }
    const pointerMove = (moveEvent: PointerEvent) => scrubLocalTimeline(moveEvent);
    const pointerUp = () => {
      window.removeEventListener('pointermove', pointerMove);
      window.removeEventListener('pointerup', pointerUp);
    };
    scrubLocalTimeline(event);
    window.addEventListener('pointermove', pointerMove);
    window.addEventListener('pointerup', pointerUp, { once: true });
  });

  localAudio.addEventListener('timeupdate', () => {
    localState.currentTime = localAudio.currentTime;
    localState.duration = localAudio.duration || localState.duration;
    renderLocalTimeline();
  });

  localAudio.addEventListener('loadedmetadata', () => {
    localState.duration = localAudio.duration || 0;
    renderLocalTimeline();
  });

  localAudio.addEventListener('ended', () => navigateLocalTrack(1));

  localAudio.addEventListener('play', () => {
    localState.isPlaying = true;
    renderLocalPlayer();
    renderLocalStatus();
  });

  localAudio.addEventListener('pause', () => {
    localState.isPlaying = false;
    renderLocalPlayer();
    renderLocalStatus();
  });
}

function importLocalFiles(fileList: FileList | null) {
  if (!fileList?.length) {
    return;
  }

  const audioFiles = Array.from(fileList).filter((file) => file.type.startsWith('audio/'));
  if (!audioFiles.length) {
    renderLocalStatus(localDeckCopy.dropError);
    return;
  }

  audioFiles.forEach((file) => localState.tracks.push(mapLocalFile(file)));

  renderLocalTrackList();
  renderLocalStatus(`${audioFiles.length} offline artifact${audioFiles.length === 1 ? '' : 's'} armed.`);

  if (localState.currentIndex === -1) {
    renderLocalPlayer();
  }
}

function mapLocalFile(file: File): LocalTrack {
  const { title, subtitle } = deriveLocalMetadata(file.name);
  return {
    id: createLocalId(),
    title,
    subtitle,
    url: URL.createObjectURL(file),
    duration: 0,
    fileName: file.name,
  };
}

function deriveLocalMetadata(fileName: string) {
  const base = fileName.replace(/\.[^/.]+$/, '').trim();
  if (!base) {
    return { title: 'Untitled Artifact', subtitle: 'Local Source' };
  }
  const segments = base.split('-').map((segment) => segment.trim()).filter(Boolean);
  if (segments.length >= 2) {
    return { title: segments.slice(1).join(' - '), subtitle: segments[0] };
  }
  return { title: base, subtitle: 'Local Source' };
}

function renderLocalTrackList() {
  if (!localState.tracks.length) {
    refs.localTrackList.innerHTML = `<div class="local-empty">${localDeckCopy.idleStatus}</div>`;
    return;
  }

  refs.localTrackList.innerHTML = localState.tracks
    .map((track, index) => {
      const safeTitle = sanitize(track.title);
      const safeSubtitle = sanitize(track.subtitle);
      const isActive = index === localState.currentIndex;
      return `
        <article class="local-card ${isActive ? 'is-active' : ''}" data-local-index="${index}" role="listitem">
          <div class="local-card__meta">
            <p>${safeTitle}</p>
            <small>${safeSubtitle}</small>
          </div>
          <button type="button">${isActive && localState.isPlaying ? 'Pause' : 'Play'}</button>
        </article>
      `;
    })
    .join('');
}

function renderLocalPlayer() {
  const track = localState.tracks[localState.currentIndex];

  if (!track) {
    refs.localCover.src = fallbackCover;
    refs.localCover.alt = 'Local deck idle';
    refs.localTitle.textContent = localDeckCopy.idleTitle;
    refs.localMeta.textContent = localDeckCopy.idleMeta;
    refs.localPlayButton.dataset.icon = '▶';
    refs.localPlayButton.textContent = 'Play';
    refs.localTimelineProgress.style.width = '0%';
    refs.localCurrentTime.textContent = '0:00';
    refs.localTotalTime.textContent = '0:00';
    renderLocalTrackList();
    return;
  }

  refs.localCover.src = fallbackCover;
  refs.localCover.alt = `${track.title} artwork`;
  refs.localTitle.textContent = track.title;
  refs.localMeta.textContent = track.subtitle;
  refs.localPlayButton.dataset.icon = localState.isPlaying ? '❚❚' : '▶';
  refs.localPlayButton.textContent = localState.isPlaying ? 'Pause' : 'Play';
  renderLocalTimeline();
  renderLocalTrackList();
}

function renderLocalTimeline() {
  const duration = localAudio.duration || localState.duration || 0;
  const progress = duration ? (localAudio.currentTime / duration) * 100 : 0;
  refs.localTimelineProgress.style.width = `${Math.min(100, progress)}%`;
  refs.localTimelineBar.setAttribute('aria-valuenow', Math.round(progress).toString());
  refs.localCurrentTime.textContent = formatDuration(localAudio.currentTime || 0);
  refs.localTotalTime.textContent = formatDuration(duration);
}

function renderLocalStatus(customMessage?: string) {
  if (customMessage) {
    refs.localStatus.textContent = customMessage;
    return;
  }

  if (!localState.tracks.length) {
    refs.localStatus.textContent = localDeckCopy.idleStatus;
    return;
  }

  if (localState.isPlaying && localState.currentIndex >= 0) {
    const track = localState.tracks[localState.currentIndex];
    refs.localStatus.textContent = `Local stream active · ${track.title}`;
    return;
  }

  refs.localStatus.textContent = `${localState.tracks.length} offline artifact${localState.tracks.length === 1 ? '' : 's'} ready.`;
}

function engageLocalTrack(index: number, autoplay: boolean) {
  if (index < 0 || index >= localState.tracks.length) {
    return;
  }

  const track = localState.tracks[index];
  localState.currentIndex = index;
  localState.currentTime = 0;
  localState.duration = 0;

  localAudio.pause();
  localAudio.src = track.url;
  localAudio.currentTime = 0;
  localAudio.load();
  localState.isPlaying = false;

  renderLocalPlayer();
  renderLocalStatus(localDeckCopy.buffer);

  if (autoplay) {
    localAudio
      .play()
      .then(() => {
        localState.isPlaying = true;
        renderLocalPlayer();
        renderLocalStatus();
      })
      .catch((error) => {
        console.error('Unable to initiate local playback', error);
        renderLocalStatus(localDeckCopy.playbackError);
      });
  }
}

function navigateLocalTrack(step: number) {
  if (!localState.tracks.length) {
    renderLocalStatus(localDeckCopy.loadHint);
    return;
  }
  let nextIndex = localState.currentIndex + step;
  if (nextIndex >= localState.tracks.length) {
    nextIndex = 0;
  }
  if (nextIndex < 0) {
    nextIndex = localState.tracks.length - 1;
  }
  engageLocalTrack(nextIndex, localState.isPlaying);
}

function scrubLocalTimeline(event: PointerEvent) {
  const rect = refs.localTimelineBar.getBoundingClientRect();
  const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
  const duration = localAudio.duration || localState.duration;
  if (!duration) {
    return;
  }
  localAudio.currentTime = ratio * duration;
  localState.currentTime = localAudio.currentTime;
  renderLocalTimeline();
}

function cleanupLocalDeck() {
  localState.tracks.forEach((track) => URL.revokeObjectURL(track.url));
}

window.addEventListener('beforeunload', cleanupLocalDeck);
