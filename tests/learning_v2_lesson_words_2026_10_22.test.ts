// зачем (владелец 22.10: «„СЛОВА“ НАЖИМАЮ, ОТКРЫВАЕТСЯ РАЗДЕЛ КАРТОЧКИ»; координатор): «Слова» в Сезоне открывают слова ЭТОГО урока — экран Learning V2 с видом «Слов урока» основного курса (общий WordList),
// данные — слова урока с телефона, без сети. Контракт исходников.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const code = (src: string): string => src.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/ \/\/ .*$/gm, '');

describe('«Слова» Сезона → слова этого урока', () => {
  const screen = code(read('app/learning_v2_lesson_words.tsx'));
  const wire = code(read('components/learning-v2/season/SeasonCourseConnected.tsx'));
  const list = code(read('app/lesson_words.tsx'));
  const layout = code(read('app/_layout.tsx'));

  it('нажатие ведёт на экран слов урока с номером урока, а не в «Карточки»', () => {
    expect(wire).toContain("pathname: '/learning_v2_lesson_words', params: { lesson: String(lesson) }");
    expect(wire).not.toContain("router.push('/flashcards'");
    expect(layout).toContain('<Stack.Screen name="learning_v2_lesson_words" />');
  });

  it('вид — общий WordList основного курса (плоский), заголовок «Слова урока N» и «‹», данные — слова урока с телефона', () => {
    expect(screen).toContain("import { WordList, type Word } from './lesson_words';");
    expect(screen).toContain('<WordList words={listWords as Word[]} learnedCounts={NO_COUNTS} lang={lang} lessonId={lessonOrdinal} flat />');
    expect(screen).toContain('s.words.title(lessonOrdinal)');
    expect(screen).toContain('<PracticeBackButton');
    expect(screen).toContain('useLearningV2UnlockedLessonWordsV1(scope, { includeAuthoringPreview: __DEV__ })');
    expect(list).toContain('export function WordList(');
    expect(list).toContain("const sections = flat ? [{ title: '', data: words }] : groupByPOS(words, lang);");
  });

  it('сети и спиннера нет; журнал [SEASON-WORDS]: вход, слова, назад; пусто — слова, а не пустой экран', () => {
    expect(screen).not.toMatch(/firebase|firestore|fetch\(|ActivityIndicator/i);
    expect(screen).not.toContain('adjustsFontSizeToFit');
    for (const key of ["'вход'", "'слова'", "'назад'"]) expect(screen).toContain(key);
    expect(screen).toContain("const LOG = '[SEASON-WORDS]';");
    expect(screen).toContain('testID="learning-v2-lesson-words-empty"');
  });

  it('слово Learning V2 → строка списка: слово, перевод на 9 языках, часть речи phrases; порядок — по занятию и месту', () => {
    for (const key of ['en: item.encounter.save.targetText', 'ru: meaning.ru', "'pt-BR': meaning['pt-BR']", "pos: 'phrases'", 'a.sourceSessionOrdinal - b.sourceSessionOrdinal || a.encounter.orderWithinSession - b.encounter.orderWithinSession']) {
      expect(screen).toContain(key);
    }
  });
});
