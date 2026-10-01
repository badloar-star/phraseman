// Ворота сети Шпиля: без флага вкладки ИЛИ без config.enabled ворота не открываются,
// значит ни один клиент комнаты / пакета / итога недели не может быть вызван.
let tabEnabled = false;
jest.mock('../app/spire_tab_flag', () => ({ isSpireTabEnabled: () => tabEnabled }));
jest.mock('../app/debug-logger', () => ({ reportSwallowed: jest.fn(), swallowError: jest.fn(() => jest.fn()), DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

import { SPIRE_CONFIG_DEFAULTS } from '../modules/spire/config_contract';
import { spireGateStillOpen, spireOpenLiveGate } from '../app/spire/spire_live_gate';

const enabled = { ...SPIRE_CONFIG_DEFAULTS, enabled: true };

describe('spire live gate', () => {
  beforeEach(() => { tabEnabled = false; });

  it('stays closed by default (tab flag off, config default off)', () => {
    expect(spireOpenLiveGate(SPIRE_CONFIG_DEFAULTS, 'test')).toBeNull();
    expect(spireOpenLiveGate(enabled, 'test')).toBeNull();
  });

  it('stays closed with the tab flag on but config disabled or unread', () => {
    tabEnabled = true;
    expect(spireOpenLiveGate(SPIRE_CONFIG_DEFAULTS, 'test')).toBeNull();
    expect(spireOpenLiveGate(null, 'test')).toBeNull();
  });

  it('opens only when both locks are open and closes again when the flag goes off', () => {
    tabEnabled = true;
    const gate = spireOpenLiveGate(enabled, 'test');
    expect(gate).not.toBeNull();
    expect(spireGateStillOpen(gate!, 'test')).toBe(true);
    tabEnabled = false;
    expect(spireGateStillOpen(gate!, 'test')).toBe(false);
  });
});
