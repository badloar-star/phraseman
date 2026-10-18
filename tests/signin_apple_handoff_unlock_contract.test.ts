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
    expect(src).toContain('userCredential = await auth.signInWithCredential(conflictUpdatedCredential ?? credential);');
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
  // интерфейс Ядра 76dace644: { ok, linked, retryCredential } | { ok:false, reason } — custom token отклонён контуром учётной записи
  it('Apple email-already-in-use без обновлённого credential: серверная привязка → тот же токен; не принят → окно Apple ещё раз', () => {
    expect(src).toContain("const appleEmailInUse = provider === 'apple'");
    expect(src).toContain("linkCode === 'auth/email-already-in-use' || linkCode === 'auth/account-exists-with-different-credential'");
    expect(src).toContain('appleLinkedByServer = await requestAppleLinkByVerifiedEmail(cred.idToken, cred.appleNonce ?? null);');
    expect(src).toContain("console.log('[AUTH-APPLE-LINK] signed_in via=same_credential');");
    expect(src).toContain('[AUTH-APPLE-LINK] same_credential_rejected code=');
    expect(src).toContain("console.log('[AUTH-APPLE-LINK] signed_in via=second_apple_window');");
    expect(src).toContain('[AUTH-APPLE-LINK] email_in_use branch=legacy_credential reason=server_refused_or_unavailable');
    expect(src).not.toContain('signInWithCustomToken');
    const fn = src.slice(src.indexOf('async function requestAppleLinkByVerifiedEmail('), src.indexOf('async function stampAnonOwnershipBeforeSignIn('));
    expect(fn).toContain("const retry = data.ok === true && data.retryCredential === true;");
    expect(fn).toContain('[AUTH-APPLE-LINK] client failed code=');
    expect(fn).not.toMatch(/console\.\w+\([^)]*idToken/); // токен в журнал не пишется
  });

  // зачем (координатор 18.10, iPhone 13:59): второе окно Apple — токен тратила обречённая привязка к гостю. Серверная привязка
  // уходит сразу после окна Apple; успех → к гостю не привязываем, входим нетронутым токеном в охраняемом пути (Ревизор 3.139).
  it('Apple: серверная привязка ДО привязки к гостю, успех → без linkWithCredential и без второго окна', () => {
    const prelinkStart = src.indexOf('const applePrelink: Promise<boolean> | null = provider === \'apple\'');
    const anonAwait = src.indexOf('await anonPreparation;', prelinkStart);
    const guestLink = src.indexOf('userCredential = await anonUser.linkWithCredential(credential);');
    const skip = src.indexOf("throw Object.assign(new Error('apple_prelinked_skip_guest_link'), { code: 'auth/credential-already-in-use' });");
    expect(prelinkStart).toBeGreaterThan(0);
    // стартует параллельно с подготовкой гостя, а не после неё
    expect(prelinkStart).toBeLessThan(anonAwait);
    expect(skip).toBeGreaterThan(prelinkStart);
    expect(skip).toBeLessThan(guestLink);
    expect(src).toContain('[AUTH-APPLE-LINK] prelink outcome=');
    // охраняемый путь не обходится: после пропуска — тот же конфликт со шторкой правила 2 и отметкой credential_ready
    expect(src.indexOf("return { result: 'error', error: 'account_switch_required' };", skip)).toBeLessThan(
      src.indexOf('providerHandoffMarker = await markProviderCredentialHandoffCredentialReady(', skip),
    );
    // шторка правила 2 получает нетронутый токен
    expect(src).toContain('storeAccountSwitchResumeCredential(provider, cred, { unconsumed: appleTokenUnconsumed });');
    // уже отказавший сервер не зовётся второй раз
    expect(src).toContain('[AUTH-APPLE-LINK] email_in_use branch=legacy_credential reason=prelink_already_refused');
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
