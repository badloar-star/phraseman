/*
 * Мгновенный отклик «День засчитан 🔥 N» (§137, координатор 04.10).
 *
 * зачем: жалобы «как работает серия — непонятно»: человек не видел момента, когда день засчитан.
 * Теперь в момент первого засчитанного действия дня (событие streak_day_counted от Ядра, только
 * локально, без сети) — короткий тост. Только на activity:* — открытие приложения в день перехода
 * (migration:*) засчитано по старому правилу и отдельного отклика не заслуживает.
 * Тост живёт в памяти текущего запуска: пропустили — ничего не теряется (не «долг на показ»).
 */
import type { AppEventMap } from './events';

type StreakDayCounted = AppEventMap['streak_day_counted'];
type ActionToastPayload = AppEventMap['action_toast'];

export function streakDayToastPayload(event: StreakDayCounted): ActionToastPayload | null {
  if (!event.source.startsWith('activity:')) return null;
  const days = Math.max(1, Math.floor(event.days));
  return {
    type: 'reward',
    messageRu: `День засчитан 🔥 ${days}`,
    messageUk: `День зараховано 🔥 ${days}`,
    messageEn: `Day counted 🔥 ${days}`,
    messageEs: `Día contado 🔥 ${days}`,
    messagePtBr: `Dia contado 🔥 ${days}`,
    messageVi: `Đã tính ngày 🔥 ${days}`,
    messageId: `Hari dihitung 🔥 ${days}`,
    messageTr: `Gün sayıldı 🔥 ${days}`,
    messagePl: `Dzień zaliczony 🔥 ${days}`,
  };
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
