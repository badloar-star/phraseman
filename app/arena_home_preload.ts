import AsyncStorage from '@react-native-async-storage/async-storage';
import { preloadArenaHome } from '../modules/arena/home_preload';
import { arenaLoadHomeWarm, arenaRememberHomeWarm } from '../modules/arena/home_cache';
import { isCurrentAccountGeneration, type AccountGenerationToken } from './account_generation';
import { arenaExpansionHome, arenaV2Home } from './arena_client';

let startedGeneration: number | undefined;

export function startArenaHomePreload(token: AccountGenerationToken): void {
  if (!token.stableId || !isCurrentAccountGeneration(token) || startedGeneration === token.generation) return;
  startedGeneration = token.generation;
  const isCurrent = () => isCurrentAccountGeneration(token);
  void preloadArenaHome({
    isCurrent,
    loadDisk: () => arenaLoadHomeWarm(AsyncStorage, Date.now(), isCurrent),
    fetchHome: arenaV2Home,
    fetchExpansion: arenaExpansionHome,
    remember: value => { arenaRememberHomeWarm({ ...value, wallNowMs: Date.now(), store: AsyncStorage }); },
  }).catch(() => { /* Opening the hub retries failed reads. Startup stays independent. */ });
}

export default function __RouteShim() { return null; }
