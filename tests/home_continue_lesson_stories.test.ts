import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('the live Home uses the full themed scene and resumes the exact saved lesson', () => {
  const home = read('app/(tabs)/home.tsx');
  expect(home).toMatch(/<HomeScene\s/);
  expect(home).not.toMatch(/<HomeContinueScene\b|<HomeV2ContinueCard\b|resolveLastAvailableLessonId/);
  expect(home).toContain("pathname: '/lesson1', params: { id: String(lastLesson.id), from: 'home' }");
  expect(home).not.toContain('openHomeContinuePlace');
  expect(read('components/home/v2/scene/HomeSceneStage.tsx')).toContain('<SceneBackdrop palette={scenePal}');
  const scene = read('components/home/v2/scene/HomeScene.tsx');
  expect(scene).not.toContain('lessonOnly');
  // зачем (владелец 11.11): прежняя сцена со всеми героями жива для dev-входа «Сверки», Главная зовёт её в режиме continueOnly
  expect(scene).toContain('copy={p.continueOnly ? stageCopy : copy}');
  expect(scene).toContain('chips={p.continueOnly ? NO_CHIPS : chips}');
});

test('Home top keeps only «Continue lesson»: states and lesson info leave the scene, Continue opens only the last opened lesson', () => {
  const scene = read('components/home/v2/scene/HomeScene.tsx');
  expect(scene).toMatch(/onChip=\{p\.onChip \?\? noopChip\}\s+continueOnly\s+canContinue=\{p\.canContinue\}/);
  expect(scene).toContain("kicker: '', title: '', line: null, bar: null, warm: null, note: null, chips: []");
  expect(scene).toContain('homeContinueLessonLabel(p.lang)');
  expect(scene).toContain("state={p.continueOnly ? 'continue' : decision.state}");
  expect(scene).toContain('offlineLine && !p.continueOnly');
  const home = read('app/(tabs)/home.tsx');
  const handler = home.slice(home.indexOf('const continueFromScene = () => {'), home.indexOf('const openScenePhrase'));
  expect(handler).toContain('openLastLesson()');
  // зачем (ответ владельца 11.11: новичку кнопку прятать): ни меню урока 1, ни раздела вместо урока
  expect(handler).not.toMatch(/lesson_menu|sceneSection|quickItems/);
  expect(home).toContain('const sceneCanContinue = sceneLesson !== null;');
  expect(home).toContain('canContinue={sceneCanContinue}');
  expect(home).not.toMatch(/homeSceneContinueTarget|sceneLessonTitle|onChip=\{/);
  expect(scene).toContain("cta: p.canContinue === false ? null : homeContinueLessonLabel(p.lang)");
});

// зачем (владелец 11.11, вечер: «не будет историй с ними, просто удаляй их»): состояния и особые сцены Главной историями не становятся.
// Падает, если Главная снова начнёт собирать из них истории или передавать их в кольцо аватара.
test('Home states and special scenes do not become stories', () => {
  const scene = read('components/home/v2/scene/HomeScene.tsx');
  const home = read('app/(tabs)/home.tsx');
  expect(scene).not.toMatch(/buildHomeSceneStory|buildHomeSpecialStory|home_activity_stories|sceneStory/);
  expect(home).not.toMatch(/homeStories=|sceneStory/);
  expect(fs.existsSync(path.join(__dirname, '..', 'modules/story_events/home_activity_stories.ts'))).toBe(false);
});

test('holding the coin for a second replays recent and Home stories even with unread events', () => {
  const avatar = read('components/stories/StoryAvatarSlot.tsx');
  expect(avatar).toContain('delayLongPress={1000}');
  expect(avatar).toContain('const replayQueue = useMemo');
  expect(avatar).toContain('open(replayQueue)');
  expect(avatar).toContain('open(unreadQueue)');
  expect(avatar).toContain('accessibilityActions=');
  expect(read('components/stories/StorySlides.tsx')).toContain("case 'home_activity'");
});
