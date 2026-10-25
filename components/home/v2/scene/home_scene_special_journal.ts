// ═══════════════════════════════════════════════════════════════════════════
// home_scene_special_journal.ts — журнал показов особых сцен Главной на телефоне (AsyncStorage, на сервер не уходит).
//
// зачем (спецификация docs/work/tasks/home-scene-new-states-spec-2026-10-25.md: «Журнал показов — локально»): правила
// «одна в день», «не два дня подряд» и частоты держатся на этом журнале. Память — сразу (Главная не ждёт диска),
// диск догоняет фоном. Ошибка чтения/записи не роняет сцену: пустой журнал = особые сцены просто разрешены.
// Журнал [HOME-SCENE]: откуда журнал (память/диск/пусто), что записали, каждая ошибка с причиной.
// ═══════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DebugLogger } from '../../../../app/debug-logger';
import {
  HOME_SCENE_SPECIAL_EMPTY_JOURNAL,
  parseHomeSceneSpecialJournal,
  recordHomeSceneSpecialShown,
  type HomeSceneSpecialJournal,
  type HomeSceneSpecialState,
} from './home_scene_special';

const LOG = '[HOME-SCENE]';
export const HOME_SCENE_SPECIAL_JOURNAL_KEY = 'home_scene_special_journal_v1';

let memory: HomeSceneSpecialJournal | null = null;
let loading: Promise<HomeSceneSpecialJournal> | null = null;

/** Журнал, если уже в памяти (первый кадр Главной), иначе null — тогда особую сцену решаем после readHomeSceneSpecialJournal. */
export function peekHomeSceneSpecialJournal(): HomeSceneSpecialJournal | null {
  return memory;
}

export function readHomeSceneSpecialJournal(): Promise<HomeSceneSpecialJournal> {
  if (memory) return Promise.resolve(memory);
  if (loading) return loading;
  loading = AsyncStorage.getItem(HOME_SCENE_SPECIAL_JOURNAL_KEY)
    .then((raw) => {
      const parsed = raw ? parseHomeSceneSpecialJournal(JSON.parse(raw)) : HOME_SCENE_SPECIAL_EMPTY_JOURNAL;
      // зачем: запись могла случиться, пока читали диск — свежая память главнее прочитанного
      memory = memory ?? parsed;
      DebugLogger.info(LOG, `особые сцены: журнал с диска=${raw ? 'есть' : 'пусто'} last=${parsed.last ? `${parsed.last.state}@${parsed.last.day}` : '—'}`); // guard-ok
      return memory;
    })
    .catch((error: unknown) => {
      DebugLogger.warn(LOG, `особые сцены: журнал не прочитался → пустой (${error instanceof Error ? error.message : String(error)})`); // guard-ok
      memory = memory ?? HOME_SCENE_SPECIAL_EMPTY_JOURNAL;
      return memory;
    })
    .finally(() => { loading = null; });
  return loading;
}

/** Отметить показ: память сразу, диск фоном. Повтор в тот же день — без записи. */
export function noteHomeSceneSpecialShown(state: HomeSceneSpecialState, key: string | null, now: Date = new Date()): HomeSceneSpecialJournal {
  const prev = memory ?? HOME_SCENE_SPECIAL_EMPTY_JOURNAL;
  const next = recordHomeSceneSpecialShown(prev, state, key, now);
  if (next === prev) return prev;
  memory = next;
  DebugLogger.info(LOG, `особые сцены: показ ${state}${key ? ` key=${key}` : ''} @${next.last?.day ?? '—'}`); // guard-ok
  AsyncStorage.setItem(HOME_SCENE_SPECIAL_JOURNAL_KEY, JSON.stringify(next)).catch((error: unknown) => {
    DebugLogger.warn(LOG, `особые сцены: журнал не записался — только в памяти (${error instanceof Error ? error.message : String(error)})`); // guard-ok
  });
  return next;
}

export function __resetHomeSceneSpecialJournalForTests(): void {
  memory = null;
  loading = null;
}
