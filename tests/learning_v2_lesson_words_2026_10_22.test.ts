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
    // зачем (24.10): путь «Слов» вынесен в app/learning_v2_placement_route.ts — сторож видимости V2 не пускает литералы /learning_v2_* в компоненты
    expect(wire).toContain('pathname: LEARNING_V2_LESSON_WORDS_HREF, params: { lesson: String(lesson) }');
    expect(fs.readFileSync(path.join(__dirname, '..', 'app/learning_v2_placement_route.ts'), 'utf8')).toContain("LEARNING_V2_LESSON_WORDS_HREF = '/learning_v2_lesson_words'");
    expect(wire).not.toContain("router.push('/flashcards'");
    expect(layout).toContain('<Stack.Screen name="learning_v2_lesson_words" />');
  });

  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «переносить как в макете» (words-lesson-course.html) — прежний общий WordList основного курса заменён списком LearningV2WordsList (кружок-динамик, поиск и разделы во «Весь курс»); заголовок «N. Словарь» и «‹» остались
  it('вид — список LearningV2WordsList по макету, заголовок «N. Словарь» и «‹», данные — слова урока с телефона', () => {
    expect(screen).toContain("import LearningV2WordsList from '../components/learning-v2/words/LearningV2WordsList';");
    expect(screen).toContain('<LearningV2WordsList');
    expect(screen).toContain('s.words.title(lessonOrdinal)');
    // 22.10 (закон владельца «назад везде в одном месте»): «‹» — общая ScreenBackButton
    expect(screen).toContain('<ScreenBackButton');
    expect(screen).toContain('useLearningV2UnlockedLessonWordsV1(scope, { includeAuthoringPreview: __DEV__ })');
    expect(list).toContain('export function WordList(');
  });

  it('сети и спиннера нет; журнал [SEASON-WORDS]: вход, слова, назад; пусто — слова, а не пустой экран', () => {
    expect(screen).not.toMatch(/firebase|firestore|fetch\(|ActivityIndicator/i);
    expect(screen).not.toContain('adjustsFontSizeToFit');
    // «назад» — общая ScreenBackButton со своим журналом [BACK-BTN]; своего обработчика «назад» в экране больше нет
    for (const key of ["'вход'", "'слова'"]) expect(screen).toContain(key);
    expect(screen).toContain("const LOG = '[SEASON-WORDS]';");
    expect(code(read('components/learning-v2/words/LearningV2WordsList.tsx'))).toContain('testID="learning-v2-lesson-words-empty"');
  });

  it('слово Learning V2 → строка списка: слово, перевод на 9 языках, часть речи phrases; порядок — по занятию и месту (модель words_list_model)', () => {
    const model = code(read('components/learning-v2/words/words_list_model.ts'));
    for (const key of ['en: item.encounter.save.targetText', 'ru: meaning.ru', "'pt-BR': meaning['pt-BR']", "pos: 'phrases'", 'a.sourceSessionOrdinal - b.sourceSessionOrdinal || a.encounter.orderWithinSession - b.encounter.orderWithinSession']) {
      expect(model).toContain(key);
    }
  });
});
