import { DeviceEventEmitter } from 'react-native';

/** Анти-бурст для `action_toast` внутри ~400 мс (мульти-тап); дальше фильтрует ActionToast. */
let _lastActionToastKey = '';
let _lastActionToastEmitAt = 0;
const ACTION_TOAST_EMIT_BURST_MS = 400;

export type AppEventMap = {
  xp_changed: undefined;
  xp_updated: { total: number; delta: number };
  level_up_pending: undefined;
  energy_reload: undefined;
  premium_activated: undefined;
  premium_deactivated: undefined;
  achievement_unlocked: undefined;
  account_deleted: undefined;
  /** После restoreFromCloud / мерджа user_name с облака — обновить профиль в UI. */
  cloud_profile_hydrated: undefined;
  /** После успешного signInWithProvider — обновить секцию "Аккаунт" в Settings, etc. */
  auth_provider_linked: undefined;
  /** Начисление осколков: анимация на главной + глобальная ShardsEarnedModal (если есть reason). */
  shards_earned: {
    amount: number;
    /** Ключ из shard_earn_ui / ShardSource — для автоподписи */
    reasonKey?: string;
    /** Готовая строка (например батч за урок) — приоритет над reasonKey */
    reasonText?: string;
  };
  shards_balance_updated: { balance: number };
  /** 48-год ваучер на безкоштовний паккарток виданий (з преміум-подарунка / broadcast) */
  pack_trial_gift_set: undefined;
  /** Ваучер «згорів» — використано для покупки набору або вийшов час; UI має повернути іконки осколків */
  pack_trial_gift_consumed: undefined;
  daily_task_completed: { taskId: string };
  /** Тост или экран забрал награду — обновить список на daily_tasks / главной. */
  daily_task_reward_claimed: { taskId: string };
  energy_purchased_shards: undefined;
  action_toast: {
    type: 'success' | 'error' | 'info';
    messageRu: string;
    messageUk?: string;
    /** Испанский UX (например dev); если нет — см. fallback в ActionToast */
    messageEs?: string;
  };
  /**
   * После онбординга отложенный тутор энергии / возврат с первого урока — главная может показать онбординг.
   * См. energyOnboardingGate + home.tsx
   */
  energy_onboarding_may_show: undefined;
  /**
   * Помечаем, что смысл «энергии» уже донесён (модалка 0 энергии) — home может показать «bug hunt» по графику.
   */
  bug_hunt_eligible_check: undefined;
  notif_permission_nudge: { missedDays: number };
};

/** RU + UK + ES для `action_toast` без дублирования полей. */
export function actionToastTri(
  type: AppEventMap['action_toast']['type'],
  m: { ru: string; uk: string; es: string },
): AppEventMap['action_toast'] {
  return { type, messageRu: m.ru, messageUk: m.uk, messageEs: m.es };
}

export function emitAppEvent<K extends keyof AppEventMap>(
  event: K,
  payload?: AppEventMap[K]
): void {
  if (event === 'action_toast' && payload !== undefined) {
    const p = payload as AppEventMap['action_toast'];
    const k = `${p.type}\u0001${p.messageRu.replace(/\s+/g, ' ').trim()}`;
    const now = Date.now();
    if (k === _lastActionToastKey && now - _lastActionToastEmitAt < ACTION_TOAST_EMIT_BURST_MS) {
      return;
    }
    _lastActionToastKey = k;
    _lastActionToastEmitAt = now;
  }
  if (payload === undefined) {
    DeviceEventEmitter.emit(event);
    return;
  }
  DeviceEventEmitter.emit(event, payload);
}

export function onAppEvent<K extends keyof AppEventMap>(
  event: K,
  handler: (payload: AppEventMap[K]) => void
): { remove: () => void } {
  return DeviceEventEmitter.addListener(event, handler as (...args: unknown[]) => void);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
