// video_full_story_state.ts — «история» после награды за видео: одна ожидающая история, показывается, когда просмотр закончен/закрыт.
// зачем (владелец 05.11: «макет как будет в истории показываться»; макет video_reward одобрен: история ПОСЛЕ завершения, «+500» и иконка во время просмотра — сразу): награда
// приходит на 70 % посреди ролика — историю посреди видео не показываем. Хук просмотра ставит ролик в ожидание (pending) в момент награды и «готовность» (ready), когда
// видео закончилось/остановилось/экран закрыт. Хост истории (VideoRewardStoryHost) показывает окно, когда есть pending И ready; показ — один раз на ролик.
import { onAccountOwnerChanged } from './account_owner_change';

const LOG = '[VIDEO-FULL-STORY]';

type StoryState = Readonly<{ videoId: string; amount: number; ready: boolean }>;
let state: StoryState | null = null;
const shown = new Set<string>();
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((l) => { try { l(); } catch (e) { console.warn(LOG, 'listener_failed', String((e as Error)?.message ?? e).slice(0, 80)); } });
}

// зачем (F17, аудит, владелец 11.11): «показано» считалось по ролику без игрока — B, получив свою награду за тот же ролик,
// историю «+500» не видел; а ожидающая история A могла открыться у B.
onAccountOwnerChanged('video_full_story', () => {
  console.log(LOG, 'owner_changed', JSON.stringify({ droppedPending: state?.videoId ?? null, shownCleared: shown.size })); // guard-ok: одна строка на смену владельца
  state = null;
  shown.clear();
  notify();
});

export function queueVideoFullStory(videoId: string, amount: number): void {
  if (shown.has(videoId)) { console.log(LOG, 'queue_skip already_shown', videoId); return; } // guard-ok: история один раз на ролик за запуск
  if (state?.videoId === videoId) { console.log(LOG, 'queue_skip already_queued', videoId); return; } // guard-ok: повтор
  state = { videoId, amount, ready: false };
  console.log(LOG, 'queued', JSON.stringify({ videoId, amount })); // guard-ok: итог
  notify();
}

/** Просмотр закончился/остановился/экран закрыт — историю можно показывать. */
export function markVideoFullStoryReady(videoId: string, why: string): void {
  if (!state || state.videoId !== videoId) { console.log(LOG, 'ready_skip', JSON.stringify({ videoId, why, queued: state?.videoId ?? null })); return; } // guard-ok: нет такой истории
  if (state.ready) return;
  state = { ...state, ready: true };
  console.log(LOG, 'ready', JSON.stringify({ videoId, why })); // guard-ok: итог
  notify();
}

/** Видео снова играет — историю прячем до следующей остановки (если успела стать готовой). */
export function holdVideoFullStory(videoId: string): void {
  if (!state || state.videoId !== videoId || !state.ready) return;
  state = { ...state, ready: false };
  notify();
}

export function peekVideoFullStory(): StoryState | null {
  return state && state.ready ? state : null;
}

export function dismissVideoFullStory(): void {
  if (!state) return;
  shown.add(state.videoId);
  console.log(LOG, 'dismissed', state.videoId); // guard-ok: итог
  state = null;
  notify();
}

export function subscribeVideoFullStory(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function __resetVideoFullStoryForTests(): void { state = null; shown.clear(); listeners.clear(); }

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
