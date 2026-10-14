// ═══════════════════════════════════════════════════════════════════════════
// welcome_back_strings.ts — тексты окна «С возвращением» (D193; образец m21 engagement-moments-v3-all.html, «ОДОБРЕН»). 9 языков.
//
// зачем (координатор 14.10: «тексты и кнопки строго как в v3-all»): русский — дословно образец; остальные — перевод (носителем не проверен).
// Строка цифр собирается из настоящих частей: часть, которой нет (0 фраз, энергия не полная), опускается, а не выдумывается.
// Монету в текстах не одушевляем (владелец 14.10: формулировки, где монета — живое существо, запрещены).
// ═══════════════════════════════════════════════════════════════════════════
import type { Lang } from '../../constants/i18n';
import { pluralWithCount } from '../../constants/plural';

type Nine = readonly [string, string, string, string, string, string, string, string, string];
const LANG_INDEX: Readonly<Record<string, number>> = { ru: 0, uk: 1, en: 2, es: 3, 'pt-BR': 4, vi: 5, id: 6, tr: 7, pl: 8 };
const pick = (lang: Lang, row: Nine): string => row[LANG_INDEX[lang] ?? 2];

const TITLE: Nine = ['С возвращением', 'З поверненням', 'Welcome back', 'Bienvenido de nuevo', 'Que bom te ver de volta', 'Chào mừng trở lại', 'Selamat datang kembali', 'Tekrar hoş geldin', 'Witaj z powrotem'];
const NOTHING_LOST: Nine = ['ничего не сгорело', 'нічого не згоріло', 'nothing was lost', 'no se perdió nada', 'nada se perdeu', 'không mất gì cả', 'tidak ada yang hilang', 'hiçbir şey kaybolmadı', 'nic nie przepadło'];
const RANK: Nine = ['ранг {n}', 'ранг {n}', 'rank {n}', 'rango {n}', 'nível {n}', 'hạng {n}', 'peringkat {n}', 'rütbe {n}', 'ranga {n}'];
const ENERGY_FULL: Nine = ['энергия полная', 'енергія повна', 'energy is full', 'energía completa', 'energia cheia', 'năng lượng đầy', 'energi penuh', 'enerji dolu', 'energia pełna'];
const MINUTE: Nine = ['1 минута', '1 хвилина', '1 minute', '1 minuto', '1 minuto', '1 phút', '1 menit', '1 dakika', '1 minuta'];
const HOME: Nine = ['На Главную', 'На Головну', 'Go to Home', 'Ir al inicio', 'Ir para o início', 'Về trang chính', 'Ke Beranda', 'Ana sayfaya', 'Na stronę główną'];

const DAY_FORMS = {
  ru: { one: 'день', few: 'дня', many: 'дней' },
  uk: { one: 'день', few: 'дні', many: 'днів' },
  en: { one: 'day', few: 'days', many: 'days' },
  es: { one: 'día', few: 'días', many: 'días' },
  'pt-BR': { one: 'dia', few: 'dias', many: 'dias' },
  vi: { one: 'ngày', few: 'ngày', many: 'ngày' },
  id: { one: 'hari', few: 'hari', many: 'hari' },
  tr: { one: 'gün', few: 'gün', many: 'gün' },
  pl: { one: 'dzień', few: 'dni', many: 'dni' },
} as const;
const PHRASE_FORMS = {
  ru: { one: 'фраза', few: 'фразы', many: 'фраз' },
  uk: { one: 'фраза', few: 'фрази', many: 'фраз' },
  en: { one: 'phrase', few: 'phrases', many: 'phrases' },
  es: { one: 'frase', few: 'frases', many: 'frases' },
  'pt-BR': { one: 'frase', few: 'frases', many: 'frases' },
  vi: { one: 'cụm từ', few: 'cụm từ', many: 'cụm từ' },
  id: { one: 'frasa', few: 'frasa', many: 'frasa' },
  tr: { one: 'ifade', few: 'ifade', many: 'ifade' },
  pl: { one: 'zwrot', few: 'zwroty', many: 'zwrotów' },
} as const;
const CARD_FORMS = {
  ru: { one: 'карточка', few: 'карточки', many: 'карточек' },
  uk: { one: 'картка', few: 'картки', many: 'карток' },
  en: { one: 'card', few: 'cards', many: 'cards' },
  es: { one: 'tarjeta', few: 'tarjetas', many: 'tarjetas' },
  'pt-BR': { one: 'cartão', few: 'cartões', many: 'cartões' },
  vi: { one: 'thẻ', few: 'thẻ', many: 'thẻ' },
  id: { one: 'kartu', few: 'kartu', many: 'kartu' },
  tr: { one: 'kart', few: 'kart', many: 'kart' },
  pl: { one: 'fiszka', few: 'fiszki', many: 'fiszek' },
} as const;

type FormsKey = keyof typeof DAY_FORMS;
const formsKey = (lang: Lang): FormsKey => (lang in DAY_FORMS ? (lang as FormsKey) : 'en');

export function welcomeBackTitle(lang: Lang): string {
  return pick(lang, TITLE);
}

export function welcomeBackHomeLabel(lang: Lang): string {
  return pick(lang, HOME);
}

/** «5 карточек — 1 минута» (образец). */
export function welcomeBackCardsLabel(lang: Lang, count: number): string {
  return `${pluralWithCount(lang, count, CARD_FORMS[formsKey(lang)])} — ${pick(lang, MINUTE)}`;
}

export type WelcomeBackLineInput = Readonly<{ awayDays: number; phrasesLearned: number; coinRank: number | null; energyFull: boolean | null }>;

/** «9 дней — ничего не сгорело: 412 фраз, ранг 5, энергия полная.» — только из настоящих частей. */
export function welcomeBackStatsLine(lang: Lang, input: WelcomeBackLineInput): string {
  const key = formsKey(lang);
  const parts: string[] = [];
  if (input.phrasesLearned > 0) parts.push(pluralWithCount(lang, input.phrasesLearned, PHRASE_FORMS[key]));
  if (input.coinRank !== null && input.coinRank >= 0) parts.push(pick(lang, RANK).replace('{n}', String(input.coinRank)));
  if (input.energyFull === true) parts.push(pick(lang, ENERGY_FULL));
  const head = `${pluralWithCount(lang, input.awayDays, DAY_FORMS[key])} — ${pick(lang, NOTHING_LOST)}`;
  return parts.length > 0 ? `${head}: ${parts.join(', ')}.` : `${head}.`;
}
