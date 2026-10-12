// зачем (координатор 12.10, решение владельца к R1): строка [REMOTE-GATES] — какие замки открыты в проде; флаг без значения
// в документе печатается как default (а не как false), чтобы владельцу не показать «открыто», когда действует код.
import fs from 'fs';
import path from 'path';

import { REMOTE_GATES_LOGGED_KEYS, formatRemoteGates } from '../app/remote_config_client';

describe('[REMOTE-GATES]', () => {
  it('явные значения и default для отсутствующих', () => {
    const line = formatRemoteGates({ gate_lessons_premium: false, gate_flashcards_premium: true, spire_tab_enabled: true, other: false });
    expect(line).toContain('lessons=false');
    expect(line).toContain('flashcards=true');
    expect(line).toContain('spire_tab=true');
    expect(line).toContain('dialog=default');
    expect(line).toContain('boot_restore_defer=default');
    expect(line.split(' ')).toHaveLength(REMOTE_GATES_LOGGED_KEYS.length);
  });

  it('не-boolean в документе — default; пустой документ — все default', () => {
    expect(formatRemoteGates({ gate_lessons_premium: 'false' })).toContain('lessons=default');
    expect(formatRemoteGates(undefined)).not.toMatch(/=(true|false)/);
  });

  it('в списке — замки R1 и три рубильника координатора; печать только в dev, на оба источника', () => {
    const keys = REMOTE_GATES_LOGGED_KEYS.map(([, key]) => key);
    for (const key of ['gate_lessons_premium', 'gate_flashcards_premium', 'gate_ai_dialog_premium', 'gate_energy_premium', 'spire_tab_enabled', 'accounts_v2_client_enabled', 'boot_restore_defer_enabled']) {
      expect(keys).toContain(key);
    }
    const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'remote_config_client.ts'), 'utf8');
    expect(src).toContain("if (typeof __DEV__ === 'undefined' || !__DEV__) return;");
    expect(src).toContain("logRemoteGates('cache', cleanFromCache.bools);");
    expect(src).toContain("logRemoteGates('network', clean.bools);");
  });
});
