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
  'card_editor_create',
  'flashcards_hub_speaking',
  'flashcards_hub_training_mode',
  'flashcards_hub_daily_practice',
  'flashcards_hub_train',
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
  // Голосовая практика вне карточной сессии: кнопка «Устно» в уроках и
  // hold-to-talk без авторизованной сессии. Раньше шли без source (legacy 'direct').
  'lesson_speaking',
  'flashcards_speak_hold',
  // Замок статистики (StatsPremiumBlur) раньше открывал пейвол без source.
  'stats_locked_card',
  // зачем (2026-09-13): каждая точка входа пейвола получает свой source —
  // раньше 23 вызова падали в legacy-дефолт 'direct' и воронка их не различала.
  'home_mistake_practice',
  'avatar_aura_picker',
  'flashcards_collection',
  'mistake_practice_direct',
  'phrase_analytics',
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
  'season_pass_lane',
  'notification_upsell',
  'dev_hub',
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

/**
 * Trusts the live entitlement snapshot, never route params. Unknown commercial
 * dimensions throw in DEV/tests and fail closed (dismiss) in production.
 */
export function resolvePremiumModalEntry(input: Readonly<{
  params: RawPaywallEntryParams;
  accessResolved: boolean;
  hasPremiumAccess: boolean;
  impressionId: string;
}>): PremiumModalEntryResolution {
  if (!input.accessResolved) return { decision: 'wait' };
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
