import type { Lang } from './i18n';

/**
 * Склонение существительных при числе.
 *
 * зачем (аудит 2026-09-15): экраны писали «1 ошибок», «×1 промахов», «1 дн.» —
 * число подставлялось в фиксированную форму множественного числа. Новичок с
 * одной-двумя ошибками видел это первым же делом.
 *
 * Славянские языки (ru, uk, pl) имеют три формы, остальные поддерживаемые —
 * две (одна/много). Английское «1 d» сокращение нейтрально и формы не требует.
 */

export type PluralForms = Readonly<{
  /** 1 ошибка, 1 błąd */
  one: string;
  /** 2 ошибки, 2 błędy */
  few: string;
  /** 5 ошибок, 5 błędów */
  many: string;
}>;

const SLAVIC: ReadonlySet<Lang> = new Set<Lang>(['ru', 'uk', 'pl']);

/** Какая форма нужна для числа в этом языке. */
export function pluralFormFor(lang: Lang, rawCount: number): keyof PluralForms {
  const count = Math.abs(Math.trunc(Number.isFinite(rawCount) ? rawCount : 0));
  if (!SLAVIC.has(lang)) return count === 1 ? 'one' : 'many';
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'one';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few';
  return 'many';
}

/** Слово в нужной форме, без числа. */
export function pluralWord(lang: Lang, count: number, forms: PluralForms): string {
  return forms[pluralFormFor(lang, count)];
}

/** «5 ошибок» — число и слово в согласованной форме. */
export function pluralWithCount(lang: Lang, count: number, forms: PluralForms): string {
  return `${count} ${pluralWord(lang, count, forms)}`;
}
