/**
 * DEV-состояния Карточек для робот-съёмки: `dev_state?hold=…&fail=…&speech=…&train_gate=…` (R1_SHOT_LIST «нет пути», Н-1…Н-12 в R1_SHOT_LIST_CARDS.md).
 *
 * зачем (координатор 12.10): часть состояний Карточек штатно не воспроизвести — транзиентные загрузки живут доли секунды, локальные источники
 * не падают, микрофона у робота нет, сбои слоя отложенной выдачи тренировки глотает fail-open. Здесь — флаги В ПАМЯТИ процесса (не диск,
 * не Firestore, без сети): точки внедрения в экранах читают геттеры. Перезапуск приложения сбрасывает всё.
 * Только `__DEV__ && !IS_STORE_RELEASE`: в стор-сборке геттеры всегда «выключено», а установка отклоняется. Логи: [DEV-STATE].
 */
import { IS_STORE_RELEASE } from './config';

/** Удержание состояния загрузки до снятия (`hold=off`). */
export const DEV_CARDS_HOLDS = [
  'hub_loading', 'saved_loading', 'catalog_loading', 'setup_loading', 'quota_waiting', 'quota_failed', 'voices_loading', 'swipe_quickstart',
] as const;
export type DevCardsHold = (typeof DEV_CARDS_HOLDS)[number];

/** Искусственный сбой чтения/записи (`fail=off` снимает всё). */
export const DEV_CARDS_FAILS = [
  'saved_load', 'setup_decks', 'recall_load', 'card_write', 'pack_write', 'publish_daily_limit',
] as const;
export type DevCardsFail = (typeof DEV_CARDS_FAILS)[number];

/** «Устно»: что подставить вместо реального микрофона. */
export const DEV_SPEECH_MODES = ['correct', 'wrong', 'denied', 'no_speech', 'unavailable'] as const;
export type DevSpeechMode = (typeof DEV_SPEECH_MODES)[number];

/** Отказ слоя отложенной выдачи тренировки (экраны «Тренировка не открылась» и т. п.). */
export const DEV_TRAIN_GATES = ['fail_blitz', 'fail_speaking', 'fail_swipe_prepare', 'fail_swipe_quota'] as const;
export type DevTrainGate = (typeof DEV_TRAIN_GATES)[number];

const LOG = '[DEV-STATE]';

type State = {
  holds: ReadonlySet<DevCardsHold>;
  fails: ReadonlySet<DevCardsFail>;
  speech: DevSpeechMode | null;
  trainGate: DevTrainGate | null;
};
const EMPTY: State = { holds: new Set(), fails: new Set(), speech: null, trainGate: null };
let state: State = EMPTY;
// зачем (координатор 12.10, «сперва логи», cards-v2-033): подмены живут в памяти процесса и переживают переход на следующую ссылку робота — в журнале старта нужно видеть, когда и какими ключами их выставили
let lastPatch: { atMs: number; keys: string[]; count: number } | null = null;

function devCardsAvailable(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE;
}

/** Выставить флаги. Любое поле необязательно: не переданное не меняется. В стор-сборке — отказ с логом, ничего не меняется. */
export function setDevCardsState(patch: Partial<{ holds: readonly DevCardsHold[]; fails: readonly DevCardsFail[]; speech: DevSpeechMode | null; trainGate: DevTrainGate | null }>): boolean {
  if (!devCardsAvailable()) {
    console.warn(`${LOG} cards: отклонено — не dev-сборка`, { keys: Object.keys(patch) }); // guard-ok: ранний выход логируется
    return false;
  }
  state = {
    holds: patch.holds ? new Set(patch.holds) : state.holds,
    fails: patch.fails ? new Set(patch.fails) : state.fails,
    speech: patch.speech !== undefined ? patch.speech : state.speech,
    trainGate: patch.trainGate !== undefined ? patch.trainGate : state.trainGate,
  };
  lastPatch = { atMs: Date.now(), keys: Object.keys(patch), count: (lastPatch?.count ?? 0) + 1 };
  console.log(`${LOG} cards: ${JSON.stringify({ holds: [...state.holds], fails: [...state.fails], speech: state.speech, trainGate: state.trainGate })}`); // guard-ok: единичный лог на ссылку
  return true;
}

export function isDevCardsHeld(hold: DevCardsHold): boolean {
  return devCardsAvailable() && state.holds.has(hold);
}

export function isDevCardsFail(fail: DevCardsFail): boolean {
  return devCardsAvailable() && state.fails.has(fail);
}

export function getDevSpeechMode(): DevSpeechMode | null {
  return devCardsAvailable() ? state.speech : null;
}

export function getDevTrainGate(): DevTrainGate | null {
  return devCardsAvailable() ? state.trainGate : null;
}

/** Снимок подмен Карточек для журнала [FLASHCARDS-SESSION]: что включено и ОТКУДА (когда и какими ключами выставлено последний раз; null — ссылка с подменами в этом процессе не приходила). */
export function describeDevCardsState(): Record<string, unknown> {
  if (!devCardsAvailable()) return { build: 'store', active: false };
  return {
    build: 'dev',
    trainGate: state.trainGate,
    holds: [...state.holds],
    fails: [...state.fails],
    speech: state.speech,
    source: lastPatch
      ? { via: 'dev_state-ссылка в памяти процесса', patches: lastPatch.count, lastKeys: lastPatch.keys, lastAgoMs: Date.now() - lastPatch.atMs }
      : { via: 'не выставлялись в этом процессе' },
  };
}

/** Фраза, которую «распознал» несуществующий микрофон: верная — сама цель, неверная — заведомо чужие слова. */
export function devSpeechTranscriptFor(targetText: string): string | null {
  const mode = getDevSpeechMode();
  if (mode === 'correct') return targetText;
  if (mode === 'wrong') return 'banana window river';
  return null;
}

/** Только для тестов. */
export function resetDevCardsStateForTests(): void {
  state = EMPTY;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
