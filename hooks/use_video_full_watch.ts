// use_video_full_watch.ts — следит за просмотром ролика и на 70 % запускает ОДНО событие «досмотрел»: пометка «просмотрено» + награда +500 + история.
// зачем (владелец 05.11: «за каждое видео за фулл просмотр давать 500 монеток; при завершении иконка и начисление +500 сразу»; порог 70 % накопленного просмотра без перемотки; повтор не даёт):
// позицию шлёт плеер раз в секунду только пока видео играет (youtube_player_seek_bus) — отдельного опроса нет. Начисление — оптимистично (журнал кошелька на телефоне, баланс в шапке растёт сразу);
// `flashKey` растёт на каждую выданную награду — экран показывает иконку «+500» (VideoRewardFlash). История идёт в очередь и показывается, когда просмотр остановился/закрыт.
import { useEffect, useRef, useState } from 'react';
import { subscribeYoutubePosition } from '../app/youtube_player_seek_bus';
import { createVideoFullState, feedVideoFullTick, videoFullEligibility, videoFullTarget, type VideoFullState } from '../app/video_full_watch';
import { videoRewardMilestoneFor, videoRewardProgressPercent } from '../app/video_reward_progress'; // зачем (владелец 06.11): шкала «до +500» под видео из того же накопленного времени
import { VIDEO_FULL_REWARD_COINS, grantVideoFullReward } from '../app/video_full_reward';
import { markVideoWatched } from '../app/home_video_watched'; // зачем (Дизайн 05.11): лента Главной читает эту же память «досмотрено»; моё событие «70 %» её и пишет
import { holdVideoFullStory, markVideoFullStoryReady, queueVideoFullStory } from '../app/video_full_story_state';
import { isVideoFullRewardEnabled } from './use_video_full_rewarded';

const LOG = '[VIDEO-FULL]';
/** Тиков нет столько мс после награды — видео остановлено/закончено: историю можно показывать. */
const STALL_MS = 2800;

type Input = Readonly<{ videoId: string | null | undefined; durationSec?: number | null; live?: boolean; active?: boolean }>;

/** progressPct — шкала для человека (70 % реального просмотра = 100); null — просмотр не засчитывается (live/короткий/нет длительности/флаг выключен) или ещё не было тика. */
export function useVideoFullWatch({ videoId, durationSec, live = false, active = true }: Input): Readonly<{ flashKey: number; progressPct: number | null }> {
  const [flashKey, setFlashKey] = useState(0);
  const [progressPct, setProgressPct] = useState<number | null>(null);
  const lastShownRef = useRef<{ pct: number; atMs: number } | null>(null);
  const milestoneRef = useRef(new Set<number>());
  const stateRef = useRef<VideoFullState | null>(null);
  const stallRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!videoId || !active) return undefined;
    // смена ролика — шкала и отметки журнала начинаются заново
    if (stateRef.current && stateRef.current.videoId !== videoId) { lastShownRef.current = null; milestoneRef.current = new Set(); setProgressPct(null); }
    if (!isVideoFullRewardEnabled()) { console.log(LOG, 'watch_off flag_disabled', videoId); return undefined; } // guard-ok: ранний выход называет причину
    const eligibility = videoFullEligibility(durationSec, live);
    if (eligibility !== 'ok' || typeof durationSec !== 'number') { console.log(LOG, 'watch_skip', JSON.stringify({ videoId, reason: eligibility, durationSec: durationSec ?? null, live })); return undefined; } // guard-ok: без длительности/лайвы/короткие — не засчитываем
    if (!stateRef.current || stateRef.current.videoId !== videoId) stateRef.current = createVideoFullState(videoId, durationSec);
    console.log(LOG, 'watch_start', JSON.stringify({ videoId, durationSec, accumulatedSec: Math.round(stateRef.current.accumulatedSec), reached: stateRef.current.reached })); // guard-ok: вход
    const clearStall = () => { if (stallRef.current) { clearTimeout(stallRef.current); stallRef.current = null; } };
    // зачем (владелец 06.11: «обновлять не чаще 1 раза в секунду»): процент уходит в состояние только при изменении и не чаще раза в секунду (100 % — сразу); журнал — на 0/25/50/75/100 один раз
    const publishProgress = (pct: number, nowMs: number) => {
      const last = lastShownRef.current;
      if (last && last.pct === pct) return;
      if (last && pct < 100 && nowMs - last.atMs < 1000) return;
      lastShownRef.current = { pct, atMs: nowMs };
      setProgressPct(pct);
      const mark = videoRewardMilestoneFor(pct);
      if (!milestoneRef.current.has(mark)) { milestoneRef.current.add(mark); console.log('[VIDEO-REWARD-PROGRESS]', JSON.stringify({ videoId, milestone: mark, pct, durationSec })); } // guard-ok: отметки 0/25/50/75/100
    };
    const armStall = () => { clearStall(); stallRef.current = setTimeout(() => markVideoFullStoryReady(videoId, 'stalled'), STALL_MS); };

    const unsubscribe = subscribeYoutubePosition(videoId, (positionSec) => {
      const current = stateRef.current;
      if (!current) return;
      if (current.reached) { publishProgress(100, Date.now()); holdVideoFullStory(videoId); armStall(); return; } // видео снова идёт — историю прячем до остановки
      const tick = feedVideoFullTick(current, positionSec, Date.now());
      stateRef.current = tick.state;
      publishProgress(videoRewardProgressPercent(tick.state.accumulatedSec, videoFullTarget(durationSec)), Date.now());
      if (tick.action === 'seek_forward' || tick.action === 'seek_back') console.log(LOG, 'tick', JSON.stringify({ videoId, action: tick.action, positionSec: Math.round(positionSec), accumulatedSec: Math.round(tick.state.accumulatedSec) })); // guard-ok: перемотка не копится
      if (!tick.justReached) return;
      console.log(LOG, 'reached_70', JSON.stringify({ videoId, durationSec, accumulatedSec: Math.round(tick.state.accumulatedSec) })); // guard-ok: порог достигнут
      void markVideoWatched(videoId);
      void grantVideoFullReward(videoId).then((outcome) => {
        console.log(LOG, 'reward_outcome', JSON.stringify({ videoId, outcome })); // guard-ok: итог
        if (outcome !== 'granted') return; // повтор / нет аккаунта / ошибка — иконки и истории нет
        setFlashKey((n) => n + 1);
        queueVideoFullStory(videoId, VIDEO_FULL_REWARD_COINS);
        armStall();
      }, (error: unknown) => {
        console.warn(LOG, 'reward_failed', JSON.stringify({ videoId, reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch пишет причину
      });
    });
    return () => {
      unsubscribe();
      clearStall();
      // экран закрыт/ролик сменился — если награда была, историю можно показывать
      if (stateRef.current?.reached) markVideoFullStoryReady(videoId, 'closed');
    };
  }, [videoId, durationSec, live, active]);

  return { flashKey, progressPct };
}
