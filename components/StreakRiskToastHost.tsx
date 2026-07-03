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
 * Тип info — не блокирует, идёт через общий ActionToast (он сам выберет язык).
 */
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { actionToastTri, emitAppEvent } from '../app/events';
import { checkStreakLossPending } from '../app/hall_of_fame_utils';
import { scheduleCoalescedForegroundTask } from '../app/app_resume_policy';

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
      const shown = await AsyncStorage.getItem(SHOWN_KEY).catch(() => null);
      if (shown === today) return;

      const { willLose, streakBefore } = await checkStreakLossPending();
      if (!willLose || streakBefore <= 1) return;

      await AsyncStorage.setItem(SHOWN_KEY, today).catch(() => {});

      emitAppEvent('action_toast', actionToastTri('info', {
        ru: `🔥 Цепочка ${streakBefore} дн. сгорит в полночь — позанимайся, чтобы сохранить`,
        uk: `🔥 Серія ${streakBefore} дн. згорить опівночі — позаймайся, щоб зберегти`,
        es: `🔥 Tu racha de ${streakBefore} días se pierde a medianoche — practica para mantenerla`,
        'pt-BR': `🔥 Sua sequência de ${streakBefore} dias acaba à meia-noite — pratique para manter`,
        vi: `🔥 Chuỗi ${streakBefore} ngày sẽ mất lúc nửa đêm — hãy luyện tập để giữ`,
        id: `🔥 Streak ${streakBefore} hari hilang tengah malam — berlatihlah untuk mempertahankan`,
        tr: `🔥 ${streakBefore} günlük serin gece yarısı sönecek — sürdürmek için çalış`,
        pl: `🔥 Seria ${streakBefore} dni zniknie o północy — poćwicz, by ją utrzymać`,
      }));
    } catch {
      /* ignore — optional enhancement */
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
