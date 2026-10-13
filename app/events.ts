import { DeviceEventEmitter } from 'react-native';
import type { PlannedTriLangCopy } from '../constants/i18n';
import type { RuntimeStudyTarget } from './target_storage_keys';
import type { SoundEventId } from '../modules/audio/sound_events';
import { noteSwallowedHandler } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

/** Анти-бурст для `action_toast` внутри ~400 мс (мульти-тап); дальше фильтрует ActionToast. */
let _lastActionToastKey = '';
let _lastActionToastEmitAt = 0;
const ACTION_TOAST_EMIT_BURST_MS = 400;
const TRACK_INTERNAL_APP_EVENTS = false;
let appFirstContentReadyFired = false;
let appHomeScreenReadyFired = false;

export type AppEventMap = {
  level_spin_balance_changed: undefined;
  /**
   * Повышение уровня ждёт показа НА ГЛАВНОЙ (полоска доливается, аватарка
   * подпрыгивает, цифра меняется). Пришло на смену полноэкранной модалке
   * поздравления — она всплывала на любом экране и показывала старый уровень
   * из durable-очереди. См. app/home_level_up_celebration_queue.ts.
   */
  home_level_up_celebration_pending: undefined;
  /**
   * Праздник повышения ПРОИГРАН на Главной: полоска долилась, аватарка
   * подпрыгнула, цифра сменилась. Момент, когда человек ТОЧНО увидел новый
   * уровень — на него вешается разовый апселл премиума на 5-м уровне
   * (раньше он висел на кнопке «Готово» удалённой модалки).
   */
  home_level_up_celebrated: { level: number };
  energy_reload: undefined;
  /** One committed balance change; the visible numeric pill deduplicates by operationId. */
  energy_visual_transaction: {
    operationId: string;
    from: number;
    to: number;
    reason: 'spend' | 'passive' | 'video' | 'gift' | 'refill' | 'refund' | 'expiry' | 'entitlement';
    source?: 'lesson' | 'training' | 'arena' | 'video' | 'gift' | 'pearls' | 'system';
  };
  premium_activated: undefined;
  premium_deactivated: undefined;
  vip_activated: undefined;
  vip_deactivated: undefined;
  dev_local_plus_override_changed: { stableId: string; mode: 'granted' | 'removed' };
  premium_access_changed: { active: boolean; source: 'premium' | 'vip' | 'none' };
  intro_full_access_changed: undefined;
  /** Приветствие-«знакомство» (компас-слайды) закрыто юзером — можно показывать подарок 3 дня. */
  welcome_closed: undefined;
  /** Подарок лояльности (72ч для существующих free-юзеров) активирован/откатан — пересчитать доступ. */
  loyalty_gift_changed: undefined;
  gold_theme_unlocked: { source: string };
  achievement_unlocked: undefined;
  account_deleted: undefined;
  identity_retired: {
    source: 'cloud_mutation' | 'startup' | 'nickname' | 'provider_sign_in';
    subject: 'stable' | 'auth' | 'closure' | 'unknown';
  };
  post_delete_identity_ready: { authUid: string; stableId: string };
  /** После restoreFromCloud / мерджа user_name с облака — обновить профиль в UI. */
  cloud_profile_hydrated: undefined;
  /** Локальное dev/admin inbox-сообщение изменилось — перечитать inbox без Firestore. */
  app_messages_local_changed: undefined;
  /** Remote Config обновился (admin → Firestore) — перечитать зависящие от флагов экраны/A-B. */
  remote_config_changed: undefined;
  /**
   * Зачем (владелец 2026-09-02): показать окно обновления ТОЛЬКО на этом
   * устройстве из дев-хаба. Без этого проверить окно можно было только
   * включив его в Пульте сразу ВСЕМ живым пользователям. Ничего не пишет
   * в remote_config и не влияет на другие устройства.
   */
  update_modal_preview: { mode: 'force' | 'optional' };
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
  /**
   * Куплен «дневной пропуск» за жемчужины (+N попыток сверх дневного лимита).
   * Эмитит `app/quota_day_pass.ts`; слушают превью квот, чтобы кнопка ожила сразу.
   */
  revenue_quota_pass_granted: { kind: string; period: string };
  /**
   * Чек дневной квоты записан — превью обязано перечитаться.
   *
   * зачем (владелец 2026-09-15, «микрофон 3 попытки для фри юзера, но они не
   * уменьшаются вообще, а потом просто показывает надо купить подписку»):
   * превью обновлялось по смене аккаунта, фокусу экрана и возврату приложения.
   * В диалоге человек НЕ уходит с экрана — счётчик стоял на месте, пока лимит
   * не кончался молча. Своё же списание превью не видело.
   */
  revenue_quota_consumed: { kind: string; used: number; limit: number | null };
  /**
   * Баланс РУН изменился (валюта; поле `stars`). Эмитит `app/runes_system.ts`.
   *
   * зачем (владелец, 23.08): у рун не было аналога `shards_balance_updated`,
   * поэтому начисление за спин никуда не сообщалось и счётчики его не видели —
   * «выиграл кучу рун, счётчик не изменился». `delta` нужна анимации начисления
   * (полёт разных глифов футарка), знак показывает начисление/трату.
   *
   * НЕ путать с `level_spin_balance_changed` — то про количество спинов-подарков,
   * а не про валюту.
   */
  runes_balance_updated: { balance: number; delta: number };
  /** Durable foreground tracker flush; achievement evaluator reuses the same five-minute cadence. */
  foreground_usage_changed: { totalMs: number };
  // зачем (04.10): pack_trial_gift_set/consumed удалены — их слушал только снятый магазин жемчуга.
  // зачем: D70/D78 — energy_purchased_shards удалено вместе с дозаправкой энергии за жемчуг.
  /** Цепочка только что обнулена, доступен оффер восстановления (24ч). home.tsx показывает модалку. */
  streak_revive_offer: { lostStreak: number; missedDays?: number };
  /** Цепочка восстановлена за осколки — home/UI должны мгновенно обновить отображение. */
  streak_revived: { restoredStreak: number; spent: number };
  /** Активное пари аннулировано (например, после revive или потери цепочки). */
  wager_lost: { reason: 'revive' | 'streak_broken' };
  streak_freeze_updated: { active: boolean };
  /**
   * §137: первое засчитанное учебное действие дня (урок / карточки / «Мои ошибки»). Локально, до сервера.
   * source — `activity:<kind>` или `migration:<cold_start|foreground>` (день перехода на правило).
   */
  streak_day_counted: { days: number; dayKey: string; source: string };
  /** Урок впервые завершён (lesson_complete впервые). Используется mastery UI. */
  lesson_finished_once: { lessonId: number; studyTarget?: string };
  /** Юзер запустил перепрохождение урока (mastery). lesson1.tsx должен перезагрузить прогресс. */
  lesson_replay_started: { lessonId: number; spent: number; studyTarget?: string };
  action_toast: {
    /** 'warning' — есть срок и цена бездействия, но ничего не сломалось. */
    type: 'success' | 'error' | 'info' | 'warning' | 'reward';
    /**
     * зачем (координатор 04.10, вариант (б)): пассивные напоминания (серия под угрозой, оплата не прошла) по
     * overlays-runtime OR-TOAST-STREAK-RISK / BILLING-ISSUE — сверху одной строкой с плиткой-значком, без
     * подписи тона и без кнопки. Нет поля — обычная карточка по overlays.html (кадры 48–57).
     */
    layout?: 'top_line';
    /** Значок в плитке для layout 'top_line' (имя Ionicons). */
    lineIcon?: string;
    /** Optional exact semantic cue; the visible ActionToast remains the playback trigger. */
    soundEventId?: SoundEventId;
    /**
     * Production default is hybrid when the field is omitted. DEV Hub and QA
     * can still pass an explicit variant; `classic` is the rollback path.
     */
    motionVariant?: 'classic' | 'hybrid';
    messageRu: string;
    messageUk?: string;
    messageEn?: string;
    /** Испанский UX (например dev); если нет — ActionToast использует базовую строку */
    messageEs?: string;
    messagePtBr?: string;
    messageVi?: string;
    messageId?: string;
    messageTr?: string;
    messagePl?: string;
    /**
     * Действие прямо в тосте (аудит 2026-09-21, одобрено владельцем).
     *
     * зачем: тосты ошибок писали «проверь связь и попробуй ещё раз», но тянуться
     * и тапать надо было заново — часто уже на другом экране, где исходной
     * кнопки нет. Повтор обязан жить там же, где сообщение о сбое.
     *
     * Поле ОПЦИОНАЛЬНОЕ: без него тост ведёт себя ровно как раньше и остаётся
     * сквозным для тапов (pointerEvents none). Перехватывать касания начинает
     * только тост, у которого действие реально есть.
     *
     * `onPress` — функция, поэтому такой тост нельзя слать из чужого процесса
     * или восстанавливать из хранилища; он живёт только в текущем запуске.
     * Это сознательно: «долг на показ» durable быть не должен.
     */
    action?: {
      labelRu: string;
      labelUk?: string;
      labelEn?: string;
      labelEs?: string;
      labelPtBr?: string;
      labelVi?: string;
      labelId?: string;
      labelTr?: string;
      labelPl?: string;
      onPress: () => void;
    };
  };
  /**
   * После онбординга отложенный тутор энергии / возврат с первого урока — главная может показать онбординг.
   * См. energyOnboardingGate + home.tsx
   */
  energy_onboarding_may_show: undefined;
  /**
   * CleanOnboarding уже сохранил onboarding_done и корневой оверлей готов закрыться.
   * Скрытые под оверлеем табы используют событие, чтобы только теперь включить
   * тяжёлые загрузки, подписки и анимации.
   */
  onboarding_completed: undefined;
  onboarding_paywall_completed: undefined;
  /** DEV-центр: перезапустить боевой онбординг с первого экрана. */
  dev_onboarding_restart: undefined;
  /** dev_state `onboarding=done`: закрыть уже открытый оверлей онбординга (иначе он переживал следующую ссылку робота). */
  dev_onboarding_done: undefined;
  /** Первый пользовательский экран уже смонтирован: можно скрывать нативный splash без пустого промежутка. */
  app_first_content_ready: undefined;
  /** Главный экран из отложенного чанка уже смонтирован; splash не должен раскрывать его placeholder. */
  app_home_screen_ready: undefined;
  /**
   * Помечаем, что смысл «энергии» уже донесён (модалка 0 энергии) — home может показать «bug hunt» по графику.
   */
  bug_hunt_eligible_check: undefined;
  notif_permission_nudge: { missedDays: number };
  /** Диалог завершён (или прогресс сброшен) — список диалогов обновляет состояния «Пройдено» и hero «Продолжить». */
  dialogs_progress_changed: undefined;
  /**
   * Юзер зашёл в урок (любым путём: меню или повтор) — карточка
   * «Продолжить урок X» на Главной обязана смениться СРАЗУ, не дожидаясь возврата на таб
   * или полного loadData(). lesson1.tsx эмитит сразу при входе, home.tsx патчит lastLesson точечно.
   */
  last_opened_lesson_changed: { lessonId: number; progress: number; score: string; studyTarget?: RuntimeStudyTarget };
  /** Cards 2.1 §1.3: набор сообщества добавлен себе (бесплатно, без списаний) — обновить каталог/коллекцию. */
  community_pack_added: { packId: string };
  /** Cards 2.1 §2.2: лайк набора поставлен/снят — плитки и экран набора обновляют счётчик. */
  community_pack_like_changed: { packId: string; liked: boolean };
  /**
   * Отклик под набором опубликован или удалён (владелец 2026-09-04).
   *
   * зачем событие, а не перечитывание: счётчик «💬» показан в четырёх местах
   * (плитка, строка каталога, экран набора, витрина топа). Без общего события
   * список отставал бы до полного перезахода в раздел — ровно та жалоба, что уже
   * была на лайк. `delta` вместо абсолютного числа: у каждого экрана своя
   * оптимистичная цифра, и складывать сдвиг безопаснее, чем навязывать значение.
   */
  community_pack_comments_changed: { packId: string; delta: number };
  /**
   * зачем: «дай пять» другу можно поставить и в строке списка друзей, и в карточке
   * игрока — оба места держат сердце в согласии через это событие, без лишних чтений.
   */
  profile_like_changed: { targetUid: string; liked: boolean };
};

/** Canonical locale payload for `action_toast` without duplicating field mapping. */
export function actionToastTri(
  type: AppEventMap['action_toast']['type'],
  m: { ru: string; uk: string; es: string; en?: string } & PlannedTriLangCopy,
): AppEventMap['action_toast'] {
  return {
    type,
    messageRu: m.ru,
    messageUk: m.uk,
    messageEn: m.en,
    messageEs: m.es,
    messagePtBr: m['pt-BR'],
    messageVi: m.vi,
    messageId: m.id,
    messageTr: m.tr,
    messagePl: m.pl,
  };
}

// зачем (координатор 05.10, пакет 01:26, «сперва логи»): событие app_first_content_ready приходило по 4–5 раз,
// а ворота сплеша первое как будто не засчитывали. Печатаем, КТО прислал (именованные кадры стека) и когда
// (мс от старта процесса) — только в dev.
let firstContentReadyEmitCount = 0;
function logFirstContentReadyEmit(): void {
  if (!(globalThis as { __DEV__?: boolean }).__DEV__) return;
  firstContentReadyEmitCount += 1;
  const entryAt = (globalThis as { __phrasemanEntryEpochMs?: number }).__phrasemanEntryEpochMs;
  const sinceEntryMs = typeof entryAt === 'number' ? Date.now() - entryAt : null;
  const frames: string[] = [];
  for (const line of (new Error().stack ?? '').split('\n').slice(2, 30)) {
    const name = /at\s+([^\s(]+)/.exec(line.trim())?.[1] ?? '';
    if (!name || name === 'emitAppEvent' || name === 'logFirstContentReadyEmit' || name.startsWith('?anon')
      || name === 'anonymous' || name === 'next' || name === 'asyncGeneratorStep') continue;
    frames.push(name);
    if (frames.length >= 4) break;
  }
  console.warn('[BOOTSPLASH-EVT] emit app_first_content_ready', JSON.stringify({
    n: firstContentReadyEmitCount,
    sinceEntryMs,
    source: frames.join(' <- ') || 'unknown',
  }));
}

export function emitAppEvent<K extends keyof AppEventMap>(
  event: K,
  payload?: AppEventMap[K]
): void {
  if (event === 'app_first_content_ready') {
    appFirstContentReadyFired = true;
    logFirstContentReadyEmit();
  }
  if (event === 'app_home_screen_ready') {
    appHomeScreenReadyFired = true;
  }
  if (event === 'action_toast' && payload !== undefined) {
    const p = payload as AppEventMap['action_toast'];
    const k = `${p.type}\u0001${p.messageRu.replace(/\s+/g, ' ').trim()}`;
    const now = Date.now();
    if (k === _lastActionToastKey && now - _lastActionToastEmitAt < ACTION_TOAST_EMIT_BURST_MS) {
      // зачем (координатор 12.10, «сперва логи»: dev_state?toast=… не показывает тост на Главной): повтор того же тоста в окне анти-всплеска молча отбрасывался.
      // зачем (координатор 12.10, полный прогон): голый __DEV__ вне React Native (тесты, node) — ReferenceError, тост терялся с исключением; та же форма, что в строке 263.
      if ((globalThis as { __DEV__?: boolean }).__DEV__) console.log(`[DEV-STATE] toast: emit отброшен как повтор type=${p.type} за ${now - _lastActionToastEmitAt}мс (окно ${ACTION_TOAST_EMIT_BURST_MS}мс) текст="${p.messageRu.slice(0, 60)}"`); // guard-ok: ранний выход называет причину
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
      .catch(noteSwallowedHandler('events:promise_1'));
  }
}

export function onAppEvent<K extends keyof AppEventMap>(
  event: K,
  handler: (payload: AppEventMap[K]) => void
): { remove: () => void } {
  const sub = DeviceEventEmitter.addListener(event, handler as (...args: unknown[]) => void);
  const replayLatchedEvent = event === 'app_first_content_ready'
    ? appFirstContentReadyFired
    : event === 'app_home_screen_ready'
      ? appHomeScreenReadyFired
      : false;
  if (!replayLatchedEvent) {
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
