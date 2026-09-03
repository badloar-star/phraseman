/**
 * Ускорение энергии за просмотр видео: склейка «сигнал плеера → подтяжка таймера».
 *
 * зачем (владелец 2026-09-02): «запустил плеер — 1 энергия за 10 минут». Как
 * только видео пошло, остаток до следующей единицы подтягивается к 10 минутам
 * (если был больше) и дальше течёт обычным ходом. Пауза ничего не отбирает:
 * недосмотренное время просто продолжает идти как обычно.
 *
 * Кому даём: только тем, у кого лимит энергии реально есть. У Plus/Max энергия
 * безлимитная — им ускорять нечего, и значок им не показываем, иначе он обещал
 * бы то, что для них бессмысленно.
 *
 * Почему подтяжка повторяется по таймеру, а не делается один раз: остаток тает
 * обычным ходом, и когда очередная единица доливается, счётчик начинает новый
 * 30-минутный круг — его снова нужно подтянуть к цели, пока видео идёт.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useEnergy } from '../components/EnergyContext';
import { creditVideoWatchSegment } from '../app/energy_video_watch_credit';
import {
  addPendingWatchMinutes,
  claimPendingWatchRunes,
  VIDEO_WATCH_RUNES_PER_MINUTE,
} from '../app/video_watch_runes_client';
import { captureAccountGeneration } from '../app/account_generation';
import { DebugLogger } from '../app/debug-logger';

/**
 * Как часто перепроверяем остаток, пока видео играет. Полминуты: достаточно
 * часто, чтобы после долива очередной единицы счётчик не успел показать
 * «30 минут», и достаточно редко, чтобы не тревожить диск.
 */
const VIDEO_WATCH_RECHECK_MS = 30 * 1000;

export type VideoWatchEnergyBoost = {
  /** Показывать ли значок ускорения энергии (видео идёт И лимит энергии есть). */
  boostVisible: boolean;
  /**
   * Показывать ли значок рун (видео идёт И энергия безлимитная, то есть Plus/Pro).
   * зачем: у платных ускорять энергию нечего, поэтому им капают руны — 1 в минуту.
   */
  runesVisible: boolean;
  /** Сколько рун накапало за текущий сеанс просмотра (локальный счёт). */
  runesEarned: number;
  /** Секунд до следующей руны (0..59) — для отсчёта в значке. */
  secondsToNextRune: number;
  /** Вызывать из плеера при каждом изменении состояния проигрывания. */
  setPlaying: (playing: boolean) => void;
};

export function useVideoWatchEnergyBoost(): VideoWatchEnergyBoost {
  const { isUnlimited, energyReady, reload } = useEnergy();
  const [playing, setPlayingState] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Через ref, чтобы размонтирование не тянуло за собой пересоздание колбэков.
  const reloadRef = useRef(reload);
  reloadRef.current = reload;

  /**
   * Подтягивает остаток до следующей единицы к 10 минутам. Идемпотентна: если
   * остаток уже 10 минут или меньше, ничего не делает и говорит почему.
   */
  const applyBoostNow = useCallback(async (trigger: string) => {
    // зачем (порядок важен): долив энергии в EnergyContext читает energy_state
    // ВНЕ общего замка, а пишет уже внутри него. Значит свежая подтяжка,
    // попавшая между его чтением и записью, была бы затёрта старой меткой.
    // Поэтому сначала даём доливу отработать целиком, и только потом пишем свой
    // сдвиг: наша запись атомарна (весь цикл читать-менять-писать идёт под
    // withStorageLock), так что после неё затирать уже нечем.
    await reloadRef.current().catch((e: unknown) => {
      DebugLogger.error(
        'use_video_watch_energy_boost:reload_before_boost',
        e instanceof Error ? e : new Error(String(e)),
        'warning',
      );
    });

    // Длительность больше не влияет на результат (подтягиваем до цели, а не
    // пропорционально просмотренному), но модуль требует непустой отрезок —
    // передаём минимально допустимый.
    const outcome = await creditVideoWatchSegment(1000);
    if (!outcome.applied) {
      // Каждый отказ обязан назвать причину — иначе механизм умирает молча.
      // Это не ошибка: «остаток уже меньше цели» — штатный и частый случай.
      if (__DEV__) {
        console.log(`[VIDEO-ENERGY] boost skipped (${trigger}): reason=${outcome.reason}`);
      }
      return;
    }
    if (__DEV__) {
      console.log(
        `[VIDEO-ENERGY] boost applied (${trigger}): срезано ${Math.round(outcome.bonusMs / 1000)}с`
        + ` lastRecoveryTime=${outcome.lastRecoveryTime}`,
      );
    }
    // Диск уже сдвинут — перечёт показывает результат: счётчик «до +1» падает
    // до 10 минут сразу, а не на следующем тике.
    await reloadRef.current().catch((e: unknown) => {
      DebugLogger.error(
        'use_video_watch_energy_boost:reload_after_boost',
        e instanceof Error ? e : new Error(String(e)),
        'warning',
      );
    });
  }, []);

  /** Активен ли зачёт: у безлимитных ускорять нечего. */
  const eligible = energyReady && !isUnlimited;

  const setPlaying = useCallback((next: boolean) => {
    setPlayingState((prev) => (prev === next ? prev : next));
  }, []);

  // Старт/стоп подтяжки. Единственное место, где заводится и снимается таймер.
  useEffect(() => {
    if (!(playing && eligible)) return undefined;
    // Сразу по «плей», а не через полминуты: иначе человек включает видео и
    // какое-то время видит прежние 30 минут — ровно то, на что владелец указал.
    void applyBoostNow('play');
    timerRef.current = setInterval(() => { void applyBoostNow('tick'); }, VIDEO_WATCH_RECHECK_MS);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      // Паузу специально НЕ откатываем (решение владельца): уже подтянутое
      // время остаётся человеку и дальше идёт обычным ходом.
    };
  }, [playing, eligible, applyBoostNow]);

  // ── Руны за просмотр: ветка Plus/Pro ───────────────────────────────────────
  // зачем (владелец 2026-09-03): у платных энергия безлимитная, ускорять нечего.
  // Вместо этого им капает 1 руна в минуту. Счёт локальный и мгновенный, а на
  // сервер уходит ОДИН вызов в конце просмотра — руны server-owned, поле `stars`
  // закрыто правилами, и поминутные вызовы стоили бы 60 обращений в час.
  const runesEligible = energyReady && isUnlimited;
  const [runesEarned, setRunesEarned] = useState(0);
  const [secondsToNextRune, setSecondsToNextRune] = useState(60);
  const runesTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const unclaimedMinutesRef = useRef(0);

  useEffect(() => {
    if (!(playing && runesEligible)) return undefined;
    setSecondsToNextRune(60);
    runesTimerRef.current = setInterval(() => {
      setSecondsToNextRune((left) => {
        if (left > 1) return left - 1;
        // Полная минута просмотра — руна начислена локально и ждёт сдачи.
        unclaimedMinutesRef.current += 1;
        setRunesEarned((n) => n + VIDEO_WATCH_RUNES_PER_MINUTE);
        return 60;
      });
    }, 1000);
    return () => {
      if (runesTimerRef.current) {
        clearInterval(runesTimerRef.current);
        runesTimerRef.current = null;
      }
      // Пауза/уход — сдаём накопленное. Незавершённая минута НЕ засчитывается:
      // руна выдаётся за полную минуту, иначе счёт разошёлся бы с сервером.
      const minutes = unclaimedMinutesRef.current;
      if (minutes <= 0) return;
      unclaimedMinutesRef.current = 0;
      const token = captureAccountGeneration();
      const stableId = token.stableId?.trim();
      if (!stableId) {
        // Ранний выход обязан назвать причину: без личности сдавать некому.
        if (__DEV__) console.log('[VIDEO-RUNES] сдача пропущена: нет stableId');
        return;
      }
      void (async () => {
        await addPendingWatchMinutes(stableId, minutes);
        const result = await claimPendingWatchRunes(token, stableId);
        if (!result.ok && __DEV__) {
          console.log(`[VIDEO-RUNES] сдача не прошла: ${result.reason} (минуты сохранены)`);
        }
      })();
    };
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
    runesVisible: playing && runesEligible,
    runesEarned,
    secondsToNextRune,
    setPlaying,
  };
}
