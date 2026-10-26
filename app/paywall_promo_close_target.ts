// paywall_promo_close_target.ts — куда вести по «закрыть» на экране промокода: обратно в пейвол или обычное «назад».
//
// зачем (правило владельца «назад ведёт туда, откуда пришёл»; Ревизор + координатор 26.10): промокод, открытый из пейвола, несёт вход пейвола в параметрах маршрута
// (paywall_context / paywall_source). Параметры маршрута — граница системы: их можно подставить диплинком (promo_code_entry?source=paywall&paywall_context=мусор),
// и пейвол с неизвестным входом тихо закрывается (rejectUnknown). Поэтому в пейвол возвращаем ТОЛЬКО пару из контракта — context из PREMIUM_CONTEXT_SET и source из
// PAYWALL_SOURCE_VALUES; иначе обычное «назад» и строка журнала с причиной и пришедшими значениями.
// Файл чистый: импортирует только контракты (без react-native и без навигации) — его берут лёгкие тесты и экран промокода.
import { PAYWALL_SOURCE_VALUES, type PaywallSource } from './paywall_entry_contract';
import { PREMIUM_CONTEXT_SET, type PremiumContext } from './premium_context';

type RouteParam = string | string[] | undefined | null;

const SOURCE_SET: ReadonlySet<string> = new Set(PAYWALL_SOURCE_VALUES);
const LOG_VALUE_MAX = 40;

const first = (value: RouteParam): string | null => {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : null;
};

/** Значение из чужого параметра — в журнал только урезанным и без управляющих знаков. */
const safeForLog = (value: string | null): string | null => (value === null ? null : value.replace(/[^\x20-\x7EЀ-ӿ]/g, '?').slice(0, LOG_VALUE_MAX));

export type PromoCloseTarget =
  | Readonly<{ kind: 'paywall'; context: PremiumContext; source: PaywallSource }>
  | Readonly<{ kind: 'back' }>;

export function promoCloseTarget(input: Readonly<{ source?: RouteParam; paywallContext?: RouteParam; paywallSource?: RouteParam }>): PromoCloseTarget {
  if (first(input.source) !== 'paywall') return { kind: 'back' }; // открыт не из пейвола — обычный путь, журнал не нужен
  const context = first(input.paywallContext);
  const source = first(input.paywallSource);
  if (!context || !source) {
    console.warn('[PAYWALL-OPEN] промокод: из пейвола, но вход потерян → обычное «назад»', JSON.stringify({ reason: 'missing', context: safeForLog(context), source: safeForLog(source) })); // guard-ok: ранний выход с причиной
    return { kind: 'back' };
  }
  if (!PREMIUM_CONTEXT_SET.has(context as PremiumContext)) {
    console.warn('[PAYWALL-OPEN] промокод: context не из контракта → обычное «назад»', JSON.stringify({ reason: 'unknown_context', context: safeForLog(context), source: safeForLog(source) })); // guard-ok: ранний выход с причиной
    return { kind: 'back' };
  }
  if (!SOURCE_SET.has(source)) {
    console.warn('[PAYWALL-OPEN] промокод: source не из контракта → обычное «назад»', JSON.stringify({ reason: 'unknown_source', context: safeForLog(context), source: safeForLog(source) })); // guard-ok: ранний выход с причиной
    return { kind: 'back' };
  }
  return { kind: 'paywall', context: context as PremiumContext, source: source as PaywallSource };
}
