/**
 * Контракт покрытия воронки конверсии аналитикой.
 *
 * Зачем: уже был баг «intro_ended_* объявлены в analytics.ts, но НИГДЕ не вызываются» →
 * половина воронки невидима в baseline. Этот тест гарантирует, что каждое
 * конверсионно-критичное событие РЕАЛЬНО вызывается где-то через trackEvent / capturePostHog
 * (или firebase-фасад), а не только объявлено в типе.
 *
 * Если ты намеренно удаляешь событие из воронки — обнови CRITICAL_FUNNEL_EVENTS.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOTS = ['app', 'components'];

/** Конверсионно-критичные события: должны иметь хотя бы один реальный вызов в коде. */
const CRITICAL_FUNNEL_EVENTS = [
  // верх воронки
  'onboarding_step_view',
  'onboarding_plan_paywall_view',
  'onboarding_plan_trial_cta',
  'intro_full_access_started',
  // главный момент конверсии
  'intro_ended_shown',
  'intro_ended_cta',
  'intro_ended_dismiss',
  // пейвол
  'paywall_shown',
  'paywall_close',
  'paywall_continue_free',
  // покупка
  'purchase_started',
  'purchase_completed',
  'purchase_failed',
  'purchase_cancelled',
  'trial_started',
  // новые механики (#3, #7)
  'afterwin_upsell_shown',
  'afterwin_upsell_cta',
  'paywall_abandoned_push_sent',
  'winback_shown',
];

function collectSource(): string {
  let out = '';
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      const st = fs.statSync(p);
      if (st.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(f) && !f.endsWith('.test.ts')) out += fs.readFileSync(p, 'utf8') + '\n';
    }
  };
  ROOTS.forEach(walk);
  return out;
}

describe('analytics — покрытие воронки конверсии', () => {
  const src = collectSource();

  it.each(CRITICAL_FUNNEL_EVENTS)('событие %s реально вызывается (не только объявлено)', (event) => {
    // ищем вызов trackEvent('event' / capturePostHog('event' / logEvent('event'
    const re = new RegExp(`(trackEvent|capturePostHog|logEvent)\\(\\s*['"]${event}['"]`);
    expect(re.test(src)).toBe(true);
  });
});
