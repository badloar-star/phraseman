// зачем (владелец 17.10: «вкладка Обучения будет открывать конкретно именно новые уроки, а не старые, а старые уроки будут открываться отдельной кнопочкой»):
// раньше здесь сторожилась память выбора «Уроки | V2» (владелец 13.10). Решение отменено: корневая вкладка всегда открывается на карте V2, памяти выбора нет;
// старый список — кнопка «Классический курс» на карте, «назад» из него возвращает на карту, с карты — на Главную.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const src = read('app/(tabs)/lessons.tsx');
const course = read('components/learning-v2/LearningV2ChaptersCourse.tsx');

describe('вкладка «Обучение»: карта V2 по умолчанию, старые уроки — кнопкой', () => {
  it('памяти выбора вкладки больше нет (иначе у людей со старой записью «v2» отдельный маршрут старого списка прыгал бы на карту)', () => {
    expect(src).not.toContain('lessons_tab_page_v1');
    expect(src).not.toContain('rememberLessonsPage');
    expect(src).not.toContain('rememberedLessonsPage');
    expect(src).not.toContain('userPickedTabRef');
  });

  it('стартовая страница: вкладка + курс доступен → V2; отдельный маршрут старого списка остаётся старым; журнал [LESSONS-TABS]', () => {
    expect(src).toContain('useState<"lessons" | "dialogs" | "v2">(() => startLessonsPage(initialPage, presentation))');
    expect(src).toContain('initial === "lessons" && presentation === "tab" && LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY ? "v2" : initial');
    expect(src).toContain('[LESSONS-TABS] вход: presentation=');
  });

  it('«назад»: с карты в корневой вкладке — на Главную; из старого списка вкладки — на карту (если она доступна), иначе на Главную', () => {
    expect(src).toContain('if (isRetainedTab && page === "v2") {');
    expect(src).toContain('[LESSONS-TABS] назад с карты V2 → Главная');
    expect(src).toContain('[LESSONS-TABS] назад из старого списка → карта V2');
    // в корневой вкладке у старого списка есть стрелка «назад», чип «Новые уроки» там снят (остался в push-маршруте)
    expect(src).toContain('{!isRetainedTab || LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY ? (');
    expect(src).toContain('{!isRetainedTab && LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY ? (');
  });

  it('кнопка «Классический курс» на карте: 9 языков, без слова «старые», открывает список через то же вводное окно; заголовок списка остаётся «Обучение»', () => {
    const block = src.slice(src.indexOf('const classicCourseLabel = triLang(lang, {'), src.indexOf('});', src.indexOf('const classicCourseLabel = triLang(lang, {')));
    for (const key of ['ru:', 'en:', 'uk:', 'es:', '"pt-BR":', 'vi:', 'id:', 'tr:', 'pl:']) expect(block).toContain(key);
    expect(block).toContain('ru: "Классический курс"');
    expect(block.toLowerCase()).not.toContain('стар');
    expect(src).toContain('legacyLessonsLabel={classicCourseLabel}');
    expect(src).toContain('onLegacyLessons={requestLegacyLessons}');
    expect(src).toContain('ru: "Обучение"');
    expect(course).toContain('testID="learning-v2-open-classic-course"');
    expect(course).toContain('onPress={props.onLegacyLessons}');
  });

  it('кнопка на карте: тон без обводки, подпись в одну строку и не ужимается шрифтом', () => {
    const chip = course.slice(course.indexOf('testID="learning-v2-open-classic-course"'), course.indexOf('</PressableHybrid>', course.indexOf('testID="learning-v2-open-classic-course"')));
    expect(chip).toContain('backgroundColor: g.buttonFill');
    expect(chip).toContain('numberOfLines={1}');
    expect(chip).not.toContain('borderWidth');
    expect(course).not.toContain('adjustsFontSizeToFit');
  });
});
