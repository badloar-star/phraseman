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
    // 18.10 (Apple + почта с Google): та же строка — запасной путь, когда custom token не получен
    expect(src).toContain(': await auth.signInWithCredential(conflictUpdatedCredential ?? credential);');
    // обновлённый credential берётся до передачи, а не после неё
    expect(src.indexOf('const updatedFromError = linkErr?.userInfo?.authCredential')).toBeLessThan(src.indexOf('signInWithCredential(conflictUpdatedCredential ?? credential)'));
  });

  it('Firebase отклонил вход (фаза credential_ready) — запись передачи снимается, поколение гостя возвращается', () => {
    const catchStart = src.indexOf("console.warn(`[AUTH-HANDOFF] cleared reason=firebase_failed");
    expect(catchStart).toBeGreaterThan(0);
    const block = src.slice(src.lastIndexOf('if (providerHandoffMarker) {', catchStart), catchStart + 1500);
    expect(block).toContain("providerHandoffMarker.phase === 'credential_ready' && sameGuestUid");
    expect(block).toContain('currentUidNow === providerHandoffMarker.ownerAuthUid');
    // зачем (подсказка Ядра 18.10): prepared — пропуск не использован, снимаем и при сменившемся анонимном uid
    expect(block).toContain("providerHandoffMarker.phase === 'prepared' && (sameGuestUid || currentIsAnonymousOrNone)");
    expect(block).toMatch(/await clearProviderCredentialHandoff\(providerHandoffMarker\);[\s\S]{0,120}providerHandoffMarker = null;[\s\S]{0,160}if \(sameGuestUid\) beginAccountGeneration\(preProviderStableId\);/);
    expect(block).toContain('[AUTH-HANDOFF] clear_failed');
    expect(block).toContain('[AUTH-HANDOFF] kept reason=provider_session');
  });

  it('библиотека Firebase на iOS действительно отдаёт обновлённый credential в ошибке', () => {
    const typesDir = path.dirname(require.resolve('@react-native-firebase/auth/package.json'));
    const types = fs.readFileSync(path.join(typesDir, 'lib', 'index.d.ts'), 'utf8');
    expect(types).toContain('authCredential: AuthCredential | null;');
  });

  // зачем (решение владельца 18.10 «Входить само», iPhone 13:05): Apple + почта, занятая аккаунтом с Google → серверная привязка
  // по проверенной почте и вход custom token; без токена — прежний путь с причиной в журнале.
  it('Apple email-already-in-use без обновлённого credential: authAppleLinkByVerifiedEmail → signInWithCustomToken', () => {
    expect(src).toContain("const appleEmailInUse = provider === 'apple'");
    expect(src).toContain("linkCode === 'auth/email-already-in-use' || linkCode === 'auth/account-exists-with-different-credential'");
    expect(src).toContain('appleCustomToken = await requestAppleLinkByVerifiedEmail(cred.idToken, cred.appleNonce ?? null);');
    expect(src).toMatch(/userCredential = appleCustomToken\s*\? await auth\.signInWithCustomToken\(appleCustomToken\)\s*: await auth\.signInWithCredential\(conflictUpdatedCredential \?\? credential\);/);
    expect(src).toContain('[AUTH-APPLE] email_in_use branch=legacy_credential reason=no_custom_token');
    const fn = src.slice(src.indexOf('async function requestAppleLinkByVerifiedEmail('), src.indexOf('async function stampAnonOwnershipBeforeSignIn('));
    expect(fn).toContain("invokeAuthCallable<typeof payload, { customToken?: unknown }>(");
    expect(fn).toContain('[AUTH-APPLE] verified_email_link failed code=');
    expect(fn).not.toMatch(/console\.\w+\([^)]*customToken\}/); // сам токен в журнал не пишется
  });

  // зачем (прогон 18.10): после отказа/убийства процесса следующий вход молча брал прежний аккаунт Google без окна выбора.
  it('каждое новое окно входа Google сперва снимает прежнюю нативную сессию — в одной цепочке с signIn', () => {
    expect(src).toContain('promise: clearPreviousGoogleNativeSession(mod).then(() => mod.GoogleSignin.signIn()),');
    const fn = src.slice(src.indexOf('async function clearPreviousGoogleNativeSession('), src.indexOf('async function runGoogleNativeSignIn('));
    expect(fn).toContain('mod.GoogleSignin.signOut()');
    expect(fn).toContain('[AUTH-LINK-GOOGLE] picker previous_session_clear_failed');
    expect(fn).not.toMatch(/throw /);
  });

  // зачем (Ревизор к 1b38ad210, 🟡): довод при запуске не держит заставку дольше ≈6 с; срок — только на сетевую часть,
  // сдача по сроку раньше замка/стирания (иначе довод доделался бы в фоне поверх отката).
  it('довод прерванного входа: общий сетевой срок 6 с, forward_timeout до замка и стирания', () => {
    expect(src).toContain('const ROLL_FORWARD_NETWORK_DEADLINE_MS = 6_000;');
    const fnStart = src.indexOf('export async function completeInterruptedProviderHandoff(');
    const fn = src.slice(fnStart, src.indexOf('export function resumePendingAccountSwitchQuarantine', fnStart));
    expect(fn).toContain('[AUTH-HANDOFF] forward_timeout step=${step}');
    expect(fn).toContain("Math.min(AUTH_LINK_HINT_TIMEOUT_MS, networkLeftMs())");
    expect(fn).toContain("'roll_forward_ensure_link'");
    const lastTimeout = fn.lastIndexOf("forwardTimeout('ensure_link')");
    expect(lastTimeout).toBeGreaterThan(0);
    expect(lastTimeout).toBeLessThan(fn.indexOf('withAccountTransitionLock('));
    expect(lastTimeout).toBeLessThan(fn.indexOf('await input.clearHandoff();'));
  });
});
