// home_review_hint_copy — подпись подсказки «Повторить N слов · M мин» на 9 языках (Переводчик, docs/work/ux_conveniences_strings_9lang.md; подстановки {n} и {min}).
// зачем (удобство №8, владелец 04.11): строка самодостаточная, без мелкой расшифровки под ней.
import { triLang, type Lang } from '../constants/i18n';

const REVIEW_WORDS = ['Повторить {n} слов · {min} мин', 'Повторити {n} слів · {min} хв', 'Review {n} words · {min} min', 'Repasar {n} palabras · {min} min', 'Revisar {n} palavras · {min} min', 'Ôn {n} từ · {min} phút', 'Ulas {n} kata · {min} menit', '{n} kelimeyi tekrarla · {min} dk', 'Powtórz {n} słów · {min} min'] as const;

export function homeReviewHintText(lang: Lang, words: number, minutes: number): string {
  const [ru, uk, en, es, ptBR, vi, id, tr, pl] = REVIEW_WORDS;
  const raw = triLang(lang, { ru, uk, en, es, 'pt-BR': ptBR, vi, id, tr, pl });
  return raw.split('{n}').join(String(words)).split('{min}').join(String(minutes));
}

export const HOME_REVIEW_HINT_STRINGS = REVIEW_WORDS;
