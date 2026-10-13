/**
 * EN_EXTRA2 13.10 (en-home-001 / paywalls-023): dev_state `onboarding=done` закрывает онбординг, открытый предыдущей ссылкой
 * (`onbstep=…` → dev_onboarding_restart → setShow(true) в _layout). Раньше done-ветка писала только ключи хранилища, и оверлей
 * оставался поверх next= до холодного старта.
 */
import fs from 'fs';
import path from 'path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('dev_state onboarding=done closes an already open onboarding overlay', () => {
  it('the done branch emits dev_onboarding_done right after storing the keys', () => {
    const src = read('app/dev_state_fixtures.ts');
    const done = src.slice(src.indexOf("if (request.onboarding === 'done') {"), src.indexOf("} else {", src.indexOf("if (request.onboarding === 'done') {")));
    expect(done).toContain("await AsyncStorage.setItem('onboarding_done', '1');");
    expect(done).toContain("emitAppEvent('dev_onboarding_done');");
  });

  it('the event is typed and the root layout hides the overlay on it, logging the previous visibility', () => {
    expect(read('app/events.ts')).toContain('dev_onboarding_done: undefined;');
    const layout = read('app/_layout.tsx');
    const at = layout.indexOf("onAppEvent('dev_onboarding_done'");
    expect(at).toBeGreaterThan(0);
    const handler = layout.slice(at, at + 600);
    expect(handler).toContain('return false;');
    expect(handler).toContain('[DEV-STATE] onboarding overlay closed by onboarding=done');
    expect(handler).toContain('setOnboardingPaywallActive(false);');
  });
});
