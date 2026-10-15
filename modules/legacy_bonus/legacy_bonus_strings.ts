// ═══════════════════════════════════════════════════════════════════════════
// legacy_bonus_strings.ts — тексты окна «Встречайте PhraseMan 2.0» (старые бонусы стали монетами). 9 языков.
//
// зачем (Ядро 15.10, D195; макет — артефакт Q9jqpBbjwJEFV1DpdEGx2h): ru/uk — дословно макет, остальные — перевод Дизайна
// (носителем не проверен, список — docs/work/tasks/translations-from-design-2026-10-15.md). Правило владельца: человеку никаких
// системных слов — нет «сервер», «синхронизация», «конвертация»; ожидание — индикатор без текста; ошибки у окна нет.
// Решение владельца 15.10 (через координатора, поправка 10:00): заголовок «Встречайте PhraseMan 2.0», над плашкой пересчёта — «Твои бонусы переходят в монеты» (принятый эталон v3);
// пояснение «Всё, что ты накопил раньше, не пропадает — вот итог» убрано окончательно: после решения 09:12 (опыт только серверный) для многих оно неправда.
// Монету в текстах не одушевляем (владелец 14.10).
// ═══════════════════════════════════════════════════════════════════════════
import type { Lang } from '../../constants/i18n';
import { pluralWord, type PluralForms } from '../../constants/plural';

type Nine = readonly [string, string, string, string, string, string, string, string, string];
const LANG_INDEX: Readonly<Record<string, number>> = { ru: 0, uk: 1, en: 2, es: 3, 'pt-BR': 4, vi: 5, id: 6, tr: 7, pl: 8 };
const pick = (lang: Lang, row: Nine): string => row[LANG_INDEX[lang] ?? 2];

const TITLE: Nine = ['Встречайте PhraseMan 2.0', 'Зустрічайте PhraseMan 2.0', 'Meet PhraseMan 2.0', 'Conoce PhraseMan 2.0', 'Conheça o PhraseMan 2.0', 'Chào mừng đến với PhraseMan 2.0', 'Inilah PhraseMan 2.0', 'PhraseMan 2.0 ile tanış', 'Poznaj PhraseMan 2.0'];
const CONVERT: Nine = ['Твои бонусы переходят в монеты', 'Твої бонуси переходять у монети', 'Your bonuses turn into coins', 'Tus bonos se convierten en monedas', 'Seus bônus viram moedas', 'Phần thưởng của bạn chuyển thành xu', 'Bonusmu berubah menjadi koin', 'Bonusların jetona dönüşüyor', 'Twoje bonusy zamieniają się w monety'];
const TOTAL: Nine = ['Итого', 'Разом', 'Total', 'Total', 'Total', 'Tổng', 'Total', 'Toplam', 'Razem'];
const CTA: Nine = ['Понятно', 'Зрозуміло', 'Got it', 'Entendido', 'Entendi', 'Đã hiểu', 'Mengerti', 'Anladım', 'Rozumiem'];
const ROW_XP: Nine = ['Опыт (XP)', 'Досвід (XP)', 'Experience (XP)', 'Experiencia (XP)', 'Experiência (XP)', 'Kinh nghiệm (XP)', 'Pengalaman (XP)', 'Deneyim (XP)', 'Doświadczenie (XP)'];
const ROW_PEARLS: Nine = ['Жемчуг', 'Перлини', 'Pearls', 'Perlas', 'Pérolas', 'Ngọc trai', 'Mutiara', 'İnci', 'Perły'];
const ROW_SPINS: Nine = ['Вращения колеса', 'Обертання колеса', 'Wheel spins', 'Giros de la ruleta', 'Giros da roleta', 'Lượt quay', 'Putaran roda', 'Çark çevirme hakkı', 'Zakręcenia kołem'];

const COIN_FORMS: Readonly<Record<string, PluralForms>> = {
  ru: { one: 'монета', few: 'монеты', many: 'монет' },
  uk: { one: 'монета', few: 'монети', many: 'монет' },
  en: { one: 'coin', few: 'coins', many: 'coins' },
  es: { one: 'moneda', few: 'monedas', many: 'monedas' },
  'pt-BR': { one: 'moeda', few: 'moedas', many: 'moedas' },
  vi: { one: 'xu', few: 'xu', many: 'xu' },
  id: { one: 'koin', few: 'koin', many: 'koin' },
  tr: { one: 'jeton', few: 'jeton', many: 'jeton' },
  pl: { one: 'moneta', few: 'monety', many: 'monet' },
};

export type LegacyBonusRowKey = 'xp' | 'pearls' | 'spins';

export function legacyBonusTitle(lang: Lang): string { return pick(lang, TITLE); }
export function legacyBonusConvertTitle(lang: Lang): string { return pick(lang, CONVERT); }
export function legacyBonusTotalLabel(lang: Lang): string { return pick(lang, TOTAL); }
export function legacyBonusCta(lang: Lang): string { return pick(lang, CTA); }
export function legacyBonusRowTitle(lang: Lang, key: LegacyBonusRowKey): string {
  return pick(lang, key === 'xp' ? ROW_XP : key === 'pearls' ? ROW_PEARLS : ROW_SPINS);
}
/** Слово «монета» в нужной форме под числом (подпись под итогом, всплывающий «+N монет»). */
export function legacyBonusCoinWord(lang: Lang, n: number): string {
  return pluralWord(lang, Math.round(n), COIN_FORMS[lang] ?? COIN_FORMS.en);
}
