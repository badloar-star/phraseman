/**
 * Ускорение энергии за просмотр видео: склейка «сигнал плеера → подтяжка таймера».
 *
 * Numeric energy: во время фактического проигрывания скорость равна 100/час,
 * то есть +1 каждые 36 секунд. Частичный просмотр сохраняется между flush,
 * паузой и размонтированием.
 *
 * Кому даём: только тем, у кого лимит энергии реально есть. У Plus/Pro энергия
 * безлимитная — им ускорять нечего, и значок им не показываем, иначе он обещал
 * бы то, что для них бессмысленно.
 *
 * Время просмотра заменяет пассивный темп для того же окна, поэтому один и тот
 * же интервал никогда не засчитывается дважды.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useEnergy } from '../components/EnergyContext';
import {
  creditVideoWatchSegment,
  initialVerifiedPlaybackState,
  measureVerifiedPlaybackProgress,
  type VerifiedPlaybackSample,
} from '../app/energy_video_watch_credit';
import {
  claimVideoWatchRuneSession,
  reportVideoWatchRuneProgress,
  startVideoWatchRuneSession,
  VIDEO_WATCH_RUNES_DAILY_CAP,
  VIDEO_WATCH_RUNES_PER_MINUTE,
} from '../app/video_watch_runes_client';
import { captureAccountGeneration } from '../app/account_generation';
import { DebugLogger } from '../app/debug-logger';
import { applySuperSundayRuneMultiplier } from '../modules/economy/super_sunday_runes';

/**
 * Один flush на точный шаг начисления: число обновляется раз в 36 секунд, а
 * остаток короче шага сохраняется при паузе/закрытии.
 */
const VIDEO_WATCH_CREDIT_FLUSH_MS = 36 * 1000;

/**
 * Сквозная трассировка рун за просмотр (владелец 2026-09-21: «нет начисления рун
 * во время просмотра»).
 *
 * зачем НЕ под `__DEV__`: прежние три лога этой ветки были в `__DEV__` и в
 * прод-сборку не попадали — «руны не капают» не оставляло ни строчки, и диагноз
 * приходилось угадывать. Правило владельца «сперва логи, потом починка»: лог
 * обязан показать вход, КАЖДОЕ ветвление со значением, которое его решило,
 * каждый ранний выход и каждый catch.
 */
function runeTrace(step: string, payload: Readonly<Record<string, unknown>>): void {
  try {
    console.log(`[VIDEO-RUNES] ${step} ${JSON.stringify(payload)}`);
  } catch (error: unknown) {
    // Немой catch запрещён: несериализуемое поле не должно глушить всю трассу.
    console.log(`[VIDEO-RUNES] ${step} trace_serialize_failed`, // guard-ok: причина обязана попасть в журнал
      error instanceof Error ? `${error.name}: ${error.message}` : String(error));
  }
}

export type VideoWatchEnergyBoost = {
  /** Показывать ли значок ускорения энергии (видео идёт И лимит энергии есть). */
  boostVisible: boolean;
  /**
   * Показывать ли значок рун (видео идёт И энергия безлимитная, то есть Plus/Pro).
   * зачем: у платных ускорять энергию нечего, поэтому им капают руны — 3 в минуту,
   * а в Супервоскресенье 6.
   */
  runesVisible: boolean;
  /** Сколько рун накапало за текущий сеанс просмотра (локальный счёт). */
  runesEarned: number;
  /** Секунд до следующего начисления (1..60) — для отсчёта в значке. */
  secondsToNextRune: number;
  /** Вызывать из плеера при каждом изменении состояния проигрывания. */
  setPlaying: (playing: boolean) => void;
  /** Timestamped position sample from the player bridge. */
  reportPlaybackSample: (sample: VerifiedPlaybackSample) => void;
};

export function useVideoWatchEnergyBoost(videoId: string): VideoWatchEnergyBoost {
  const {
    isUnlimited,
    energyReady,
    energy,
    bonusEnergy,
    maxEnergy,
    bonusEnergyCapacity,
    reload,
  } = useEnergy();
  const [playing, setPlayingState] = useState(false);

  const trackerRef = useRef(initialVerifiedPlaybackState(videoId));
  const pendingVerifiedMsRef = useRef(0);
  const creditTailRef = useRef(Promise.resolve());
  const runeSessionRef = useRef<{ token: ReturnType<typeof captureAccountGeneration>; stableId: string; sessionId: string } | null>(null);
  const runeProgressPendingMsRef = useRef(0);
  const runeVerifiedMsRef = useRef(0);
  const latestPositionMsRef = useRef(0);
  // Через ref, чтобы размонтирование не тянуло за собой пересоздание колбэков.
  const reloadRef = useRef(reload);
  reloadRef.current = reload;

  const applyWatchedSegment = useCallback(async (watchedMs: number, trigger: string) => {
    const outcome = await creditVideoWatchSegment(watchedMs);
    if (!outcome.applied) {
      if (__DEV__) {
        console.log(`[VIDEO-ENERGY] credit skipped (${trigger}): reason=${outcome.reason}`);
      }
      return;
    }
    if (__DEV__) {
      console.log(
        `[VIDEO-ENERGY] credit applied (${trigger}): watched=${outcome.watchedMs}ms`
        + ` energy=${outcome.from}->${outcome.to}`,
      );
    }
    await reloadRef.current().catch((e: unknown) => {
      DebugLogger.error(
        'use_video_watch_energy_boost:reload_after_credit',
        e instanceof Error ? e : new Error(String(e)),
        'warning',
      );
    });
  }, []);

  /** Активен ли зачёт: у безлимитных ускорять нечего. */
  const eligible = energyReady
    && !isUnlimited
    && energy + bonusEnergy < maxEnergy + bonusEnergyCapacity;

  const setPlaying = useCallback((next: boolean) => {
    setPlayingState((prev) => (prev === next ? prev : next));
  }, []);

  const flushVerifiedPlayback = useCallback((trigger: string) => {
    const watchedMs = pendingVerifiedMsRef.current;
    pendingVerifiedMsRef.current = 0;
    if (watchedMs <= 0 || !eligible) return;
    creditTailRef.current = creditTailRef.current
      .then(() => applyWatchedSegment(watchedMs, trigger))
      .catch((error: unknown) => {
        DebugLogger.error(
          'use_video_watch_energy_boost:credit_tail',
          error instanceof Error ? error : new Error(String(error)),
          'warning',
        );
      });
  }, [applyWatchedSegment, eligible]);

  const reportPlaybackSample = useCallback((sample: VerifiedPlaybackSample) => {
    latestPositionMsRef.current = sample.positionMs;
    const measured = measureVerifiedPlaybackProgress(
      trackerRef.current,
      { ...sample, sourceId: videoId },
      Date.now(),
    );
    trackerRef.current = measured.state;
    setPlaying(sample.playing);
    if (measured.creditedMs > 0) pendingVerifiedMsRef.current += measured.creditedMs;
    // Ветвление, которое решает, двигается ли счётчик рун вообще. Печатаем оба
    // значения: ноль creditedMs и отсутствие сессии дают одинаковый симптом
    // «счётчик стоит», но чинятся в разных местах.
    if (measured.creditedMs <= 0 || !runeSessionRef.current) {
      runeTrace('sample_no_rune_credit', {
        reason: measured.creditedMs <= 0 ? 'credited_ms_zero' : 'no_rune_session',
        creditedMs: measured.creditedMs,
        hasRuneSession: runeSessionRef.current !== null,
        playing: sample.playing,
        positionMs: Math.round(sample.positionMs),
        videoId,
      });
    } else {
      runeProgressPendingMsRef.current += measured.creditedMs;
      runeVerifiedMsRef.current += measured.creditedMs;
      const verifiedWithCarry = runeVerifiedMsRef.current;
      const nextMinutes = Math.floor(verifiedWithCarry / 60_000);
      setBaseUnclaimedMinutes(nextMinutes);
      setSecondsToNextRune(Math.max(1, Math.ceil((60_000 - (verifiedWithCarry % 60_000)) / 1000)));
      const willReport = runeProgressPendingMsRef.current >= 5_000;
      runeTrace('sample_credited', {
        creditedMs: measured.creditedMs,
        verifiedMsWithCarry: verifiedWithCarry,
        unclaimedMinutes: nextMinutes,
        pendingProgressMs: runeProgressPendingMsRef.current,
        willReportToServer: willReport,
        positionMs: Math.round(sample.positionMs),
      });
      if (willReport) {
        runeProgressPendingMsRef.current = 0;
        const session = runeSessionRef.current;
        void reportVideoWatchRuneProgress(session.token, session.stableId, session.sessionId, sample.positionMs)
          .then((result) => {
            runeTrace('progress_result', {
              ok: result.ok,
              reason: result.reason,
              serverVerifiedMs: result.verifiedMs ?? null,
              localVerifiedMs: runeVerifiedMsRef.current,
            });
          })
          .catch((error: unknown) => {
            // Немой catch запрещён: потерянный progress = потерянное время просмотра.
            runeTrace('progress_threw', { // guard-ok: проглоченная ошибка обязана писать причину
              error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
            });
          });
      }
    }
    if (!sample.playing) flushVerifiedPlayback('pause');
    else if (pendingVerifiedMsRef.current >= VIDEO_WATCH_CREDIT_FLUSH_MS) flushVerifiedPlayback('progress');
  }, [flushVerifiedPlayback, setPlaying, videoId]);

  useEffect(() => {
    flushVerifiedPlayback('video_change');
    trackerRef.current = initialVerifiedPlaybackState(videoId);
  }, [flushVerifiedPlayback, videoId]);

  useEffect(() => () => flushVerifiedPlayback('unmount'), [flushVerifiedPlayback]);

  // ── Руны за просмотр: ветка Plus/Pro ───────────────────────────────────────
  // зачем (владелец 2026-09-03): у платных энергия безлимитная, ускорять нечего.
  // Вместо этого им капает 3 базовые руны в минуту, в Супервоскресенье — 6.
  // Счётчик двигается локально и мгновенно. Сервер получает start и один claim
  // на паузе/закрытии: поминутных запросов нет, но длительность всё равно
  // берётся с серверных часов, не с устройства.
  const runesEligible = energyReady && isUnlimited;
  const [runeSessionActive, setRuneSessionActive] = useState(false);
  const [baseUnclaimedMinutes, setBaseUnclaimedMinutes] = useState(0);
  const [grantedToday, setGrantedToday] = useState(0);
  const baseRunesEarned = Math.min(
    baseUnclaimedMinutes * VIDEO_WATCH_RUNES_PER_MINUTE,
    Math.max(0, VIDEO_WATCH_RUNES_DAILY_CAP - grantedToday),
  );
  const runesEarned = applySuperSundayRuneMultiplier(baseRunesEarned, Date.now());
  const [secondsToNextRune, setSecondsToNextRune] = useState(60);

  useEffect(() => {
    setRuneSessionActive(false);
    // Решение «капают ли руны вообще». Печатаем сами значения, а не голый
    // результат: «не премиум» и «энергия ещё не загрузилась» — разные диагнозы
    // с одинаковым симптомом.
    if (!(playing && runesEligible)) {
      runeTrace('session_effect_idle', {
        playing,
        runesEligible,
        energyReady,
        isUnlimited,
        reason: !playing ? 'not_playing' : !energyReady ? 'energy_not_ready' : 'not_unlimited_no_premium',
      });
      return undefined;
    }
    let stopped = false;
    let sessionId: string | null = null;
    const token = captureAccountGeneration();
    const stableId = token.stableId?.trim();
    setBaseUnclaimedMinutes(0);
    if (!stableId) {
      // Первое звено цепочки: без личности серверная сессия не откроется, и
      // счётчик замрёт молча (класс бага stable_identity_unavailable).
      runeTrace('session_start_skipped', { reason: 'no_stable_id', generation: token.generation });
      return undefined;
    }
    runeTrace('session_start_requested', { stableId, generation: token.generation, videoId });

    // Start сначала досдаёт предыдущий immutable claim. Поэтому быстрый
    // pause/resume не может заменить активную серверную сессию раньше её сдачи.
    const startedAtMs = Date.now();
    void startVideoWatchRuneSession(token, stableId).then((result) => {
      if (!result.ok) {
        runeTrace('session_start_failed', {
          reason: result.reason,
          tookMs: Date.now() - startedAtMs,
          stableId,
        });
        return;
      }
      sessionId = result.sessionId;
      runeTrace('session_started', {
        sessionId: result.sessionId,
        carryMs: result.carryMs,
        grantedToday: result.grantedToday,
        dailyCap: VIDEO_WATCH_RUNES_DAILY_CAP,
        tookMs: Date.now() - startedAtMs,
        stoppedWhileStarting: stopped,
      });
      if (stopped) {
        // Ранний выход: просмотр кончился раньше, чем сервер ответил.
        runeTrace('session_claimed_immediately', { sessionId: result.sessionId, reason: 'stopped_before_ready' });
        void claimVideoWatchRuneSession(token, stableId, result.sessionId).then((claim) => {
          runeTrace('claim_result', { phase: 'stopped_before_ready', ok: claim.ok, reason: claim.reason });
        });
        return;
      }
      setRuneSessionActive(true);
      runeSessionRef.current = { token, stableId, sessionId: result.sessionId };
      runeProgressPendingMsRef.current = 0;
      runeVerifiedMsRef.current = result.carryMs;
      void reportVideoWatchRuneProgress(token, stableId, result.sessionId, latestPositionMsRef.current);
      setGrantedToday(result.grantedToday);
      setSecondsToNextRune(Math.max(1, Math.ceil((60_000 - result.carryMs) / 1000)));
    });

    return () => {
      stopped = true;
      setRuneSessionActive(false);
      setBaseUnclaimedMinutes(0);
      if (!sessionId) {
        // Ранний выход: сессия так и не открылась — всё накопленное время
        // просмотра пропадает, и до сих пор об этом не было ни строчки.
        runeTrace('cleanup_without_session', {
          reason: 'session_never_opened',
          lostVerifiedMs: runeVerifiedMsRef.current,
          lastPositionMs: Math.round(latestPositionMsRef.current),
        });
        return;
      }
      const pendingMs = runeProgressPendingMsRef.current;
      runeTrace('cleanup_claiming', {
        sessionId,
        pendingProgressMs: pendingMs,
        localVerifiedMs: runeVerifiedMsRef.current,
        lastPositionMs: Math.round(latestPositionMsRef.current),
      });
      if (pendingMs > 0) {
        runeProgressPendingMsRef.current = 0;
        void reportVideoWatchRuneProgress(token, stableId, sessionId, latestPositionMsRef.current)
          .then((result) => {
            runeTrace('final_progress_result', { ok: result.ok, reason: result.reason, serverVerifiedMs: result.verifiedMs ?? null });
          })
          .catch((error: unknown) => {
            runeTrace('final_progress_threw', { // guard-ok: причина обязана попасть в журнал
              error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
            });
          });
      }
      runeSessionRef.current = null;
      const claimStartedMs = Date.now();
      void claimVideoWatchRuneSession(token, stableId, sessionId).then((result) => {
        // Итог, который увидел пользователь: сколько рун реально начислено.
        runeTrace('claim_result', {
          phase: 'cleanup',
          ok: result.ok,
          reason: result.reason,
          granted: result.ok ? result.granted : 0,
          grantedToday: result.ok ? result.grantedToday : null,
          localVerifiedMs: runeVerifiedMsRef.current,
          tookMs: Date.now() - claimStartedMs,
        });
      }).catch((error: unknown) => {
        runeTrace('claim_threw', { // guard-ok: проглоченная ошибка обязана писать причину
          error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
        });
      });
    };
    // зачем именно этот список: `energyReady`/`isUnlimited` уже свёрнуты в
    // `runesEligible`, а `videoId` здесь добавлять НЕЛЬЗЯ — он пересоздавал бы
    // серверную сессию на каждой смене ролика. Трассировка обязана только
    // наблюдать, а не менять поведение.
  }, [playing, runesEligible]);

  // Уход в фон = видео больше не смотрят. YouTube в WebView всё равно встаёт на
  // паузу, но onStateChange из свёрнутого приложения может и не доехать —
  // гасим отсчёт сами, иначе фоновое время продолжало бы подтягивать таймер.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state !== 'active') setPlayingState(false);
    });
    return () => subscription.remove();
  }, []);

  return {
    boostVisible: playing && eligible,
    // Do not show a ticking promise until the authoritative session exists.
    runesVisible: playing && runesEligible && runeSessionActive,
    runesEarned,
    secondsToNextRune,
    setPlaying,
    reportPlaybackSample,
  };
}
