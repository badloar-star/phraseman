import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const read = (...parts: string[]): string => readFileSync(join(ROOT, ...parts), 'utf8');

/**
 * ОБНОВЛЕНО 2026-10-17 (владелец: «вкладка Обучения будет открывать именно новые уроки, а старые — отдельной кнопочкой»): решение 2026-09-13 ниже
 * больше НЕ действует для корневой вкладки — она открывается на карте V2 (см. tests/lessons_tabs_memory.test.ts). Сохранено для маршрута /lessons_list
 * (плитка «Уроки» на Главной, выходы из старых уроков): дефолт пропса initialPage по-прежнему "lessons".
 *
 * Вход в уроки открывает СТАРЫЕ уроки — решение владельца 2026-09-13.
 *
 * Что было: `initialPage` по умолчанию равнялся "v2", и пропс этот никто не
 * передавал. То есть дефолт и был единственной точкой входа: человек с Главной
 * сразу попадал в недописанный курс Learning V2, а старые уроки приходилось
 * искать кнопкой внутри него.
 *
 * Как теперь: вход открывает старые уроки. Чип «Новые уроки» остаётся на
 * экране как обещание будущего, но приглушён и по тапу не переключает
 * страницу — под ним появляется строка «Этот курс находится в разработке».
 * Единственный путь на страницу V2 — дев-вкладка «V2» в шапке (ENABLE_DEV_TOOLS).
 *
 * Это НЕ пломба уровня MAX: курс пишется прямо сейчас и вернётся людям, когда
 * будет дописан. Возврат — правка одной константы
 * LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY плюс переписывание этого сторожа.
 *
 * Сработал сторож — возвращать правило, а не удалять проверку.
 *
 * Обновлено 2026-10-02 (§70, координатор Q114) по решениям владельца:
 *  • 2026-09-19 — Learning V2 открыт для раннего релиза: константа = true
 *    (незавершённость показывают значки ремонта на уроках, а не замок курса);
 *  • 2026-09-21 — раздел называется «Обучение» во ВСЕХ сборках (не «Старые уроки»).
 * Неизменным остаётся главное: ВХОД всегда открывает обычные уроки.
 */
describe('lessons entry opens the legacy course while Learning V2 is unfinished', () => {
  const lessons = read('app', '(tabs)', 'lessons.tsx');

  test('ручное открытие курса выражено одной константой (открыт с 2026-09-19)', () => {
    // зачем (R92, 17.10): внутри вкладки условие — learningV2CanOpen = константа + язык интерфейса с пояснениями курса (ru/uk)
    expect(lessons).toContain('const learningV2CanOpen = LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY && isLearningV2OpenForUiLangV1(lang, "lessons_tab");');
    // зачем (владелец 11.10: «столько, сколько доступно»): вход есть, только если хоть одно занятие реально открывается.
    expect(lessons).toMatch(/^const LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY = (true|ENABLE_DEV_TOOLS|!IS_STORE_RELEASE|LEARNING_V2_HAS_RELEASED_SESSIONS_V1 \|\| ENABLE_DEV_TOOLS|!LEARNING_V2_HIDDEN && \(LEARNING_V2_HAS_RELEASED_SESSIONS_V1 \|\| ENABLE_DEV_TOOLS\));$/m);
    // зачем (10.10, релизный пол): в стор-сборке маршруты V2 вырезаны из роутера, чип «Новые уроки» там скрыт — иначе тупик «неизвестный маршрут».
  });

  test('ВХОД открывает старые уроки БЕЗУСЛОВНО — и в релизе, и в деве', () => {
    // Именно эта строка и была корнем: пропс никто не передаёт, дефолт = вход.
    expect(lessons).toContain('initialPage = "lessons"');
    expect(lessons).not.toContain('initialPage = "v2"');
    // Первая попытка привязала вход к дев-флагу — у владельца в деве
    // по-прежнему открывался курс. Вход НЕ смеет зависеть от сборки.
    expect(lessons).not.toMatch(
      /initialPage\s*=\s*LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY/,
    );
    expect(lessons).not.toMatch(/initialPage\s*=\s*ENABLE_DEV_TOOLS/);
  });

  test('чип «Новые уроки» не переключает страницу мимо константы', () => {
    // Раньше обработчик был безусловным `onPress={() => { setPage("v2"); }}`.
    expect(lessons).toContain('onPress={openNewLessons}');
    expect(lessons).toContain(
      'if (!learningV2CanOpen) {',
    );
  });

  test('раздел называется «Обучение» во всех сборках (владелец 2026-09-21)', () => {
    expect(lessons).toContain('const legacyLessonsScreenTitle = triLang(lang, {');
    expect(lessons).toContain('{legacyLessonsScreenTitle}');
    expect(lessons).toContain('ru: "Обучение"');
    expect(lessons).not.toContain('ru: "Старые уроки"');
  });

  test('единственный оставшийся переключатель на V2 закрыт той же константой, что и чип', () => {
    // Следим, чтобы в файле не завёлся ещё один безусловный вход на страницу курса.
    const unconditionalSwitches = lessons.match(/setPage\("v2"\)/g) ?? [];
    // Ровно три: вкладка «V2» в шапке, ветка внутри openNewLessons и «назад» из старого списка корневой вкладки на карту (владелец 17.10).
    expect(unconditionalSwitches).toHaveLength(3);
    // зачем (координатор 23:25, practice-027): прежний сторож только считал вызовы и не заметил, что 1d70c8fc5 снял
    // условие с кнопки «V2» — в стор-сборке она вела в вырезанный маршрут. Теперь проверяем само условие у кнопки.
    expect(lessons).toMatch(/\{learningV2CanOpen \? \(\s*<TabUnderlineButton\s+label="V2"/);
    expect(lessons).not.toMatch(/\{\(\s*<TabUnderlineButton\s+label="V2"/);
  });

  test('недоступность показана тоном, а не обводкой (запрет владельца)', () => {
    expect(lessons).toContain(
      'opacity: learningV2CanOpen ? 1 : 0.45,',
    );
  });

  test('ответ на тап — строка «Этот курс находится в разработке»', () => {
    expect(lessons).toContain('legacy-lessons-new-lessons-locked-notice');
    expect(lessons).toContain('ru: "Этот курс находится в разработке"');
    // Мгновенно и локально: без сети, без модала поверх экрана.
    expect(lessons).toContain('setLearningV2LockedNoticeVisible(true)');
  });
});
