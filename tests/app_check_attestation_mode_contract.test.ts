import fs from 'fs';
import path from 'path';

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('App Check attestation mode contract', () => {
  const config = read('app/config.ts');
  const primary = read('app/app_check_init.ts');
  const secondary = read('app/auth_recovery_secondary.ts');
  const packageJson = JSON.parse(read('package.json')) as { scripts?: Record<string, string> };
  const eas = JSON.parse(read('eas.json')) as {
    build: Record<string, { env?: Record<string, string> }>;
  };

  it('explicitly enables real store attestation for production and TestFlight dev', () => {
    expect(eas.build.production.env?.EXPO_PUBLIC_APP_CHECK_REAL_ATTESTATION).toBe('1');
    expect(eas.build['testflight-dev'].env?.EXPO_PUBLIC_APP_CHECK_REAL_ATTESTATION).toBe('1');
    expect(eas.build['testflight-dev'].env?.EXPO_PUBLIC_STORE_RELEASE).toBe('0');
    expect(eas.build['testflight-dev'].env?.EXPO_PUBLIC_TESTFLIGHT_DEV_TOOLS).toBe('1');
    expect(eas.build.preview.env?.EXPO_PUBLIC_APP_CHECK_REAL_ATTESTATION).toBeUndefined();
  });

  it('preserves real attestation for production OTA bundles that inject only store-release mode', () => {
    expect(packageJson.scripts?.['eas:update:production']).toContain('EXPO_PUBLIC_STORE_RELEASE=1');
    expect(packageJson.scripts?.['eas:update:production']).not.toContain(
      'EXPO_PUBLIC_APP_CHECK_REAL_ATTESTATION',
    );
    expect(config).toMatch(
      /export const APP_CHECK_REAL_ATTESTATION_ENABLED\s*=\s*\n?\s*IS_STORE_RELEASE\s*\|\|\s*process\.env\.EXPO_PUBLIC_APP_CHECK_REAL_ATTESTATION === '1';/,
    );
  });

  it.each([
    ['primary', primary],
    ['secondary', secondary],
  ])('uses the dedicated mode in %s App Check without consulting IS_STORE_RELEASE', (_name, source) => {
    expect(source).toContain('APP_CHECK_REAL_ATTESTATION_ENABLED');
    expect(source).not.toContain('IS_STORE_RELEASE');
    expect(source).toContain('!APP_CHECK_REAL_ATTESTATION_ENABLED &&');
    expect(source).toContain('if (!APP_CHECK_REAL_ATTESTATION_ENABLED && !useDebugProvider)');
  });
});
