import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const root = path.resolve(__dirname, '..');
const onboardingPath = path.join(root, 'components', 'onboarding.tsx');
const source = fs.readFileSync(onboardingPath, 'utf8');

describe('personal plan onboarding mockup contract', () => {
  it('keeps the polished plan-flow copy and removes the intermediate app copy', () => {
    [
      'Зачем тебе английский?',
      'План подстроится под ситуации и фразы, которые пригодятся первыми.',
      'Для поездок',
      'Аэропорт, отель, кафе, вопросы на месте',
      'Для работы',
      'Созвоны, переписка, короткие объяснения',
      'Для переезда',
      'Быт, документы, врачи, школа, жильё',
      'Для себя',
      'Спокойно прокачивать понимание и речь',
      'Какой старт ближе?',
      'Сколько времени удобно?',
      'Выбери ритм, который реально получится держать каждый день.',
      'Соберём первую фразу',
      'Собираем твой план',
      'План готов',
      'Попробовать 3 дня бесплатно',
      'Месячный план',
      'Годовой план',
      'Персональный план',
      'Все уроки разблокированы',
      'Разборы твоих ошибок',
      'Продолжить без плана',
    ].filter((text) => !text.includes('onboarding ')).forEach((text) => {
      expect(source).toContain(text);
    });

    [
      'Какая цель сейчас главная?',
      'Выбери направление, а дальше план сам соберёт старт, темп и первые задания.',
      "'Личный план'",
      "goToStep('planPermission')",
      'Можно напомнить о плане?',
      'Один мягкий сигнал в день помогает не начинать заново каждый понедельник.',
    ].forEach((text) => {
      expect(source).not.toContain(text);
    });
  });

  it('uses the mockup shell for the plan path instead of the regular close/header shell', () => {
    expect(source).toContain('hideClose?: boolean');
    expect(source).toContain('renderPlanSegmentProgress');
    expect(source).toContain('styles.planFlowProgressSegments');
    expect(source).toContain('styles.planFlowBackGlyph');
    expect(source).toContain('renderPlanFlowScreen');
    expect(source).toContain("'planPaywall'");
    expect(source).toContain('PLAN_PAYWALL_BENEFITS');
    expect(source).toContain('true,');
    expect(source).not.toContain('<Ionicons name={choice.icon}');
    expect(source).not.toContain('planPermission');
  });

  it('keeps the start screen geometry matched to the recovered mockup', () => {
    [
      'styles.planEntryRoot',
      'styles.planEntryMain',
      'styles.planEntryCtas',
      'paddingHorizontal: 22',
      'paddingBottom: 44',
      'height: 42',
      'letterSpacing: 1.9',
      'width: 112',
      'height: 112',
      'width: 86',
      'height: 86',
      'maxWidth: 360',
      'marginTop: 30',
      'gap: 10',
      'numberOfLines={1}',
      'adjustsFontSizeToFit',
    ].forEach((text) => {
      expect(source).toContain(text);
    });

    expect(source).not.toContain('marginTop: 216');
  });

  it('sends the independent onboarding path straight to nickname entry', () => {
    const start = source.indexOf('testID="onboarding-continue-independently"');
    const end = source.indexOf('</TouchableOpacity>', start);
    const buttonBlock = source.slice(start, end);

    expect(buttonBlock).toContain("setNicknameMode('regular')");
    expect(buttonBlock).toContain('AsyncStorage.removeItem(PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY)');
    expect(buttonBlock).toContain("goToStep('name')");
    expect(buttonBlock).not.toContain("goToStep('welcome')");
  });

  it('keeps the regular start nickname screen matched to the mockup', () => {
    [
      'onboarding-name-screen',
      'Текущая ветка onboarding приложения без личного плана.',
      'Личный план подключён. Осталось подписать профиль.',
      'styles.regularNameRoot',
      'styles.regularNameTop',
      'styles.regularNameMark',
      'styles.regularNameInputFrame',
      'styles.regularNameInput',
      'placeholder=""',
      'autoFocus={false}',
      "PREV_STEP[step] ?? 'planEntry'",
    ].filter((text) => !text.includes('onboarding ') && !text.includes('Ли')).forEach((text) => {
      expect(source).toContain(text);
    });

    const nameBlockStart = source.indexOf("if (step === 'name') {");
    const nameBlockEnd = source.indexOf('if (false) {', nameBlockStart);
    const activeNameBlock = source.slice(nameBlockStart, nameBlockEnd);

    expect(activeNameBlock).not.toContain('renderProgressBar()');
    expect(activeNameBlock).not.toContain('testID="onboarding-name-skip"');
    expect(activeNameBlock).not.toContain('REGULAR START');
    expect(activeNameBlock).not.toContain('regularNameBrand');
    expect(activeNameBlock).not.toContain('regularNameSub');
    expect(activeNameBlock).not.toContain('placeholder="Alex"');
  });

  it('does not keep Ionicon-backed plan metadata or plan-flow glyphs', () => {
    [
      "icon: 'airplane-outline'",
      "icon: 'briefcase-outline'",
      "icon: 'home-outline'",
      "icon: 'flash-outline'",
      "icon: 'ear-outline'",
      'icon: keyof typeof Ionicons.glyphMap',
      '<Ionicons name="chevron-forward"',
      '<Ionicons name="checkmark-circle"',
    ].forEach((text) => {
      expect(source).not.toContain(text);
    });
  });

  it('keeps bitmap plan icons wired into choice cards', () => {
    [
      'iconAsset: ONBOARDING_PLAN_ICONS.travel',
      'iconAsset: ONBOARDING_PLAN_ICONS.work',
      'iconAsset: ONBOARDING_PLAN_ICONS.home',
      'iconAsset: ONBOARDING_PLAN_ICONS.study',
      'iconAsset: ONBOARDING_PLAN_ICONS.beginner',
      'iconAsset: ONBOARDING_PLAN_ICONS.basic',
      'iconAsset: ONBOARDING_PLAN_ICONS.speaking',
      'iconAsset: ONBOARDING_PLAN_ICONS.confidence',
      'todayIconAsset: ONBOARDING_PLAN_ICONS.phrase',
      '<PlanFlowIcon source={choice.iconAsset} />',
      '<PlanFlowIcon source={ONBOARDING_PLAN_ICONS.time} />',
    ].forEach((text) => {
      expect(source).toContain(text);
    });
  });

  it('renders onboarding bitmap icons as bundled images without delayed expo-image fade-in', () => {
    [
      'Image as RNImage',
      'ONBOARDING_PRELOADED_ICON_ASSETS',
      'function resolveOnboardingBundledImageSource',
      'function warmOnboardingBundledImages()',
      'resolveOnboardingBundledImageSource(source)',
      'function OnboardingBundledImage',
      'fadeDuration={0}',
      '<OnboardingBundledImage',
      'warmOnboardingBundledImages();',
    ].forEach((text) => {
      expect(source).toContain(text);
    });

    [
      "import { Image as ExpoImage } from 'expo-image';",
      '<ExpoImage',
      'contentFit="contain"',
      'cachePolicy="memory-disk"',
      'RNImage.resolveAssetSource(source);',
    ].forEach((text) => {
      expect(source).not.toContain(text);
    });
  });

  it('ports the mockup result/detail pages instead of remapping them into old app cards', () => {
    [
      'days: 84',
      'days: 112',
      'days: 126',
      'days: 140',
      'Рекомендуем A2, потому что план сразу ведёт в реальные сценарии поездки: аэропорт, стойка регистрации, кафе, отель, просьбы и уточнения.',
      'Уже к середине этого срока ты сможешь не просто учить слова, а действовать: спросить, понять ответ, переспросить и не теряться в типичных ситуациях поездки.',
      'Дней занятий',
      'planMockupDaysCard',
      'planMockupResultHero',
      'planMockupRowsPanel',
      'planMockupRow',
      'dayWord(',
    ].forEach((text) => {
      expect(source).toContain(text);
    });

    [
      'План для поездок: спросить дорогу',
      'Начнём с A2:',
      '<Text style={styles.planResultNumber}>{selectedPlan.horizon}</Text>',
    ].forEach((text) => {
      expect(source).not.toContain(text);
    });
  });

  it('keeps the mockup loading animation timings and colors available in the native screen', () => {
    [
      'PLAN_LOADING_METER_KEYFRAMES',
      'inputRange: [0, 0.35, 0.7, 1]',
      'outputRange: [0.06, 0.42, 0.76, 1]',
      'duration: 3200',
      'delay: 450',
      'delay: 1100',
      'delay: 1750',
      'delay: 3350',
      "'#63E6D2'",
      "['#F2B84B', '#63E6D2']",
      'useNativeDriver: true',
      'transform: [{ scaleX: meterScaleX }]',
      'transform: [{ scaleX: daysFillScale }]',
      "transformOrigin: 'left center'",
    ].forEach((text) => {
      expect(source).toContain(text);
    });

    expect(source).not.toContain('planLoadingRailWidth');
    expect(source).not.toContain('setPlanLoadingRailWidth');
    expect(source).not.toContain('planDaysRailWidth');
    expect(source).not.toContain('setPlanDaysRailWidth');
  });

  it('keeps plan choice cards arrowless and allows phrase mistakes after input', () => {
    [
      'PLAN_PHRASE_TOKENS',
      'PLAN_PHRASE_TARGET',
      'selectedPlanPhraseTokens',
      'const canContinuePlanPhrase = selectedPlanPhraseTokens.length > 0',
      'planPhraseHasError',
      'planPhraseLineError',
      '{canContinuePlanPhrase ? (',
      'planFlowShell',
      '<Text style={styles.planEntryBrand}>PHRASEMAN</Text>',
      'selectedPlanBilling',
      "onPress={() => setSelectedPlanBilling('monthly')}",
      "onPress={() => setSelectedPlanBilling('annual')}",
      'PLAN_DAYS_COUNT_DURATION_MS',
      'PLAN_DAYS_COUNT_TICK_MS',
      'let countTimer: ReturnType<typeof setInterval> | null = null',
      'Math.round(total * easedProgress)',
      'Хочу свой план',
      'Продолжить без плана',
    ].forEach((text) => {
      expect(source).toContain(text);
    });

    expect(source).not.toContain('styles.planFlowChevron');
    expect(source).not.toContain("const canContinuePlanPhrase = phraseAnswer === PLAN_PHRASE_TARGET.join(' ')");
    expect(source).not.toContain('disabled={!canContinuePlanPhrase}');
    expect(source).not.toContain('planPhraseContinueDisabled');
    expect(source).not.toContain('Вернуться к Premium');
    expect(source).not.toContain('planDaysProgress.addListener');
    expect(source).not.toContain('Math.round(total * value)');
    expect(source).toContain('planMockupGhostButton]} activeOpacity={0.72} onPress={() => goToStep(\'name\')}');
    expect(source).toContain('style={styles.eliteWelcomeSecondaryCta} activeOpacity={0.82} onPress={() => goToStep(\'name\')}');
  });
});

describe('personal plan onboarding icon assets', () => {
  const expectedHashes: Record<string, string> = {
    'icon-basic.png': '6477B0DF29E17308529EE1D6518553EA019006EF18B99EB1462DCFBE1B1B7883',
    'icon-beginner.png': '95D3F7595210F0961AB4D3E60F8C6DF44E825BB718E4D5D2AB9B37F68A1C6AA5',
    'icon-confidence.png': '2EF1DF599F3DE89FFFC9C9360320AE2BCE4FB42E1CD8AC20C0C9DDB084ECE4EA',
    'icon-home.png': 'F7C1FCC4132751B4E18E5AA2C5680EEB961540135CB52FC7AEC0174B7396D8BC',
    'icon-path.png': 'E7CC5243678376469DB35275D821C09FAC42BF26BCAEDF14B0235AC413CABBA5',
    'icon-phrase.png': 'AE3DB055C4F85E02B2FD51F40186A18F96734222F17577F725B8B7D64EDFA68D',
    'icon-speaking.png': 'AE3DB055C4F85E02B2FD51F40186A18F96734222F17577F725B8B7D64EDFA68D',
    'icon-study.png': '15E9B218898F1652256B73CDB9E4AC67337EA4EDB45281C5D99D0E7094330038',
    'icon-time.png': 'FD40F596D7ADD45023006998000A0B165F9834C607F155756B73C29D961AB3ED',
    'icon-travel.png': 'B2483D34C1A19B45D5E9E1FF1E635A047FEC9D5E9B8191BC0E0EEDA7062CA666',
    'icon-work.png': '7B6CBD2B1946B838900ED1DA0BECE12B5F249138D33A1151F40A13B369377975',
  };

  it('does not lose or mutate the current plan icon assets', () => {
    for (const [fileName, expectedHash] of Object.entries(expectedHashes)) {
      const assetPath = path.join(root, 'assets', 'images', 'onboarding', 'plan-icons', fileName);
      const bytes = fs.readFileSync(assetPath);
      const actualHash = crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();

      expect(bytes.length).toBeGreaterThan(1000);
      expect(actualHash).toBe(expectedHash);
    }
  });
});
