/**
 * Подпись под «…» собеседника, пока ответ ИИ идёт долго (координатор 18.10, К2).
 *
 * зачем: ответ в Диалогах 2.0 приходит за 7–13 с (не-потоковый ход на сервере). Тихие «…» дольше пяти секунд выглядят как
 * зависание. Через 5 с — «Мила печатает…» (имя собеседника из данных диалога, не литерал), через 15 с — «Отвечает дольше
 * обычного». Без кнопок и спиннеров: это только мягкий текст. Строки — на сверку Переводчику.
 */
import { triLang, type Lang } from '../../constants/i18n';

/** Через сколько после отправки показывать подписи. */
export const DIALOGUE_TYPING_NAME_AFTER_MS = 5_000;
export const DIALOGUE_TYPING_SLOW_AFTER_MS = 15_000;

export type DialogueTypingStage = 'none' | 'typing' | 'slow';

export function dialogueTypingStageFor(elapsedMs: number): DialogueTypingStage {
  if (elapsedMs >= DIALOGUE_TYPING_SLOW_AFTER_MS) return 'slow';
  if (elapsedMs >= DIALOGUE_TYPING_NAME_AFTER_MS) return 'typing';
  return 'none';
}

/** Текст подписи; без имени собеседника стадия «печатает» молчит (не подставляем выдуманное имя). */
export function dialogueTypingCaption(lang: Lang, stage: DialogueTypingStage, personaName: string | null): string | null {
  if (stage === 'slow') {
    return triLang(lang, {
      ru: 'Отвечает дольше обычного',
      // зачем (переводчик 18.10): как в ru — «он/она отвечает», коротко в одну строку под пузырём
      uk: 'Відповідає довше, ніж зазвичай',
      en: 'Taking longer than usual',
      es: 'Está tardando más de lo normal',
      'pt-BR': 'Está demorando mais que o normal',
      vi: 'Trả lời lâu hơn bình thường',
      id: 'Balasan lebih lama dari biasanya',
      tr: 'Her zamankinden uzun sürüyor',
      pl: 'Odpowiada dłużej niż zwykle',
    });
  }
  const name = personaName?.trim();
  if (stage !== 'typing' || !name) return null;
  return triLang(lang, {
    ru: `${name} печатает…`,
    uk: `${name} друкує…`,
    en: `${name} is typing…`,
    es: `${name} está escribiendo…`,
    'pt-BR': `${name} está digitando…`,
    vi: `${name} đang nhập…`,
    id: `${name} sedang mengetik…`,
    tr: `${name} yazıyor…`,
    pl: `${name} pisze…`,
  });
}
