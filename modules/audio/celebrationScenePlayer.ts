/**
 * celebrationScenePlayer — многоканальный проигрыватель звуков сцен
 * празднования покупки. КАЖДЫЙ звук доигрывает полностью, не обрезая соседний.
 *
 * зачем отдельно от soundDirector (владелец 2026-08-25: «звук не надо резать,
 * они должны доигрывать»): soundDirector — ОДИН общий канал на всё
 * приложение (modules/audio/expo_sfx_backend.ts, ExpoSfxBackend.play()
 * вызывает this.stop() первой строкой). Это верно для обычных UI-сигналов
 * (новый тап должен прервать старый), но ломает последовательность сцен
 * празднования: шаг между сценами (SCENE_STEP_MS=780мс,
 * components/premium_celebration/celebrationScenes.ts) короче длины самих
 * звуков (900-1200мс) — каждый следующий звук через общий канал обрубал
 * предыдущий на полуслове.
 *
 * Решение — тот же паттерн, что уже применён для фоновой подложки
 * (celebrationBackgroundPlayer.ts): свой независимый AudioPlayer на каждый
 * вызов, никакого общего "текущего" слота. Несколько коротких звуков сцен
 * могут недолго звучать внахлёст на стыке (последние 100-200мс уходящего
 * поверх первых мс нового) — это НАМНОГО лучше обрыва на середине слова.
 *
 * Громкости и source берутся из того же SOUND_EVENTS, что и soundDirector —
 * единственный источник правды, не дублируем require() второй раз.
 */
import { createAudioPlayer } from 'expo-audio';
import { SOUND_EVENTS, type SoundEventId } from './sound_events';
import {
  acquireCelebrationAudioSession,
  registerCelebrationSceneRevoker,
} from './celebrationBackgroundPlayer';

type PlayerLike = {
  volume: number;
  play(): void;
  pause(): void;
  remove(): void;
};

// зачем: живые плееры сцен текущего показа — чтобы модалка могла заглушить
// ВСЕ недоигравшие звуки разом при резком закрытии (не при штатном финале,
// там они тоже пусть доиграют естественно, как и фон).
const liveScenePlayers = new Map<PlayerLike, { cleanupTimer: ReturnType<typeof setTimeout>; releaseSession: () => void }>();

function disposePlayer(player: PlayerLike): void {
  try { player.pause(); } catch (e) {
      // native player may already be released
      console.warn('[silent-catch] celebrationScenePlayer:disposePlayer', e instanceof Error ? e.message : String(e));
    }
  try { player.remove(); } catch (e) {
      // native player may already be released
      console.warn('[silent-catch] celebrationScenePlayer:disposePlayer', e instanceof Error ? e.message : String(e));
    }
}

/**
 * Проиграть один звук сцены до конца, не трогая уже играющие. eventId — ключ
 * из SOUND_EVENTS вида 'pm.celebration.energy_break'.
 */
export function playCelebrationSceneSound(eventId: SoundEventId): void {
  const def = SOUND_EVENTS[eventId];
  if (!def || !def.source) return;
  const releaseSession = acquireCelebrationAudioSession();
  if (!releaseSession) return;
  let player: PlayerLike | null = null;
  try {
    player = createAudioPlayer(def.source) as unknown as PlayerLike;
    player.volume = Math.max(0, Math.min(1, def.volume));
    const currentPlayer = player;
    const cleanupTimer = setTimeout(() => {
      const live = liveScenePlayers.get(currentPlayer);
      liveScenePlayers.delete(currentPlayer);
      live?.releaseSession();
      disposePlayer(currentPlayer);
    }, def.durationMs + 400);
    liveScenePlayers.set(currentPlayer, { cleanupTimer, releaseSession });
    currentPlayer.play(); // guard-ok: локальный синхронный аудио-плеер, не сетевой запрос/запись данных
    // Самоочистка чуть позже заявленной длины — надёжнее подписки на события
    // плеера (та же осторожность, что в expo_sfx_backend.ts: рантайм не всегда
    // шлёт статусы вовремя), и нам не нужен onEnded-колбэк, только уборка Set.
  } catch {
    // зачем: звук сцены декоративный — молчаливый сбой безопаснее, чем
    // уронить анимацию из-за недоступного аудио-движка.
    if (player) {
      const live = liveScenePlayers.get(player);
      if (live) clearTimeout(live.cleanupTimer);
      liveScenePlayers.delete(player);
      live?.releaseSession();
      disposePlayer(player);
    } else releaseSession();
  }
}

/**
 * Резко заглушить ВСЕ недоигравшие звуки сцен — только для аварийного выхода
 * (человек ушёл с экрана посреди прогона). При штатном закрытии/финале НЕ
 * вызывать: звуки должны доиграть сами, как и фон (letCelebrationBackgroundFinish).
 */
export function stopAllCelebrationSceneSounds(): void {
  for (const [player, live] of liveScenePlayers) {
    clearTimeout(live.cleanupTimer);
    live.releaseSession();
    disposePlayer(player);
  }
  liveScenePlayers.clear();
}

registerCelebrationSceneRevoker(stopAllCelebrationSceneSounds);

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
