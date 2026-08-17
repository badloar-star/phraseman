/**
 * Режим «Говорить» раздела «Карточки» — чистая логика сессии.
 *
 * зачем (владелец, 2026-08-17): «в разделе карточки в отработке есть блиц и
 * слушать — надо ещё речь, чтобы карточки можно было отрабатывать говоря».
 * Экран `app/flashcards_speaking_session.tsx` показывает перевод карточки, человек
 * зажимает микрофон и произносит фразу по-английски; оценку даёт `SpeakingPanel`
 * (тот же движок, что «Устно» в уроках и тренажёре). Здесь — только состояние
 * очереди и подсчёт итога, без React и нативных модулей (юнит-тесты:
 * tests/fc_speaking_session_logic.test.ts).
 *
 * Правило очереди — общее для раздела (`session_queue.ts`, §3.5 мастер-плана):
 * не сдал карточку → она уходит в конец очереди, максимум 2 повтора за сессию.
 */
import type { DeckCard } from './deck_sources';
import {
  requeueAfterMistake,
  summarizeSession,
  type SessionAnswerEvent,
  type SessionOutcomeSummary,
} from './session_queue';

/** Один зачёт → сразу дальше; пауза даёт увидеть звёзды и раскрытую фразу. */
export const SPEAKING_AUTO_ADVANCE_MS = 1100;

// ── Настройки fc_speaking_prefs_v1 ───────────────────────────────────────────

export const FC_SPEAKING_PREFS_KEY = 'fc_speaking_prefs_v1';

/**
 * Тип задания (типы 2 и 1 плана говорильной дорожки Learning V2,
 * docs/v2/SPEAKING_TRACK_PLAN_2026-08-17.md):
 *  • `recall` — «Скажи по-английски»: виден только перевод, английский скрыт;
 *  • `repeat` — «Повтори за диктором»: английский показан и озвучен.
 */
export type SpeakingTask = 'recall' | 'repeat';
export const SPEAKING_TASKS: readonly SpeakingTask[] = ['recall', 'repeat'];
export type SpeakingPrefs = { task: SpeakingTask };
export const DEFAULT_SPEAKING_PREFS: SpeakingPrefs = { task: 'recall' };

/** Толерантный парсинг настроек (битое/чужое — дефолт). */
export function parseSpeakingPrefs(raw: string | null | undefined): SpeakingPrefs {
  if (!raw || !raw.trim()) return DEFAULT_SPEAKING_PREFS;
  try {
    const p = JSON.parse(raw) as Record<string, unknown>;
    if (!p || typeof p !== 'object' || Array.isArray(p)) return DEFAULT_SPEAKING_PREFS;
    const task = SPEAKING_TASKS.includes(p.task as SpeakingTask)
      ? (p.task as SpeakingTask)
      : DEFAULT_SPEAKING_PREFS.task;
    return { task };
  } catch {
    return DEFAULT_SPEAKING_PREFS;
  }
}

/** Оценка попытки от SpeakingPanel (`onScore`). */
export type SpeakingAttempt = { score: number; passed: boolean };

/**
 * Что показывает экран под карточкой:
 *  • `idle`     — ждём удержания микрофона;
 *  • `live`     — идёт запись/оценка (панель говорения смонтирована);
 *  • `scored`   — есть результат попытки: звёзды + «Ещё раз» / «Дальше».
 */
export type SpeakingPhase = 'idle' | 'live' | 'scored';

export type SpeakingSessionState = {
  /** Очередь карточек: текущая — `queue[index]`, повторы дописываются в хвост. */
  queue: DeckCard[];
  index: number;
  /** Сколько раз карточка уже уходила в повтор (кэп в session_queue). */
  repeatCounts: Record<string, number>;
  events: SessionAnswerEvent[];
  phase: SpeakingPhase;
  /** Последняя оценка на текущей карточке (null — ещё не говорил). */
  attempt: SpeakingAttempt | null;
  /** Сколько попыток сделано на текущей карточке (для «нечётко» — не наказываем сразу). */
  attemptsOnCard: number;
  finished: boolean;
};

export function initialSpeakingState(cards: readonly DeckCard[]): SpeakingSessionState {
  return {
    queue: [...cards],
    index: 0,
    repeatCounts: {},
    events: [],
    phase: 'idle',
    attempt: null,
    attemptsOnCard: 0,
    finished: cards.length === 0,
  };
}

export function currentSpeakingCard(s: SpeakingSessionState): DeckCard | null {
  return s.finished ? null : (s.queue[s.index] ?? null);
}

/** Прогресс «N / всего» — считаем по исходному размеру плюс дописанные повторы. */
export function speakingProgress(s: SpeakingSessionState): { position: number; total: number } {
  const total = Math.max(1, s.queue.length);
  return { position: Math.min(s.index + 1, total), total };
}

/** Микрофон зажат — панель говорения оживает. Из `scored` можно говорить снова. */
export function beginSpeakingAttempt(s: SpeakingSessionState): SpeakingSessionState {
  if (s.finished || s.phase === 'live') return s;
  return { ...s, phase: 'live', attempt: null };
}

/**
 * Панель вернула оценку. Журнал событий пишем СРАЗУ (каждая попытка — событие,
 * как в блице/тренажёре: точность считается по попыткам), решение «дальше или
 * повтор» принимает `advanceSpeaking`.
 */
export function scoreSpeakingAttempt(
  s: SpeakingSessionState,
  attempt: SpeakingAttempt,
): SpeakingSessionState {
  const card = currentSpeakingCard(s);
  if (!card || s.phase !== 'live') return s;
  return {
    ...s,
    phase: 'scored',
    attempt,
    attemptsOnCard: s.attemptsOnCard + 1,
    events: [...s.events, { key: card.id, correct: attempt.passed }],
  };
}

/** Запись сорвалась (нет речи / отказ движка) — возвращаемся к ожиданию без штрафа. */
export function cancelSpeakingAttempt(s: SpeakingSessionState): SpeakingSessionState {
  if (s.phase !== 'live') return s;
  return { ...s, phase: 'idle' };
}

/**
 * «Дальше» после оценки (или автопереход после зачёта).
 * Не сдал → карточка дописывается в конец очереди (кэп повторов — session_queue),
 * так фраза вернётся ещё раз до конца сессии. Пропуск без попытки (`skip`) —
 * тоже «не сдал»: иначе можно было бы прокликать сессию насквозь.
 *
 * `force` — хост уже знает, что фаза 'live' мертва (SpeakingPanel уткнулась в
 * статус без внутреннего выхода — не расслышал / завис движок / нет доступа
 * к микрофону / устройство не распознаёт речь) и держит панель на экране
 * только чтобы показать причину, а не потому что запись всё ещё идёт. Без
 * `force` обычный live честно блокирует «Дальше» — гонка с ещё звучащей
 * попыткой недопустима.
 */
export function advanceSpeaking(
  s: SpeakingSessionState,
  opts?: { skip?: boolean; force?: boolean },
): SpeakingSessionState {
  const card = currentSpeakingCard(s);
  if (!card || (s.phase === 'live' && !opts?.force)) return s;
  const passed = !opts?.skip && s.attempt?.passed === true;
  let queue = s.queue;
  let repeatCounts = s.repeatCounts;
  let events = s.events;
  if (!passed) {
    const requeued = requeueAfterMistake(s.queue, card, card.id, s.repeatCounts);
    queue = requeued.queue;
    repeatCounts = requeued.repeatCounts;
    // Пропуск без единой попытки — честная ошибка в журнале (для «Ещё учу»).
    if (opts?.skip && s.attempt === null) events = [...events, { key: card.id, correct: false }];
  }
  const nextIndex = s.index + 1;
  const finished = nextIndex >= queue.length;
  return {
    ...s,
    queue,
    repeatCounts,
    events,
    index: finished ? s.index : nextIndex,
    phase: 'idle',
    attempt: null,
    attemptsOnCard: 0,
    finished,
  };
}

/** Итог для SessionResultScreen. */
export function summarizeSpeaking(s: SpeakingSessionState): SessionOutcomeSummary {
  return summarizeSession(s.events);
}

/**
 * Второй раунд «Добить»: только карточки, которые хоть раз не сдал, в порядке
 * первого появления. Пустой список — добивать нечего.
 */
export function speakingRetryCards(s: SpeakingSessionState): DeckCard[] {
  const learn = new Set(summarizeSession(s.events).learnKeys);
  const seen = new Set<string>();
  const out: DeckCard[] = [];
  for (const card of s.queue) {
    if (!learn.has(card.id) || seen.has(card.id)) continue;
    seen.add(card.id);
    out.push(card);
  }
  return out;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
