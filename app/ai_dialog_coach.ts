/**
 * Поля тренера в ответе хода диалога: «почему так», перевод, готовые ответы,
 * мягкая поправка реплики ученика.
 *
 * зачем (владелец 2026-09-14, редизайн раздела «Диалоги»): шторка «Почему так»
 * обязана открываться МГНОВЕННО — «пусть не будет долгой генерации, а будет всё
 * сразу». Поэтому сервер кладёт все четыре поля в тот же JSON-конверт, что и
 * саму реплику (functions/src/premium_dialog.ts → sanitizeCoach), а экран лишь
 * показывает готовое, без единого сетевого вызова по тапу.
 *
 * Модуль намеренно чистый (без React и сети): его разбирает тест, а экран
 * получает уже безопасную структуру. Любое поле может отсутствовать — старый
 * сервер, обрезанный JSON или неигровой режим; тогда UI прячет то, чего нет.
 */

export interface DialogCoachFix {
  /** Реплика ученика в исправленном виде (изучаемый язык). */
  corrected: string;
  /** Одно тёплое предложение на языке интерфейса: что поправить и почему. */
  note: string;
}

export interface DialogCoachTurn {
  /** Почему собеседник сказал именно так. Пусто — объяснения нет. */
  note: string;
  /** Перевод реплики на язык интерфейса. Пусто — перевода нет. */
  translation: string;
  /** Готовые ответы под уровень (до 3). Пусто — рекомендаций нет. */
  suggestions: string[];
  /** Поправка последней реплики ученика; null — ошибок не нашли. */
  userFix: DialogCoachFix | null;
}

/** Пустой тренер: экран показывает базовый набор кнопок без «почему так». */
export const EMPTY_COACH: DialogCoachTurn = {
  note: '',
  translation: '',
  suggestions: [],
  userFix: null,
};

function str(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

/**
 * Разбирает поле `coach` из ответа сервера. Никогда не бросает: любой мусор
 * превращается в пустые поля, экран остаётся рабочим.
 */
export function parseDialogCoach(raw: unknown): DialogCoachTurn {
  if (!raw || typeof raw !== 'object') return EMPTY_COACH;
  const record = raw as Record<string, unknown>;

  const suggestions = Array.isArray(record.suggestions)
    ? record.suggestions
        .map((item) => str(item, 90))
        .filter((item) => item.length > 0)
        .slice(0, 3)
    : [];

  const rawFix = record.userFix && typeof record.userFix === 'object'
    ? (record.userFix as Record<string, unknown>)
    : null;
  const corrected = rawFix ? str(rawFix.corrected, 300) : '';

  return {
    note: str(record.note, 400),
    translation: str(record.translation, 900),
    suggestions,
    userFix: corrected ? { corrected, note: str(rawFix?.note, 300) } : null,
  };
}

/** true — есть что показать в шторке «Почему так» (иначе кнопка бесполезна). */
export function hasCoachExplanation(coach: DialogCoachTurn): boolean {
  return coach.note.length > 0 || coach.translation.length > 0 || coach.suggestions.length > 0;
}

/**
 * Считает, «пустая» ли реплика ученика — по такой репликой нельзя судить о
 * прогрессе, и три подряд включают помощника.
 *
 * зачем (владелец 2026-09-14): помощник появляется «только когда юзер уже три
 * реплики не может сказать ничего адекватного». Адекватность считаем без
 * модели и без сети: короткий ответ из одного-двух служебных слов («no», «ok»,
 * «yes»), либо текст не на латинице (человек перешёл на родной язык), либо
 * пустая строка после чистки.
 */
const FILLER_WORDS = new Set([
  'yes', 'no', 'ok', 'okay', 'yeah', 'yep', 'nope', 'hi', 'hello', 'bye',
  'thanks', 'thank', 'sure', 'good', 'fine', 'nice', 'what', 'why', 'huh',
  'да', 'нет', 'ок', 'окей', 'привет', 'пока', 'ага', 'угу', 'что',
]);

export function isWeakLearnerReply(text: string): boolean {
  const clean = text.trim().toLowerCase().replace(/[.!?,;:()"'`-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return true;

  // Язык проверяем ПЕРВЫМ, до длины: длинная фраза на родном языке — это тоже
  // «не смог сказать ничего адекватного» на изучаемом, и помощник ей нужен
  // даже сильнее, чем короткому «yes».
  const latinLetters = (clean.match(/[a-z]/g) ?? []).length;
  const allLetters = (clean.match(/\p{L}/gu) ?? []).length;
  if (allLetters > 0 && latinLetters / allLetters < 0.5) return true;

  const words = clean.split(' ').filter(Boolean);
  // Три слова и больше на изучаемом языке — человек строит фразу, всё в порядке.
  if (words.length >= 3) return false;
  // Один-два слова: слабо, если все они служебные/односложные подтверждения.
  if (words.every((w) => FILLER_WORDS.has(w))) return true;
  // Одно короткое слово («ok?», «mm») — тоже пусто.
  return words.length === 1 && words[0].length <= 3;
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
