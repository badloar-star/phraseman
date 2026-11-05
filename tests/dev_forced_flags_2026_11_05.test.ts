// зачем (координатор 05.11, инвентарь окон наград: «14 окон без dev-способа показа»): dev_state?devFlags=a,b|off включает remote-флаги ссылкой, без рестарта Metro — только dev-сборка.
// Сторож: включает/снимает, в стор-сборке отклоняет, неверные имена отбрасываются, getRemoteBool видит принудительный флаг, ссылка разбирается в dev_state_fixtures.
import { readSource } from './helpers/read_source';

describe('dev_state?devFlags — принудительное включение remote-флагов', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
  });
  afterEach(() => jest.restoreAllMocks());

  it('в dev-сборке: включает флаг, getRemoteBool его видит; off — снимает', () => {
    jest.doMock('../app/config', () => ({ IS_STORE_RELEASE: false }));
    const forced = require('../app/dev_forced_flags') as typeof import('../app/dev_forced_flags');
    expect(forced.isDevForcedFlag('section_openings_enabled')).toBe(false);
    expect(forced.setDevForcedFlags(['section_openings_enabled', 'energy_gift_enabled'])).toBe(true);
    expect(forced.isDevForcedFlag('section_openings_enabled')).toBe(true);
    expect(forced.isDevForcedFlag('rank_gates_enabled')).toBe(false);
    expect(forced.setDevForcedFlags(null)).toBe(true);
    expect(forced.isDevForcedFlag('section_openings_enabled')).toBe(false);
  });

  it('remote_flags.getRemoteBool возвращает true для принудительного флага (energy_gift_enabled по умолчанию false)', () => {
    jest.doMock('../app/config', () => ({ IS_STORE_RELEASE: false }));
    const flags = require('../app/remote_flags') as typeof import('../app/remote_flags');
    const forced = require('../app/dev_forced_flags') as typeof import('../app/dev_forced_flags');
    expect(flags.getRemoteBool('energy_gift_enabled')).toBe(false);
    forced.setDevForcedFlags(['energy_gift_enabled']);
    expect(flags.getRemoteBool('energy_gift_enabled')).toBe(true);
    forced.setDevForcedFlags(null);
    expect(flags.getRemoteBool('energy_gift_enabled')).toBe(false);
  });

  it('стор-сборка: установка отклоняется, флаг не включается', () => {
    jest.doMock('../app/config', () => ({ IS_STORE_RELEASE: true }));
    const forced = require('../app/dev_forced_flags') as typeof import('../app/dev_forced_flags');
    expect(forced.setDevForcedFlags(['energy_gift_enabled'])).toBe(false);
    expect(forced.isDevForcedFlag('energy_gift_enabled')).toBe(false);
  });

  it('разбор списка: неверные имена отбрасываются', () => {
    jest.doMock('../app/config', () => ({ IS_STORE_RELEASE: false }));
    const forced = require('../app/dev_forced_flags') as typeof import('../app/dev_forced_flags');
    expect(forced.parseDevForcedFlags('section_openings_enabled, ,Bad-Name,x,energy_gift_enabled')).toEqual(['section_openings_enabled', 'energy_gift_enabled']);
  });

  it('ссылка dev_state разбирает devFlags и после установки сообщает хостам remote_config_changed', () => {
    const src = readSource('app/dev_state_fixtures.ts');
    expect(src).toContain('const devFlagsRaw = one(params.devFlags);');
    expect(src).toContain("setDevForcedFlags(names)");
    expect(src).toContain("emitAppEvent('remote_config_changed')");
    expect(readSource('app/remote_flags.ts')).toContain('if (isDevForcedFlag(key)) return true;');
  });
});
