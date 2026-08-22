/**
 * Display-only pacing for MAX live captions.
 *
 * Canonical transcript history is owned by max_call_transcript.ts. This reducer
 * may delay what the learner sees, but it must never delay or mutate history.
 */

export interface LiveCaptionState {
  itemId: string | null;
  fullText: string;
  visibleText: string;
  visibleEnd: number;
  playing: boolean;
  /** Item whose remote audio already ended; late deltas for it must publish now. */
  stoppedItemId: string | null;
  complete: boolean;
  cancelled: boolean;
  /** Полная завершённая реплика для одного screen-reader announcement. */
  announcementText: string;
  announcedItemId: string | null;
}

export type LiveCaptionEvent =
  | { type: 'assistant_delta'; itemId: string; delta: string }
  | { type: 'assistant_done'; itemId: string }
  | { type: 'audio_started' }
  | { type: 'tick' }
  | { type: 'audio_stopped' }
  | { type: 'audio_cleared' | 'reconnect' | 'end' | 'fail' }
  | { type: 'reset' };

export const LIVE_CAPTION_INITIAL: LiveCaptionState = Object.freeze({
  itemId: null,
  fullText: '',
  visibleText: '',
  visibleEnd: 0,
  playing: false,
  stoppedItemId: null,
  complete: false,
  cancelled: false,
  announcementText: '',
  announcedItemId: null,
});

const MIN_CHUNK_WORDS = 2;
const MAX_CHUNK_WORDS = 5;

interface CaptionToken {
  end: number;
  text: string;
}

function stableTokens(text: string, from: number, complete: boolean): CaptionToken[] {
  const tail = text.slice(from);
  const matches = [...tail.matchAll(/\S+\s*/gu)];
  if (!complete && matches.length > 0 && !/[\s.!?…,:;]$/u.test(tail)) {
    matches.pop();
  }
  return matches.map((match) => ({
    text: match[0],
    end: from + (match.index ?? 0) + match[0].length,
  }));
}

function nextChunkEnd(state: LiveCaptionState): number {
  const tokens = stableTokens(state.fullText, state.visibleEnd, state.complete);
  if (tokens.length < MIN_CHUNK_WORDS) {
    return state.complete ? (tokens[tokens.length - 1]?.end ?? state.visibleEnd) : state.visibleEnd;
  }

  const limit = Math.min(MAX_CHUNK_WORDS, tokens.length);
  for (let index = 0; index < limit - 1; index += 1) {
    if (/[.!?…,:;]\s*$/u.test(tokens[index]?.text ?? '')) {
      const boundaryIndex = Math.max(MIN_CHUNK_WORDS - 1, index);
      return tokens[boundaryIndex]?.end ?? state.visibleEnd;
    }
  }
  return tokens[limit - 1]?.end ?? state.visibleEnd;
}

export function liveCaptionChunkDelayMs(chunk: string): number {
  const wordCount = chunk.trim() === '' ? 0 : chunk.trim().split(/\s+/u).length;
  return Math.min(1_100, Math.max(420, wordCount * 210));
}

export function reduceLiveCaption(
  state: LiveCaptionState,
  event: LiveCaptionEvent,
): LiveCaptionState {
  switch (event.type) {
    case 'assistant_delta': {
      if (event.delta === '') return state;
      if (state.itemId !== event.itemId) {
        return {
          ...LIVE_CAPTION_INITIAL,
          itemId: event.itemId,
          fullText: event.delta,
          playing: state.playing,
        };
      }
      if (state.complete || state.cancelled) return state;
      const fullText = state.fullText + event.delta;
      return { ...state, fullText };
    }
    case 'assistant_done': {
      if (state.itemId !== event.itemId || state.complete) return state;
      const shouldAnnounce = state.stoppedItemId === event.itemId
        && state.announcedItemId !== event.itemId;
      return {
        ...state,
        complete: true,
        ...(shouldAnnounce
          ? { announcementText: state.fullText.trim(), announcedItemId: event.itemId }
          : {}),
      };
    }
    case 'audio_started':
      // Keep `cancelled` until a genuinely new item arrives: otherwise the
      // immediate tick scheduled for audio start could reveal stale words.
      // `playing` still advances, so the new item's first delta inherits the
      // active audio epoch even when audio_started precedes transcript data.
      return state.playing
        ? state
        : { ...state, playing: true, stoppedItemId: null };
    case 'tick': {
      if (!state.playing || state.cancelled) return state;
      const visibleEnd = nextChunkEnd(state);
      if (visibleEnd === state.visibleEnd) return state;
      return {
        ...state,
        visibleEnd,
        visibleText: state.fullText.slice(0, visibleEnd).trim(),
      };
    }
    case 'audio_stopped':
      if (state.cancelled) return state;
      if (
        !state.playing
        && state.stoppedItemId === state.itemId
        && (!state.complete || state.announcedItemId === state.itemId)
      ) return state;
      return {
        ...state,
        playing: false,
        stoppedItemId: state.itemId,
        ...(state.complete && state.itemId !== null && state.announcedItemId !== state.itemId
          ? { announcementText: state.fullText.trim(), announcedItemId: state.itemId }
          : {}),
      };
    case 'audio_cleared':
    case 'reconnect':
    case 'end':
    case 'fail':
      return state.cancelled && !state.playing
        ? state
        : {
            ...state,
            playing: false,
            stoppedItemId: null,
            cancelled: true,
            announcementText: '',
            announcedItemId: null,
          };
    case 'reset':
      return LIVE_CAPTION_INITIAL;
    default:
      return state;
  }
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
