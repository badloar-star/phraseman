import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

describe('settings promo-code startup stability', () => {
  it('applies the cached admin visibility flag before Settings can first render', () => {
    const remoteConfig = read('app/remote_config_client.ts');
    const rootLayout = read('app/_layout.tsx');

    expect(remoteConfig).toContain('export async function primeRemoteConfigCacheFromStorage(): Promise<void>');
    expect(rootLayout).toContain("import { primeRemoteConfigCacheFromStorage } from './remote_config_client';");
    expect(rootLayout).toContain('primeRemoteConfigCacheFromStorage().catch(() => {})');
  });

  it('does not use a late local setter to add the promo row after Settings opens', () => {
    const settings = read('app/(tabs)/settings.tsx');

    expect(settings).toContain('const [promoCodesOn] = useState(isPromoCodesEnabled());');
    expect(settings).not.toContain('setPromoCodesOn(');
  });
});
