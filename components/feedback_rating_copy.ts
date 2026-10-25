// feedback_rating_copy.ts — плейсхолдер поля отзыва после выбора звёзд (ЗАМОК ВЛАДЕЛЬЦА 25.10: «оценку без текста отправить нельзя»).
// Девять языков приложения; пока звёзд нет, карточка показывает прежний плейсхолдер экрана-хозяина. Тексты на проверку Переводчику (10 · ПЕРЕВОДЧИК).
import type { Lang } from '../constants/i18n';

export const FEEDBACK_NEED_WORD_PLACEHOLDER: Readonly<Record<string, string>> = {
  // зачем (Переводчик 25.10): теплее — «и» вместо условия «тогда», uk без канцелярского пассива; id на «ты» (-mu)
  ru: 'Напиши хотя бы одно слово — и оценка отправится',
  uk: 'Напиши хоча б одне слово — і оцінка надішлеться',
  en: 'Write at least one word to send your rating',
  es: 'Escribe al menos una palabra para enviar tu valoración',
  'pt-BR': 'Escreva pelo menos uma palavra para enviar sua avaliação',
  vi: 'Hãy viết ít nhất một từ để gửi đánh giá',
  id: 'Tulis setidaknya satu kata untuk mengirim penilaianmu',
  tr: 'Puanını göndermek için en az bir kelime yaz',
  pl: 'Napisz choć jedno słowo, aby wysłać ocenę',
};

export function feedbackNeedWordPlaceholder(lang: Lang): string {
  return FEEDBACK_NEED_WORD_PLACEHOLDER[lang] ?? FEEDBACK_NEED_WORD_PLACEHOLDER.en!;
}
