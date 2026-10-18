/**
 * «Лимит — N ответов в месяц» и формы слова «ответ» — без зависимостей от вида (иконок, темы).
 *
 * зачем (координатор 18.10): строку берут бейдж квоты, подпись диктора центра Диалогов и шапка сессии. Сессия импортировала её из
 * DialogQuotaBadge и тянула за собой @expo/vector-icons — тест маршрута сессии падал на разборе модуля. Здесь только текст и склонение;
 * DialogQuotaBadge переэкспортирует оба имени, прежние импорты не меняются.
 */
import { triLang, type Lang } from '../constants/i18n';
import { pluralWord } from '../constants/plural';

/** зачем (координатор 18.10, Ревизор 3.45): остаток неизвестен — называем месячный лимит, а не выдуманный остаток. Видимая строка = подпись для диктора. */
/** Формы слова «ответ» для ru/uk/pl: лимит приходит числом и может быть не только 30. Общие с DialogueV2HubNotices.quotaUnknownA11y. */
export const DIALOG_REPLY_FORMS = {
  ru: { one: 'ответ', few: 'ответа', many: 'ответов' },
  uk: { one: 'відповідь', few: 'відповіді', many: 'відповідей' },
  pl: { one: 'odpowiedź', few: 'odpowiedzi', many: 'odpowiedzi' },
  // зачем (координатор 18.10, сторожа i18n:en-check и number_noun_pairs): у словаря форм должен быть en, и английская строка лимита
  // склоняется тем же помощником («1 reply / 30 replies»), а не держит фиксированное «replies».
  en: { one: 'reply', few: 'replies', many: 'replies' },
} as const;

// зачем (переводчик 18.10): «Лимит — N ответов в месяц» одинаково в бейдже и подписи диктора центра Диалогов, со склонением по числу
export function aiDialogMonthlyLimitText(lang: Lang, limit: number): string {
  return triLang(lang, {
    ru: `Лимит — ${limit} ${pluralWord('ru', limit, DIALOG_REPLY_FORMS.ru)} в месяц`,
    uk: `Ліміт — ${limit} ${pluralWord('uk', limit, DIALOG_REPLY_FORMS.uk)} на місяць`,
    en: `Limit:\u00A0${limit} ${pluralWord('en', limit, DIALOG_REPLY_FORMS.en)} a month`,
    es: `Límite:\u00A0${limit}\u00A0respuestas al mes`,
    'pt-BR': `Limite:\u00A0${limit}\u00A0respostas por mês`,
    vi: `Giới hạn:\u00A0${limit}\u00A0lượt trả lời mỗi tháng`,
    id: `Batas:\u00A0${limit}\u00A0balasan per bulan`,
    tr: `Sınır: ayda\u00A0${limit}\u00A0yanıt`,
    pl: `Limit:\u00A0${limit} ${pluralWord('pl', limit, DIALOG_REPLY_FORMS.pl)} miesięcznie`,
  });
}
