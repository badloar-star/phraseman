// ═══════════════════════════════════════════════════════════════════════════
// announcement_v2_strings.ts — фиксированные подписи 36 кадров объявлений (макет stories-announcements-v1.html) и подписи кнопок по действию.
//
// зачем: тексты объявления пишет владелец в админке (метка, заголовок, блоки), а короткие подписи внутри шаблонов («дня осталось», «VS»,
// «Твой код», «исправлено», «Как сделать», «Было / Стало», кнопки) — часть кадра и живут здесь на 9 языках интерфейса в формате
// story_template_strings (ru, uk, en, es, pt-BR, vi, id, tr, pl). ПЕРЕВОДЧИК: значения uk … pl ниже — временно английские (помечены
// TRANSLATE), список отправлен координатору 28.10; до замены релиз этих кадров не идёт (гейт перевода scan_untranslated_ui).
// ═══════════════════════════════════════════════════════════════════════════
import type { Lang } from '../../../constants/i18n';
import { pluralWord } from '../../../constants/plural';

type Nine = readonly [string, string, string, string, string, string, string, string, string];
const LANG_INDEX: Readonly<Record<string, number>> = { ru: 0, uk: 1, en: 2, es: 3, 'pt-BR': 4, vi: 5, id: 6, tr: 7, pl: 8 };
/** TRANSLATE: ru + en от макета, остальные семь — английский до ответа Переводчика. */
const t = (ru: string, en: string): Nine => [ru, en, en, en, en, en, en, en, en];

const S = {
  // ── кнопки действия (строго как в макете: plus / invite / theme) ──
  ctaOpenPlus: t('Открыть Plus', 'Open Plus'),
  ctaShareInvite: t('Поделиться ссылкой', 'Share link'),
  ctaUseTheme: t('Включить тему', 'Turn on theme'),
  // ── подписи внутри кадров ──
  /** 7 · обратный отсчёт: «{n} {n_w}» под цифрой — слово к числу дней (формы ниже). */
  countdownLeft: t('осталось', 'left'),
  /** 11 · только сегодня: центр печати. */
  hours24: t('24 ч', '24 h'),
  /** 14 · карточки: подпись под словом на лицевой стороне. */
  cardsTapToFlip: t('нажмите, чтобы перевернуть', 'tap to flip'),
  /** 16 · дуэли. */
  vs: t('VS', 'VS'),
  /** 18 · ошибки: подписи «Было» / «Стало» на карточке. */
  was: t('Было', 'Was'),
  became: t('Стало', 'Now'),
  /** 22 · Plus: слово в кольце. */
  plus: t('Plus', 'Plus'),
  /** 25 · пригласи друзей: подпись карточки кода. */
  yourCode: t('Твой код', 'Your code'),
  /** 35 · мы прочитали: подпись записки. */
  fixed: t('исправлено', 'fixed'),
  /** 36 · совет: заголовок карточки. */
  howTo: t('Как сделать', 'How to'),
  /** 10 · скоро: слово на занавесе, если метка пустая. */
  soon: t('Скоро', 'Soon'),
  /** 11 · только сегодня: надпись по кругу, если метка пустая. */
  todayOnly: t('Только сегодня', 'Today only'),
  /** 13 · диалоги: перевод трёх подсказок примера под плитками (блоки = английские фразы примера макета). */
  dialogsHint1: t('Повторите?', 'Could you repeat?'),
  dialogsHint2: t('Я имею в виду…', 'I mean…'),
  dialogsHint3: t('Да ладно!', 'No way!'),
  /** 14 · карточки: оборот верхней карточки — значение слова quit из примера макета. */
  cardsSampleMeaning: t('уйти с работы', 'to quit'),
} as const;

export type AnnouncementV2StringKey = keyof typeof S;
export const ANNOUNCEMENT_V2_STRING_KEYS = Object.keys(S) as readonly AnnouncementV2StringKey[];

/** Слово «день» к числу (7 · обратный отсчёт): формы на 9 языках (TRANSLATE для uk … pl — английские формы). */
const DAY_FORMS: readonly (readonly [string, string, string])[] = [
  ['день', 'дня', 'дней'], ['day', 'days', 'days'], ['day', 'days', 'days'], ['day', 'days', 'days'], ['day', 'days', 'days'],
  ['day', 'days', 'days'], ['day', 'days', 'days'], ['day', 'days', 'days'], ['day', 'days', 'days'],
];

export function annText(lang: Lang, key: AnnouncementV2StringKey): string {
  const row = S[key];
  return row[LANG_INDEX[lang] ?? 2] ?? row[2];
}

/** «дня осталось» — слово к числу без самого числа (цифра стоит отдельно крупно). */
export function annDaysLeftWord(lang: Lang, days: number): string {
  const forms = DAY_FORMS[LANG_INDEX[lang] ?? 2] ?? DAY_FORMS[2]!;
  return `${pluralWord(lang, days, { one: forms[0], few: forms[1], many: forms[2] })} ${annText(lang, 'countdownLeft')}`;
}

/** «3 дня осталось» — число дней до конца срока. */
export function annDaysLeft(lang: Lang, days: number): string {
  const forms = DAY_FORMS[LANG_INDEX[lang] ?? 2] ?? DAY_FORMS[2]!;
  const word = pluralWord(lang, days, { one: forms[0], few: forms[1], many: forms[2] });
  return `${days} ${word} ${annText(lang, 'countdownLeft')}`;
}
