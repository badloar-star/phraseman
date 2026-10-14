// ═════════════════════════════════════════════════════════════════════
// spire_plurals.ts — склонение «ступень» и «человек» в Шпиле на 9 языках.
//
// зачем (координатор 12.10, аудит SPIRE_I18N_AUDIT §6): подпись подставлялась после числа в одной форме —
// «1 ступеней», «1 steps», «1 людей», «2 stopni». Шпиль в первом выпуске только для ru и uk, поэтому формы
// обязаны быть верными. Правило выбора формы — общее для приложения (constants/plural.ts), здесь только слова.
// Языки без множественного числа (vi, id, tr) держат одно слово во всех трёх формах.
// ═════════════════════════════════════════════════════════════════════
import type { Lang } from '../../constants/i18n';
import { pluralFormFor, pluralWord, type PluralForms } from '../../constants/plural';
import { runeWord } from '../../constants/runes';

const forms = (one: string, few: string, many: string): PluralForms => ({ one, few, many });
const same = (word: string): PluralForms => forms(word, word, word);

/** Ступень: 1 ступень · 2 ступени · 5 ступеней. */
export const SPIRE_STEP_FORMS: Readonly<Record<Lang, PluralForms>> = {
  ru: forms('ступень', 'ступени', 'ступеней'),
  uk: forms('сходинка', 'сходинки', 'сходинок'),
  en: forms('step', 'steps', 'steps'),
  es: forms('escalón', 'escalones', 'escalones'),
  'pt-BR': forms('degrau', 'degraus', 'degraus'),
  vi: same('bậc'),
  id: same('anak tangga'),
  tr: same('basamak'),
  pl: forms('stopień', 'stopnie', 'stopni'),
};

/** Человек: 1 человек · 2 человека · 5 человек. */
export const SPIRE_PEOPLE_FORMS: Readonly<Record<Lang, PluralForms>> = {
  ru: forms('человек', 'человека', 'человек'),
  uk: forms('людина', 'людини', 'людей'),
  en: forms('person', 'people', 'people'),
  es: forms('persona', 'personas', 'personas'),
  'pt-BR': forms('pessoa', 'pessoas', 'pessoas'),
  vi: same('người'),
  id: same('orang'),
  tr: same('kişi'),
  pl: forms('osoba', 'osoby', 'osób'),
};

/** Сокращения «ступ.», «сход.» не склоняются; склоняется только английское «step(s)». */
const STEP_SHORT: Readonly<Record<Lang, string>> = {
  ru: 'ступ.', uk: 'сход.', en: 'steps', es: 'esc.', 'pt-BR': 'deg.', vi: 'bậc', id: 'lgk', tr: 'bsm', pl: 'st.',
};

const SLAVIC: ReadonlySet<Lang> = new Set<Lang>(['ru', 'uk', 'pl']);

/** «ступеней» в нужной форме, без числа. */
export function spireStepsWord(lang: Lang, n: number): string {
  return pluralWord(lang, n, SPIRE_STEP_FORMS[lang]);
}

/** «5 ступеней». */
export function spireStepsCount(lang: Lang, n: number): string {
  return `${n} ${spireStepsWord(lang, n)}`;
}

/**
 * Слово после «из N» («3 из 8 ступеней»): в славянских языках после «из» всегда родительный множественного
 * («из 8 ступеней», «из 22 ступеней»), а не форма по числу; в остальных — как обычно.
 */
export function spireStepsWordAfterOf(lang: Lang, total: number): string {
  return SLAVIC.has(lang) ? SPIRE_STEP_FORMS[lang].many : spireStepsWord(lang, total);
}

/** Короткая подпись рядом с числом в тесной строке: «12 ступ.», «1 step». */
export function spireStepsShort(lang: Lang, n: number): string {
  return lang === 'en' ? (pluralFormFor(lang, n) === 'one' ? 'step' : 'steps') : STEP_SHORT[lang];
}

/** D162: «1 240 монет» — монеты недели в комнате Пика; слово — общая валюта приложения (runeWord = «монета» на 9 языках). */
export function spireCoinsCount(lang: Lang, n: number): string {
  const value = Math.max(0, Math.trunc(Number(n)) || 0);
  return `${value} ${runeWord(lang, value)}`;
}

/**
 * Число с разделителем тысяч — неразрывный пробел U+00A0: «8 511».
 * зачем (координатор 14.10, D162): в колонке подиума ≈101 dp число монет не должно рваться на «8» и «511» и не должно ужиматься шрифтом; без разделителя
 * «8511» читается хуже. Не Intl: на Hermes/Android локаль не всегда подключена, а нам нужен один и тот же вид на 9 языках.
 */
export function spireGroupThousands(n: number): string {
  const value = Math.max(0, Math.trunc(Number(n)) || 0);
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** «30 человек». */
export function spirePeopleCount(lang: Lang, n: number): string {
  return `${n} ${pluralWord(lang, n, SPIRE_PEOPLE_FORMS[lang])}`;
}
