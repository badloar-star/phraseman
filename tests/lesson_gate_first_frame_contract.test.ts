// зачем (координатор 13.10, UX без смены логики): пока fail-closed проверка доступа/энергии не ответила, меню и шлюз урока рисуют скелет по форме экрана, а не пустой фон.
// Контракт держит обе половины: (1) скелет есть и не раскрывает содержимое; (2) решение гейта не тронуто — fail-closed старт, «закрыто» по-прежнему рисует только фон, содержимое урока не монтируется до `available`.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const menu = read('app/lesson_menu.tsx');
const boundary = read('app/lesson_runtime_access_boundary.tsx');
const skeleton = read('components/lessons/LessonMenuGateSkeleton.tsx');

describe('меню урока: скелет вместо пустого фона на время проверки', () => {
  it('скелет рисуется только пока решения НЕТ (lockStateLoaded ложно), решённое «закрыто» — прежний фон', () => {
    const branch = menu.slice(menu.indexOf('зачем (координатор 13.10): РЕШЕНИЯ ещё нет'), menu.indexOf('// зачем: тут стоял `return <View style={{flex:1}}/>`'));
    expect(branch).toMatch(/if \(!lockStateLoaded\) \{\n\s*return \(\n\s*<ScreenGradient forceFullBleed>/);
    expect(branch).toContain('<LessonMenuGateSkeleton glass={lessonMenuGlass} bottomInset={insets.bottom} />');
    // после скелета — прежний ответ для закрытого урока: только фон, без меню
    expect(branch).toMatch(/return \(\n\s*<ScreenGradient>\n\s*<LessonArtBackdrop variant="menu" \/>\n\s*<\/ScreenGradient>\n\s*\);\n\s*\}\s*$/);
  });

  it('решение гейта не менялось: fail-closed старт и ревалидация, ошибка проверки = закрыто', () => {
    expect(menu).toMatch(/const \[isLessonLocked, setIsLessonLocked\] = useState\(true\);/);
    expect(menu).toMatch(/const \[lockStateLoaded, setLockStateLoaded\] = useState\(false\);/);
    // 15.10 (7d564d137): запуск закрыт ещё и пока идёт тихая перепроверка (lockRevalidating) — строже прежнего, fail-closed сохранён
    expect(menu).toMatch(/const lessonLaunchBlocked = !lockStateLoaded \|\| isLessonLocked \|\| lockRevalidating;/);
    // 15.10: новый урок/аккаунт — прежний fail-closed старт (скелет + закрыто до подтверждения); подтверждённый в заходе урок перепроверяется тихо, запуск закрыт (lockRevalidating); сеттеры результата — по поколению проверки
    expect(menu).toMatch(/lockCheckStartedAtRef\.current = Date\.now\(\);[\s\S]*?setLockStateLoaded\(false\);[\s\S]*?setIsLessonLocked\(true\);/);
    expect(menu).toMatch(/by: 'error_fail_closed'[\s\S]*?gatedSetLocked\(true\);/);
  });

  it('скелет ничего не включает: без нажатий, скрыт от скринридера, строки того же размера, что у LessonMenuRow, без обводок', () => {
    expect(skeleton).toContain('pointerEvents="none"');
    expect(skeleton).toContain('accessibilityElementsHidden');
    expect(skeleton).toContain('importantForAccessibility="no-hide-descendants"');
    expect(skeleton).toContain('scrollEnabled={false}');
    expect(skeleton).toMatch(/LESSON_MENU_SKELETON_ROW_HEIGHT = 76;/);
    expect(read('components/lessons/LessonMenuGlass.tsx')).toMatch(/const ROW_MIN_HEIGHT = 76;/);
    expect(skeleton).not.toMatch(/borderWidth|borderColor/);
  });

  it('журнал [LESSON-GATE-FIRSTFRAME]: начало ожидания и длительность с исходом', () => {
    expect(menu).toContain('[LESSON-GATE-FIRSTFRAME] menu lesson=');
    expect(menu).toMatch(/проверка заняла \$\{Date\.now\(\) - lockCheckStartedAtRef\.current\} мс/);
  });
});

describe('шлюз входа в урок: скелет урока вместо пустого View', () => {
  it('ожидание рисует тот же LessonFirstFrame, что урок после шлюза, внутри неинтерактивной обёртки', () => {
    expect(boundary).toContain("import LessonFirstFrame from '../modules/lesson_first_frame';");
    expect(boundary).toMatch(/<View testID="lesson-runtime-access-pending" pointerEvents="none" style=\{\{ flex: 1 \}\}>\n\s*<LessonFirstFrame theme=\{t\} \/>\n\s*<\/View>/);
  });

  it('решение шлюза не тронуто: содержимое монтируется только при available, закрыто/ошибка — на экран отказа', () => {
    expect(boundary).toMatch(/if \(gate === 'available'\) \{\n\s*setAuthorizedRouteKey\(routeKey\);\n\s*return;\n\s*\}/);
    expect(boundary).toContain('openLessonPremiumPaywall(router, lessonId);');
    // 15.10 (f81d8c79d): охранник передаёт меню своё решение (gate) для сверки замков в журнале — решение то же: не available → меню замка
    expect(boundary).toMatch(/openLessonAccessGate\(router, lessonId, String\(gate\), Date\.now\(\) - startedAt\);\n\s*\}\)\n\s*\.catch\(/);
    expect(boundary).toMatch(/if \(!cancelled\) openLessonAccessGate\(router, lessonId, 'resolver_error', Date\.now\(\) - startedAt\);/);
    expect(boundary).toContain('return <Screen {...props} />;');
    // экран монтируется строго после проверки authorized
    expect(boundary.indexOf('if (!authorized)')).toBeLessThan(boundary.indexOf('return <Screen {...props} />;'));
  });

  it('журнал [LESSON-GATE-FIRSTFRAME]: начало, длительность с исходом, причина падения проверки', () => {
    expect(boundary).toContain('[LESSON-GATE-FIRSTFRAME] boundary ${routeKey}: проверка доступа идёт');
    expect(boundary).toMatch(/проверка заняла \$\{Date\.now\(\) - startedAt\} мс → \$\{gate\}/);
    expect(boundary).toMatch(/console\.warn\(`\[LESSON-GATE-FIRSTFRAME\] boundary \$\{routeKey\}: проверка упала за/);
  });
});
