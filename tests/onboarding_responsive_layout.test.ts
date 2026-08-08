import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'components', 'CleanOnboarding.tsx'), 'utf8');

describe('clean onboarding responsive layout contract', () => {
  it('uses a constrained scroll shell with bounce disabled for all non-welcome screens', () => {
    expect(source).toContain('function ScreenFrame');
    expect(source).toContain('bounces={false}');
    expect(source).toContain('alwaysBounceVertical={false}');
    expect(source).toContain('overScrollMode="never"');
    expect(source).toContain('contentContainerStyle');
  });

  it('keeps long text from clipping on the branded welcome screen', () => {
    expect(source).toContain('numberOfLines={3}');
    expect(source).toContain('letterSpacing: 0');
    // зачем: ужимать шрифт под контейнер запрещено (прыгающая геометрия первого кадра
    // и нечитаемый текст на длинных локалях) — длинный текст лечится переносом/вёрсткой.
    expect(source).not.toContain('adjustsFontSizeToFit');
  });

  it('keeps the name step usable when the keyboard is open', () => {
    expect(source).toContain("behavior={Platform.OS === 'ios' ? 'padding' : undefined}");
    expect(source).toContain('Keyboard.dismiss()');
    expect(source).toContain('keyboardShouldPersistTaps="handled"');
  });

  it('keeps the final age consent truthful and checkbox-based', () => {
    expect(source).toContain('testID="onboarding-age-yes"');
    expect(source).toContain('testID="onboarding-age-no"');
    expect(source).toContain('testID="onboarding-legal-checkbox"');
    expect(source).toContain('testID="onboarding-analytics-checkbox"');
    // Онбординг спрашивает только «есть ли 16» — значит и записывать он должен ровно
    // этот факт. Синтетический год рождения (текущий − 16) уезжал в Firestore как
    // персональные данные: у всех одинаковый, бесполезный, лишний по GDPR ст. 5(1)(c).
    expect(source).toContain('confirmAdultAgeAttestation()');
    expect(source).not.toContain('setBirthYear');
    expect(source).not.toContain('getFullYear() - MIN_FULL_ACCESS_AGE');
    // зачем: согласие пишется в двух ветках (granted/denied) вместе с трекингом события,
    // а не одним тернарником — проверяем оба исхода, а не конкретную форму записи.
    expect(source).toContain("setAnalyticsConsent('granted')");
    expect(source).toContain("setAnalyticsConsent('denied')");
    expect(source).toContain("if (ageAnswer !== 'yes')");
    expect(source).toContain('Приложение доступно с ${MIN_FULL_ACCESS_AGE} лет.');
    expect(source).not.toContain('BackHandler.exitApp()');
    expect(source).not.toContain("label={ageAnswer === 'no'");
    expect(source).not.toContain("loading={ageAnswer === 'no'");
    expect(source).not.toContain('YearWheel');
    expect(source).not.toContain('onboarding-age-year-wheel');
    expect(source).not.toContain('следующий шаг безопас');
  });

  it('keeps the midnight liquid background asset-free', () => {
    expect(source).toContain('function Background()');
    expect(source).toContain('liquidBlobOne');
    expect(source).toContain('liquidBlobTwo');
    expect(source).not.toContain("require('../assets/images/onboarding");
    expect(source).not.toMatch(/onboarding-bg-(welcome|name|streak|auth)-wide\.webp/);
    expect(source).not.toContain('ONBOARDING_THEME_BLUE');
    expect(source).not.toContain('ONBOARDING_THEME_GREEN');
  });
});
