import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(
  path.join(process.cwd(), 'components', 'EnergyContext.tsx'),
  'utf8',
);

describe('EnergyContext remote free gate contract', () => {
  it('makes the primary spending path unlimited when the admin frees energy', () => {
    const readUnlimitedStart = source.indexOf('async function readUnlimited()');
    const readUnlimitedEnd = source.indexOf('async function readRecoveryIntervalMs()', readUnlimitedStart);
    const readUnlimited = source.slice(readUnlimitedStart, readUnlimitedEnd);

    expect(source).toContain("import { isFeatureFreeForEveryone } from '../app/feature_gates';");
    // зачем (2026-09-03): ветка развёрнута из однострочника в блок, чтобы называть
    // ПРИЧИНУ безлимита в логе — «энергия не отнимается» неотличимо от поломки
    // списания, пока причина молчит. Сторожим сам факт снятия лимита по флагу
    // пульта, а не форму записи: иначе тест ломается на каждом добавленном логе.
    expect(readUnlimited).toContain("isFeatureFreeForEveryone('energy')");
    expect(readUnlimited).toContain('return true;');
  });

  it('re-evaluates unlimited energy after a live Remote Config update', () => {
    expect(source).toContain(
      "DeviceEventEmitter.addListener('remote_config_changed', () => { load(); })",
    );
    expect(source).toContain('remoteConfigSub.remove();');
  });
});
