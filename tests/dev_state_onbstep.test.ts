// зачем (R1_PENDING_COVERAGE 2б, onboarding-025 / onboarding-paywall-001): dev_state?onbstep=onboardingPaywall&paywall=loading|live открывает экран цены онбординга.
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseDevStateParams } from '../app/dev_state_fixtures';

describe('dev_state?onbstep=', () => {
  it('известный шаг принимается (без учёта регистра) и подразумевает onboarding=pending', () => {
    const r = parseDevStateParams({ onbstep: 'onboardingpaywall', onboarding: 'done', paywall: 'loading' });
    expect(r.request.onbStep).toBe('onboardingPaywall');
    expect(r.request.onboarding).toBe('pending');
    expect(r.request.paywall).toBe('loading');
    expect(r.rejected).toEqual({});
  });
  it('неизвестный шаг отбрасывается с причиной, онбординг не трогается', () => {
    const r = parseDevStateParams({ onbstep: 'nowhere', onboarding: 'done' });
    expect(r.request.onbStep).toBeUndefined();
    expect(r.request.onboarding).toBe('done');
    expect(Object.keys(r.rejected)).toEqual(['onbstep']);
  });
  it('подмена пейвола «по ссылке» принимает loading / live / reference / failed / off', () => {
    for (const value of ['loading', 'live', 'reference', 'failed', 'off']) expect(parseDevStateParams({ paywall: value }).request.paywall).toBe(value);
  });
  it('применение пишет версию потока и шаг только в локальные ключи и перезапускает онбординг', () => {
    const src = readFileSync(join(__dirname, '..', 'app', 'dev_state_fixtures.ts'), 'utf8').replace(/\r\n/g, '\n');
    expect(src).toMatch(/multiSet\(\[\['onboarding_flow_version_v1', CLEAN_ONBOARDING_FLOW_VERSION\], \['onboarding_step', request\.onbStep\]\]\)/);
    expect(src.indexOf("request.onbStep) {")).toBeLessThan(src.indexOf("emitAppEvent('dev_onboarding_restart')", src.indexOf("request.onbStep) {")));
  });
});
