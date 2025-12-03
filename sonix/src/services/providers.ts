import { AppStore } from '../state/store';
import { MusicProvider, ProviderName } from '../types/music';
import { AudiusService } from './audius';
import { JamendoService } from './jamendo';

const DEFAULT_AUDIUS_APP = process.env.SONIX_AUDIUS_APP_NAME || 'sonix-deck';

export function createMusicProvider(name: ProviderName, store: AppStore): MusicProvider {
  if (name === 'audius') {
    return new AudiusService(DEFAULT_AUDIUS_APP);
  }

  return new JamendoService(() => store.getState().clientId);
}