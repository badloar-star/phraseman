/**
 * Ускорение энергии за просмотр видео: склейка «сигнал плеера → зачёт времени».
 *
 * зачем (владелец 2026-09-02): пока видео играет, энергия восстанавливается за
 * 10 минут вместо 30. Считаем ЧЕСТНО — только реально проигранное время (см.
 * app/energy_video_watch_credit.ts). Пауза мгновенно останавливает зачёт, плей
 * возобновляет.
 *
 * Кому даём: только тем, у кого лимит энергии реально есть. У Plus/Max энергия
 * безлимитная — им ускорять нечего, и значок им не показываем, иначе он обещал
 * бы то, что для них бессмысленно.
 *
 * Зачёт идёт отрезками (не одним куском в конце), чтобы долгий просмотр не
 * пропал, если приложение убьют: каждые VIDEO_WATCH_FLUSH_MS накопленное
 * записывается на диск, а остаток дописывается при паузе/размонтировании.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useEnergy } from '../components/EnergyContext';
import { creditVideoWatchSegment } from '../app/energy_video_watch_credit';
import { DebugLogger } from '../app/debug-logger';

/**
 * Как часто «сбрасываем» накопленный просмотр на диск. Минута — компромисс:
 * запись раз в минуту не нагружает диск, а потеря при падении процесса
 * ограничена одной минутой просмотра.
 */
const VIDEO_WATCH_FLUSH_MS = 60 * 1000;

export type VideoWatchEnergyBoost = {
  /** Показывать ли значок ускорения над плеером (видео идёт И лимит есть). */
  boostVisible: boolean;
  /** Вызывать из плеера при каждом изменении состояния проигрывания. */
  setPlaying: (playing: boolean) => void;
};

export function useVideoWatchEnergyBoost(): VideoWatchEnergyBoost {
  const { isUnlimited, energyReady, reload } = useEnergy();
  const [playing, setPlayingState] = useState(false);

  /** Момент начала текущего непрерывного отрезка просмотра (0 — не идёт). */
  const segmentStartedAtRef = useRef(0);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Через ref, чтобы размонтирование не тянуло за собой пересоздание колбэков.
  const reloadRef = useRef(reload);
  reloadRef.current = reload;

  /**
   * Записывает всё, что накопилось с начала отрезка, и начинает новый отрезок
   * (или закрывает его, если `continueSegment === false`).
   */
  const flushSegment = useCallback(async (continueSegment: boolean) => {
    const startedAt = segmentStartedAtRef.current;
    if (startedAt <= 0) return;
    const now = Date.now();
    // Новый отрезок начинаем СРАЗУ, до await: иначе просмотр между началом
    // записи и её завершением потерялся бы.
    segmentStartedAtRef.current = continueSegment ? now : 0;

    const watchedMs = now - startedAt;
    // Часы могли уехать назад (смена таймзоны, ручная правка времени) — тогда
    // отрезок отрицательный. Молча пропускаем, но с причиной в логе.
    if (watchedMs <= 0) {
      DebugLogger.error(
        'use_video_watch_energy_boost:flush',
        new Error(`non_positive_segment:${watchedMs}`),
        'warning',
      );
      return;
    }

    // зачем (порядок важен): долив энергии в EnergyContext читает energy_state
    // ВНЕ общего замка, а пишет уже внутри него. Значит свежий кредит, попавший
    // между его чтением и записью, был бы затёрт старой меткой — подаренное
    // время просто исчезло бы. Поэтому сначала даём доливу отработать целиком,
    // и только потом пишем свой сдвиг: наша запись атомарна (весь цикл
    // читать-менять-писать идёт под withStorageLock), так что после неё
    // затирать уже нечем.
    await reloadRef.current().catch((e: unknown) => {
      DebugLogger.error(
        'use_video_watch_energy_boost:reload_before_credit',
        e instanceof Error ? e : new Error(String(e)),
        'warning',
      );
    });

    const outcome = await creditVideoWatchSegment(watchedMs);
    if (!outcome.applied) {
      // Каждый отказ обязан назвать причину — иначе механизм умирает молча.
      // Это не ошибка (полная энергия — штатный отказ), поэтому обычный лог с
      // общим префиксом [VIDEO-ENERGY] для grep по всей цепочке.
      if (__DEV__) {
        console.log(`[VIDEO-ENERGY] credit skipped: reason=${outcome.reason} watchedMs=${watchedMs}`);
      }
      return;
    }
    if (__DEV__) {
      console.log(
        `[VIDEO-ENERGY] credited: watchedMs=${outcome.watchedMs} bonusMs=${outcome.bonusMs}`
        + ` lastRecoveryTime=${outcome.lastRecoveryTime}`,
      );
    }
    // Диск уже сдвинут — второй перечёт показывает результат: таймер «до +1»
    // сокращается сразу, а не на следующем тике, и энергия доливается, если
    // подаренного времени хватило на целый интервал.
    await reloadRef.current().catch((e: unknown) => {
      DebugLogger.error(
        'use_video_watch_energy_boost:reload_after_credit',
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

  // Старт/стоп отсчёта. Единственное место, где отрезок открывается и
  // закрывается, — чтобы состояние не разъехалось между обработчиками.
  useEffect(() => {
    const counting = playing && eligible;
    if (counting) {
      if (segmentStartedAtRef.current === 0) segmentStartedAtRef.current = Date.now();
      flushTimerRef.current = setInterval(() => { void flushSegment(true); }, VIDEO_WATCH_FLUSH_MS);
      return () => {
        if (flushTimerRef.current) {
          clearInterval(flushTimerRef.current);
          flushTimerRef.current = null;
        }
        // Закрываем отрезок при любом уходе: пауза, размонтирование плеера,
        // потеря права на ускорение. Незаписанный хвост иначе пропал бы.
        void flushSegment(false);
      };
    }
    return undefined;
  }, [playing, eligible, flushSegment]);

  // Уход в фон = видео больше не смотрят. YouTube в WebView всё равно встаёт на
  // паузу, но onStateChange из свёрнутого приложения может и не доехать —
  // закрываем отрезок сами, иначе фоновое время засчиталось бы как просмотр.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state !== 'active') void flushSegment(false);
    });
    return () => subscription.remove();
  }, [flushSegment]);

  return { boostVisible: playing && eligible, setPlaying };
}
