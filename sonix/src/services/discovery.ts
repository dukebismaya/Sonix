import { DiscoveryFilter, DiscoveryMode } from '../types/music';

export const discoveryFilters: Record<DiscoveryMode, DiscoveryFilter> = {
  trending: {
    label: 'Pulse Trending',
    description: 'Weekly popularity waves',
    order: 'popularity_week',
    mode: 'trending',
  },
  latest: {
    label: 'Solar Launch',
    description: 'Fresh drops, just landed',
    order: 'releasedate_desc',
    mode: 'latest',
  },
  pulse: {
    label: 'Night Pulse',
    description: 'After-hours synth glide',
    order: 'popularity_total',
    mode: 'pulse',
  },
  instrumental: {
    label: 'Artefact',
    description: 'Slow-burn atmospheric currents',
    order: 'popularity_month',
    mode: 'instrumental',
  },
};
