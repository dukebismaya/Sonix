import {
  DiscoveryMode,
  JamendoTrack,
  MusicProvider,
  ProviderQuery,
  ProviderResult,
  Track,
} from '../types/music';
import { discoveryFilters } from './discovery';

const API_BASE = 'https://api.jamendo.com/v3.0';
const AUDIO_PROXY_ENDPOINT = '/api/audio-proxy';

interface JamendoResponse {
  headers: {
    status: string;
    error_message: string;
    results_count?: string;
  };
  results: JamendoTrack[];
}

const baseQuery = {
  format: 'json',
  audioformat: 'mp31',
  audiodlformat: 'mp32',
  imagesize: '600',
  boost: 'popularity_week',
  order: 'popularity_week',
  include: 'musicinfo',
  groupby: 'artist_id',
  limit: '12',
};

export class JamendoService implements MusicProvider {
  readonly name = 'jamendo';
  readonly requiresClientId = true;

  constructor(private readonly clientIdProvider: () => string | null) {}

  async fetchFeatured(mode: DiscoveryMode, options?: ProviderQuery): Promise<ProviderResult> {
    const filter = discoveryFilters[mode];
    return this.request('/tracks', {
      order: filter.order,
      tags: filter.tags,
      speed: filter.speed,
    }, options);
  }

  async search(term: string, options?: ProviderQuery): Promise<ProviderResult> {
    return this.request('/tracks', {
      search: term,
      order: 'relevance_desc',
    }, options);
  }

  async request(
    endpoint: string,
    query: Record<string, string | undefined>,
    options?: ProviderQuery,
  ): Promise<ProviderResult> {
    const clientId = this.clientIdProvider();

    if (!clientId) {
      throw new Error('Supply a Relay Access Key to unlock Sonix.');
    }

    const params = new URLSearchParams({
      client_id: clientId,
      ...baseQuery,
    });

    if (options?.limit) {
      params.set('limit', String(options.limit));
    }

    if (typeof options?.offset === 'number') {
      params.set('offset', String(options.offset));
    }

    Object.entries(query).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });

    const response = await fetch(`${API_BASE}${endpoint}?${params.toString()}`);
    const payload: JamendoResponse = await response.json();

    if (!response.ok || payload.headers.status !== 'success') {
      const reason = payload.headers.error_message || 'Relay request failed';
      console.error('Jamendo request failed', reason);
      throw new Error('Remote relay responded with an error.');
    }

    const tracks = payload.results
      .map((track) => this.mapTrack(track, clientId))
      .filter((track): track is Track => Boolean(track));

    const total = payload.headers.results_count ? Number(payload.headers.results_count) : undefined;

    return {
      tracks,
      total,
    };
  }

  private mapTrack(raw: JamendoTrack, clientId: string): Track | null {
    if (!raw.audio) {
      return null;
    }

    const streamUrl = this.proxifyUrl(this.injectClientId(raw.audio, clientId));
    const downloadSource = raw.audiodownload ?? raw.audio;
    const downloadUrl = this.proxifyUrl(this.injectClientId(downloadSource, clientId));

    return {
      id: raw.id,
      title: raw.name,
      artist: raw.artist_name,
      album: raw.album_name,
      duration: raw.duration,
      streamUrl,
      downloadUrl,
      cover: raw.image ?? '',
      releaseDate: raw.releasedate,
      shareUrl: raw.shareurl,
      licenseUrl: raw.license_ccurl,
    };
  }

  private injectClientId(uri: string | null, clientId: string): string {
    if (!uri) {
      return '';
    }

    try {
      const url = new URL(uri);
      url.searchParams.set('client_id', clientId);
      return url.toString();
    } catch (error) {
      console.warn('Invalid Jamendo media URL', uri, error);
      return uri;
    }
  }

  private proxifyUrl(uri: string): string {
    if (!uri || uri.startsWith(AUDIO_PROXY_ENDPOINT)) {
      return uri;
    }

    try {
      const url = new URL(uri);
      if (!url.hostname || !url.hostname.endsWith('jamendo.com')) {
        return uri;
      }
      return `${AUDIO_PROXY_ENDPOINT}?target=${encodeURIComponent(url.toString())}`;
    } catch (error) {
      console.warn('Unable to proxify Jamendo media URL', uri, error);
      return uri;
    }
  }
}
