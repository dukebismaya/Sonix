import { DiscoveryMode, MusicProvider, ProviderQuery, ProviderResult, Track } from '../types/music';

interface AudiusArtwork {
  '150x150'?: string;
  '480x480'?: string;
  '1000x1000'?: string;
}

interface AudiusUser {
  name?: string;
}

interface AudiusTrack {
  id: string;
  title: string;
  duration?: number;
  stream_url?: string;
  download_url?: string;
  downloadable?: boolean;
  release_date?: string;
  created_at?: string;
  genre?: string;
  mood?: string;
  artwork?: AudiusArtwork;
  description?: string;
  permalink_url?: string;
  user?: AudiusUser;
  is_unlisted?: boolean;
  is_streamable?: boolean;
  is_delete?: boolean;
}

const DISCOVERY_ENDPOINT = 'https://api.audius.co';

const modeConfig: Record<DiscoveryMode, { path: string; params?: Record<string, string> }> = {
  trending: {
    path: '/v1/tracks/trending',
    params: { time: 'week' },
  },
  latest: {
    path: '/v1/tracks/trending',
    params: { time: 'day' },
  },
  pulse: {
    path: '/v1/tracks/trending',
    params: { time: 'month' },
  },
  instrumental: {
    path: '/v1/tracks/trending',
    params: { time: 'all' },
  },
};

export class AudiusService implements MusicProvider {
  readonly name = 'audius';
  readonly requiresClientId = false;

  private discoveryHost: string | null = null;

  constructor(private readonly appName: string) {
    if (!this.appName) {
      throw new Error('Audius requires an app name (SONIX_AUDIUS_APP_NAME).');
    }
  }

  async fetchFeatured(mode: DiscoveryMode, options?: ProviderQuery): Promise<ProviderResult> {
    const config = modeConfig[mode];
    return this.request(config.path, config.params, options);
  }

  async search(term: string, options?: ProviderQuery): Promise<ProviderResult> {
    return this.request('/v1/tracks/search', {
      query: term,
    }, options);
  }

  private async request(
    path: string,
    params: Record<string, string | undefined> = {},
    options?: ProviderQuery,
  ): Promise<ProviderResult> {
    const host = await this.resolveHost();
    const query = new URLSearchParams({
      app_name: this.appName,
      limit: String(options?.limit ?? 12),
    });

    if (typeof options?.offset === 'number') {
      query.set('offset', String(options.offset));
    }

    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        query.set(key, value);
      }
    });

    const response = await fetch(`${host}${path}?${query.toString()}`);
    let payload: any = null;

    try {
      payload = await response.json();
    } catch (error) {
      console.warn('Audius response parsing failed', error);
    }

    if (!response.ok) {
      const message = payload?.error || payload?.message || 'Audius request failed';
      throw new Error(message);
    }

    if (!payload) {
      throw new Error('Audius response was empty');
    }

    const results: AudiusTrack[] = payload?.data ?? payload ?? [];

    const tracks = results
      .map((track) => this.mapTrack(track))
      .filter((track): track is Track => Boolean(track));

    const rawTotal = payload?.metadata?.total_count;
    const parsedTotal =
      typeof rawTotal === 'number'
        ? rawTotal
        : typeof rawTotal === 'string'
        ? Number.parseInt(rawTotal, 10)
        : undefined;
    const total = Number.isFinite(parsedTotal) ? parsedTotal : undefined;

    return {
      tracks,
      total,
    };
  }

  private async resolveHost(): Promise<string> {
    if (this.discoveryHost) {
      return this.discoveryHost;
    }

    const response = await fetch(DISCOVERY_ENDPOINT);
    if (!response.ok) {
      throw new Error('Unable to reach Audius discovery service');
    }

    const payload = await response.json();
    const host = payload?.data?.[0];

    if (!host) {
      throw new Error('Audius discovery returned no hosts');
    }

    this.discoveryHost = host;
    return host;
  }

  private mapTrack(raw: AudiusTrack): Track | null {
    if (!raw.stream_url || raw.is_delete || raw.is_unlisted || raw.is_streamable === false) {
      return null;
    }

    const cover = raw.artwork?.['480x480'] ?? raw.artwork?.['1000x1000'] ?? '';
    const streamUrl = this.appendAppName(raw.stream_url);
    const downloadUrl = raw.downloadable && raw.download_url ? this.appendAppName(raw.download_url) : streamUrl;

    return {
      id: raw.id,
      title: raw.title,
      artist: raw.user?.name ?? 'Unknown Artist',
      album: raw.description ? raw.title : 'Audius Single',
      duration: raw.duration ?? 0,
      streamUrl,
      downloadUrl,
      cover,
      releaseDate: raw.release_date ?? raw.created_at ?? new Date().toISOString(),
      shareUrl: raw.permalink_url ?? '',
      licenseUrl: 'https://audius.co/terms',
    };
  }

  private appendAppName(uri: string): string {
    try {
      const url = new URL(uri);
      url.searchParams.set('app_name', this.appName);
      return url.toString();
    } catch (error) {
      console.warn('Audius stream URL malformed', uri, error);
      return uri;
    }
  }
}
