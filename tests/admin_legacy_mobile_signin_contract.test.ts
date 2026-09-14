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
// УДАЛЁННЫЙ admin/v2/scripts/admin-firebase.js раньше маскировал эту регрессию.
// Этот контракт сторожит именно боевой файл.
describe('admin legacy mobile sign-in contract', () => {
  const adminHtml = fs.readFileSync(
    path.join(process.cwd(), 'admin/v2/legacy.html'),
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

  // зачем: 2026-08-04 владелец потерял вход с ДЕСКТОПА — «Ошибка 400:
  // redirect_uri_mismatch». Подмена authDomain на web.app применялась всегда, и
  // popup уходил на web.app/__/auth/handler, которого нет в OAuth-клиенте Google
  // Cloud. Баг спал, пока жила сохранённая сессия. Подмена нужна только телефону
  // (third-party storage handoff), десктоп обязан идти через firebaseapp.com.
  it('rewrites the authDomain only for mobile redirect sign-in', () => {
    const helperSource = extractBracedBlock(
      adminHtml,
      'function applyAdminSameOriginAuthDomain',
    );
    expect(helperSource).not.toBe('');

    // Помощник зависит от списка зарегистрированных доменов и от проверки по
    // нему — вырезаем всю тройку, иначе eval падает на несуществующей ссылке.
    const registeredListSource = String(
      adminHtml.match(/const ADMIN_REGISTERED_AUTH_DOMAINS = \[[^\]]*\];/)?.[0] ?? '',
    );
    expect(registeredListSource).not.toBe('');
    const registeredCheckSource = extractBracedBlock(
      adminHtml,
      'function isRegisteredAdminAuthDomain',
    );
    expect(registeredCheckSource).not.toBe('');

    const applyAdminSameOriginAuthDomain = new Function(
      `${registeredListSource}; ${registeredCheckSource}; ${helperSource}; return applyAdminSameOriginAuthDomain;`,
    )() as (
      config: Record<string, unknown>,
      hostname: string,
      isMobile?: boolean,
    ) => Record<string, unknown>;

    const hostedConfig = {
      projectId: 'phraseman-ea0b3',
      authDomain: 'phraseman-ea0b3.firebaseapp.com',
      apiKey: 'public-web-config-key',
    };

    // зачем этот блок переписан (2026-09-14): владелец не мог войти с телефона —
    // «Error 400: redirect_uri_mismatch». Подмена применялась ВСЛЕПУЮ, и Google
    // получал web.app/__/auth/handler, которого нет в OAuth-клиенте. Старый
    // сторож ТРЕБОВАЛ именно этого поведения, то есть охранял поломку.
    // Теперь правило: подмена только на зарегистрированный домен.
    expect(
      applyAdminSameOriginAuthDomain(hostedConfig, 'phraseman-ea0b3.web.app', true),
    ).toBe(hostedConfig);

    // Десктоп на том же домене — конфиг обязан остаться нетронутым.
    expect(
      applyAdminSameOriginAuthDomain(hostedConfig, 'phraseman-ea0b3.web.app', false),
    ).toBe(hostedConfig);

    expect(applyAdminSameOriginAuthDomain(hostedConfig, 'localhost', true)).toBe(hostedConfig);
    expect(applyAdminSameOriginAuthDomain(hostedConfig, 'localhost', false)).toBe(hostedConfig);

    expect(adminHtml).toContain(
      'applyAdminSameOriginAuthDomain(config, globalThis.location?.hostname, isMobileAdminBrowser())',
    );
  });

  it('never sends Google a redirect_uri that is not registered', () => {
    // Корень инцидента 2026-09-14. Список доменов обязан существовать, и
    // web.app в нём быть НЕ должен, пока адрес не вписан в OAuth-клиент вручную
    // (Google Cloud Console → Credentials → Authorized redirect URIs).
    expect(adminHtml).toContain('const ADMIN_REGISTERED_AUTH_DOMAINS');
    expect(adminHtml).toContain('function isRegisteredAdminAuthDomain');
    expect(adminHtml).toContain('if (!isRegisteredAdminAuthDomain(hostingAuthDomain)) return config;');

    const listMatch = adminHtml.match(/const ADMIN_REGISTERED_AUTH_DOMAINS = \[([^\]]*)\]/);
    expect(listMatch).not.toBeNull();
    const registered = String(listMatch?.[1] ?? '');
    expect(registered).toContain('firebaseapp.com');
    // Если однажды web.app зарегистрируют — эту строку меняет ЧЕЛОВЕК осознанно,
    // вместе с реальной записью в Google Cloud. Молча подмену не возвращаем.
    expect(registered).not.toContain('web.app');
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

  it('fails closed without destroying a recoverable owner session', () => {
    const forcedRefresh = adminHtml.indexOf('tr = await user.getIdTokenResult(true)');
    const denialBranch = extractBracedBlock(
      adminHtml,
      "if ((!tr.claims || tr.claims.admin !== true) && managedAccessResult?.granted !== true) {",
      forcedRefresh + 1,
    );
    const preserved = denialBranch.indexOf('Сессия сохранена');

    expect(forcedRefresh).toBeGreaterThan(-1);
    expect(denialBranch).not.toContain('await signOut(auth);');
    expect(preserved).toBeGreaterThan(-1);
    expect(denialBranch).toContain('showAdminLoginShell()');
    expect(denialBranch).not.toMatch(/service[\W_]*account/i);
    expect(denialBranch).not.toMatch(/set[\W_]*admin[\W_]*claim/i);
    expect(denialBranch).not.toMatch(/\bnode(?:\.exe)?\s+/i);
  });
});
