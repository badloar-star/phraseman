// lesson_hardmode_switch_copy.ts — тексты строки-перехода «Печатаешь вручную · Выбирать слова» и тоста «Вернуть» (классический урок).
// зачем (жалоба №4, решение координатора 25.10, макет docs/design/v2-app/hardmode-switch-line.html): новичок не понимал, почему вместо плиток
// поле. Тексты — рабочие черновики на 9 языках; живой голос (VOICE.md) пришлёт Переводчик и заменит их здесь одной правкой.
import { triLang, type Lang } from '../../constants/i18n';

export type LessonHardModeSwitchKey = 'state' | 'action' | 'toast' | 'undo';

type Nine = readonly [ru: string, uk: string, en: string, es: string, ptBR: string, vi: string, id: string, tr: string, pl: string];

const COPY: Readonly<Record<LessonHardModeSwitchKey, Nine>> = {
  state: ['Печатаешь вручную', 'Друкуєш вручну', 'Typing by hand', 'Escribes a mano', 'Digitando à mão', 'Đang tự gõ', 'Mengetik manual', 'Elle yazıyorsun', 'Piszesz ręcznie'],
  action: ['Выбирать слова', 'Обирати слова', 'Pick words', 'Elegir palabras', 'Escolher palavras', 'Chọn từ', 'Pilih kata', 'Kelime seç', 'Wybieraj słowa'],
  toast: ['Включил выбор слов', 'Увімкнув вибір слів', 'Word picking is on', 'Elección de palabras activada', 'Escolha de palavras ativada', 'Đã bật chọn từ', 'Pilih kata aktif', 'Kelime seçimi açık', 'Wybór słów włączony'],
  undo: ['Вернуть', 'Повернути', 'Undo', 'Deshacer', 'Desfazer', 'Hoàn tác', 'Urungkan', 'Geri al', 'Cofnij'],
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
