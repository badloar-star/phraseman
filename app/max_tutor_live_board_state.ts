// Ephemeral UI state for MAX tutor calls. This module is deliberately pure:
// Realtime tool payloads are untrusted, so validation happens before React
// renders anything and lifecycle events can clear the board deterministically.

export type TutorBoardKind = 'hint' | 'recast' | 'translation';
export type TutorBoardSource = 'learner_request' | 'silence' | 'confident_correction';
export type TutorConversationMode = 'guided' | 'free_talk';

export interface TutorBoardPayload {
  kind: TutorBoardKind;
  targetText: string;
  meaning: string;
  source: TutorBoardSource;
  shownAtMs: number;
  expiresAtMs: number;
}

export interface TutorLiveUiState {
  board: TutorBoardPayload | null;
  currentTopic: string;
  mode: TutorConversationMode;
  notice: { text: string; expiresAtMs: number } | null;
}

export type TutorLiveUiEvent =
  | { type: 'show_board'; board: TutorBoardPayload }
  | { type: 'dismiss_board' }
  | { type: 'speech_started' }
  | { type: 'set_topic'; topic: string; mode: TutorConversationMode; nowMs: number }
  | { type: 'expire'; nowMs: number }
  | { type: 'reconnecting' }
  | { type: 'background' }
  | { type: 'ended' };

export const TUTOR_BOARD_TTL_MS = 12_000;
export const TUTOR_TOPIC_NOTICE_MS = 2_000;
export const TUTOR_BOARD_TARGET_MAX_CHARS = 100;
export const TUTOR_BOARD_MEANING_MAX_CHARS = 140;
export const TUTOR_TOPIC_MAX_CHARS = 80;

const BOARD_KINDS = new Set<TutorBoardKind>(['hint', 'recast', 'translation']);
const BOARD_SOURCES = new Set<TutorBoardSource>([
  'learner_request',
  'silence',
  'confident_correction',
]);

function cleanText(value: unknown, maxChars: number): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxChars);
}

export function normalizeTutorBoard(
  raw: Record<string, unknown>,
  nowMs: number,
): TutorBoardPayload | null {
  const kind = String(raw.kind ?? '') as TutorBoardKind;
  const source = String(raw.source ?? '') as TutorBoardSource;
  const rawTargetText = String(raw.targetText ?? '').replace(/\s+/g, ' ').trim();

  if (!BOARD_KINDS.has(kind) || !BOARD_SOURCES.has(source)) return null;
  if (!rawTargetText || rawTargetText.length > TUTOR_BOARD_TARGET_MAX_CHARS) return null;
  if (kind === 'recast' && source !== 'confident_correction') return null;

  return {
    kind,
    source,
    targetText: rawTargetText,
    meaning: cleanText(raw.meaning, TUTOR_BOARD_MEANING_MAX_CHARS),
    shownAtMs: nowMs,
    expiresAtMs: nowMs + TUTOR_BOARD_TTL_MS,
  };
}

export function initialTutorLiveUiState(topic: string): TutorLiveUiState {
  return {
    board: null,
    currentTopic: cleanText(topic, TUTOR_TOPIC_MAX_CHARS),
    mode: 'guided',
    notice: null,
  };
}

function clearTransient(state: TutorLiveUiState): TutorLiveUiState {
  if (state.board === null && state.notice === null) return state;
  return { ...state, board: null, notice: null };
}

export function reduceTutorLiveUi(
  state: TutorLiveUiState,
  event: TutorLiveUiEvent,
): TutorLiveUiState {
  switch (event.type) {
    case 'show_board':
      return { ...state, board: { ...event.board } };
    case 'dismiss_board':
      return state.board === null ? state : { ...state, board: null };
    case 'set_topic': {
      const topic = cleanText(event.topic, TUTOR_TOPIC_MAX_CHARS);
      if (!topic) return clearTransient(state);
      return {
        ...state,
        board: null,
        currentTopic: topic,
        mode: event.mode,
        notice: {
          text: topic,
          expiresAtMs: event.nowMs + TUTOR_TOPIC_NOTICE_MS,
        },
      };
    }
    case 'expire': {
      const board = state.board && state.board.expiresAtMs <= event.nowMs ? null : state.board;
      const notice = state.notice && state.notice.expiresAtMs <= event.nowMs ? null : state.notice;
      return board === state.board && notice === state.notice ? state : { ...state, board, notice };
    }
    case 'speech_started':
      // Речь ученика убирает только учебную подсказку. Подтверждение новой темы
      // живёт собственные две секунды, иначе быстрый ответ стирает его до того,
      // как ученик успеет увидеть, что MAX действительно переключился.
      return state.board === null ? state : { ...state, board: null };
    case 'reconnecting':
    case 'background':
    case 'ended':
      return clearTransient(state);
    default:
      return state;
  }
}

/* expo-router route shim: files in app/ are treated as routes. */
export default function __RouteShim() {
  return null;
}
