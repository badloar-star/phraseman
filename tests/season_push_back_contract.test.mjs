// [LESSONS-NAV] ЗАМОК (владелец 25.10, 2.0.2, iPhone: «из раздела „Уроки“ невозможно выйти назад!!! нет кнопки назад, нет таббара»):
// каждый вход на экран Сезона даёт либо таббар (вкладка «Уроки» внутри TabSlider), либо штатную «Назад» (push /learning-v2/course).
// Сломался — верни кнопку, а не ослабляй проверку.
import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const read = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const lessons = read('app/(tabs)/lessons.tsx');
const course = read('app/learning-v2/course.tsx');
const connected = read('components/learning-v2/season/SeasonCourseConnected.tsx');
const view = read('components/learning-v2/season/SeasonCourseView.tsx');
const slider = read('app/TabSlider.tsx');
const oldMap = read('components/learning-v2/LearningV2ChaptersCourse.tsx');

test('push-маршрут /learning-v2/course — тот же экран «Уроки» поверх вкладок (таббара нет)', () => {
  assert.match(course, /<LessonsTab presentation="push" initialPage="v2" \/>/);
});

test('вкладка: TabSlider помечает страницу вкладки (там таббар) — по этому Сезон отличает вкладку от push', () => {
  assert.match(slider, /<TabPageContext\.Provider value>/);
  assert.match(connected, /const isTabPage = useIsTabPage\(\);/);
});

test('push: Сезон рисует штатную «Назад» (ScreenBackButton) вне прокрутки', () => {
  assert.match(connected, /pushBack=\{!isTabPage\}/);
  assert.match(view, /import ScreenBackButton, \{[^}]*\} from '\.\.\/\.\.\/v2\/ScreenBackButton';/);
  const afterScroll = view.slice(view.lastIndexOf('</ScrollView>'));
  assert.match(afterScroll, /\{props\.pushBack \? <ScreenBackButton screen="season_course_push" fallback="\/\(tabs\)\/home"/, '«Назад» после </ScrollView> — не уезжает с обложкой');
  assert.match(view, /left: SCREEN_BACK_RESERVED/, 'строка «Урок N» не ложится под круг');
});

test('флаг Сезона выключен: старая карта по-прежнему рисует «Назад» из navigationControl', () => {
  assert.match(lessons, /SEASON_SCENE_V2_ENABLED \? \(SeasonCourseConnected as unknown as typeof LearningV2ChaptersCourse\) : LearningV2ChaptersCourse/);
  assert.match(lessons, /navigationControl=\{\n\s+<PressableHybrid\n\s+testID="learning-v2-back-home"/);
  assert.match(oldMap, /\{props\.navigationControl\}/);
});

test('списки Сезона на вкладке учитывают капсулу таббара (Ревизор 25.10: подпись под таббаром)', () => {
  const hook = read('components/learning-v2/season/use_season_list_bottom_pad.ts');
  assert.match(hook, /const used = isTabPage \? Math\.max\(given, tabBottomPad\) : given;/);
  const all = read('components/learning-v2/LearningV2AllLessonsList.tsx');
  assert.match(all, /const bottomPad = useSeasonListBottomPad\(props\.bottomPadding, "all_lessons"\);/);
  assert.match(all, /paddingBottom: bottomPad \}/);
  assert.doesNotMatch(all, /paddingBottom: props\.bottomPadding/);
  const pick = read('components/learning-v2/season/SeasonPickScreens.tsx');
  assert.match(pick, /const bottomPad = useSeasonListBottomPad\(props\.bottomPadding, props\.screen\);/);
  assert.match(pick, /styles\.footer, \{ paddingBottom: bottomPad \}/);
  assert.match(view, /const contentBottomPad = isTabPage \? Math\.max\(props\.bottomPadding, tabBottomPad\) : props\.bottomPadding;/, 'обложка — то же правило');
});

test('«Все уроки»: каждый выход идёт через closeLessonsList с журналом (вкладка → таббар, push → «Назад» на обложке)', () => {
  assert.match(connected, /\[LESSONS-NAV\] all_lessons:\$\{what\}/);
  assert.match(connected, /onBack=\{\(\) => closeLessonsList\('header_back'\)\}/);
  assert.match(connected, /closeLessonsList\('hardware_back'\);/);
  assert.match(connected, /closeLessonsList\('lesson_pick'\);/);
  assert.doesNotMatch(connected, /onBack=\{\(\) => setAllLessonsOpen\(false\)\}/, 'выход из списка мимо журнала');
});

test('Android: системная «Назад» на push-Сезоне = «‹» (Сверка 25.10: уходила в классический lessons_list)', () => {
  const block = connected.slice(connected.indexOf("BackHandler.addEventListener('hardwareBackPress', () => {\n      if (!screenFocusedRef.current)"));
  assert.ok(block.length > 0, 'подписка push-Сезона на hardwareBackPress есть');
  assert.match(connected, /if \(isTabPage\) return undefined;\n\s+if \(typeof BackHandler\?\.addEventListener !== 'function'\) return undefined;/, 'только на push, вкладку не трогает');
  assert.match(block, /noteBackTap\('season_course_push', 'hardware_back', \{ source: 'hardware'/);
  assert.match(block, /safeRouterBack\(router, HOME_BACK_FALLBACK\);\n\s+return true;/);
  assert.match(connected, /return false;\n\s+\}\n\s+noteBackTap\('season_course_push'/, 'не в фокусе — отдаёт дальше');
  // подписка один раз при монтировании, не useFocusEffect: окно эпизода и списки подписываются позже и забирают «Назад» первыми
  assert.doesNotMatch(connected, /useFocusEffect/);
  assert.ok(connected.indexOf("noteBackTap('season_course_push'") < connected.indexOf('аппаратная «назад» из «Все уроки»'), 'подписка Сезона объявлена раньше подписки «Все уроки»');
});

test('Android: глобальный «Назад» корня не перехватывает push-Сезон (Сверка 25.10 ❌ по 1c45ee89f: POP_TO lessons_list)', () => {
  const nav = read('app/navigation_back.ts');
  const owned = nav.match(/const SCREEN_OWNED_ANDROID_BACK_PATHS: ReadonlySet<string> = new Set\(\[([\s\S]*?)\]\);/);
  assert.ok(owned, 'список экранов со своим «Назад» найден');
  assert.ok(owned[1].includes("'/learning-v2/course'"), 'push-Сезон сам решает «Назад»');
  const root = read('app/_layout.tsx');
  assert.match(root, /\[BACK-GLOBAL\] gate/);
  assert.match(root, /\[BACK-GLOBAL\] press/);
});

test('журнал [LESSONS-NAV]: режим экрана, canGoBack и чем решён выход', () => {
  assert.match(connected, /\[LESSONS-NAV\] season/);
  assert.match(connected, /back: isTabPage \? 'not_needed\(tab_root\)' : 'ScreenBackButton'/);
});
