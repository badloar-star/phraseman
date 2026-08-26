import fs from 'node:fs';
import path from 'node:path';

const root = path.join(__dirname, '..');
const read = (...parts: string[]) => fs.readFileSync(path.join(root, ...parts), 'utf8');

describe('instant interaction response contract', () => {
  test('production navigation cannot re-enable animated route transitions', () => {
    const config = read('app', 'config.ts');
    const layout = read('app', '_layout.tsx');
    const sectionSheet = read('app', 'section_sheet_navigation.ts');
    const paywall = read('components', 'paywall', 'paywallShared.tsx');

    for (const [flag, envName] of [
      ['ENABLE_SCREEN_TRANSITIONS', 'EXPO_PUBLIC_SCREEN_TRANSITIONS'],
      ['SCREEN_FADE_TRANSITIONS', 'EXPO_PUBLIC_SCREEN_FADE'],
      ['SECTION_SHEET_TRANSITIONS', 'EXPO_PUBLIC_SECTION_SHEET_TRANSITIONS'],
    ] as const) {
      expect(config).toContain(
        `export const ${flag} = !IS_STORE_RELEASE && process.env.${envName} === '1';`,
      );
    }
    expect(layout).toContain("const INSTANT_STACK_ANIMATION = { animation: 'none', animationDuration: 0 } as const;");
    expect(layout).toContain('const cardsSiblingAnimationOptions = INSTANT_STACK_ANIMATION;');
    expect(layout).toContain('const bottomModalAnimationOptions = INSTANT_STACK_ANIMATION;');
    expect(sectionSheet).toContain("animation: 'none', animationDuration: 0");
    expect(sectionSheet).not.toContain("animation: 'slide_from_bottom'");
    expect(paywall).toContain("presentation: 'modal', animation: 'none', animationDuration: 0, gestureEnabled: true");
  });

  test('shared press primitives start visual feedback before native haptics', () => {
    for (const file of ['PressableScale.tsx', 'TapScale.tsx', 'DuoPressable.tsx', 'PressableHybrid.tsx']) {
      const source = read('components', ...file.split('/'))
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
      const pressInStart = source.indexOf('const pressIn');
      const hapticIndex = source.indexOf('hapticTap()', pressInStart);
      const visualIndex = Math.min(
        ...['Animated.timing', 'Animated.spring', 'press.value ='].map((needle) => {
          const index = source.indexOf(needle, pressInStart);
          return index < 0 ? Number.POSITIVE_INFINITY : index;
        }),
      );

      expect(pressInStart).toBeGreaterThanOrEqual(0);
      expect(visualIndex).toBeLessThan(hapticIndex);
    }

    const feedbackPress = read('components', 'feedback', 'PressableScale.tsx');
    const feedbackStart = feedbackPress.indexOf('const handlePressIn');
    expect(feedbackPress.indexOf('pressed.value =', feedbackStart)).toBeLessThan(feedbackPress.indexOf('fk.tap()', feedbackStart));

    const speak = read('app', 'flashcards', 'SpeakHoldButton.tsx');
    const speakStart = speak.indexOf('const onPressIn');
    expect(speak.indexOf('press.value =', speakStart)).toBeLessThan(speak.indexOf('hapticTap()', speakStart));

    const tabs = read('app', '(tabs)', '_layout.tsx');
    const tabPressStart = tabs.indexOf('const beginTabPress');
    expect(tabs.indexOf('Animated.spring', tabPressStart)).toBeLessThan(tabs.indexOf('hapticTap()', tabPressStart));
  });

  test('Android edge rebound stays crisp instead of occupying half a second', () => {
    const bounceMath = read('components', 'bounceMath.ts');
    const match = bounceMath.match(/BOUNCE_SPRING\s*=\s*\{[^}]*duration:\s*(\d+)/);
    expect(match).not.toBeNull();
    expect(Number(match?.[1])).toBeLessThanOrEqual(220);

    const bouncy = read('components', 'BouncyScrollView.tsx');
    expect(bouncy).toContain('ReduceMotion.System');
    expect(bouncy).not.toContain('.onEnd(() => {');
    expect(bouncy.match(/withSpring\(0, ACCESSIBLE_BOUNCE_SPRING\)/g)).toHaveLength(1);
  });

  test('cold tab evaluation is outside the tap hot path and URL sync has no timer', () => {
    const tabs = read('app', '(tabs)', '_layout.tsx');
    const mountStart = tabs.indexOf('const mountNow = useCallback');
    const mountEnd = tabs.indexOf('const scheduleMount = useCallback', mountStart);
    const mountBlock = tabs.slice(mountStart, mountEnd);
    const frameIndex = mountBlock.indexOf('requestAnimationFrame(() => {');
    const prewarmIndex = mountBlock.indexOf('prewarmDeferredTabScreen(idx)');
    const navigateStart = tabs.indexOf('const navigateTo = useCallback');
    const navigateEnd = tabs.indexOf('const handleTabChange = useCallback', navigateStart);
    const navigateBlock = tabs.slice(navigateStart, navigateEnd);

    expect(frameIndex).toBeGreaterThanOrEqual(0);
    expect(prewarmIndex).toBeGreaterThan(frameIndex);
    expect(mountBlock.match(/requestAnimationFrame/g)).toHaveLength(2);
    expect(navigateBlock).toContain('router.navigate(target as any);');
    expect(navigateBlock).not.toContain('setTimeout');
  });

  test('shared route helpers and lesson cache warmups do not delay navigation', () => {
    const modalNavigation = read('app', 'safe_modal_navigation.ts');
    const redirect = read('components', 'DeferredRedirect.tsx');
    const lessonMenu = read('app', 'lesson_menu.tsx');
    const lessonComplete = read('app', 'lesson_complete.tsx');
    const flashcards = read('app', 'flashcards_collection.tsx');
    const listening = read('app', 'flashcards_listening_session.tsx');
    const dialogs = read('components', 'DialogsTabContent.tsx');
    const dialogBriefing = read('app', 'ai_dialog_briefing.tsx');
    const dialogSeen = read('app', 'ai_dialog_intro_seen.ts');
    const languagePicker = read('components', 'settings', 'StudyLanguagePicker.tsx');
    const languageWelcome = read('app', 'language_welcome.tsx');

    expect(modalNavigation).not.toContain('InteractionManager.runAfterInteractions');
    expect(modalNavigation).not.toContain('setTimeout(navigate');
    expect(redirect).not.toContain('InteractionManager.runAfterInteractions');
    expect(redirect).not.toContain('setTimeout');
    expect(lessonMenu).not.toContain('await primeLessonScreenFromStorage');
    expect(lessonMenu).not.toContain('await prefetchLessonMenuCache');
    expect(lessonComplete).not.toContain('await prefetchLessonMenuCache');
    const flashStart = flashcards.slice(
      flashcards.indexOf('const startDeckSession'),
      flashcards.indexOf('const startDeckTraining'),
    );
    expect(flashStart).not.toContain('await getLastPreset');
    expect(flashStart).toContain('router.push');
    expect(flashStart).toContain("size: 'preset'");
    expect(listening).toContain("if (raw === 'preset') return null;");
    expect(listening).toContain('if (!sessionSizeReady) return;');
    const dialogStart = dialogs.slice(
      dialogs.indexOf('const openScenarioDestination'),
      dialogs.indexOf('const openCourseScenario'),
    );
    expect(dialogStart).not.toContain('await hasSeenAiDialogIntro');
    expect(dialogStart).not.toContain('.then(');
    expect(dialogStart).toContain("pathname: '/ai_dialog_briefing'");
    expect(dialogBriefing).toContain('peekAiDialogIntroSeen');
    expect(dialogBriefing).toContain('hasSeenAiDialogIntro');
    expect(dialogSeen).toContain('seenMemory.set(key, false);');
    const languageStart = languagePicker.slice(
      languagePicker.indexOf('const onSelect'),
      languagePicker.indexOf('return ('),
    );
    expect(languageStart).not.toContain('await getStartedStudyLanguages');
    expect(languageStart).toContain("resolveStarted: '1'");
    expect(languageWelcome).toContain('const [entryResolved, setEntryResolved] = useState(!resolveStarted);');
  });

  test('high-frequency scroll chrome avoids JS-driven decorative animation work', () => {
    const tabs = read('app', '(tabs)', '_layout.tsx');
    const theory = read('app', 'lesson_help_theory_ui.tsx');
    const verbs = read('app', 'lesson_irregular_verbs.tsx');

    expect(tabs).toContain('if (immediate || reduceMotion)');
    expect(theory).toContain('{ useNativeDriver: true }');
    expect(verbs).toContain('{ useNativeDriver: true }');
    expect(theory).not.toContain('{ useNativeDriver: false }');
    expect(verbs).not.toContain('{ useNativeDriver: false }');
  });
});
