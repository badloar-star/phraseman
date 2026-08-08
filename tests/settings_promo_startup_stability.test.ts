import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

// зачем 2026-08-04 (владелец: «кнопка должна быть всегда там без исключений,
// на всех устройствах»): раньше «стабильность появления при старте» была
// проблемой ИМЕННО потому, что ряд ждал remote-флаг (см. history этого
// файла) — на свежем устройстве без сети флаг падал на дефолт false и ряд не
// появлялся вовсе, не то что «поздно». Теперь ряд безусловный: сам класс
// проблемы (флаг применяется до/после первого рендера) больше не существует
// для этого конкретного ряда — стережём, что это остаётся так.
describe('settings promo-code startup stability', () => {
  it('applies the cached admin visibility flag before Settings can first render (other remote-gated rows)', () => {
    const remoteConfig = read('app/remote_config_client.ts');
    const rootLayout = read('app/_layout.tsx');

    expect(remoteConfig).toContain('export async function primeRemoteConfigCacheFromStorage(): Promise<void>');
    expect(rootLayout).toContain("import { primeRemoteConfigCacheFromStorage } from './remote_config_client';");
    expect(rootLayout).toContain('primeRemoteConfigCacheFromStorage().catch(() => {})');
  });

  it('promo code row never depends on remote config, network, or a local flag state', () => {
    const settings = read('app/(tabs)/settings.tsx');

    expect(settings).not.toContain('isPromoCodesEnabled');
    expect(settings).not.toContain('promoCodesOn');
    expect(settings).not.toContain('setPromoCodesOn(');
    expect(settings).toContain('settings-promo-code-row');
  });
});
