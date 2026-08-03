import { DeviceEventEmitter } from 'react-native';
import type { PlannedTriLangCopy } from '../constants/i18n';
import type { ThemeMode } from '../constants/theme';
import type { PersonalPlanHomeSnapshot } from './personal_plan_state';
import type { RuntimeStudyTarget } from './target_storage_keys';
import type { SoundEventId } from '../modules/audio/sound_events';

/** Анти-бурст для `action_toast` внутри ~400 мс (мульти-тап); дальше фильтрует ActionToast. */
let _lastActionToastKey = '';
let _lastActionToastEmitAt = 0;
const ACTION_TOAST_EMIT_BURST_MS = 400;
const TRACK_INTERNAL_APP_EVENTS = false;
let appFirstContentReadyFired = false;

export type AppEventMap = {
  xp_changed: undefined;
  xp_updated: { total: number; delta: number };
  level_up_pending: undefined;
  energy_reload: undefined;
  premium_activated: undefined;
  premium_deactivated: undefined;
  vip_activated: undefined;
  vip_deactivated: undefined;
  premium_access_changed: { active: boolean; source: 'premium' | 'vip' | 'none' };
  intro_full_access_changed: undefined;
  /** Приветствие-«знакомство» (компас-слайды) закрыто юзером — можно показывать подарок 3 дня. */
  welcome_closed: undefined;
  /** Подарок лояльности (72ч для существующих free-юзеров) активирован/откатан — пересчитать доступ. */
  loyalty_gift_changed: undefined;
  gold_theme_unlocked: { source: string };
  achievement_unlocked: undefined;
  account_deleted: undefined;
  /** После restoreFromCloud / мерджа user_name с облака — обновить профиль в UI. */
  cloud_profile_hydrated: undefined;
  /** После первого сохранения league_state_v3 из облака — перечитать карточку клуба на главной. */
  league_local_state_updated: undefined;
  league_crown_updated: { uid: string; expiresAt: number; crownCount?: number };
  /** Непрочитанные сообщения чата лиги изменились — обновить badge на главной/в клубе. */
  /** Локальное dev/admin inbox-сообщение изменилось — перечитать inbox без Firestore. */
  app_messages_local_changed: undefined;
  /** Remote Config обновился (admin → Firestore) — перечитать зависящие от флагов экраны/A-B. */
  remote_config_changed: undefined;
  /** «Сундук недели» (mystery_monday) забран — плашка TodaysBoonStrip должна сразу сменить текст на «уже открыт». */
  mystery_chest_claimed: undefined;
  /** «Сокровищница»: инвентарь карточек изменился (дроп/restore) — обновить счётчики и сетки. */
  collectibles_changed: undefined;
  /** После успешного signInWithProvider — обновить секцию "Аккаунт" в Settings, etc. */
  auth_provider_linked: undefined;
  /** Начисление осколков: анимация на главной + глобальный reward-тост (GlobalShardsEarnedHost). */
  shards_earned: {
    amount: number;
    /** Ключ из shard_earn_ui / ShardSource — для автоподписи */
    reasonKey?: string;
    /** Готовая строка (например батч за урок) — приоритет над reasonKey */
    reasonText?: string;
    /** Фаза 2: бонусная часть от карточки IV+ (уже входит в amount; опционально — для отдельного показа). */
    bonus?: number;
  };
  shards_balance_updated: {
    balance: number;
    op?: 'earn' | 'spend' | 'replace' | 'admin';
    reason?: string;
    eligibleAchievementBalance?: number;
  };
  /** 48-год ваучер на безкоштовний паккарток виданий (з преміум-подарунка / broadcast) */
  pack_trial_gift_set: undefined;
  /** Ваучер «згорів» — використано для покупки набору або вийшов час; UI має повернути іконки осколків */
  pack_trial_gift_consumed: undefined;
  daily_task_completed: { taskId: string; studyTarget?: RuntimeStudyTarget };
  personal_plan_updated: { planId?: string; taskId?: string; snapshot?: PersonalPlanHomeSnapshot } | undefined;
  personal_plan_onboarding_nickname_ready: undefined;
  /** Тост или экран забрал награду — обновить список на daily_tasks / главной. */
  daily_task_reward_claimed: { taskId: string; studyTarget?: RuntimeStudyTarget };
  /** Dev/admin preview only: показать reward-toast без storage/XP claim. */
  daily_task_reward_toast_preview: { themeMode: ThemeMode; taskTitle?: string; xpBase?: number };
  /** Пользователь сменил дневное задание за осколки — UI обязан перечитать список и прогресс. */
  daily_task_rerolled: { oldTaskId: string; newTaskId: string };
  /** Пользователь сменил весь сегодняшний набор дневных заданий из утреннего модала. */
  daily_tasks_set_rerolled: { oldTaskIds: string[]; newTaskIds: string[]; studyTarget?: RuntimeStudyTarget };
  energy_purchased_shards: undefined;
  /** Цепочка только что обнулена, доступен оффер восстановления (24ч). home.tsx показывает модалку. */
  streak_revive_offer: { lostStreak: number; missedDays?: number };
  /** Цепочка восстановлена за осколки — home/UI должны мгновенно обновить отображение. */
  streak_revived: { restoredStreak: number; spent: number };
  /** DEV/admin: вручную посеяно число дней streak — главная перечитывает локальное состояние. */
  streak_seeded: { days: number };
  /** Активное пари аннулировано (например, после revive или потери цепочки). */
  wager_lost: { reason: 'revive' | 'streak_broken' };
  streak_freeze_updated: { active: boolean };
  /** Урок впервые завершён (lesson_complete впервые). Используется mastery UI. */
  lesson_finished_once: { lessonId: number; studyTarget?: string };
  /** Юзер запустил перепрохождение урока (mastery). lesson1.tsx должен перезагрузить прогресс. */
  lesson_replay_started: { lessonId: number; spent: number; studyTarget?: string };
  action_toast: {
    /** 'warning' — есть срок и цена бездействия, но ничего не сломалось. */
    type: 'success' | 'error' | 'info' | 'warning' | 'reward';
    /** Optional exact semantic cue; the visible ActionToast remains the playback trigger. */
    soundEventId?: SoundEventId;
    messageRu: string;
    messageUk?: string;
    /** Испанский UX (например dev); если нет — ActionToast использует базовую строку */
    messageEs?: string;
    messagePtBr?: string;
    messageVi?: string;
    messageId?: string;
    messageTr?: string;
    messagePl?: string;
  };
  /**
   * После онбординга отложенный тутор энергии / возврат с первого урока — главная может показать онбординг.
   * См. energyOnboardingGate + home.tsx
   */
  energy_onboarding_may_show: undefined;
  /** Первый пользовательский экран уже смонтирован: можно скрывать нативный splash без пустого промежутка. */
  app_first_content_ready: undefined;
  /**
   * Помечаем, что смысл «энергии» уже донесён (модалка 0 энергии) — home может показать «bug hunt» по графику.
   */
  bug_hunt_eligible_check: undefined;
  notif_permission_nudge: { missedDays: number };
  /** Диалог завершён (или прогресс сброшен) — список диалогов обновляет состояния «Пройдено» и hero «Продолжить». */
  dialogs_progress_changed: undefined;
  /**
   * Юзер зашёл в урок (любым путём: меню, задания дня, личный план, повтор) — карточка
   * «Продолжить урок X» на Главной обязана смениться СРАЗУ, не дожидаясь возврата на таб
   * или полного loadData(). lesson1.tsx эмитит сразу при входе, home.tsx патчит lastLesson точечно.
   */
  last_opened_lesson_changed: { lessonId: number; progress: number; score: string; studyTarget?: RuntimeStudyTarget };
};

/** RU + UK + ES для `action_toast` без дублирования полей. */
export function actionToastTri(
  type: AppEventMap['action_toast']['type'],
  m: { ru: string; uk: string; es: string } & PlannedTriLangCopy,
): AppEventMap['action_toast'] {
  return {
    type,
    messageRu: m.ru,
    messageUk: m.uk,
    messageEs: m.es,
    messagePtBr: m['pt-BR'],
    messageVi: m.vi,
    messageId: m.id,
    messageTr: m.tr,
    messagePl: m.pl,
  };
}

export function emitAppEvent<K extends keyof AppEventMap>(
  event: K,
  payload?: AppEventMap[K]
): void {
  if (event === 'app_first_content_ready') {
    appFirstContentReadyFired = true;
  }
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
  if (TRACK_INTERNAL_APP_EVENTS) {
    void import('./app_activity')
      .then(({ trackActivity }) =>
        trackActivity(`event:${String(event)}`, {
          feature: event === 'action_toast' ? 'toast' : 'app_event',
          result: event === 'action_toast'
            ? (() => {
                const t = (payload as AppEventMap['action_toast']).type;
                // 'reward' нет в словаре result у trackActivity — для аналитики это успех.
                if (t === 'reward') return 'success';
                // зачем: 'warning' в словаре result тоже нет. Предупреждение —
                // это НЕ сбой (ничего не сломалось), поэтому в аналитике оно
                // проходит как info, а не как error: иначе счётчик ошибок
                // раздуют штатные плашки про оплату и сгорающую цепочку.
                if (t === 'warning') return 'info';
                return t;
              })()
            : 'info',
          tags: {
            hasPayload: true,
            payload: JSON.stringify(payload).slice(0, 220),
          },
        }),
      )
      .catch(() => {});
  }
}

export function onAppEvent<K extends keyof AppEventMap>(
  event: K,
  handler: (payload: AppEventMap[K]) => void
): { remove: () => void } {
  const sub = DeviceEventEmitter.addListener(event, handler as (...args: unknown[]) => void);
  if (event !== 'app_first_content_ready' || !appFirstContentReadyFired) {
    return sub;
  }

  const replayTimer = setTimeout(() => {
    handler(undefined as AppEventMap[K]);
  }, 0);

  return {
    remove: () => {
      clearTimeout(replayTimer);
      sub.remove();
    },
  };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
