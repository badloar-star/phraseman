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

test('журнал [LESSONS-NAV]: режим экрана, canGoBack и чем решён выход', () => {
  assert.match(connected, /\[LESSONS-NAV\] season/);
  assert.match(connected, /back: isTabPage \? 'not_needed\(tab_root\)' : 'ScreenBackButton'/);
});
