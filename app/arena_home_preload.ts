import AsyncStorage from '@react-native-async-storage/async-storage';
import { preloadArenaHome } from '../modules/arena/home_preload';
import { arenaLoadHomeWarmForTarget, arenaRememberHomeWarmForTarget } from '../modules/arena/home_cache';
import type { ArenaStudyTarget } from '../modules/arena/target_registry';
import { isCurrentAccountGeneration, type AccountGenerationToken } from './account_generation';
import { arenaExpansionHome, arenaV2Home } from './arena_client';

let startedScope: string | undefined;

export function startArenaHomePreload(token: AccountGenerationToken, studyTarget: ArenaStudyTarget): void {
  const scope = `${token.generation}:${studyTarget}`;
  if (!token.stableId || !isCurrentAccountGeneration(token) || startedScope === scope) return;
  startedScope = scope;
  const isCurrent = () => isCurrentAccountGeneration(token);
  void preloadArenaHome({
    isCurrent,
    loadDisk: () => arenaLoadHomeWarmForTarget(AsyncStorage, Date.now(), studyTarget, isCurrent),
    fetchHome: () => arenaV2Home(studyTarget),
    fetchExpansion: () => arenaExpansionHome(studyTarget),
    remember: value => { arenaRememberHomeWarmForTarget({ ...value, studyTarget, wallNowMs: Date.now(), store: AsyncStorage }); },
  }).catch(() => { /* Opening the hub retries failed reads. Startup stays independent. */ });
}

export default function __RouteShim() { return null; }
