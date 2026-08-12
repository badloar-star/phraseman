// Чистый модуль reconnect-чейна MAX-звонка.
//
// Обрыв линии не должен убивать звонок: фаза 1 — grace 4с при
// iceConnectionState=disconnected (локальный трек мьютится, соединение не
// рвём — мобильные сети часто восстанавливаются сами); фаза 2 — полный
// teardown и ре-минт с reconnectOf. Кап чейна (2 авто + 1 ручной) — защита
// бюджета: reconnect-минты не считаются в rate limit, поэтому без капа
// мигающая сеть могла бы плодить сессии бесконечно.
//
// Reconnect-summary собирается ЛОКАЛЬНО по шаблону, без AI-вызова: это
// хвост instructions нового минта, и лишний сетевой вызов в момент, когда
// сеть уже подвела, только увеличил бы шанс потерять звонок. Кап по
// символам (~300 токенов) держит стабильным кэш-префикс промпта.
//
// Ноль React/native-импортов: модуль детерминирован и покрыт юнит-тестами.

import type { TranscriptTurn } from './max_call_transcript';

/** Фаза 1: столько миллисекунд ждём самовосстановления ICE, ничего не рвя. */
export const RECONNECT_GRACE_MS = 4000;

/** Дефолтный кап summary: ~300 токенов, чтобы не раздувать платный префикс. */
export const RECONNECT_SUMMARY_MAX_CHARS = 1200;

/** Маркер для ИИ при обрыве до первой реплики: восстанавливать нечего. */
export const RECONNECT_EMPTY_MARKER =
  "The line dropped at the very start — restart from 'where were we?'.";

export type ReconnectPhase = 'grace' | 'remint';

/**
 * Фазовый протокол: до истечения grace соединение не трогаем (сеть может
 * вернуться сама), после — единственный путь это ре-минт новой сессии.
 */
export function reconnectPhase(disconnectedForMs: number): ReconnectPhase {
  return disconnectedForMs < RECONNECT_GRACE_MS ? 'grace' : 'remint';
}

export interface ReconnectChainState {
  /** sessionId самой первой сессии чейна — сервер связывает по нему биллинг. */
  rootSessionId: string;
  autoCount: number;
  manualCount: number;
}

export function makeReconnectChain(rootSessionId: string): ReconnectChainState {
  return { rootSessionId, autoCount: 0, manualCount: 0 };
}

/**
 * Авто и ручные попытки считаются раздельно: исчерпанные авто-попытки не
 * должны отнимать у юзера его единственную осознанную кнопку «переподключить».
 */
export function canReconnect(
  chain: ReconnectChainState,
  kind: 'auto' | 'manual',
  caps: { auto: number; manual: number },
): boolean {
  return kind === 'auto' ? chain.autoCount < caps.auto : chain.manualCount < caps.manual;
}

/** Иммутабельно: состояние чейна живёт в ref'е клиента, мутации там опасны. */
export function nextChain(
  chain: ReconnectChainState,
  kind: 'auto' | 'manual',
): ReconnectChainState {
  return {
    rootSessionId: chain.rootSessionId,
    autoCount: chain.autoCount + (kind === 'auto' ? 1 : 0),
    manualCount: chain.manualCount + (kind === 'manual' ? 1 : 0),
  };
}

// Однострочная реплика для шаблона: переносы внутри текста сломали бы
// построчный формат summary, по которому ИИ восстанавливает контекст.
function turnLine(turn: TranscriptTurn): string {
  const label = turn.role === 'assistant' ? 'AI' : 'You';
  let text = turn.text.replace(/\s+/g, ' ').trim();
  // Оборванную barge-in'ом реплику помечаем, если транскрипт ещё не пометил:
  // ИИ не должен «дозачитывать» фразу, которую юзер уже перебил.
  if (turn.interrupted && !text.endsWith('—')) text = `${text} —`;
  return `${label}: ${text}`;
}

/**
 * Шаблонная сборка reconnect-summary БЕЗ AI: закрытые objectives + weak words,
 * которые уже прозвучали (чтобы ИИ не «продавал» их заново), + последние
 * реплики до обрыва. При переполнении капа сначала выкидываем самые старые
 * реплики — свежий контекст ценнее для «continue from where we were».
 */
export function buildReconnectSummary(
  history: TranscriptTurn[],
  opts: {
    objectivesClosed?: string[];
    /** Коррекции (recast'ы), уже вплетённые ИИ до обрыва: после реконнекта их не повторять. */
    correctionsGiven?: string[];
    weakWordsSpoken?: string[];
    maxChars?: number;
  },
): string {
  const maxChars =
    typeof opts.maxChars === 'number' && Number.isFinite(opts.maxChars) && opts.maxChars > 0
      ? Math.floor(opts.maxChars)
      : RECONNECT_SUMMARY_MAX_CHARS;

  const turns = history.filter((t) => t.text.trim().length > 0);
  if (turns.length === 0) return RECONNECT_EMPTY_MARKER;

  const header: string[] = ['[RECONNECT SUMMARY]'];
  const objectives = (opts.objectivesClosed ?? []).filter((o) => o.trim().length > 0);
  if (objectives.length > 0) {
    header.push(`Objectives already completed: ${objectives.join('; ')}.`);
  }
  // Уже данные коррекции: ИИ не должен «продавать» тот же recast второй раз —
  // повторная поправка того же места звучит как придирка и ломает невидимость
  // обучения (спека §7 TEACHING).
  const corrections = (opts.correctionsGiven ?? []).filter((c) => c.trim().length > 0);
  if (corrections.length > 0) {
    header.push(`Corrections already woven in: ${corrections.join('; ')}.`);
  }
  const weakWords = (opts.weakWordsSpoken ?? []).filter((w) => w.trim().length > 0);
  if (weakWords.length > 0) {
    header.push(`Weak words the learner already used: ${weakWords.join(', ')}.`);
  }
  header.push('Last exchanges before the line dropped:');
  const footer =
    "Continue from the learner's last line; do not re-ask what was already answered.";

  // Реплики добавляем от самых свежих к старым, пока влезаем в кап.
  const assemble = (lines: string[]): string =>
    [...header, ...lines, footer].join('\n');
  const included: string[] = [];
  for (let i = turns.length - 1; i >= 0; i--) {
    const candidate = [turnLine(turns[i]), ...included];
    if (assemble(candidate).length > maxChars) break;
    included.unshift(turnLine(turns[i]));
  }

  let result: string;
  if (included.length > 0) {
    result = assemble(included);
  } else {
    // Даже одна реплика не влезла (гигантский монолог или крошечный кап):
    // берём последнюю и жёстко режем — обрыв summary хуже, чем обрыв фразы.
    result = assemble([turnLine(turns[turns.length - 1])]);
  }
  if (result.length > maxChars) {
    result = `${result.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
  }
  return result;
}
