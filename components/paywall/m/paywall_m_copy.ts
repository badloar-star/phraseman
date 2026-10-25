// ═══════════════════════════════════════════════════════════════════════════
// paywall_m_copy.ts — тексты пейвола «Вариант М»: подстановки {n} и формы по числу [одна|две|много].
//
// зачем (координатор 25.10): строки приходят от Переводчика таблицей (paywall_m_copy.generated.ts); числа в них — из кода
// (прогресс человека, лимиты, цены магазина), поэтому слово после числа склоняем здесь — как ruPl/plPl в home_scene_special_copy.ts.
// Чистый модуль без React — тест tests/paywall_m_copy_2026_10_25.test.ts.
// ═══════════════════════════════════════════════════════════════════════════
import type { Lang } from '../../../constants/i18n';
import { PAYWALL_M_COPY_ROWS, type PaywallMCopyKey, type PaywallMCopyRow } from './paywall_m_copy.generated';

export type PaywallMVars = Readonly<Record<string, string | number>>;

/** Номер формы по числу: ru/uk — 3 формы (один/несколько/много), pl — 3 формы по своему правилу, en/es/pt-BR — 2 (один/много). */
export function paywallMPluralIndex(lang: Lang, n: number, forms: number): number {
  const v = Math.abs(Math.round(n));
  const mod10 = v % 10;
  const mod100 = v % 100;
  if (forms >= 3) {
    if (lang === 'pl') {
      if (v === 1) return 0;
      return mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14) ? 1 : 2;
    }
    if (mod10 === 1 && mod100 !== 11) return 0;
    return mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14) ? 1 : 2;
  }
  return v === 1 ? 0 : 1;
}

const PLURAL = /\{(\w+)\}( ?)\[([^\]]+)\]/g;

/** Подставляет числа с формами слова, потом простые {имя}. Неизвестная подстановка остаётся как есть (видно в журнале теста). */
export function paywallMFill(lang: Lang, template: string, vars: PaywallMVars = {}): string {
  const withForms = template.replace(PLURAL, (whole, name: string, space: string, group: string) => {
    const raw = vars[name];
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(n)) return whole;
    const forms = group.split('|');
    const word = forms[Math.min(paywallMPluralIndex(lang, n, forms.length), forms.length - 1)];
    return `${String(raw)}${space}${word}`;
  });
  return withForms.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}

function rowFor(key: PaywallMCopyKey): PaywallMCopyRow {
  return PAYWALL_M_COPY_ROWS[key];
}

/** Строка М на языке интерфейса; нет языка — английский (никогда не русская подстановка). */
export function paywallMText(lang: Lang, key: PaywallMCopyKey, vars: PaywallMVars = {}): string {
  const row = rowFor(key);
  const template = (row as Readonly<Record<string, string>>)[lang] ?? row.en;
  return paywallMFill(lang, template, vars);
}

/**
 * «Ноль» в валюте магазина из строки цены («39,99 €» → «0 €», «€39.99» → «€0», «₽3 999» → «₽0»): цифры → одна «0», остальное как у магазина.
 * Нет цифр (нет цены) — null: подпись «Сегодня …» тогда не показываем.
 */
export function paywallMZeroFromPrice(priceString: string | null | undefined): string | null {
  if (!priceString) return null;
  const re = /\d[\d\s  .,]*\d|\d/;
  if (!re.test(priceString)) return null;
  return priceString.replace(re, '0').trim();
}
