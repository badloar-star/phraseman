// зачем (координатор 12.10, paywall-gap-001/004/007; требование ревью сторов — условия на экране = условия списания):
// длительность пробного N приходит только из магазина (D117, D158-уточнение), тексты подставляют реальное N на 9 языках,
// dev-превью с заданным N (_force_trial_days) не просачивается в стор-сборку и не подменяет данные магазина.
import fs from 'node:fs';
import path from 'node:path';

import type { PurchasesPackage } from 'react-native-purchases';

import { describeTrialSource } from '../app/paywall_trial_info';
import { ctaStartTrial, heroTrialTitle, reminderDayTitle, trialFreeLabel } from '../components/paywall/PaywallPlusCopy';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('Paywall trial: the number on screen is the number the store charges by', () => {
  it.each([3, 7, 12, 17])('N=%i appears in the header, the button, the plan line and the timeline on all nine languages', (n) => {
    for (const lang of LANGS) {
      for (const text of [heroTrialTitle(lang, n), ctaStartTrial(lang, n), trialFreeLabel(lang, n)]) {
        expect(text).toContain(String(n));
        expect(text).not.toMatch(/\{n\}|\{days\}/);
      }
      expect(reminderDayTitle(lang, n)).toBeTruthy();
    }
  });

  it('the trial length is never typed into the paywall copy or the screen', () => {
    const copy = read('components/paywall/PaywallPlusCopy.ts');
    const screen = read('components/paywall/PaywallPlusScreen.tsx');
    expect(copy).not.toMatch(/\b(?:3|5|7|10|12|14|17|30)\s*(?:дн|day|días|dias|ngày|hari|gün|dni)/i);
    expect(screen).not.toMatch(/trialDays\s*[:=]\s*\d/);
  });

  it('the trial in a real build comes only from the store package (eligible intro price / Play free phase)', () => {
    const hook = read('app/paywall_purchase.ts');
    expect(hook).toMatch(/const yearlyTrialDays = yearlyTrial\.hasTrial \? yearlyTrial\.days : devTrialDays;/);
    expect(hook).toMatch(/const devForceTrial = DEV_IAP_BYPASS && forceTrialUI === true;/);
    // выдуманное N возможно только в dev-превью (нужен и флаг, и обход магазина)
    expect(hook).toMatch(/const devTrialDays = devForceTrial \?/);
    const screen = read('components/paywall/PaywallPlusScreen.tsx');
    expect(screen).toContain('const yearlyTrialDays = pricesReady ? p.yearlyTrialDays : null;'); // без живых цен магазина пробный не обещаем
    expect(screen).toMatch(/источникПробного=/); // журнал [PAYWALL] называет источник N: store | dev_force
  });

  // зачем (владелец 18.10: «почему на месяце написано БЕЗ ПРОБНОГО ПЕРИОДА? пробный установлен и там, и там»): плитка «Месяц»
  // брала пробный только при выбранном месяце, а по умолчанию выбран год. Каждая плитка читает пробный СВОЕГО пакета.
  it('each tile reads the trial of its own package, regardless of the selected plan', () => {
    const hook = read('app/paywall_purchase.ts');
    expect(hook).toMatch(/getTrialInfo\(packages\.monthly, monthlyEligibility\)/);
    expect(hook).toMatch(/const monthlyTrialDays = monthlyTrial\.hasTrial \? monthlyTrial\.days : devTrialDays;/);
    expect(hook).toMatch(/monthlyTrialDays, monthlyTrialSource, ctaDisabled/);
    expect(hook).toMatch(/'\[PAYWALL-TRIAL\]', `год: \$\{describeTrialSource\(packages\.yearly/);
    expect(hook).toMatch(/'\[PAYWALL-TRIAL\]', `месяц: \$\{describeTrialSource\(packages\.monthly/);
    const screen = read('components/paywall/PaywallPlusScreen.tsx');
    expect(screen).toContain('const monthlyTrialDays = pricesReady ? p.monthlyTrialDays : null;');
    expect(screen).not.toMatch(/p\.selected === 'monthly' \? p\.trialDays/);
  });

  it('the monthly tile never says «no free trial»: no trial in the package means no line at all', () => {
    const tiles = read('components/paywall/PaywallPlanRows.tsx');
    expect(tiles).not.toMatch(/COPY\.noTrial/);
    expect(tiles).toContain('trialDays={monthlyTrialDays}');
    expect(tiles).toMatch(/\{trialDays \? <Text[\s\S]*?trialFreeLabel\(lang, trialDays\)[\s\S]*?: null\}/);
  });

  it('[PAYWALL-TRIAL] names what the store gave for the package', () => {
    const monthlyAndroid = {
      product: { identifier: 'plus_monthly', defaultOption: { id: 'trial-7', freePhase: { billingPeriod: { unit: 'DAY', value: 7, iso8601: 'P7D' } } } },
    } as unknown as PurchasesPackage;
    expect(describeTrialSource(monthlyAndroid)).toBe('продукт=plus_monthly introPrice[нет] defaultOption=trial-7 freePhase[дней=7 iso=P7D] eligibility=unknown');
    const monthlyIos = {
      product: { identifier: 'plus_monthly', introPrice: { price: 0, periodNumberOfUnits: 1, periodUnit: 'WEEK', period: 'P1W' } },
    } as unknown as PurchasesPackage;
    expect(describeTrialSource(monthlyIos, 'ineligible')).toBe('продукт=plus_monthly introPrice[цена=0 период=1WEEK/P1W дней=7] defaultOption=нет freePhase[нет] eligibility=ineligible');
    expect(describeTrialSource(undefined)).toBe('пакета нет');
  });

  it('dev preview accepts only a sane N and never reads the param when the hook is not in the dev bypass', () => {
    const screen = read('components/paywall/PaywallPlusScreen.tsx');
    expect(screen).toMatch(/Number\.isInteger\(n\) && n >= 1 && n <= 60 \? n : null/);
    expect(screen).toMatch(/forceTrialUI, forceTrialDays, resumeLessonId/);
  });
});
