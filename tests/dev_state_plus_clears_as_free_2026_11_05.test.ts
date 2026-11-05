// зачем (150, Maestro: тап по уроку 11 при dev_state plus=on не открывал урок): флаг «как Free» переживал перезапуск и подменял Plus на Free
// в проверке уроков списка. plus=on без явного free= теперь заодно снимает флаг; явный free= остаётся главным.
import { readSource } from './helpers/read_source';

describe('dev_state: plus=on снимает флаг «как Free»', () => {
  it('шаг free_auto_off стоит сразу после явного free= и срабатывает только при plus=on без free', () => {
    const s = readSource('app/dev_state_fixtures.ts');
    const explicit = s.indexOf("if (request.free) await step('free'");
    const auto = s.indexOf("if (request.plus === 'on' && !request.free) await step('free_auto_off'");
    expect(explicit).toBeGreaterThan(0);
    expect(auto).toBeGreaterThan(explicit);
    expect(s).toContain("setDevAsFreeFlag(false)");
  });
});
