// зачем (владелец 22.10, на шторку с 14 чипами столбиком: «ТЫ НЕ ВИДЕЛ, КАК ТЕОРИЯ ВЫГЛЯДИТ В ОСНОВНОМ КУРСЕ???»): теория Learning V2 —
// тот же экран, что теория основного курса (TheoryLessonView), а не своя шторка с вкладками. Сторож не даёт вернуть вкладки и свою вёрстку.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const code = (src: string): string => src.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// ЗАМОК ВЛАДЕЛЬЦА 22.10: «ТЫ НЕ ВИДЕЛ, КАК ТЕОРИЯ ВЫГЛЯДИТ В ОСНОВНОМ КУРСЕ???» — теория Learning V2 = экран основного курса.
describe('теория Learning V2 = экран теории основного курса', () => {
  const sheet = code(read('components/learning-v2/LearningV2TheorySheet.tsx'));
  const view = code(read('components/theory/TheoryLessonView.tsx'));
  const classic = code(read('app/lesson_theory_v2.tsx'));

  it('классика и Learning V2 рисуются одним компонентом TheoryLessonView', () => {
    expect(classic).toContain('<TheoryLessonView');
    expect(sheet).toContain('import TheoryLessonView');
    expect(sheet).toContain('<TheoryLessonView');
  });

  it('в Learning V2 нет своей вёрстки: ни вкладок разделов, ни своих стилей', () => {
    expect(sheet).not.toContain('accessibilityRole="tab"');
    expect(sheet).not.toContain('StyleSheet.create');
    expect(sheet).not.toMatch(/flexWrap/);
  });

  it('полный экран, «‹» закрывает и возвращает к заданию', () => {
    expect(sheet).toContain('presentationStyle="fullScreen"');
    expect(sheet).toContain('onBack={close}');
  });

  it('из эпизода открыт и прокручен раздел главы', () => {
    expect(sheet).toContain('defaultOpen: hasInitial ? section.num === initialSection : section.defaultOpen');
    expect(sheet).toContain('scrollToSection={initialSection}');
    expect(view).toContain('scrollToSection?: string;');
    expect(view).toContain('scrollRef.current?.scrollTo({ y, animated: false })');
  });

  it('жалоба на ошибку помечена как теория Learning V2, а не урок классики', () => {
    expect(sheet).toContain('reportDataId={`learning_v2_theory_${theory.lesson}_${theory.lang}`}');
    expect(view).toContain('dataId={reportDataId ?? `lesson_theory_${lessonId}`}');
  });
});

// ЗАМОК ВЛАДЕЛЬЦА 22.10: «В ТЕОРИИ РАМКИ НА ВСЮ ШИРИНУ ЭКРАНА!!! … ЧТО ВВЕРХУ ЦВЕТ ДРУГОЙ И ТАК ОБРЕЗАНО! И ТЕОРИЯ ОТЦЕНТРИРОВАНА».
describe('один вид теории для основного курса и Learning V2 (владелец 22.10)', () => {
  const view = code(read('components/theory/TheoryLessonView.tsx'));

  it('экран edge-to-edge на одном фоне: без SafeAreaView со своим фоном и без шапки-полосы', () => {
    expect(view).not.toContain('SafeAreaView');
    expect(view).not.toContain('backgroundColor: glass.bg');
    expect(view).toContain('paddingTop: headerTop');
  });

  it('«назад» — общий ScreenBackButton, заголовок шапки по центру', () => {
    expect(view).toContain('<ScreenBackButton');
    expect(view).not.toContain('PracticeBackButton');
    expect(view).toMatch(/topTitle: \{[^}]*textAlign: 'center'/);
  });

  it('разделы без колонки номера: тело не сдвинуто вправо, поля симметричные', () => {
    expect(view).not.toMatch(/sectionNum: \{[^}]*width: 26/);
    expect(view).toMatch(/sectionBody: \{\s*paddingLeft: 4,\s*paddingRight: 4,/);
  });
});
