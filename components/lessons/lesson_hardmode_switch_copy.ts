// lesson_hardmode_switch_copy.ts — тексты строки-перехода «Пишешь с клавиатуры · Вернуть слова» и тоста с «Отмена» (классический урок).
// зачем (жалоба №4, решение координатора 25.10, макет docs/design/v2-app/hardmode-switch-line.html): новичок не понимал, почему вместо плиток
// поле. Тексты на 9 языках — живой голос Переводчика (VOICE.md, 706b13a30).
import { triLang, type Lang } from '../../constants/i18n';

export type LessonHardModeSwitchKey = 'state' | 'action' | 'toast' | 'undo';

type Nine = readonly [ru: string, uk: string, en: string, es: string, ptBR: string, vi: string, id: string, tr: string, pl: string];

const COPY: Readonly<Record<LessonHardModeSwitchKey, Nine>> = {
  // живые тексты Переводчика 706b13a30: «Отмена» вместо «Вернуть» — однозначно отменяет последнее действие, без рода в «включил»
  state: ['Пишешь с клавиатуры', 'Пишеш із клавіатури', 'Typing it out', 'Escribiendo a mano', 'Digitando', 'Đang gõ phím', 'Mengetik manual', 'Klavyeyle yazıyorsun', 'Piszesz z klawiatury'],
  action: ['Вернуть слова', 'Повернути слова', 'Use word tiles', 'Usar palabras', 'Usar palavras', 'Dùng ô chữ', 'Pakai kata', 'Kelime seç', 'Wybieraj słowa'],
  toast: ['Слова снова на месте', 'Слова знову на місці', 'Word tiles are back', 'Las palabras han vuelto', 'As palavras voltaram', 'Ô chữ đã quay lại', 'Kata-katanya kembali', 'Kelimeler geri geldi', 'Słowa wróciły'],
  undo: ['Отмена', 'Скасувати', 'Undo', 'Deshacer', 'Desfazer', 'Hoàn tác', 'Batalkan', 'Geri al', 'Cofnij'],
};

export const LESSON_HARDMODE_SWITCH_COPY = COPY;

export function lessonHardModeSwitchText(lang: string, key: LessonHardModeSwitchKey): string {
  const [ru, uk, en, es, ptBR, vi, id, tr, pl] = COPY[key];
  return triLang(lang as Lang, { ru, uk, en, es, 'pt-BR': ptBR, vi, id, tr, pl });
}

/** Все 9 языков ключа — для полей тоста (messageRu/labelRu…). */
export function lessonHardModeSwitchAll(key: LessonHardModeSwitchKey): Readonly<{ ru: string; uk: string; en: string; es: string; 'pt-BR': string; vi: string; id: string; tr: string; pl: string }> {
  const [ru, uk, en, es, ptBR, vi, id, tr, pl] = COPY[key];
  return { ru, uk, en, es, 'pt-BR': ptBR, vi, id, tr, pl };
}
