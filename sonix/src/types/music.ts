export type Theme = 'nebula' | 'sol';

export type DiscoveryMode = 'trending' | 'latest' | 'pulse' | 'instrumental';
export type ProviderName = 'jamendo' | 'audius';

export interface DiscoveryFilter {
  label: string;
  description: string;
  order: string;
  tags?: string;
  speed?: string;
  mode: DiscoveryMode;
}

export interface ProviderQuery {
  limit?: number;
  offset?: number;
}

export interface ProviderResult {
  tracks: Track[];
  total?: number;
}

export interface JamendoTrack {
  id: string;
  name: string;
  artist_name: string;
  album_name: string;
  duration: number;
  audio: string | null;
  audiodownload: string | null;
  image: string | null;
  releasedate: string;
  shareurl: string;
  license_ccurl: string;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  streamUrl: string;
  downloadUrl: string;
  cover: string;
  releaseDate: string;
  shareUrl: string;
  licenseUrl: string;
}

export interface MusicProvider {
  name: ProviderName;
  requiresClientId: boolean;
  fetchFeatured(mode: DiscoveryMode, options?: ProviderQuery): Promise<ProviderResult>;
  search(term: string, options?: ProviderQuery): Promise<ProviderResult>;
}
