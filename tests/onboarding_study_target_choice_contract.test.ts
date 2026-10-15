import fs from 'fs';
import path from 'path';
import { ONBOARDING_COPY_SOURCE } from './helpers/onboarding_copy_source';

const root = process.cwd();
const wrapperSource = fs.readFileSync(path.join(root, 'components', 'onboarding.tsx'), 'utf8');
const source = fs.readFileSync(path.join(root, 'components', 'CleanOnboarding.tsx'), 'utf8') + ONBOARDING_COPY_SOURCE; // // зачем (координатор 12.10): тексты онбординга переехали в components/onboarding/*

describe('clean onboarding study-target and order contract', () => {
  it('keeps the active onboarding wrapper free of legacy implementation code', () => {
    expect(wrapperSource.replace(/\r\n/g, '\n').trim()).toBe("export { default } from './CleanOnboarding';\nexport type { OnboardingProps as Props } from './CleanOnboarding';");
    expect(wrapperSource).not.toContain('studyTargetRoot');
    expect(wrapperSource).not.toContain('planPaywall');
    expect(wrapperSource).not.toContain("require('../assets/images/onboarding");
  });

  // зачем 2026-08-16: анкета построения плана (цель / минуты / режим старта /
  // сравнение планов) удалена вместе с самими планами — утверждён минимальный
  // флоу из 9 живых шагов. Сторожим НОВЫЙ порядок и то, что старые шаги ушли
  // насовсем: вернутся — тест упадёт.
  it('uses the approved minimal screen order', () => {
    [
      "'welcome'",
      "'privacy'",
      "'source'",
      "'level'",
      "'promise'",
      "'notifications'",
      "'trialReminder'",
      "'onboardingPaywall'",
      "'improve'",
      "'name'",
    ].forEach((step) => expect(source).toContain(step));

    expect(source).toContain('CLEAN_ONBOARDING_ORDER');
    // D126 (владелец 2026-09-30): экран выбора языка включён, уровень — нет.
    // Рубильники раздельные, чтобы уровень не вернулся «прицепом» к языку.
    expect(source).toContain('const SHOW_ONBOARDING_LANGUAGE_STEP = true');
    // зачем (координатор 15.10 к сборке 16.10, решение владельца): экран уровня включён и рисуется в цветах темы.
    expect(source).toContain('const SHOW_ONBOARDING_LEVEL_STEP = true');
    expect(source).toContain("...(SHOW_ONBOARDING_LANGUAGE_STEP ? (['language'] as const) : [])");
    expect(source).toContain("...(SHOW_ONBOARDING_LEVEL_STEP ? (['level'] as const) : [])");
    // D164 (вариант А, владелец 12.10): при английском интерфейсе экран языка обязателен — админка его не выключит; иначе порядок прежний.
    expect(source).toContain('languageRequired ? withRequiredLanguageStep(remoteEnabledSteps) : remoteEnabledSteps,');
    expect(source).toContain('SHOW_ONBOARDING_LANGUAGE_STEP || languageRequired,');
    expect(source).toContain("const languageRequired = !isStudyTargetAllowedForUi('en', lang);");
    expect(source).not.toContain("| 'goal'");
    expect(source).not.toContain("| 'minutes'");
    expect(source).not.toContain("| 'plusBenefits'");
    expect(source).not.toContain("| 'startMode'");
    expect(source).not.toContain("| 'planComparison'");
    expect(source).not.toContain("'streak'");
    expect(source).not.toContain("'auth'");
    expect(source).not.toContain("'studyTarget'");
    expect(source).not.toContain("'planPaywall'");
    expect(source).not.toContain("'planPicker'");
  });

  it('starts with branded welcome and same-screen existing-account auth', () => {
    expect(source).toContain('testID="onboarding-welcome-screen"');
    expect(source).toContain('testID="onboarding-start"');
    expect(source).toContain('testID="onboarding-existing-account"');
    expect(source).toContain('GoogleSignInButton');
    expect(source).toContain('AppleSignInButton');
    // зачем (шаг 3 auth-legacy-google-not-found, ревью L-1): онбординг просит сохранить пропуск для входа после смены.
    expect(source).toContain('signInWithProvider(provider, { captureAccountSwitchResume: true })');
  });

  it('D126: English is the default before the language choice, the choice overrides it', () => {
    // «Начать» и «Создать аккаунт» фиксируют английский безусловно — экран языка
    // может быть выключен в админке, и тогда дефолт обязан остаться английским.
    expect(source).toContain('void ensureEnglishStudyTarget();');
    expect(source).not.toContain('if (!SHOW_ONBOARDING_LANGUAGE_STEP) void ensureEnglishStudyTarget()');
    // Выбор карточки сразу пишет таргет обучения.
    expect(source).toContain('onPress={() => { void chooseStudyTarget(item.id); }}');
    expect(source).toContain('[ONBOARDING_REQUESTED_STUDY_TARGET_KEY, target]');
    // Отказы записи не глотаются молча.
    expect(source).toContain('ONBOARDING-LANG:');
  });

  it('captures source and keeps the language picker assets', () => {
    expect(source).toContain('DISCOVERY_OPTIONS');
    expect(source).toContain('onboarding_source_select');
    // Маркетинговая атрибуция обязана дойти до Firestore и админки.
    expect(source).toContain('ensureEnglishStudyTarget');
    expect(source).toContain('LANGUAGE_OPTIONS');
    expect(source).toContain('testID="onboarding-language-continue"');
    expect(source).toContain('LEVEL_OPTIONS');
    // Анкета плана удалена вместе с планами — её наборы не должны вернуться.
    expect(source).not.toContain('GOAL_OPTIONS');
    expect(source).not.toContain('MINUTE_OPTIONS');
  });

  it('persists requested English/French target without old onboarding image assets', () => {
    expect(source).toContain('ONBOARDING_REQUESTED_STUDY_TARGET_KEY');
    expect(source).toContain("[ONBOARDING_REQUESTED_STUDY_TARGET_KEY, 'en']");
    expect(source).toContain('setStoredStudyTarget(target, lang)');
    expect(source).toContain("setStoredStudyTarget('en', lang)");
    expect(source).toContain('setDevStudyTargetLang(target, lang)');
    expect(source).toContain("setDevStudyTargetLang('en', lang)");
    expect(source).toContain("prefetchAndRecordStudyTargetServerPack('fr', lang)");
    // зачем D129 (владелец 2026-09-30): пять языков в порядке «фр, исп, англ, нем, итал».
    const order = ['fr', 'es', 'en', 'de', 'it'].map((id) => source.indexOf(`languageOption('${id}', `));
    order.forEach((position) => expect(position).toBeGreaterThan(-1));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(source).not.toContain("require('../assets/images/onboarding/");
    expect(source).not.toContain('ONBOARDING_STUDY_TARGET_ICONS');
  });

  it('keeps final legal as one terms/privacy checkbox plus optional analytics', () => {
    expect(source).toContain('testID="onboarding-age-yes"');
    expect(source).toContain('testID="onboarding-age-no"');
    expect(source).toContain('testID="onboarding-analytics-checkbox"');
    // Согласие с Условиями переехало на первый экран строкой вплотную к кнопке
    // (sign-in-wrap). Сторожим факт согласия и его запись, а не форму галочки.
    expect(source).toContain('Продолжая, ты принимаешь');
    expect(source).toContain("'onboarding_terms_privacy_accepted_v1'");
    expect(source).toContain('KNOWLY_LEGAL_TERMS_URL');
    expect(source).toContain('KNOWLY_LEGAL_PRIVACY_URL');
    expect(source).not.toContain('YearWheel');
    expect(source).not.toContain('onboarding-age-year-wheel');
  });
});
