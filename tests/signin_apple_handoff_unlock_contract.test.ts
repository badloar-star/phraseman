// зачем (блокер выпуска 18.10, журнал iPhone владельца 08:41–08:48): гость + существующий Apple-аккаунт — привязка падает
// «email уже занят», повторный вход тем же Apple-credential давал auth/unknown (nonce одноразовый), а запись передачи
// оставалась и запирала вход ВСЕХ провайдеров (provider_handoff_active) до перезапуска.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('вход: аноним + существующий Apple/Google-аккаунт', () => {
  const src = read('app/auth_provider.ts');

  it('после конфликта привязки вход идёт обновлённым credential из ошибки (Apple: исходный nonce уже израсходован)', () => {
    expect(src).toContain('const updatedFromError = linkErr?.userInfo?.authCredential ?? null;');
    expect(src).toContain('[AUTH-HANDOFF] updated_credential provider=${provider} present=');
    expect(src).toContain('userCredential = await auth.signInWithCredential(conflictUpdatedCredential ?? credential);');
    // обновлённый credential берётся до передачи, а не после неё
    expect(src.indexOf('const updatedFromError = linkErr?.userInfo?.authCredential')).toBeLessThan(src.indexOf('signInWithCredential(conflictUpdatedCredential ?? credential)'));
  });

  it('Firebase отклонил вход (фаза credential_ready) — запись передачи снимается, поколение гостя возвращается', () => {
    const catchStart = src.indexOf("console.warn(`[AUTH-HANDOFF] cleared reason=firebase_failed");
    expect(catchStart).toBeGreaterThan(0);
    const block = src.slice(src.lastIndexOf('if (providerHandoffMarker) {', catchStart), catchStart + 600);
    expect(block).toContain("providerHandoffMarker.phase === 'credential_ready'");
    expect(block).toContain('currentUidNow === providerHandoffMarker.ownerAuthUid');
    expect(block).toMatch(/await clearProviderCredentialHandoff\(providerHandoffMarker\);\s*providerHandoffMarker = null;\s*beginAccountGeneration\(preProviderStableId\);/);
    expect(block).toContain('[AUTH-HANDOFF] clear_failed');
    expect(block).toContain('[AUTH-HANDOFF] kept reason=session_changed');
  });

  it('библиотека Firebase на iOS действительно отдаёт обновлённый credential в ошибке', () => {
    const typesDir = path.dirname(require.resolve('@react-native-firebase/auth/package.json'));
    const types = fs.readFileSync(path.join(typesDir, 'lib', 'index.d.ts'), 'utf8');
    expect(types).toContain('authCredential: AuthCredential | null;');
  });
});
