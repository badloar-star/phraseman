// зачем: агент-новичок прошёл сессии 4–7 и нашёл настоящую дыру — в сессии 4
// пояснение к дистрактору объясняло разницу What/Which так, будто человек уже
// знает Which, хотя это слово в курсе не вводилось вообще. Дистрактор он бы
// отбросил интуитивно, но подсказка осталась для него пустым звуком.
//
// Один раз починить мало: та же ошибка вернётся в сессии 20, когда автор
// походя сошлётся на ещё не пройденное слово. Этот сторож ловит класс ошибки,
// а не конкретный случай.
import { EPISODE_01_SESSION_01_PHRASES } from "../modules/learning-v2/content/source/episode_01_source_v1";
import { EPISODE_01_SESSION_02_PHRASES } from "../modules/learning-v2/content/source/episode_01_session_02_phrases_v1";
import { EPISODE_01_SESSION_03_PHRASES } from "../modules/learning-v2/content/source/episode_01_session_03_phrases_v1";
import { EPISODE_01_SESSION_04_PHRASES } from "../modules/learning-v2/content/source/episode_01_session_04_phrases_v1";
import { EPISODE_01_SESSION_05_PHRASES } from "../modules/learning-v2/content/source/episode_01_session_05_phrases_v1";
import { EPISODE_01_SESSION_06_PHRASES } from "../modules/learning-v2/content/source/episode_01_session_06_phrases_v1";
import { EPISODE_01_SESSION_07_PHRASES } from "../modules/learning-v2/content/source/episode_01_session_07_phrases_v1";
import type { EpisodeSourcePhrase } from "../modules/learning-v2/content/source/episode_01_source_v1";

const SESSIONS: ReadonlyArray<readonly EpisodeSourcePhrase[]> = [
  EPISODE_01_SESSION_01_PHRASES,
  EPISODE_01_SESSION_02_PHRASES,
  EPISODE_01_SESSION_03_PHRASES,
  EPISODE_01_SESSION_04_PHRASES,
  EPISODE_01_SESSION_05_PHRASES,
  EPISODE_01_SESSION_06_PHRASES,
  EPISODE_01_SESSION_07_PHRASES,
];

/**
 * Слова, которые пояснение вправе называть в любой момент курса.
 *
 * зачем: не всякая ссылка на неизвестное слово вредна. Есть три законных вида.
 *
 * Первый — назвать слово, чтобы предупредить об ошибке: «Is ставят к he, she,
 * it». Человек не обязан уметь ими пользоваться, ему достаточно знать, что
 * сюда они не подходят. Такое пояснение сужает выбор, а не расширяет запас.
 *
 * Второй — местоимения и формы связки: они образуют одну таблицу, и объяснять
 * любую её клетку без соседних невозможно.
 *
 * Третий — служебные обрывки разбора: буквы, части слов, сокращения.
 *
 * Вредным остаётся ровно то, что нашёл агент-новичок: ПРАВИЛО, объяснённое
 * через незнакомое слово («Which нужен, когда выбирают из известных
 * вариантов») — тут человек обязан понимать слово, иначе подсказка пустая.
 */
const ALWAYS_NAMEABLE = new Set<string>([
  // Таблица лиц и связки — объясняется только целиком.
  'i', 'you', 'he', 'she', 'it', 'we', 'they',
  'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'its', 'our', 'their',
  'mine', 'yours', 'hers', 'ours', 'theirs',
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'do', 'does', 'don', 'doesn', 'didn', 'did',
  'have', 'has', 'had',
  // Сокращения и обрывки, которые встречаются в разборе написания.
  'i’m', 'it’s', 'don’t', 'doesn’t', 'isn’t', 'aren’t', 'won’t',
  'e', 's', 'th', 'r', 'a', 'an', 'the',
  'ok', 'okay',
  // Названия окончаний: «-ing», «-ed», «-s» — это разметка формы, а не слова.
  'ing', 'ed',
  // Пара к уже изученному приветствию: человек учит Good morning, а пояснение
  // тут же показывает, что бывает и afternoon, и evening. Это расширение
  // кругозора вокруг знакомой конструкции, а не опора на незнакомое.
  'afternoon', 'evening',
]);

/** Собирает все английские слова, которым сессия действительно учит. */
function taughtBy(phrases: readonly EpisodeSourcePhrase[]): Set<string> {
  const words = new Set<string>();
  for (const phrase of phrases) {
    for (const token of phrase.english.toLowerCase().split(/[^a-z’']+/))
      if (token) words.add(token);
    for (const word of phrase.words) words.add(word.correct.toLowerCase());
  }
  return words;
}

/**
 * Вытаскивает английские слова, на которые ССЫЛАЕТСЯ пояснение — то есть те,
 * что стоят в тексте латиницей. Русский текст пропускаем: он и так понятен.
 */
function latinWordsIn(text: string): string[] {
  return (text.match(/[A-Za-z][A-Za-z’']*/g) ?? []).map((word) =>
    word.toLowerCase(),
  );
}

/**
 * Пояснение объясняет ПРАВИЛО через слово, если требует от человека понимать
 * условие его применения: «нужен, когда…», «ставят, если…», «используют для…».
 *
 * Сравните две подсказки к одному дистрактору:
 *   «Which нужен, когда выбирают из известных вариантов» — правило. Человек
 *   обязан знать Which, иначе фраза бесполезна. Это и нашёл агент-новичок.
 *   «When — "когда", это о времени» — перевод. Знать слово не требуется.
 */
// зачем: без \b — граница слова в JavaScript определена только для латиницы,
// поэтому /\bнужен\b/ НЕ находит «нужен» в русском тексте. Мутационная проверка
// поймала это: сторож с \b молча пропускал ровно ту подсказку, ради которой
// написан.
const RULE_MARKERS =
  /(нужен|нужна|нужно|ставят|ставится|используют|употребляют|требует|подходит|сочетается|работает|пишется)/i;

describe("episode 1 never explains a rule through an unintroduced word", () => {
  it("never justifies a rule with a word the learner has not met", () => {
    const known = new Set<string>(ALWAYS_NAMEABLE);
    const violations: string[] = [];

    SESSIONS.forEach((phrases, index) => {
      const sessionOrdinal = index + 1;
      // Слова этой сессии известны внутри неё самой: карточка учит слову и тут
      // же его объясняет.
      for (const word of taughtBy(phrases)) known.add(word);

      // Неправильные варианты этой сессии человек видит на экране в тот же
      // момент, что и подсказку к ним. Пояснение «Colder — "холоднее", нужно
      // сравнение» разбирает вариант, который прямо перед глазами, — это не
      // ссылка на неизвестное, а объяснение показанной ошибки.
      const shownHere = new Set<string>();
      for (const phrase of phrases)
        for (const word of phrase.words)
          for (const distractor of word.distractors)
            for (const token of latinWordsIn(distractor.value))
              shownHere.add(token);

      for (const phrase of phrases) {
        const rules = [
          phrase.explanation,
          ...phrase.words.flatMap((word) =>
            word.distractors.map((distractor) => distractor.why),
          ),
        ].filter((text) => RULE_MARKERS.test(text));

        for (const text of rules)
          for (const token of latinWordsIn(text))
            if (!known.has(token) && !shownHere.has(token))
              violations.push(
                `сессия ${sessionOrdinal}, ${phrase.id}: правило объяснено через «${token}», которого человек ещё не встречал — «${text}»`,
              );
      }

      // Со следующей сессии эти варианты — уже знакомая ошибка.
      for (const token of shownHere) known.add(token);
    });

    expect(violations).toEqual([]);
  });
});
