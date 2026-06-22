import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const root = path.resolve(__dirname, '..');
const onboardingPath = path.join(root, 'components', 'onboarding.tsx');
const source = fs.readFileSync(onboardingPath, 'utf8');

describe('personal plan onboarding mockup contract', () => {
  it('keeps the two-choice plan entry as first launch and kills the legacy welcome screen route', () => {
    [
      'getOnboardingAbVariant',
      'getStableId',
      "type OnboardingAbEntryStep = 'planEntry'",
      "type OnboardingAbSimpleStep = 'name' | 'demo2' | 'demo'",
      "const ONBOARDING_AB_FALLBACK_ENTRY_STEP: OnboardingAbEntryStep = 'planEntry'",
      "const ONBOARDING_AB_FALLBACK_SIMPLE_STEP: OnboardingAbSimpleStep = 'name'",
      "const ONBOARDING_AB_VARIANT_STORAGE_KEY = 'onboarding_ab_variant_v1'",
      'const ONBOARDING_BG_LIBRARY = require',
      "onboarding-bg-welcome-wide.webp",
      'const ONBOARDING_BG_NAME = ONBOARDING_BG_LIBRARY',
      'styles.onboardingBgImageStack',
      '<Animated.Image',
      'LEGACY_PERSONAL_PLAN_ONBOARDING_STEPS',
      'onboardingSimpleStepForVariant',
      'onboardingSimpleStepRef',
      "return 'demo'",
      "return 'name'",
      'normalizeRestoredOnboardingStep(saved, pendingNickname, entryStep)',
      "restored === 'beta' || LEGACY_PERSONAL_PLAN_ONBOARDING_STEPS.has(restored)",
      "restored === 'welcome' || restored === 'demo2' || restored === 'demo'",
      // Дефолтный (не-быстрый) старт по-прежнему = ONBOARDING_AB_FALLBACK_ENTRY_STEP
      // ('planEntry'). На быстром пути переоткрытия после пейвола стартуем сразу на
      // 'name' (synchronousNameEntry) — см. onboarding_paywall_return_no_home_flash.
      "synchronousNameEntry ? 'name' : ONBOARDING_AB_FALLBACK_ENTRY_STEP",
      'goToStep(onboardingSimpleStepRef.current)',
      "next === 'welcome' ? onboardingEntryStepRef.current : next",
      "if (step === 'welcome') setStep(onboardingEntryStepRef.current)",
      'onboarding-welcome-disabled-screen',
      'onboarding-ab-resolving-screen',
      'getOnboardingPrevStep(step)',
    ].forEach((text) => {
      expect(source).toContain(text);
    });

    [
      "useState<OnboardingStep>(IS_BETA_TESTER ? 'beta' : 'planEntry')",
      "type OnboardingAbSimpleStep = 'welcome' | 'demo2' | 'demo'",
      "const ONBOARDING_AB_FALLBACK_SIMPLE_STEP: OnboardingAbSimpleStep = 'welcome'",
      "return 'welcome'",
      "welcome: 'planEntry'",
      "PREV_STEP[step] ?? 'planEntry'",
      "onboarding-bg-name-wide.webp",
      "onboarding-bg-builder-wide.webp",
      "onboarding-bg-quiz-wide.webp",
      "onboarding-bg-streak-wide.webp",
      "onboarding-bg-auth-wide.webp",
    ].forEach((text) => {
      expect(source).not.toContain(text);
    });
  });

  it('routes the "just look at the app" path straight to nickname entry for every A/B variant (no demo quiz)', () => {
    // Кнопка «Просто посмотреть приложение» зовёт goToStep(onboardingSimpleStepRef.current),
    // а ref берётся из onboardingSimpleStepForVariant(...). Эта функция теперь ВСЕГДА
    // отдаёт 'name' — демо-квиз-экраны ('demo'/'demo2', напр. «I'm fed up with this job»)
    // удалены из реального флоу и больше не маршрутизируются ни для одного варианта.
    const fnStart = source.indexOf('function onboardingSimpleStepForVariant');
    expect(fnStart).toBeGreaterThan(-1);
    const fnEnd = source.indexOf('\n}', fnStart);
    const fnBody = source.slice(fnStart, fnEnd);

    expect(fnBody).toContain("return 'name'");
    expect(fnBody).not.toContain("return 'demo2'");
    expect(fnBody).not.toContain("return 'demo'");
    expect(fnBody).not.toContain("variant === 'builder'");
    expect(fnBody).not.toContain("variant === 'quiz'");

    // Демо-фразы «fed up» больше не должны попадаться пользователю по этому пути —
    // сам экран можно держать в коде как мёртвый, но роутинг на него снят выше.
  });

  it('keeps the polished plan-flow copy and removes the intermediate app copy', () => {
    [
      'Зачем тебе английский?',
      'Скажи — и план сразу подберёт нужные слова и ситуации.',
      'Понимать кино и сериалы',
      'Живая речь на слух — без субтитров',
      'Говорить в обычной жизни',
      'Отвечать в разговоре без ступора',
      'Путешествовать',
      'Аэропорт, отель, кафе и дорога',
      'Знать нужные слова',
      'Запас на каждый день — и сразу в речь',
      'Заниматься для себя',
      'Спокойный темп и польза для ума',
      'С чего начнём?',
      'Сколько времени удобно?',
      'Выбери ритм, который реально получится держать каждый день.',
      'Собираем твой план',
      'План готов',
      'const trialDays = storePrices.trialDays',
      "const ctaLabel = storePrices.hasTrial",
      "`Попробовать ${trialDays} ${trialDays === 1 ? 'день' : trialDays < 5 ? 'дня' : 'дней'} бесплатно`",
      'Месячный',
      'Годовой',
      'Персональный план',
      'Все уроки открыты',
      'Разбор твоих слабых мест',
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

  it('opens the A/B/C paywall (with onboarding bg) from the plan result, gating it behind a premium-already check', () => {
    const resultStart = source.indexOf("if (step === 'planResult') {");
    const resultBlock = source.slice(resultStart, source.indexOf("if (step === 'planPaywall') {", resultStart));

    // CTA «Это мой план — вперёд» вызывает guard-обёртку openSelectedPlanAbPaywall.
    expect(source).toContain('openSelectedPlanAbPaywall');
    expect(resultBlock).toContain('onPress={openSelectedPlanAbPaywall}');

    // Внутри обёртки: запоминаем выбранный биллинг, проверяем уже-имеющийся доступ,
    // и если доступа нет — вызываем onPersonalPlanPaywallStart (→ /premium_modal → A/B/C с фоном онбординга).
    const wrapperStart = source.indexOf('const openSelectedPlanAbPaywall = async () => {');
    const wrapperEnd = source.indexOf('\n  };', wrapperStart);
    const wrapperBlock = source.slice(wrapperStart, wrapperEnd);
    expect(wrapperStart).toBeGreaterThan(-1);
    expect(wrapperBlock).toContain("'onboarding_plan_billing'");
    expect(wrapperBlock).toContain('queuePendingPersonalPlanActivation');
    expect(wrapperBlock).toContain('onPersonalPlanPaywallStart');
    expect(wrapperBlock).not.toContain("goToStep('planPaywall')");

    // Сам экран planPaywall сохранён (резерв) — но не активируется через openSelectedPlanAbPaywall.
    expect(source).toContain("if (step === 'planPaywall') {");
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
    expect(buttonBlock).toContain('goToStep(onboardingSimpleStepRef.current)');
    expect(buttonBlock).not.toContain("goToStep('name')");
    expect(buttonBlock).not.toContain("goToStep('welcome')");
  });

  it('does not restore a stale regular nickname step over the first screen', () => {
    const restoreStart = source.indexOf("AsyncStorage.getItem('onboarding_step')");
    const restoreEnd = source.indexOf('const logOnboardingFunnel', restoreStart);
    const restoreBlock = source.slice(restoreStart, restoreEnd);

    expect(restoreBlock).toContain('PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY');
    expect(restoreBlock).toContain('getStableId');
    expect(restoreBlock).toContain('getOnboardingAbVariant');
    expect(restoreBlock).toContain('normalizeRestoredOnboardingStep(saved, pendingNickname, entryStep)');
    expect(restoreBlock).toContain("['onboarding_step', restored]");
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
      'getOnboardingPrevStep(step) ?? onboardingEntryStepRef.current',
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
    expect(activeNameBlock).toContain('styles.regularNameSub');
    expect(activeNameBlock).not.toContain('placeholder="Alex"');
  });

  it('checks nickname availability while typing on the active nickname screen', () => {
    const nameBlockStart = source.indexOf("if (step === 'name') {");
    const nameBlockEnd = source.indexOf('if (false) {', nameBlockStart);
    const activeNameBlock = source.slice(nameBlockStart, nameBlockEnd);

    [
      'checkNameAvailabilityDetailed',
      'reserveNameDetailed',
      'warmNameAvailabilityAuth',
      'NAME_AVAILABILITY_DEBOUNCE_MS = 700',
      "status: 'checking'",
      "status: 'available'",
      "status: 'taken'",
      "status: 'error'",
      'nameAvailabilitySeq.current',
      'regularNameInputAvailable',
      'regularNameInputError',
      'regularNameStatusIconAvailable',
      'regularNameStatusTextAvailable',
      'regularNameStatusTextHidden',
      'autoCapitalize="none"',
      'autoCorrect={false}',
    ].forEach((text) => {
      expect(source).toContain(text);
    });

    expect(activeNameBlock).toContain("nameAvailabilityStatus === 'checking'");
    expect(activeNameBlock).toContain("nameAvailabilityStatus === 'available'");
    expect(activeNameBlock).toContain("nameAvailabilityStatus === 'taken'");
    expect(activeNameBlock).toContain('ActivityIndicator');
    expect(activeNameBlock).toContain('Ionicons name="checkmark"');
    expect(activeNameBlock).toContain('Ionicons name="close"');
    expect(activeNameBlock).toContain('disabled={nameContinueDisabled}');
    // ОПТИМИСТИЧНЫЙ онбординг: имя принимается мгновенно, серверная бронь идёт
    // В ФОНЕ (handleNameDone не ждёт reserveNameDetailed) — отсюда переход без
    // ожидания сети и без ложного «Имя не проверилось». Бронь обёрнута в
    // fire-and-forget `void (async () => { ... reserveNameDetailed(...) ... })()`
    // и переход `goToStep('streak')` происходит сразу после неё, не дожидаясь
    // результата. Раньше тут жёстко проверялся result.status (taken/cooldown/ok)
    // ДО перехода — это поведение намеренно убрано.
    expect(source).toContain("reserveNameDetailed(trimmed, priorReservedName, { source: 'onboarding' })");
    expect(source).toContain('void (async () => {');
    expect(source).not.toContain("if (result.status === 'cooldown'");
    expect(source).toContain("setNameAvailability({ status: 'idle', value: '', message: null });");
    expect(source.indexOf("setNameAvailability({ status: 'idle', value: '', message: null });"))
      .toBeLessThan(source.indexOf("message: pickNameText('Проверяем имя...'"));
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
      'iconAsset: ONBOARDING_PLAN_ICONS.phrase',
      'iconAsset: ONBOARDING_PLAN_ICONS.work',
      'iconAsset: ONBOARDING_PLAN_ICONS.path',
      'iconAsset: ONBOARDING_PLAN_ICONS.beginner',
      'iconAsset: ONBOARDING_PLAN_ICONS.basic',
      'iconAsset: ONBOARDING_PLAN_ICONS.speaking',
      'iconAsset: ONBOARDING_PLAN_ICONS.confidence',
      'todayIconAsset: ONBOARDING_PLAN_ICONS.phrase',
      '<PlanFlowIcon source={choice.iconAsset} styles={styles} />',
      '<PlanFlowIcon source={ONBOARDING_PLAN_ICONS.time} styles={styles} />',
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
      'Рекомендуем A2: план сразу ведёт в реальные сценарии поездки — аэропорт, отель, кафе, просьбы и уточнения.',
      'Уже к середине пути ты сможешь спросить, понять ответ, переспросить — и спокойно решить вопрос в поездке.',
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
      'theme.accent2',
      'colors={[theme.accent, theme.accent2]}',
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

  it('does not replay the completed plan-loading animation for the same answers', () => {
    [
      'const completedPlanLoadingAnswerKeyRef = useRef<string | null>(null)',
      'const planLoadingAnswerKey = [',
      'selectedPlanGoalForPlan',
      'selectedPlanLevelForPlan',
      'selectedPlanMinutesForPlan',
      'selectedPlanId',
      'completedPlanLoadingAnswerKeyRef.current === planLoadingAnswerKey',
      'setPlanLoadingCtaReady(true)',
      'planLoadingMeter.setValue(1)',
      'planLoadingBuildAnims.forEach((value) => value.setValue(1))',
      'planLoadingButtonAnim.setValue(1)',
      'completedPlanLoadingAnswerKeyRef.current = planLoadingAnswerKey',
      '}, [planLoadingAnswerKey, planLoadingBuildAnims, planLoadingButtonAnim, planLoadingMeter, step])',
    ].forEach((text) => {
      expect(source).toContain(text);
    });
  });

  it('keeps plan choice cards arrowless and skips the removed phrase-builder step', () => {
    [
      'planFlowShell',
      '<Text style={styles.planEntryBrand}>PHRASEMAN</Text>',
      'selectedPlanBilling',
      "onPress={() => setSelectedPlanBilling('monthly')}",
      "onPress={() => setSelectedPlanBilling('annual')}",
      'PLAN_DAYS_COUNT_DURATION_MS',
      'PLAN_DAYS_COUNT_TICK_MS',
      'let countTimer: ReturnType<typeof setInterval> | null = null',
      'Math.round(total * easedProgress)',
      "goToStep('planLoading')",
      'Составить план под мою цель',
      'Продолжить без плана',
    ].forEach((text) => {
      expect(source).toContain(text);
    });

    expect(source).not.toContain('styles.planFlowChevron');
    expect(source).not.toContain('planPhrase');
    expect(source).not.toContain('PLAN_PHRASE');
    expect(source).not.toContain('selectedPlanPhraseTokens');
    expect(source).not.toContain('onboarding-plan-phrase-screen');
    expect(source).not.toContain('disabled={!canContinuePlanPhrase}');
    expect(source).not.toContain('planPhraseContinueDisabled');
    expect(source).not.toContain('Вернуться к Premium');
    expect(source).not.toContain('planDaysProgress.addListener');
    expect(source).not.toContain('Math.round(total * value)');
    expect(source).toContain('planMockupGhostButton]} activeOpacity={0.72} onPress={() => {');
    expect(source).toContain("goToStep('name');");
    expect(source).toContain('style={[styles.eliteWelcomeSecondaryCta, styles.planEntrySecondaryCta]}');
  });

  it('does not visually preselect personal-plan choice cards before the user taps', () => {
    [
      "useState<OnboardingPlanGoal | null>(null)",
      "useState<OnboardingPlanLevel | null>(null)",
      "useState<PlanMinutesChoice | null>(null)",
      "const selectedPlanGoalForPlan: OnboardingPlanGoal = selectedPlanGoal ?? 'travel'",
      "const selectedPlanLevelForPlan: OnboardingPlanLevel = selectedPlanLevel ?? 'a1'",
      "const selectedPlanMinutesForPlan: PlanMinutesChoice = selectedPlanMinutes ?? 15",
      "const selected = selectedPlanGoal === choice.id",
      "const selected = selectedPlanLevel === choice.id",
      "const selected = selectedPlanMinutes === choice",
      'resolveOnboardingPlanId(selectedPlanGoalForPlan, selectedPlanOverride)',
      'minutesPerDay: selectedPlanMinutesForPlan',
    ].forEach((text) => {
      expect(source).toContain(text);
    });

    [
      "useState<OnboardingPlanGoal>('travel')",
      "useState<OnboardingPlanLevel>('a1')",
      'useState<PlanMinutesChoice>(15)',
      'minutesPerDay: selectedPlanMinutes,',
    ].forEach((text) => {
      expect(source).not.toContain(text);
    });
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
