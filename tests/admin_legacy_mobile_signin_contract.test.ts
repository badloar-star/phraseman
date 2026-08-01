import fs from 'fs';
import path from 'path';

function extractBracedBlock(source: string, marker: string, fromIndex = 0): string {
  const markerIndex = source.indexOf(marker, fromIndex);
  if (markerIndex < 0) return '';
  const openingBrace = source.indexOf('{', markerIndex);
  if (openingBrace < 0) return '';

  let depth = 0;
  for (let index = openingBrace; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] !== '}') continue;
    depth -= 1;
    if (depth === 0) return source.slice(markerIndex, index + 1);
  }
  return '';
}

// зачем: 2026-07-27 владелец потерял вход в админку с телефона. Причина —
// legacy.html (единственная боевая админка) звал только signInWithPopup, а
// getRedirectResult не звал вообще: Google возвращал на страницу, и вход молча
// терялся. Существующий admin_v2_auth_persistence_lifecycle.test.mjs сторожил
// ЗАМОРОЖЕННЫЙ admin/v2/scripts/admin-firebase.js, поэтому регрессию не поймал.
// Этот контракт сторожит именно боевой файл.
describe('admin legacy mobile sign-in contract', () => {
  const adminHtml = fs.readFileSync(
    path.join(process.cwd(), 'admin', 'v2', 'legacy.html'),
    'utf8',
  );

  it('imports the redirect sign-in helpers it actually needs', () => {
    expect(adminHtml).toContain('signInWithRedirect');
    expect(adminHtml).toContain('getRedirectResult');
    expect(adminHtml).toContain('browserLocalPersistence');
  });

  it('completes a pending redirect sign-in on startup', () => {
    // Без этого вызова возврат с Google на телефоне терял сессию.
    expect(adminHtml).toMatch(/getRedirectResult\s*\(\s*auth\s*\)/);
    expect(adminHtml).toContain('const _adminRedirectSignInReady');
  });

  it('never wraps the redirect result in a timeout that can abort the login', () => {
    // Старый баг: вход обрывался по таймауту раньше, чем Google отвечал.
    expect(adminHtml).not.toContain('withAdminAuthTimeout(getRedirectResult(auth)');
  });

  it('sends phones straight to redirect instead of a popup', () => {
    expect(adminHtml).toContain('function isMobileAdminBrowser()');
    expect(adminHtml).toMatch(/Android\|iPhone\|iPad\|iPod\|Mobile/);
    expect(adminHtml).toMatch(/if\s*\(isMobileAdminBrowser\(\)\)\s*\{\s*await signInWithRedirect\(auth, googleProvider\);/);
  });

  it('falls back to redirect when a desktop popup is blocked', () => {
    expect(adminHtml).toContain("c === 'auth/popup-blocked'");
    expect(adminHtml).toContain("c === 'auth/web-storage-unsupported'");
    expect(adminHtml).toContain("c === 'auth/operation-not-supported-in-this-environment'");
  });

  it('keeps the session across devices and browser restarts', () => {
    expect(adminHtml).toContain('setPersistence(auth, browserLocalPersistence)');
    expect(adminHtml).not.toContain('browserSessionPersistence');
    expect(adminHtml).not.toContain('inMemoryPersistence');
  });

  it('lets the owner pick an account only during an explicit sign-in', () => {
    // Сохранённая admin-сессия не должна снова открывать выбор аккаунта при загрузке.
    expect(adminHtml).toContain('function createInteractiveAdminGoogleProvider()');
    expect(adminHtml).toContain("provider.setCustomParameters({ prompt: 'select_account' })");
    expect(adminHtml).toContain('const googleProvider = createInteractiveAdminGoogleProvider();');
    expect(adminHtml).not.toContain('_googleProvider.setCustomParameters');
  });

  it('does not flash the login screen while the redirect is still completing', () => {
    expect(adminHtml).toContain('await _adminRedirectSignInReady;');
    expect(adminHtml).toContain('if (auth.currentUser) return;');
  });

  it('denies non-admin accounts without exposing identity or operator commands', () => {
    const forcedRefresh = adminHtml.indexOf('tr = await user.getIdTokenResult(true)');
    const denialBranch = extractBracedBlock(
      adminHtml,
      'if (!tr.claims || tr.claims.admin !== true) {',
      forcedRefresh + 1,
    );
    const signOut = denialBranch.indexOf('await signOut(auth);');
    const genericError = denialBranch.indexOf('У этого Google-аккаунта нет доступа к админке.');

    expect(forcedRefresh).toBeGreaterThan(-1);
    expect(signOut).toBeGreaterThan(-1);
    expect(genericError).toBeGreaterThan(signOut);
    expect(denialBranch).not.toMatch(/user\s*\.\s*uid|user\s*\.\s*email/i);
    expect(denialBranch).not.toMatch(/service[\W_]*account/i);
    expect(denialBranch).not.toMatch(/set[\W_]*admin[\W_]*claim/i);
    expect(denialBranch).not.toMatch(/\bnode(?:\.exe)?\s+/i);
  });
});
