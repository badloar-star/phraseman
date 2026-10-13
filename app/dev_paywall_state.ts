/**
 * DEV-состояния пейвола Plus для робот-съёмки: `premium_modal?…&_dev_state=<имя>` (R1_SHOT_LIST «нет пути», paywalls-011…016/018, paywall-gap-006).
 *
 * зачем (координатор 12.10): часть состояний пейвола невозможна в dev без магазина — скелетон загрузки (loadOfferings выходит при DEV_IAP_BYPASS),
 * ошибка цен, «≈» справочной цены, идёт оплата, ожидание банка, неизвестный исход, промо магазина, экран «Plus твой. Напомнить…».
 * Здесь — чистая подмена того, что хук usePaywallPurchase отдаёт экрану; магазин, сеть, Firestore и покупки НЕ вызываются.
 * Только `__DEV__ && !IS_STORE_RELEASE`: в стор-сборке parseDevPaywallState всегда null, а applyDevPaywallView возвращает вид без изменений.
 * Логи: [DEV-STATE] на каждой ветке.
 */
import { IS_STORE_RELEASE } from './config';
import { DEV_PREVIEW_MONTHLY_PRICE, DEV_PREVIEW_YEARLY_PER_MONTH, DEV_PREVIEW_YEARLY_PRICE } from './paywall_dev_preview';
import type { StoreUnavailableReason } from './paywall_billing_unavailable';
import type { PaywallPriceSource } from './paywall_reference_prices';
import { resolvePaywallReferencePrices } from './paywall_reference_prices';
import type { StorePromoPricing } from './premium_store_promo_display';

export const DEV_PAYWALL_STATES = [
  'loading', 'live', 'reference', 'error_no_prices', 'billing_unavailable',
  'purchasing', 'restoring', 'pending', 'unknown_outcome', 'status_unknown', 'store_promo', 'reminder_prompt', 'store_unreachable',
] as const;
export type DevPaywallState = (typeof DEV_PAYWALL_STATES)[number];

/** Псевдонимы из заданий («failed», «purchase_pending»…) → каноническое имя. */
const ALIASES: Readonly<Record<string, DevPaywallState>> = {
  failed: 'error_no_prices',
  purchase_pending: 'pending',
  purchase_failed: 'unknown_outcome',
  promo: 'store_promo',
  checkout_error: 'store_unreachable',
};

const LOG = '[DEV-STATE]';

function devPaywallAvailable(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE;
}

/** Параметр маршрута → состояние. В стор-сборке и на неизвестное значение — null (с логом причины). */
export function parseDevPaywallState(raw: unknown): DevPaywallState | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string' || !value.trim()) return null;
  if (!devPaywallAvailable()) {
    console.warn(`${LOG} paywall: _dev_state игнорируется — не dev-сборка`, { value }); // guard-ok: ранний выход логируется
    return null;
  }
  const key = value.trim().toLowerCase();
  const state = (DEV_PAYWALL_STATES as readonly string[]).includes(key) ? (key as DevPaywallState) : ALIASES[key] ?? null;
  if (!state) {
    console.warn(`${LOG} paywall: неизвестное _dev_state=${key}; допустимо: ${DEV_PAYWALL_STATES.join('|')}`); // guard-ok: ранний выход логируется
    return null;
  }
  console.log(`${LOG} paywall: _dev_state=${state}`); // guard-ok: единичный лог на открытие окна
  return state;
}

/**
 * Состояние «по ссылке»: `dev_state?paywall=loading|live|reference|failed` — для окон без своего `_dev_state` (пейвол онбординга, `onboarding-025`,
 * `onboarding-paywall-001`). Явный `_dev_state` у окна сильнее. В памяти процесса; `paywall=off` снимает. В стор-сборке всегда null.
 */
let linkState: DevPaywallState | null = null;

export function setDevPaywallLinkState(state: DevPaywallState | null): boolean {
  if (!devPaywallAvailable()) {
    console.warn(`${LOG} paywall: paywall= отклонён — не dev-сборка`, { state }); // guard-ok: ранний выход логируется
    return false;
  }
  linkState = state;
  console.log(`${LOG} paywall: по ссылке = ${state ?? 'off'}`); // guard-ok: единичный лог на ссылку
  return true;
}

export function getDevPaywallLinkState(): DevPaywallState | null {
  return devPaywallAvailable() ? linkState : null;
}

/**
 * `dev_state?manage=loading` (Авторизация 12.10, paywalls-020 = profile-019): «Управление подпиской» держит скелетон
 * `manage-subscription-loading` — загрузка данных магазина не начинается. Без подмены скелетон живёт доли секунды. Только память.
 */
let manageLoadingHold = false;

export function setDevManageLoadingHold(on: boolean): boolean {
  if (!devPaywallAvailable()) {
    console.warn(`${LOG} paywall: manage= отклонён — не dev-сборка`, { on }); // guard-ok: ранний выход логируется
    return false;
  }
  manageLoadingHold = on;
  console.log(`${LOG} paywall: manage=${on ? 'loading' : 'off'}`); // guard-ok: единичный лог на ссылку
  return true;
}

export function isDevManageLoadingHold(): boolean {
  return devPaywallAvailable() && manageLoadingHold;
}

/**
 * `dev_state?restorepurchase=empty` (Авторизация 13.10, profile-024 / paywalls-022): «Восстановить покупки» в «Управлении Plus» сразу показывает
 * «Покупок не нашлось» — магазин не вызывается (без подмены тап уходил в настоящий магазин и давал «не удалось проверить»). Только память.
 */
let restorePurchaseEmpty = false;

export function setDevRestorePurchaseEmpty(on: boolean): boolean {
  if (!devPaywallAvailable()) {
    console.warn(`${LOG} paywall: restorepurchase= отклонён — не dev-сборка`, { on }); // guard-ok: ранний выход логируется
    return false;
  }
  restorePurchaseEmpty = on;
  console.log(`${LOG} paywall: restorepurchase=${on ? 'empty' : 'off'}`); // guard-ok: единичный лог на ссылку
  return true;
}

export function isDevRestorePurchaseEmpty(): boolean {
  return devPaywallAvailable() && restorePurchaseEmpty;
}

/**
 * `dev_state?upsell=first_lesson|three_lessons` (Авторизация 12.10, paywalls-009/010): мягкое предложение Plus на итоге урока
 * без кулдаунов и отметок показа — экран рисует подставное предложение, отметка «показано» в хранилище НЕ пишется.
 * `dev_state?ai_explain=limit` (paywalls-008): карточка ИИ-разбора ошибки сразу в состоянии «лимит дня», без вызова сервера.
 */
export const DEV_LESSON_UPSELLS = ['first_lesson', 'three_lessons'] as const;
export type DevLessonUpsell = (typeof DEV_LESSON_UPSELLS)[number];
let lessonUpsell: DevLessonUpsell | null = null;
let aiExplainLimit = false;
/**
 * зачем (координатор 13.10, mistakes-panel-016): «Почему» на кадре показывало отказ ИИ (лимит дня), а в образце — объяснение
 * с «Объясни проще». `ai_explain=demo` подставляет текст образца без вызова сервера и без расхода бесплатного разбора дня.
 */
const DEV_AI_EXPLAIN_DEMO_TEXT = 'Grand- добавляет поколение: grandmother — бабушка, grandchildren — внуки. Дети — это children.';
let aiExplainDemo = false;

export function setDevLessonUpsell(value: DevLessonUpsell | null): boolean {
  if (!devPaywallAvailable()) {
    console.warn(`${LOG} paywall: upsell= отклонён — не dev-сборка`, { value }); // guard-ok: ранний выход логируется
    return false;
  }
  lessonUpsell = value;
  console.log(`${LOG} paywall: upsell=${value ?? 'off'}`); // guard-ok: единичный лог на ссылку
  return true;
}

export function getDevLessonUpsell(): DevLessonUpsell | null {
  return devPaywallAvailable() ? lessonUpsell : null;
}

export function setDevAiExplainLimit(on: boolean): boolean {
  if (!devPaywallAvailable()) {
    console.warn(`${LOG} paywall: ai_explain= отклонён — не dev-сборка`, { on }); // guard-ok: ранний выход логируется
    return false;
  }
  aiExplainLimit = on;
  console.log(`${LOG} paywall: ai_explain=${on ? 'limit' : 'off'}`); // guard-ok: единичный лог на ссылку
  return true;
}

export function isDevAiExplainLimit(): boolean {
  return devPaywallAvailable() && aiExplainLimit;
}

export function setDevAiExplainDemo(on: boolean): boolean {
  if (!devPaywallAvailable()) {
    console.warn(`${LOG} paywall: ai_explain=demo отклонён — не dev-сборка`, { on }); // guard-ok: ранний выход логируется
    return false;
  }
  aiExplainDemo = on;
  console.log(`${LOG} paywall: ai_explain=${on ? 'demo' : 'off (demo)'}`); // guard-ok: единичный лог на ссылку
  return true;
}

/** Текст демо-объяснения или null (подмена выключена / не dev-сборка). */
export function getDevAiExplainDemoText(): string | null {
  return devPaywallAvailable() && aiExplainDemo ? DEV_AI_EXPLAIN_DEMO_TEXT : null;
}

/**
 * `dev_state?lessonsDone=N&examA1=almost|passed` (координатор 12.10, learn-007…013 — экзамен «почти»/Free, окна «Ещё рано»/
 * «Уровень закрыт»/«Недоступно»): первые N уроков пройдены на 5 звёзд, результат экзамена A1 — в памяти поверх снимка списка
 * уроков (lessons_tab_state). Хранилище, облако и прогресс человека НЕ меняются; в стор-сборке — заглушка.
 */
export type DevLessonsProgress = Readonly<{ done: number; examA1: 'almost' | 'passed' | null }>;
let lessonsProgress: DevLessonsProgress | null = null;

export function setDevLessonsProgress(value: DevLessonsProgress | null): boolean {
  if (!devPaywallAvailable()) {
    console.warn(`${LOG} lessons: прогресс отклонён — не dev-сборка`, { value }); // guard-ok: ранний выход логируется
    return false;
  }
  lessonsProgress = value ? Object.freeze({ done: Math.max(0, Math.min(32, Math.floor(value.done))), examA1: value.examA1 }) : null;
  console.log(`${LOG} lessons: прогресс=${JSON.stringify(lessonsProgress)} (только память)`); // guard-ok: единичный лог на ссылку
  return true;
}

export function getDevLessonsProgress(): DevLessonsProgress | null {
  return devPaywallAvailable() ? lessonsProgress : null;
}

/**
 * зачем (Макеты f5564eafa, learn-012/013): в dev-сборке DEV_CONTENT_UNLOCK открывает весь курс — тап по экзамену всегда вёл на
 * экран зачёта, и окна «Уровень пока закрыт» (A11) и «Недоступно» (A12) были недостижимы. `real` — ворота как в релизе при Plus;
 * `legacyCap` — сохранённый бесплатный потолок старого аккаунта (D122) при plus=off. Только память процесса.
 */
export type DevLessonGates = Readonly<{ real: boolean; legacyCap: number | null }>;
let lessonGates: DevLessonGates | null = null;

export function setDevLessonGates(value: DevLessonGates | null): boolean {
  if (!devPaywallAvailable()) {
    console.warn(`${LOG} lessons: ворота отклонены — не dev-сборка`, { value }); // guard-ok: ранний выход логируется
    return false;
  }
  lessonGates = value
    ? Object.freeze({ real: value.real, legacyCap: value.legacyCap === null ? null : Math.max(1, Math.min(32, Math.floor(value.legacyCap))) })
    : null;
  console.log(`${LOG} lessons: ворота=${JSON.stringify(lessonGates)} (только память)`); // guard-ok: единичный лог на ссылку
  return true;
}

export function getDevLessonGates(): DevLessonGates | null {
  return devPaywallAvailable() ? lessonGates : null;
}

/**
 * зачем (settings-gap-005, координатор 13.10): плашка «Полный доступ на 3 дня» в Настройках видна только при активном
 * пробном доступе — у гостя эмулятора его нет. Подмена в памяти: доступ «начат сейчас», кончается через 3 дня. Хранилище,
 * облако, уведомления и деньги не трогаются; в стор-сборке — заглушка.
 */
export type DevIntroFullAccess = Readonly<{ startedAt: number; endsAt: number }>;
const DEV_INTRO_FULL_ACCESS_MS = 3 * 24 * 60 * 60 * 1000;
let introFullAccess: DevIntroFullAccess | null = null;

export function setDevIntroFullAccess(active: boolean, nowMs: number = Date.now()): boolean {
  if (!devPaywallAvailable()) {
    console.warn(`${LOG} intro: подмена отклонена — не dev-сборка`, { active }); // guard-ok: ранний выход логируется
    return false;
  }
  introFullAccess = active ? Object.freeze({ startedAt: nowMs, endsAt: nowMs + DEV_INTRO_FULL_ACCESS_MS }) : null;
  console.log(`${LOG} intro: пробный доступ=${JSON.stringify(introFullAccess)} (только память)`); // guard-ok: единичный лог на ссылку
  return true;
}

export function getDevIntroFullAccess(): DevIntroFullAccess | null {
  return devPaywallAvailable() ? introFullAccess : null;
}

export type PaywallDevView = {
  loading: boolean;
  offeringsSettled: boolean;
  offeringsFailed: boolean;
  storeUnavailableReason: StoreUnavailableReason | null;
  previewPrices: boolean;
  priceSource: PaywallPriceSource;
  pricesApproximate: boolean;
  yearlyPriceSource: PaywallPriceSource;
  monthlyPriceSource: PaywallPriceSource;
  yearlyPrice: string;
  monthlyPrice: string;
  yearlyPerMonth: string;
  monthlyPerMonth: string;
  pricesFromCache: boolean;
  purchasing: boolean;
  payStarted: boolean;
  restoring: boolean;
  tapNotice: boolean;
  storePromo: Readonly<Record<'yearly' | 'monthly' | 'lifetime', StorePromoPricing | null>>;
  selectedPromo: StorePromoPricing | null;
  trialReminderPrompt: { days: number; priceLabel: string; trialStartMs: number } | null;
};

const NO_PRICES = {
  yearlyPrice: '', monthlyPrice: '', yearlyPerMonth: '', monthlyPerMonth: '',
  priceSource: 'none' as PaywallPriceSource, yearlyPriceSource: 'none' as PaywallPriceSource, monthlyPriceSource: 'none' as PaywallPriceSource,
  pricesApproximate: false, pricesFromCache: false, previewPrices: false,
};

const LIVE_PRICES = {
  yearlyPrice: DEV_PREVIEW_YEARLY_PRICE, monthlyPrice: DEV_PREVIEW_MONTHLY_PRICE, yearlyPerMonth: DEV_PREVIEW_YEARLY_PER_MONTH, monthlyPerMonth: DEV_PREVIEW_MONTHLY_PRICE,
  priceSource: 'store' as PaywallPriceSource, yearlyPriceSource: 'store' as PaywallPriceSource, monthlyPriceSource: 'store' as PaywallPriceSource,
  pricesApproximate: false, pricesFromCache: false, previewPrices: false,
};

const SETTLED = { loading: false, offeringsSettled: true, offeringsFailed: false, storeUnavailableReason: null as StoreUnavailableReason | null };

/** Подмена вида хука. Чистая функция: без состояния, сети и магазина. Вне dev-сборки возвращает вид как есть. */
export function applyDevPaywallView<T extends PaywallDevView>(state: DevPaywallState | null, view: T, selected: 'monthly' | 'yearly' | 'lifetime'): T {
  if (!state) return view;
  if (!devPaywallAvailable()) {
    console.warn(`${LOG} paywall: подмена вида отклонена — не dev-сборка`, { state }); // guard-ok: ранний выход логируется
    return view;
  }
  switch (state) {
    case 'loading':
      return { ...view, ...NO_PRICES, loading: true, offeringsSettled: false, offeringsFailed: false, storeUnavailableReason: null };
    case 'live':
      return { ...view, ...LIVE_PRICES, ...SETTLED };
    case 'reference': {
      const reference = resolvePaywallReferencePrices();
      console.log(`${LOG} paywall: reference yearly=${reference.yearly} monthly=${reference.monthly}`); // guard-ok: единичный лог
      return {
        ...view, ...SETTLED,
        yearlyPrice: reference.yearly, monthlyPrice: reference.monthly, yearlyPerMonth: reference.yearlyPerMonth ?? '', monthlyPerMonth: '',
        priceSource: 'reference', yearlyPriceSource: 'reference', monthlyPriceSource: 'reference',
        pricesApproximate: true, pricesFromCache: false, previewPrices: false,
      };
    }
    case 'error_no_prices':
      return { ...view, ...NO_PRICES, loading: false, offeringsSettled: true, offeringsFailed: true, storeUnavailableReason: 'network' };
    case 'billing_unavailable':
      return { ...view, ...NO_PRICES, loading: false, offeringsSettled: true, offeringsFailed: true, storeUnavailableReason: 'billing_unavailable' };
    case 'purchasing':
      return { ...view, ...LIVE_PRICES, ...SETTLED, purchasing: true, payStarted: true };
    case 'restoring':
      return { ...view, ...LIVE_PRICES, ...SETTLED, restoring: true };
    case 'pending':
      // зачем (владелец 13.10): ожидание оплаты — тост, кнопка НЕ висит со спиннером, окна нет.
      return { ...view, ...LIVE_PRICES, ...SETTLED };
    case 'unknown_outcome':
      // Как на макете: под диалогом тарифы и кнопка неактивны (идёт/шла оплата).
      return { ...view, ...LIVE_PRICES, ...SETTLED, purchasing: true, payStarted: true };
    case 'status_unknown':
      return { ...view, ...LIVE_PRICES, ...SETTLED };
    case 'store_unreachable':
      // зачем (координатор 12.10, dev-состояния пейвола для съёмки): paywalls-012 «Ошибка до checkout»: цены магазина на плитках, под кнопкой «Попробуй через минуту» (tapNotice), тост «Не удалось связаться с магазином» приходит из эффекта хука.
      return { ...view, ...LIVE_PRICES, ...SETTLED, tapNotice: true };
    case 'store_promo': {
      const yearlyPromo: StorePromoPricing = { discountPercent: 30, promoPriceString: '€27,99', standardPriceString: DEV_PREVIEW_YEARLY_PRICE };
      const monthlyPromo: StorePromoPricing = { discountPercent: 25, promoPriceString: '€5,99', standardPriceString: DEV_PREVIEW_MONTHLY_PRICE };
      const storePromo = { yearly: yearlyPromo, monthly: monthlyPromo, lifetime: null };
      return { ...view, ...LIVE_PRICES, ...SETTLED, storePromo, selectedPromo: storePromo[selected] ?? null };
    }
    case 'reminder_prompt':
      return { ...view, ...LIVE_PRICES, ...SETTLED, trialReminderPrompt: { days: 3, priceLabel: DEV_PREVIEW_YEARLY_PRICE, trialStartMs: Date.now() } };
  }
}
