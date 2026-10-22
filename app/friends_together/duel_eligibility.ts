/**
 * «Дуэль на 5 фраз» (идея 3) — «учите один язык»: можно ли вызвать этого друга по языку.
 *
 * зачем (D188: друзья учат разные языки; ответ 1 · ЯДРО 22.10): текущего языка друга на сервере нет — friendsGetProfiles
 * отдаёт studyLanguagesStarted, список начатых языков (0 новых чтений). «Один язык» = пересечение списков. Фразы дуэли есть
 * только у английского курса в сборке, поэтому общий язык дуэли — английский: он должен быть у друга в начатых, а свой пул
 * считаем, только пока сейчас учишь английский (локальный прогресс курса общий на все языки — id занятий у языков одинаковые,
 * пройденное на другом языке нельзя выдать за английское).
 */
export const DUEL_LANGUAGE = 'en';

const LOG = '[FRIENDS-DUEL]';
const MAX_LANGUAGES = 16;
const LANGUAGE_RE = /^[a-z]{2}(?:-[A-Za-z]{2})?$/u;

/** Начатые языки друга из ответа friendsGetProfiles. Нет поля или мусор — null («не знаем»), а не пустой список. */
export function parseStudyLanguagesStarted(value: unknown): readonly string[] | null {
  if (!Array.isArray(value)) return null;
  const languages = value.filter((item): item is string => typeof item === 'string' && LANGUAGE_RE.test(item)).slice(0, MAX_LANGUAGES);
  return languages.length > 0 ? [...new Set(languages)] : null;
}

/**
 * Один ли язык для дуэли. Свой язык сейчас не английский — нет. Список друга неизвестен (старый сервер, поле не пришло) —
 * не запрещаем: сервер дуэли всё равно проверяет дружбу, а «учите разные языки» по пустому месту человек не поймёт.
 */
export function duelSameLanguage(myStudyTarget: string, friendStarted: readonly string[] | null): boolean {
  if (myStudyTarget !== DUEL_LANGUAGE) {
    console.log(`${LOG} language: свой язык=${myStudyTarget} — фраз дуэли нет (курс фраз английский) → «один язык» нет`); // guard-ok: ранний выход с причиной
    return false;
  }
  if (friendStarted === null) {
    console.log(`${LOG} language: начатые языки друга неизвестны → не запрещаем`); // guard-ok: ветка без данных сервера
    return true;
  }
  return friendStarted.includes(DUEL_LANGUAGE);
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
