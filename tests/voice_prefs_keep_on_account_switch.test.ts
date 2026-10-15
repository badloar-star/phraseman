import fs from 'node:fs';
import path from 'node:path';

// зачем (координатор/Ревизор 15.10): выбранный голос озвучки — id системного голоса, не персональные данные; это настройка
// устройства, как app_theme. При смене владельца аккаунта оба ключа выбора голоса остаются (KEEP), а не стираются.
const ROOT = path.join(__dirname, '..');
const cloudSync = fs.readFileSync(path.join(ROOT, 'app', 'cloud_sync.ts'), 'utf8').replace(/\r\n/g, '\n');

describe('voice preferences survive an account switch (device setting)', () => {
  const keepStart = cloudSync.indexOf('const KEEP = new Set<string>([');
  const keepBlock = cloudSync.slice(keepStart, cloudSync.indexOf(']);', keepStart));

  it.each(['fc_voice_prefs_v1', 'fc_voice_prefs_by_lang_v1'])('%s is in the wipe KEEP list', (key) => {
    expect(keepStart).toBeGreaterThan(-1);
    expect(keepBlock).toContain(`'${key}'`);
  });

  it('they are not listed as account leak keys either', () => {
    const leakFile = path.join(ROOT, 'app', 'account_switch_leak_keys.ts');
    if (!fs.existsSync(leakFile)) return;
    const leak = fs.readFileSync(leakFile, 'utf8');
    expect(leak).not.toContain("'fc_voice_prefs_v1'");
    expect(leak).not.toContain("'fc_voice_prefs_by_lang_v1'");
  });
});
