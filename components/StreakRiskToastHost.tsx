/**
 * StreakRiskToastHost — вечерний in-app тост «цепочка под угрозой».
 *
 * Немое место №8 (docs/reports/missing_feedback_designs_2026-06-11.html):
 * push на 21:00 уже есть (scheduleStreakWarningIfNeeded), но если push
 * отключён/проигнорирован, а юзер сидит в приложении на уроке/в арене —
 * он не знает, что цепочка сгорит сегодня в полночь.
 *
 * Условия показа: вечер (≥17:00), цепочка под угрозой (checkStreakLossPending),
 * заморозка не активна, и сегодня тост ещё не показывали. Один раз в день.
 * Тип warning — не блокирует, идёт через общий ActionToast (он сам выберет язык).
 */
import { tryPlayV2Event } from '../modules/sound_v2/legacy_bridge';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { actionToastTri, emitAppEvent } from '../app/events';
import { checkStreakLossPending } from '../app/hall_of_fame_utils';
import { scheduleCoalescedForegroundTask } from '../app/app_resume_policy';
import { DebugLogger } from '../app/debug-logger';
import { noteSwallowedHandler, noteSwallowedAs } from '../app/swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

const EVENING_HOUR = 17;
const SHOWN_KEY = 'streak_risk_toast_shown';

export default function StreakRiskToastHost() {
  const runningRef = useRef(false);
  const scheduledRef = useRef<{ cancel: () => void } | null>(null);

  const check = async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    try {
      const now = new Date();
      if (now.getHours() < EVENING_HOUR) return;

      const today = now.toISOString().slice(0, 10);
      const shown = await AsyncStorage.getItem(SHOWN_KEY).catch(noteSwallowedAs('StreakRiskToastHost:promise_1', null));
      if (shown === today) return;

      const { willLose, streakBefore } = await checkStreakLossPending();
      if (!willLose || streakBefore <= 1) return;

      await AsyncStorage.setItem(SHOWN_KEY, today).catch(noteSwallowedHandler('StreakRiskToastHost:promise_2'));

      // зачем: у цепочки есть срок (полночь) и цена бездействия — это
      // предупреждение, а не нейтральное инфо, которым его раньше маскировали.
      // motionVariant:'hybrid' — тост-вид «Световод»: вход/выход из света на
      // ActionToastHybridCard (components/ActionToast.tsx), закон №15 (выход
      // короче входа). Условия показа (вечер/раз в день/цепочка под угрозой)
      // не менялись.
      // зачем (OR-TOAST-STREAK-RISK): пассивное напоминание — сверху одной строкой с плиткой-огоньком.
      tryPlayV2Event('streak_risk', 'streak_risk_toast'); // зачем (координатор 14.10): звук «серия под угрозой» V2; флаг выключен — тишина
      emitAppEvent('action_toast', {
        layout: 'top_line',
        lineIcon: 'flame-outline',
        ...actionToastTri('warning', {
          ru: `Цепочка ${streakBefore} дн. сгорит в полночь — позанимайся, чтобы сохранить`,
          uk: `Серія ${streakBefore} дн. згорить опівночі — позаймайся, щоб зберегти`,
          es: `Tu racha de ${streakBefore} días se pierde a medianoche — practica para mantenerla`, en: `Your ${streakBefore}-day streak ends at midnight — practice to save it`,
          'pt-BR': `Sua sequência de ${streakBefore} dias acaba à meia-noite — pratique para manter`,
          vi: `Chuỗi ${streakBefore} ngày sẽ mất lúc nửa đêm — hãy luyện tập để giữ`,
          id: `Streak ${streakBefore} hari hilang tengah malam — berlatihlah untuk mempertahankan`,
          tr: `${streakBefore} günlük serin gece yarısı sönecek — sürdürmek için çalış`,
          pl: `Seria ${streakBefore} dni zniknie o północy — poćwicz, by ją utrzymać`,
        }),
        motionVariant: 'hybrid',
      });
    } catch (e) {
      // ignore — optional enhancement
      DebugLogger.error('StreakRiskToastHost:shown', e instanceof Error ? e : new Error(String(e)), 'warning');
    } finally {
      runningRef.current = false;
    }
  };

  useEffect(() => {
    const scheduleCheck = () => {
      scheduledRef.current?.cancel();
      scheduledRef.current = scheduleCoalescedForegroundTask('streak_risk_toast_check', check);
    };
    scheduleCheck();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') scheduleCheck();
    });
    return () => {
      sub.remove();
      scheduledRef.current?.cancel();
      scheduledRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
