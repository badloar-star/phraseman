import { PREMIUM_CONTEXT_SET, type PremiumContext } from './premium_context';

export const PAYWALL_CREATIVE_REVISION = 'revenue-vnext-2026-09-12-r1' as const;

export const PAYWALL_SOURCE_VALUES = [
  'direct',
  'onboarding',
  'onboarding_plan',
  'settings_premium',
  'settings_language_picker',
  'lesson_complete_soft_upsell',
  'language_welcome_gate',
  'language_welcome_cta',
  'pack_create',
  // зачем (Карточки 2.0 12.10): лимит 3 своих наборов у Free показывается на входе в «Новый набор» — отдельный source для воронки
  'pack_create_limit',
  // зачем (Карточки 2.0 12.10): лимит 50 своих карточек у Free показывается на входе в редактор карточки
  'card_editor_limit',
  // зачем (Карточки 2.0 12.10): «Безлимит с Plus» в настройке тренировки при исчерпанном месячном лимите
  'flashcards_training_setup',
  // зачем (режим энергии Б 12.10): кнопка Plus в шторке остановки занятия
  'energy_stop_sheet',
  // зачем: окно "Последний шанс" Пика (моменты v3) — отдельный источник в воронке пейвола
  'spire_last_chance',
  'card_editor_create',
  'flashcards_hub_speaking',
  'flashcards_hub_training_mode',
  'flashcards_hub_train',
  // зачем (координатор 15.10): шторка режимов на экране ролика открывает пейвол со своим источником — воронка отличает «Тренировать» из ролика от хаба Карточек
  'video_watch_train',
  'flashcards_training_setup_direct',
  'flashcards_training_direct',
  'flashcards_training_start',
  'flashcards_blitz_direct',
  'flashcards_recall_direct',
  'flashcards_speaking_direct',
  'ai_companion_direct_entry',
  'ai_dialog_direct_entry',
  'ai_dialog_voice_input',
  'ai_dialog_retry',
  // зачем (2026-09-13): дневной лимит реплик исчерпан ПО ОТВЕТУ сервера, а не на
  // входе — отдельный source, чтобы воронка видела «дошёл до лимита в диалоге».
  'ai_dialog_daily_limit',
  'dialog_analysis',
  // Каталог диалогов: замок по дневному лимиту или апселл «все уровни».
  'dialogs_catalogue',
  // Арена: дневная попытка (1 матч/сутки) израсходована — кнопка «Играть».
  'arena_hub_play',
  // Тот же лимит, но человек пришёл на экран поиска НЕ из хаба: «Играть снова»
  // и «Реванш» с результатов, «попробовать снова» с матча, квест с Главной.
  'arena_matchmaking_direct',
  // Диалоги: платный сценарий открыт прямым роутом мимо каталога.
  'ai_dialog_briefing_direct',
  // Голосовая практика вне карточной сессии: кнопка «Устно» в уроках и
  // hold-to-talk без авторизованной сессии. Раньше шли без source (legacy 'direct').
  'lesson_speaking',
  'flashcards_speak_hold',
  // Замок статистики (StatsPremiumBlur) раньше открывал пейвол без source.
  'stats_locked_card',
  // зачем (2026-09-13): каждая точка входа пейвола получает свой source —
  // раньше 23 вызова падали в legacy-дефолт 'direct' и воронка их не различала.
  'home_mistake_practice',
  // зачем (2026-09-14): дневной лимит сессий ошибок исчерпан - кнопка «Разобрать» в хабе.
  'mistakes_hub_start',
  // зачем (Ревизор 2.76, координатор 15.10): «Добить: Ещё учу» на итоге урока и диалога и «Ещё N» на финале тренировки ошибок шли в
  // сессию мимо дневной квоты — теперь через тот же гейт, у каждой точки свой source для воронки.
  'lesson_complete_finish',
  'mistake_finale_more',
  'dialogue_v2_finish_mistakes',
  'avatar_aura_picker',
  'flashcards_collection',
  // зачем (координатор 18.10, Ревизор acd177ed2): «Сохранить» на карточке из видео при лимите Free открывает пейвол-шторку (context flashcard_limit) — у точки свой source для воронки.
  'video_card_save',
  'mistake_practice_direct',
  'settings_theme_picker',
  'stats_streak',
  'intro_ended',
  'add_to_flashcard',
  'no_energy_modal',
  'lesson_menu',
  'level_exam',
  'home_streak',
  'afterwin_levelup',
  // Карточка возврата истёкшего Plus/VIP (EntitlementExpiredHost): раньше
  // уходила без source и сливалась с прямыми ссылками в воронке возврата.
  'entitlement_expired',
  'winback',
  'referral_ended',
  'notification_upsell',
  'dev_hub',
  // зачем (2026-09-20): пять живых точек входа, которых не было в списке. На
  // релизе `rejectUnknown` возвращал null → `dismiss`, и кнопка Plus молча
  // закрывала модалку вместо продажи; в DEV падала красным экраном. Имена
  // сохранены как в вызывающих экранах — слить их в существующие означало бы
  // склеить разные кнопки в одну строку воронки.
  // Бейдж скидки по центру шапки Главной (HomeDiscountBadge).
  'home_header_center',
  // «Разбор урока» у репетитора — закрытый разбор, не дневной лимит.
  'tutor_lesson_review',
  // Афиша репетитора в табе «Диалоги», когда дневной лимит исчерпан.
  'dialogs_tutor_poster',
  // Дневной лимит реплик у ИИ-компаньона (ai_companion_session).
  'ai_companion_daily_limit',
  // «Работа над ошибками» внутри урока Learning V2.
  'learning_v2',
  // зачем (D194, Дизайн 15.10): исчерпан дневной лимит голоса на микрофоне занятия нового курса — пейвол ai_voice_input.
  'learning_v2_course_voice',
  // зачем (30.09): живые точки входа 2.0, которых не было в списке — без них
  // rejectUnknown превращал кнопку Plus в «закрыть». Диалоги V2 (хаб, сессия,
  // свободный разговор, память), компаньон диалогов и «нет энергии» в Шпиле.
  'dialogue_v2_hub',
  'dialogue_v2_session',
  'dialogue_v2_freeform',
  'dialogue_v2_memory',
  'dialogs_companion',
  'spire_no_energy',
  // зачем (Ядро 11.10): тап по пушу «VIP заканчивается» (notification_tap_handler) — источника не было в списке,
  // и в стор-сборке окно Plus закрывалось само вместо показа.
  'notification_premium_expiry',
] as const;

export type PaywallSource = (typeof PAYWALL_SOURCE_VALUES)[number];
export type PaywallEntitlementState = 'unresolved' | 'free' | 'plus';

export type PaywallAttribution = Readonly<{
  campaign: string;
  variant: string;
}>;

export interface PaywallEntry {
  readonly context: PremiumContext;
  readonly source: PaywallSource;
  readonly creativeRevision: typeof PAYWALL_CREATIVE_REVISION;
  readonly impressionId: string;
  readonly entitlementState: PaywallEntitlementState;
  readonly attribution?: PaywallAttribution;
}

export function paywallEntryAnalyticsParams(entry: PaywallEntry | undefined): Readonly<{
  creative_revision?: typeof PAYWALL_CREATIVE_REVISION;
  entitlement_state?: PaywallEntitlementState;
  attribution_campaign?: string;
  attribution_variant?: string;
}> {
  if (!entry) return Object.freeze({});
  return Object.freeze({
    creative_revision: entry.creativeRevision,
    entitlement_state: entry.entitlementState,
    ...(entry.attribution ? {
      attribution_campaign: entry.attribution.campaign,
      attribution_variant: entry.attribution.variant,
    } : {}),
  });
}

type RawParam = string | string[] | undefined;
export type RawPaywallEntryParams = Readonly<Record<string, RawParam>>;

export type PremiumModalEntryResolution =
  | { readonly decision: 'wait' }
  | { readonly decision: 'dismiss' }
  | { readonly decision: 'show'; readonly entry: PaywallEntry };

const PAYWALL_SOURCE_SET: ReadonlySet<string> = new Set(PAYWALL_SOURCE_VALUES);
const LEGACY_CONTEXT_ALIASES: Readonly<Record<string, PremiumContext>> = Object.freeze({
  ai_dialog: 'dialog_limit',
  hall_of_fame: 'generic',
});

function first(raw: RawParam): string {
  return String(Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '')).trim();
}

export function normalizePaywallAttributionValue(raw: RawParam): string | null {
  const value = first(raw)
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(0, 32);
  return value || null;
}

function parseAttribution(params: RawPaywallEntryParams): PaywallAttribution | undefined {
  const campaign = normalizePaywallAttributionValue(params.attribution_campaign);
  const variant = normalizePaywallAttributionValue(params.attribution_variant);
  return campaign && variant ? Object.freeze({ campaign, variant }) : undefined;
}

function strictContractRuntime(): boolean {
  return (typeof __DEV__ !== 'undefined' && __DEV__)
    || (typeof process !== 'undefined' && process.env.NODE_ENV === 'test');
}

function rejectUnknown(code: string): null {
  if (strictContractRuntime()) throw new Error(code);
  // зачем (2026-09-20): в релизе отказ fail-closed — модалка закрывается, и это
  // правильнее крэша в руках у человека. Но раньше он был НЕМЫМ: кнопка Plus
  // просто ничего не делала, владелец о потере не узнавал, а воронка видела
  // вход без показа пейвола. Лог обязателен (запрет немого отказа) — по
  // префиксу [PAYWALL-ENTRY] вся цепочка вытаскивается одним grep.
  console.warn(`[PAYWALL-ENTRY] reject — пейвол НЕ показан, вход закрыт: ${code}`);
  return null;
}

function parseContext(raw: RawParam): PremiumContext | null {
  const value = first(raw) || 'generic'; // explicit legacy direct-link default
  const alias = LEGACY_CONTEXT_ALIASES[value];
  if (alias) return alias;
  if (PREMIUM_CONTEXT_SET.has(value as PremiumContext)) return value as PremiumContext;
  return rejectUnknown(`unknown_paywall_context:${value}`);
}

function parseSource(raw: RawParam): PaywallSource | null {
  const value = first(raw) || 'direct'; // explicit legacy call-site default
  if (PAYWALL_SOURCE_SET.has(value)) return value as PaywallSource;
  return rejectUnknown(`unknown_paywall_source:${value}`);
}

export function createPaywallEntry(input: Readonly<{
  context: PremiumContext;
  source: PaywallSource;
  entitlementState: PaywallEntitlementState;
  impressionId: string;
  attribution?: PaywallAttribution;
}>): PaywallEntry {
  const impressionId = input.impressionId.trim();
  if (!impressionId || impressionId.length > 80) {
    throw new Error('invalid_paywall_impression_id');
  }
  return {
    context: input.context,
    source: input.source,
    creativeRevision: PAYWALL_CREATIVE_REVISION,
    impressionId,
    entitlementState: input.entitlementState,
    ...(input.attribution ? { attribution: input.attribution } : {}),
  };
}

/** Последний известный доступ из синхронного снимка профиля (до ответа живой проверки). */
export type CachedPaywallEntitlement = 'free' | 'premium' | 'unknown';

/**
 * Trusts the live entitlement snapshot, never route params. Unknown commercial
 * dimensions throw in DEV/tests and fail closed (dismiss) in production.
 *
 * зачем (§141, 04.10, правило владельца «каждый раздел открывается мгновенно»): пока живой доступ
 * уточняется, окно не ждёт на пустом градиенте — при точно известном «бесплатно» показывается сразу.
 * Plus/неизвестно — прежнее ожидание: платному окно покупки не мелькает. Если живой статус окажется
 * Plus, сработает обычный dismiss.
 */
/**
 * PM-214 (04.10): входные данные резолвера окна Plus с учётом потолка ожидания.
 * До потолка — как было (ждём резолв, если кэш не «free»). После потолка без резолва:
 * кэш «premium» → считаем доступ есть (окно закроется); кэш «unknown» → считаем, что нет (окно покажется).
 * Поздний резолв возвращает живые значения — подписчика окно закроет прежний путь «dismiss».
 */
export function paywallEntryAccessInputs(input: Readonly<{
  accessResolved: boolean;
  hasPremiumAccess: boolean;
  cachedEntitlement: CachedPaywallEntitlement;
  waitCeilingPassed: boolean;
}>): Readonly<{ accessResolved: boolean; hasPremiumAccess: boolean; source: 'live' | 'wait' | 'ceiling_cache' }> {
  if (input.accessResolved) return { accessResolved: true, hasPremiumAccess: input.hasPremiumAccess, source: 'live' };
  if (!input.waitCeilingPassed) return { accessResolved: false, hasPremiumAccess: input.hasPremiumAccess, source: 'wait' };
  return { accessResolved: true, hasPremiumAccess: input.cachedEntitlement === 'premium', source: 'ceiling_cache' };
}

export function resolvePremiumModalEntry(input: Readonly<{
  params: RawPaywallEntryParams;
  accessResolved: boolean;
  hasPremiumAccess: boolean;
  impressionId: string;
  cachedEntitlement?: CachedPaywallEntitlement;
}>): PremiumModalEntryResolution {
  if (!input.accessResolved && input.cachedEntitlement !== 'free') return { decision: 'wait' };
  if (input.hasPremiumAccess) return { decision: 'dismiss' };

  const context = parseContext(input.params.context);
  const source = parseSource(input.params.source);
  if (!context || !source) return { decision: 'dismiss' };

  return {
    decision: 'show',
    entry: createPaywallEntry({
      context,
      source,
      entitlementState: 'free',
      impressionId: input.impressionId,
      attribution: parseAttribution(input.params),
    }),
  };
}

export default function __RouteShim() { return null; }
