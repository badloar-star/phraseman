import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
// Catches LEGACY runtime locale-fallback logic only: `lang === 'ru'|'uk'|'es'`
// and return/nullish-coalescing to a BARE locale token (RU/UK/ES). The bare
// word `fallback` was dropped (it matches legit feature UI like the Compass
// «голос дня (fallback)»), and the lookbehind keeps RU/UK/ES from matching
// inside identifiers like CLUB_DEFS_RU.
const RUNTIME_FALLBACK_RE = /(lang === 'ru'|lang === 'uk'|lang === 'es'|return\s+[^;\n]*(?<![A-Za-z0-9_])(?:RU|UK|ES)\b|\?\?\s*[^;\n]*(?<![A-Za-z0-9_])(?:RU|UK|ES)\b)/g;

describe('web and admin runtime locale fallback audit', () => {
  it('keeps public web/admin bridge files free of legacy runtime fallback markers', () => {
    const files = [
      'admin/index.html',
      'knowly-www/download/index.html',
      'knowly-www/phraseman/apple-auth/index.html',
      'knowly-www/phraseman/duel/index.html',
      'knowly-www/phraseman/invite/index.html',
    ];

    for (const file of files) {
      const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
      expect(source.match(RUNTIME_FALLBACK_RE) || []).toEqual([]);
    }
  });

  it('does not seed pt-BR/vi/id/tr/pl VIP survey copy from generic admin text', () => {
    const source = fs.readFileSync(path.join(ROOT, 'admin', 'v2', 'legacy.html'), 'utf8');

    for (const id of [
      'vs-title-ptbr',
      'vs-message-ptbr',
      'vs-title-vi',
      'vs-message-vi',
      'vs-title-id',
      'vs-message-id',
      'vs-title-tr',
      'vs-message-tr',
      'vs-title-pl',
      'vs-message-pl',
    ]) {
      expect(source).toContain(`id="${id}"`);
    }

    expect(source).not.toContain('plannedTitleNeedsReview');
    expect(source).not.toContain('plannedMessageNeedsReview');
    expect(source).not.toContain('titlePtBr: titleDefault');
    expect(source).not.toContain('messagePtBr: messageDefault');
    expect(source).not.toContain('needs-review: VIP survey');
  });

  it('keeps admin Google login persistent across page reloads', () => {
    const source = fs.readFileSync(path.join(ROOT, 'admin', 'v2', 'legacy.html'), 'utf8');

    expect(source).toContain('setPersistence(auth, browserLocalPersistence)');
    expect(source).toContain("setAdminSignInBusy(true, 'ПРОВЕРЯЕМ СЕССИЮ...')");
    expect(source).not.toContain("prompt: 'select_account'");

    const cachedTokenCheck = source.indexOf('tr = await user.getIdTokenResult(false)');
    const forcedTokenRefresh = source.indexOf('tr = await user.getIdTokenResult(true)', cachedTokenCheck);
    const unexpectedSignOut = source.indexOf('await signOut(auth)', cachedTokenCheck);

    expect(cachedTokenCheck).toBeGreaterThan(-1);
    expect(forcedTokenRefresh).toBeGreaterThan(cachedTokenCheck);
    expect(unexpectedSignOut).toBeGreaterThan(forcedTokenRefresh);
  });

  it('keeps the public referral invite page install-first for new users', () => {
    const source = fs.readFileSync(path.join(ROOT, 'knowly-www/phraseman/invite/index.html'), 'utf8');

    expect(source).not.toContain('phraseman://invite');
    expect(source).not.toContain('window.location.href = appUrl');
    expect(source).not.toContain('id="openApp"');
    expect(source).toContain('referrer=');
    expect(source).toContain('installGooglePlay');
  });

  it('does not label Firebase-authenticated users as anonymous when provider metadata is missing', () => {
    const source = fs.readFileSync(path.join(ROOT, 'admin', 'v2', 'legacy.html'), 'utf8');

    expect(source).toContain('firebaseAuthUid: snap.data().firebaseAuthUid || null');
    expect(source).toContain('firebaseAuthUid: doc.data().firebaseAuthUid || null');
    expect(source).toContain('function hasAnyAuth(u)');
    expect(source).toContain("if(fAuth==='any')   us=us.filter(u=>hasAnyAuth(u));");
    expect(source).toContain("if(fAuth==='anon')  us=us.filter(u=>!hasAnyAuth(u));");
    expect(source).toContain('Firebase auth есть, provider-link отсутствует');
  });
});
