import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = (relative: string) =>
  readFileSync(join(__dirname, '..', relative), 'utf8');

test('Learning V2 uses a dedicated new intro renderer instead of the legacy lesson design', () => {
  const route = source('app/learning-v2/session/[id].tsx');
  const intro = source('app/learning_v2_session_intro.tsx');

  expect(route).toContain(
    'import LearningV2SessionIntro from "../../../app/learning_v2_session_intro"',
  );
  expect(route).not.toContain('../../../app/lesson_intro_screens');
  expect(route).toContain('<LearningV2SessionIntro');
  expect(route).toContain('sessionOrdinal={ordinal}');

  expect(intro).not.toContain('LessonArtBackdrop');
  expect(intro).not.toContain('IntroBlockCard');
  expect(intro).not.toContain('DuoPressable');
  expect(intro).toContain('const VISUALS:');
  expect(intro).toMatch(/ru:\s*['"]СМЫСЛ['"]/);
  expect(intro).toMatch(/ru:\s*['"]СХЕМА['"]/);
  expect(intro).toMatch(/ru:\s*['"]ПРИМЕНЕНИЕ['"]/);
  expect(intro).toContain('learning-v2-intro-next');
  expect(intro).toContain('style={styles.scroll}');
  expect(intro).toContain('slide: { flex: 1, minHeight: 0 }');
  expect(intro).toContain('{ paddingBottom: 94 + insets.bottom }');
  expect(intro).toContain('bottomBar: {');
});

test('each of the three intro pages contains its own question and practice begins at slot four', () => {
  const intro = source('app/learning_v2_session_intro.tsx');
  const route = source('app/learning-v2/session/[id].tsx');

  expect(intro).toContain('screen?.learningV2EmbeddedQuestion');
  expect(intro).toContain('wrongCount >= 2');
  expect(intro).not.toMatch(/ru:\s*['"]К 3 вопросам['"]/);
  expect(intro).not.toContain('Три вопроса закрепят тему');
  expect(intro).toMatch(/backgroundColor:\s*['"]#CFFF45['"]/);
  expect(intro).toMatch(/color:\s*['"]#07110A['"]/);
  expect(route).toContain('const [cardIndex, setCardIndex] = useState(3)');
  expect(route).toContain('setCardIndex(3)');
  expect(route).not.toContain('cardIndex < 3');
  expect(intro).toContain('useReducedMotion');
  expect(intro).not.toContain('withRepeat(');
});

test('the application renderer only displays supplied data and contains no generator or network path', () => {
  const intro = source('app/learning_v2_session_intro.tsx');

  expect(intro).not.toMatch(
    /@react-native-firebase|httpsCallable|fetch\(|XMLHttpRequest|OPENAI|\/v1\/audio\/speech/i,
  );
  expect(intro).not.toMatch(
    /admin_content|content_stage_worker|prompt_registry/i,
  );
  expect(intro).toContain('readonly LessonIntroScreen[]');
});
