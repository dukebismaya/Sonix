import { DiscoveryMode } from '../../types/music';

export interface AppViewRefs {
  trackList: HTMLElement;
  statusBanner: HTMLElement;
  searchInput: HTMLInputElement;
  filterBar: HTMLElement;
  pageSizeSelect: HTMLSelectElement;
  pageInfo: HTMLElement;
  pagePrev: HTMLButtonElement;
  pageNext: HTMLButtonElement;
  filterButtons: NodeListOf<HTMLButtonElement>;
  themeButtons: NodeListOf<HTMLButtonElement>;
  settingsDrawer: HTMLElement;
  settingsToggle: HTMLButtonElement;
  clientIdInput: HTMLInputElement;
  saveClientButton: HTMLButtonElement;
  telemetryPlaying: HTMLElement;
  telemetryMode: HTMLElement;
  telemetryTheme: HTMLElement;
  playerTitle: HTMLElement;
  playerMeta: HTMLElement;
  playerCover: HTMLImageElement;
  playButton: HTMLButtonElement;
  prevButton: HTMLButtonElement;
  nextButton: HTMLButtonElement;
  timelineBar: HTMLElement;
  timelineProgress: HTMLElement;
  currentTime: HTMLElement;
  totalTime: HTMLElement;
  volumeSlider: HTMLInputElement;
  waveBackdrop: HTMLElement;
  modeButtons: NodeListOf<HTMLButtonElement>;
  localPanel: HTMLElement;
  localDropZone: HTMLElement;
  localFileInput: HTMLInputElement;
  localBrowseButton: HTMLButtonElement;
  localStatus: HTMLElement;
  localTrackList: HTMLElement;
  localTitle: HTMLElement;
  localMeta: HTMLElement;
  localCover: HTMLImageElement;
  localPlayButton: HTMLButtonElement;
  localPrevButton: HTMLButtonElement;
  localNextButton: HTMLButtonElement;
  localTimelineBar: HTMLElement;
  localTimelineProgress: HTMLElement;
  localCurrentTime: HTMLElement;
  localTotalTime: HTMLElement;
}

const filterButtons: { label: string; subLabel: string; mode: DiscoveryMode }[] = [
  { label: 'Trending Pulse', subLabel: 'popularity·week', mode: 'trending' },
  { label: 'Solar Launch', subLabel: 'fresh·drops', mode: 'latest' },
  { label: 'Night Pulse', subLabel: 'club·dna', mode: 'pulse' },
  { label: 'Artefact', subLabel: 'instrumental·focus', mode: 'instrumental' },
];

export function mountAppShell(root: HTMLElement): AppViewRefs {
  root.innerHTML = `
    <div class="orbital-field" aria-hidden="true">
      <div class="orbital-grid"></div>
    </div>
    <div class="mode-overlay" role="group" aria-label="Deck mode selector">
      <button class="mode-toggle is-active" data-mode="online">Online Relay</button>
      <button class="mode-toggle" data-mode="local">Local Pulse</button>
    </div>
    <div class="app-grid">
      <aside class="panel panel--nav">
        <div class="brand">
          <p class="brand__eyebrow">SONIX ∙ v.02</p>
          <h1>Neural Audio Deck</h1>
          <p class="brand__tagline">Futuristic Sonix relay control room</p>
        </div>
        <button class="ghost-button" id="settingsToggle" aria-controls="settingsDrawer">
          Configure Relay Access
        </button>
        <div class="telemetry">
          <div>
            <p class="telemetry__label">Now Streaming</p>
            <p class="telemetry__value" data-telemetry="playing">Hold to sync</p>
          </div>
          <div>
            <p class="telemetry__label">Spectrum Status</p>
            <p class="telemetry__value" data-telemetry="mode">Trending Pulse</p>
          </div>
          <div>
            <p class="telemetry__label">Theme Vector</p>
            <p class="telemetry__value" data-telemetry="theme">Nebula</p>
          </div>
        </div>
        <div class="theme-toggle">
          <span>Theme</span>
          <div class="theme-toggle__set">
            <button class="chip" data-theme="nebula" aria-pressed="true">Nebula</button>
            <button class="chip" data-theme="sol" aria-pressed="false">Sol</button>
          </div>
        </div>
      </aside>

      <section class="panel panel--local" id="localPanel">
        <header class="local-header">
          <div>
            <p class="local-eyebrow">Local Pulse</p>
            <h2>Offline Resonance</h2>
            <p class="local-hint">Load personal audio artifacts to jam without the network.</p>
          </div>
          <div class="local-actions">
            <button class="ghost-button" id="localBrowse">Browse Files</button>
            <input id="localFileInput" type="file" accept="audio/*" hidden multiple />
          </div>
        </header>
        <div class="local-drop" id="localDropZone">
          <p>Drop WAV / MP3 / OGG</p>
          <span>or click browse</span>
        </div>
        <p class="local-status-display" id="localStatus">Awaiting local artifacts</p>
        <div class="local-player" aria-live="polite">
          <div class="local-now">
            <img id="localCover" alt="Local deck cover" />
            <div>
              <p id="localTitle">No offline signal armed</p>
              <p id="localMeta">Import a file to begin</p>
            </div>
          </div>
          <div class="local-controls">
            <button id="localPrev" aria-label="Previous local track" data-icon="◄"></button>
            <button id="localPlay" aria-label="Play or pause local track" data-icon="▶">Play</button>
            <button id="localNext" aria-label="Next local track" data-icon="►"></button>
          </div>
          <div class="local-timeline" id="localTimelineBar" role="slider" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
            <div class="local-timeline__progress" id="localTimelineProgress"></div>
          </div>
          <div class="local-times">
            <span id="localCurrentTime">0:00</span>
            <span id="localTotalTime">0:00</span>
          </div>
        </div>
        <div class="local-tracklist" id="localTrackList" role="list"></div>
      </section>

      <section class="panel panel--library">
        <header class="library-header">
          <div class="search">
            <div class="search__icon" aria-hidden="true"></div>
            <input id="searchField" type="search" placeholder="Scan the Sonix relay" autocomplete="off" />
            <span class="search__hint">press Enter to force search</span>
          </div>
          <div class="filters" id="filterBar">
            ${filterButtons
              .map(
                (filter) => `
                  <button class="filter" data-mode="${filter.mode}">
                    <span>${filter.label}</span>
                    <small>${filter.subLabel}</small>
                  </button>
                `
              )
              .join('')}
          </div>
          <div class="library-controls">
            <label class="page-size" for="pageSizeSelect">
              <span>Results per page</span>
              <select id="pageSizeSelect">
                <option value="6">6</option>
                <option value="12">12</option>
                <option value="18">18</option>
                <option value="24">24</option>
              </select>
            </label>
            <div class="pager" role="group" aria-label="Pagination controls">
              <button id="pagePrev" aria-label="Previous page" data-icon="◄"></button>
              <span id="pageInfo">Page 1 · 0 transmissions</span>
              <button id="pageNext" aria-label="Next page" data-icon="►"></button>
            </div>
          </div>
        </header>
        <div class="status-banner" id="statusBanner"></div>
        <div class="track-list" id="trackList" role="list"></div>
      </section>

      <section class="panel panel--player">
        <div class="player-wave" id="playerWave" aria-hidden="true"></div>
        <div class="player-meta">
          <img id="playerCover" alt="Current artwork" />
          <div>
            <p id="playerTitle" class="player-title">Select a track</p>
            <p id="playerMeta" class="player-subtitle">Sonix relay idle</p>
          </div>
        </div>
        <div class="timeline">
          <span id="currentTime">0:00</span>
          <div class="timeline__bar" id="timelineBar" role="slider" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
            <div class="timeline__progress" id="timelineProgress"></div>
          </div>
          <span id="totalTime">0:00</span>
        </div>
        <div class="controls">
          <button id="prevButton" aria-label="Previous track" data-icon="◄"></button>
          <button id="playButton" aria-label="Play or pause" data-icon="▶"></button>
          <button id="nextButton" aria-label="Next track" data-icon="►"></button>
          <label class="volume">
            <span>Volume</span>
            <input id="volumeSlider" type="range" min="0" max="1" step="0.01" />
          </label>
        </div>
      </section>
    </div>

    <section class="settings" id="settingsDrawer" aria-hidden="true">
      <div>
        <p class="settings__eyebrow">Relay Access Key</p>
        <h2 data-copy="settings-heading">Authorize Sonix Deck</h2>
        <p data-copy="settings-description">Drop in your relay access key to sync with the control room.</p>
        <label>
          <span>Client ID</span>
          <input id="clientIdInput" type="text" placeholder="xxxxxxxx" spellcheck="false" />
        </label>
        <button id="saveClientId">Save & Sync</button>
      </div>
    </section>
  `;

  return {
    trackList: root.querySelector('#trackList') as HTMLElement,
    statusBanner: root.querySelector('#statusBanner') as HTMLElement,
    searchInput: root.querySelector('#searchField') as HTMLInputElement,
    filterBar: root.querySelector('#filterBar') as HTMLElement,
    pageSizeSelect: root.querySelector('#pageSizeSelect') as HTMLSelectElement,
    pageInfo: root.querySelector('#pageInfo') as HTMLElement,
    pagePrev: root.querySelector('#pagePrev') as HTMLButtonElement,
    pageNext: root.querySelector('#pageNext') as HTMLButtonElement,
    filterButtons: root.querySelectorAll<HTMLButtonElement>('.filter'),
    themeButtons: root.querySelectorAll<HTMLButtonElement>('.theme-toggle .chip'),
    settingsDrawer: root.querySelector('#settingsDrawer') as HTMLElement,
    settingsToggle: root.querySelector('#settingsToggle') as HTMLButtonElement,
    clientIdInput: root.querySelector('#clientIdInput') as HTMLInputElement,
    saveClientButton: root.querySelector('#saveClientId') as HTMLButtonElement,
    telemetryPlaying: root.querySelector('[data-telemetry="playing"]') as HTMLElement,
    telemetryMode: root.querySelector('[data-telemetry="mode"]') as HTMLElement,
    telemetryTheme: root.querySelector('[data-telemetry="theme"]') as HTMLElement,
    playerTitle: root.querySelector('#playerTitle') as HTMLElement,
    playerMeta: root.querySelector('#playerMeta') as HTMLElement,
    playerCover: root.querySelector('#playerCover') as HTMLImageElement,
    playButton: root.querySelector('#playButton') as HTMLButtonElement,
    prevButton: root.querySelector('#prevButton') as HTMLButtonElement,
    nextButton: root.querySelector('#nextButton') as HTMLButtonElement,
    timelineBar: root.querySelector('#timelineBar') as HTMLElement,
    timelineProgress: root.querySelector('#timelineProgress') as HTMLElement,
    currentTime: root.querySelector('#currentTime') as HTMLElement,
    totalTime: root.querySelector('#totalTime') as HTMLElement,
    volumeSlider: root.querySelector('#volumeSlider') as HTMLInputElement,
    waveBackdrop: root.querySelector('#playerWave') as HTMLElement,
    modeButtons: root.querySelectorAll<HTMLButtonElement>('.mode-toggle'),
    localPanel: root.querySelector('#localPanel') as HTMLElement,
    localDropZone: root.querySelector('#localDropZone') as HTMLElement,
    localFileInput: root.querySelector('#localFileInput') as HTMLInputElement,
    localBrowseButton: root.querySelector('#localBrowse') as HTMLButtonElement,
    localStatus: root.querySelector('#localStatus') as HTMLElement,
    localTrackList: root.querySelector('#localTrackList') as HTMLElement,
    localTitle: root.querySelector('#localTitle') as HTMLElement,
    localMeta: root.querySelector('#localMeta') as HTMLElement,
    localCover: root.querySelector('#localCover') as HTMLImageElement,
    localPlayButton: root.querySelector('#localPlay') as HTMLButtonElement,
    localPrevButton: root.querySelector('#localPrev') as HTMLButtonElement,
    localNextButton: root.querySelector('#localNext') as HTMLButtonElement,
    localTimelineBar: root.querySelector('#localTimelineBar') as HTMLElement,
    localTimelineProgress: root.querySelector('#localTimelineProgress') as HTMLElement,
    localCurrentTime: root.querySelector('#localCurrentTime') as HTMLElement,
    localTotalTime: root.querySelector('#localTotalTime') as HTMLElement,
  };
}
