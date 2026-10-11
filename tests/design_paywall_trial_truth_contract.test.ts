// зачем (координатор 12.10, paywall-gap-001/004/007; требование ревью сторов — условия на экране = условия списания):
// длительность пробного N приходит только из магазина (D117, D158-уточнение), тексты подставляют реальное N на 9 языках,
// dev-превью с заданным N (_force_trial_days) не просачивается в стор-сборку и не подменяет данные магазина.
import fs from 'node:fs';
import path from 'node:path';

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

  it('dev preview accepts only a sane N and never reads the param when the hook is not in the dev bypass', () => {
    const screen = read('components/paywall/PaywallPlusScreen.tsx');
    expect(screen).toMatch(/Number\.isInteger\(n\) && n >= 1 && n <= 60 \? n : null/);
    expect(screen).toMatch(/forceTrialUI, forceTrialDays, resumeLessonId/);
  });
});
