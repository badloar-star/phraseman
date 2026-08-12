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
    expect(readUnlimited).toContain("if (isFeatureFreeForEveryone('energy')) return true;");
  });

  it('re-evaluates unlimited energy after a live Remote Config update', () => {
    expect(source).toContain(
      "DeviceEventEmitter.addListener('remote_config_changed', () => { load(); })",
    );
    expect(source).toContain('remoteConfigSub.remove();');
  });
});
