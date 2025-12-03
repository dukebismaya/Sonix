import { DiscoveryMode, ProviderName, Theme, Track } from '../types/music';

export interface AppState {
  provider: ProviderName;
  clientId: string | null;
  tracks: Track[];
  activeMode: DiscoveryMode;
  currentTrackIndex: number;
  isPlaying: boolean;
  loading: boolean;
  error?: string;
  searchTerm: string;
  theme: Theme;
  volume: number;
  currentTime: number;
  duration: number;
  pageSize: number;
  page: number;
  totalResults: number;
}

type Listener = (state: AppState) => void;

const defaultState: AppState = {
  provider: 'jamendo',
  clientId: null,
  tracks: [],
  activeMode: 'trending',
  currentTrackIndex: -1,
  isPlaying: false,
  loading: false,
  searchTerm: '',
  theme: 'nebula',
  volume: 0.72,
  currentTime: 0,
  duration: 0,
  pageSize: 12,
  page: 0,
  totalResults: 0,
};

export class AppStore {
  private state: AppState;
  private listeners = new Set<Listener>();

  constructor(initialState: Partial<AppState> = {}) {
    this.state = { ...defaultState, ...initialState };
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  getState(): AppState {
    return this.state;
  }

  get currentTrack(): Track | null {
    return this.state.tracks[this.state.currentTrackIndex] ?? null;
  }

  patch(partial: Partial<AppState>): void {
    this.state = { ...this.state, ...partial };
    this.emit();
  }

  setClientId(clientId: string | null): void {
    this.patch({ clientId });
  }

  setProvider(provider: ProviderName): void {
    this.patch({ provider });
  }

  setTracks(tracks: Track[]): void {
    this.patch({
      tracks,
      currentTrackIndex: -1,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
    });
  }

  setActiveMode(mode: DiscoveryMode): void {
    this.patch({ activeMode: mode });
  }

  setSearchTerm(term: string): void {
    this.patch({ searchTerm: term });
  }

  setCurrentTrack(index: number): void {
    if (index < 0 || index >= this.state.tracks.length) {
      return;
    }

    this.patch({
      currentTrackIndex: index,
      currentTime: 0,
      duration: this.state.tracks[index]?.duration ?? 0,
    });
  }

  setPlaybackState(isPlaying: boolean): void {
    this.patch({ isPlaying });
  }

  setLoading(loading: boolean): void {
    this.patch({ loading });
  }

  setError(message?: string): void {
    this.patch({ error: message });
  }

  setPosition(currentTime: number, duration?: number): void {
    this.patch({
      currentTime,
      duration: typeof duration === 'number' ? duration : this.state.duration,
    });
  }

  setVolume(volume: number): void {
    this.patch({ volume });
  }

  setTheme(theme: Theme): void {
    this.patch({ theme });
  }

  setPage(page: number): void {
    this.patch({ page });
  }

  setPageSize(pageSize: number): void {
    this.patch({ pageSize });
  }

  setTotalResults(totalResults: number): void {
    this.patch({ totalResults });
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener(this.state));
  }
}
