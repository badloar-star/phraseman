import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const read = (...parts: string[]): string => readFileSync(join(ROOT, ...parts), 'utf8');

/**
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
 */
describe('lessons entry opens the legacy course while Learning V2 is unfinished', () => {
  const lessons = read('app', '(tabs)', 'lessons.tsx');

  test('ручное открытие курса выражено одной константой и закрыто в релизе', () => {
    expect(lessons).toContain(
      'const LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY = ENABLE_DEV_TOOLS;',
    );
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
      'if (!LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY) {',
    );
  });

  test('в релизе экран называется просто «Уроки», в деве — «Старые уроки»', () => {
    expect(lessons).toContain(
      'const legacyLessonsScreenTitle = LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY',
    );
    expect(lessons).toContain('{legacyLessonsScreenTitle}');
    expect(lessons).toContain('ru: "Уроки"');
  });

  test('единственный оставшийся переключатель на V2 закрыт дев-флагом', () => {
    // Вкладка «V2» в шапке уже жила под ENABLE_DEV_TOOLS; следим, чтобы в файле
    // не завёлся ещё один безусловный вход на страницу курса.
    const unconditionalSwitches = lessons.match(/setPage\("v2"\)/g) ?? [];
    // Ровно два: дев-вкладка в шапке и ветка внутри openNewLessons.
    expect(unconditionalSwitches).toHaveLength(2);
  });

  test('недоступность показана тоном, а не обводкой (запрет владельца)', () => {
    expect(lessons).toContain(
      'opacity: LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY ? 1 : 0.45,',
    );
  });

  test('ответ на тап — строка «Этот курс находится в разработке»', () => {
    expect(lessons).toContain('legacy-lessons-new-lessons-locked-notice');
    expect(lessons).toContain('ru: "Этот курс находится в разработке"');
    // Мгновенно и локально: без сети, без модала поверх экрана.
    expect(lessons).toContain('setLearningV2LockedNoticeVisible(true)');
  });
});
