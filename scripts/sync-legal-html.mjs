/**
 * Reads canonical legal/terms_of_use_en.json + legal/privacy_policy_en.json and writes:
 * - app/legal/*.json
 * - terms.html
 * - privacy.html
 * - admin/oauth-privacy.html
 * - knowly-www/legal/terms/index.html
 * - knowly-www/legal/privacy/index.html
 * - knowly-www/legal/data-deletion/index.html
 *
 * Run: npm run legal:sync
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const LEGAL = path.join(ROOT, 'legal');
const APP_LEGAL = path.join(ROOT, 'app', 'legal');
const KNOWLY_WWW = path.join(ROOT, 'knowly-www');

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function bodyHtmlSimple(body) {
  return String(body)
    .split(/\n\n+/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, '<br />')}</p>`)
    .join('\n');
}

function renderLegalBlocks(sections) {
  return sections
    .map((s) => {
      const h = escapeHtml(s.heading);
      const inner = bodyHtmlSimple(s.body);
      return `        <h2>${h}</h2>\n${inner.split('\n').map((line) => `        ${line}`).join('\n')}`;
    })
    .join('\n\n');
}

function extractDate(sections) {
  const first = sections[0]?.body?.split('\n\n')[0] || '';
  const match = first.match(/Last updated:\s*([^\n]+)/i);
  return match ? match[1].trim() : '';
}

function rootPage({ title, sections, date }) {
  const blocks = sections
    .map((s) => {
      const h = escapeHtml(s.heading);
      const inner = bodyHtmlSimple(s.body);
      return `  <div class="section">\n    <h2>${h}</h2>\n${inner}\n  </div>`;
    })
    .join('\n\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      --bg: #0f1117;
      --surface: #1a1d27;
      --border: #2a2d3a;
      --text: #e8eaf0;
      --text-secondary: #9196a8;
      --accent: #5b7fff;
    }
    @media (prefers-color-scheme: light) {
      :root {
        --bg: #f5f6fa;
        --surface: #ffffff;
        --border: #e0e3ed;
        --text: #1a1d27;
        --text-secondary: #5a5f73;
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 16px;
      line-height: 1.65;
    }
    .container { max-width: 760px; margin: 0 auto; padding: 40px 24px 80px; }
    header { margin-bottom: 40px; border-bottom: 1px solid var(--border); padding-bottom: 24px; }
    header h1 { font-size: 1.75rem; font-weight: 800; color: var(--text); margin-bottom: 8px; }
    header .meta { color: var(--text-secondary); font-size: 0.9rem; }
    header .app-name { color: var(--accent); font-weight: 700; }
    h2 { font-size: 1.05rem; font-weight: 700; color: var(--text); margin: 28px 0 10px; }
    p { color: var(--text-secondary); margin-bottom: 12px; }
    a { color: var(--accent); }
    .section { margin-bottom: 4px; }
  </style>
</head>
<body>
<div class="container">
  <header>
    <h1>${escapeHtml(title)}</h1>
    <p class="meta">Application: <span class="app-name">Phraseman</span> | Developer: <span class="app-name">Knowly</span> | Last updated: <strong>${escapeHtml(date)}</strong>.</p>
  </header>
${blocks}
</div>
</body>
</html>
`;
}

function knowlyPage({ title, sections, date, active }) {
  const privacyClass = active === 'privacy' ? ' class="km-active"' : '';
  const termsClass = active === 'terms' ? ' class="km-active"' : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${escapeHtml(title)} &middot; Knowly</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400..700;1,9..40,400..700&family=Syne:wght@600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/assets/knowly.css" />
</head>
<body>
  <div class="km-page-bg" aria-hidden="true"></div>
  <div class="km-shell">
    <header class="km-nav">
      <a class="km-brand" href="/">
        <span class="km-mark" aria-hidden="true"></span>
        <span>
          <span class="km-brand-name">Knowly</span><br />
          <span class="km-brand-tag">mobile app studio</span>
        </span>
      </a>
      <nav class="km-nav-links" aria-label="Nav">
        <a href="/">Home</a>
        <a href="/download/">Phraseman</a>
        <a href="/legal/privacy/"${privacyClass}>Privacy Policy</a>
        <a href="/legal/terms/"${termsClass}>Terms</a>
        <a href="/contact/" class="km-cta">Contact</a>
      </nav>
      <button type="button" id="km-burger" class="km-burger" aria-label="Menu">&#9776;</button>
    </header>
    <div id="km-overlay" class="km-overlay" aria-hidden="true"></div>
    <aside id="km-drawer" class="km-drawer" aria-label="Menu">
      <div style="font-family:Syne,sans-serif;font-weight:800;font-size:1.2rem;margin-bottom:12px">Knowly</div>
      <a href="/" data-drawer-close>Home</a>
      <a href="/download/" data-drawer-close>Phraseman</a>
      <div class="km-drawer-h">Legal</div>
      <a href="/legal/privacy/" data-drawer-close>Privacy Policy</a>
      <a href="/legal/terms/" data-drawer-close>Terms</a>
      <a href="/contact/" data-drawer-close>Contact</a>
    </aside>

    <main class="km-main km-section km-article">
      <div class="legal-document">
        <h1>${escapeHtml(title)}</h1>
        <p class="meta">
          Application: <strong style="color:var(--km-text)">Phraseman</strong> &middot; Developer:
          <strong style="color:var(--km-text)">Knowly</strong> &middot; Last updated <strong>${escapeHtml(date)}</strong>.
        </p>

${renderLegalBlocks(sections)}
      </div>
    </main>

    <footer class="km-footer">
      <div class="km-footer-inner">
        <nav class="km-footer-links">
          <a href="/">Home</a>
          <a href="/download/">Phraseman</a>
          <a href="/legal/privacy/">Privacy</a>
          <a href="/legal/terms/">Terms</a>
          <a href="/legal/data-deletion/">Data deletion</a>
          <a href="/contact/">Contact</a>
        </nav>
      </div>
    </footer>
  </div>
  <script src="/assets/site-config.js" defer></script>
  <script src="/assets/stats.js" defer></script>
  <script src="/assets/site.js" defer></script>
</body>
</html>
`;
}

function dataDeletionPage({ date }) {
  const title = 'Delete Your Phraseman Account and Data';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${title} &middot; Knowly</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400..700;1,9..40,400..700&family=Syne:wght@600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/assets/knowly.css" />
</head>
<body>
  <div class="km-page-bg" aria-hidden="true"></div>
  <div class="km-shell">
    <header class="km-nav">
      <a class="km-brand" href="/">
        <span class="km-mark" aria-hidden="true"></span>
        <span>
          <span class="km-brand-name">Knowly</span><br />
          <span class="km-brand-tag">mobile app studio</span>
        </span>
      </a>
      <nav class="km-nav-links" aria-label="Nav">
        <a href="/">Home</a>
        <a href="/download/">Phraseman</a>
        <a href="/legal/privacy/">Privacy Policy</a>
        <a href="/legal/terms/">Terms</a>
        <a href="/contact/" class="km-cta">Contact</a>
      </nav>
      <button type="button" id="km-burger" class="km-burger" aria-label="Menu">&#9776;</button>
    </header>
    <div id="km-overlay" class="km-overlay" aria-hidden="true"></div>
    <aside id="km-drawer" class="km-drawer" aria-label="Menu">
      <div style="font-family:Syne,sans-serif;font-weight:800;font-size:1.2rem;margin-bottom:12px">Knowly</div>
      <a href="/" data-drawer-close>Home</a>
      <a href="/download/" data-drawer-close>Phraseman</a>
      <div class="km-drawer-h">Legal</div>
      <a href="/legal/privacy/" data-drawer-close>Privacy Policy</a>
      <a href="/legal/terms/" data-drawer-close>Terms</a>
      <a href="/contact/" data-drawer-close>Contact</a>
    </aside>

    <main class="km-main km-section km-article">
      <div class="legal-document">
        <h1>${title}</h1>
        <p class="meta">
          Application: <strong style="color:var(--km-text)">Phraseman</strong> &middot; Developer:
          <strong style="color:var(--km-text)">Knowly</strong> &middot; Last updated <strong>${escapeHtml(date)}</strong>.
        </p>

        <h2>How to request deletion</h2>
        <p>Open Phraseman and go to Settings &gt; Account &gt; Delete account. Confirm the deletion in the app. The app starts an authenticated deletion request to Knowly, then may sign you out and clear local app data from the device while server-side deletion continues in the background.</p>
        <p>If you cannot access the app, if the in-app deletion request does not complete, or if you want follow-up, email <a href="mailto:support.phraseman@gmail.com?subject=Delete%20My%20Data">support.phraseman@gmail.com</a> with subject "Delete My Data". Include the email, sign-in method, or other account details you used with Phraseman. We may need to verify your request before deleting account data.</p>

        <h2>Data deleted or de-identified</h2>
        <p>The deletion flow is designed to delete or de-identify active account data controlled by Knowly, including your Firebase Auth user, users/{stable_id} cloud profile and progress data, leaderboard/profile records, authentication links, friend/referral indexes, social and multiplayer records, community pack records, chat/report/moderation records linked to the account where deletion is appropriate, reactions, poll votes, survey records, app activity/error records linked to the account, RevenueCat-linked app records controlled by Knowly, and local app data on the device.</p>

        <h2>Data that may be retained</h2>
        <p>Some records may remain where retention is required or permitted for legal compliance, payment, tax, accounting, fraud prevention, security, dispute handling, chargebacks/refunds, moderation integrity, backups, or records held by app stores and third-party processors under their own policies.</p>
        <p>Deleting your Phraseman account does not automatically cancel an active App Store or Google Play subscription. You must cancel subscriptions in the relevant store subscription settings.</p>

        <h2>Questions</h2>
        <p>For privacy, parental, or account deletion requests, email <a href="mailto:support.phraseman@gmail.com">support.phraseman@gmail.com</a>.</p>
        <p>See also the <a href="/legal/privacy/">Privacy Policy</a> and <a href="/legal/terms/">Terms of Use</a>.</p>
      </div>
    </main>

    <footer class="km-footer">
      <div class="km-footer-inner">
        <nav class="km-footer-links">
          <a href="/">Home</a>
          <a href="/download/">Phraseman</a>
          <a href="/legal/privacy/">Privacy</a>
          <a href="/legal/terms/">Terms</a>
          <a href="/contact/">Contact</a>
        </nav>
      </div>
    </footer>
  </div>
  <script src="/assets/site-config.js" defer></script>
  <script src="/assets/stats.js" defer></script>
  <script src="/assets/site.js" defer></script>
</body>
</html>
`;
}

/**
 * зачем: страницы knowly-www/legal/* были переделаны в новом дизайне сайта
 * (свой <head>, шапка, футер). Полная перезапись старым шаблоном сносила
 * редизайн. Поэтому, если на диске уже лежит редизайн-страница с контейнером
 * <div class="legal-document">…</div></main>, обновляем ТОЛЬКО текст внутри
 * контейнера (заголовок, дата, разделы), а обвязку сайта не трогаем. Старого
 * контейнера нет — пишем полный шаблон, как раньше.
 */
function writeLegalIntoExistingPage(filePath, { title, sections, date }, fallbackHtml) {
  if (!fs.existsSync(filePath)) return writeFileEnsured(filePath, fallbackHtml);
  const current = fs.readFileSync(filePath, 'utf8');
  const open = current.indexOf('<div class="legal-document">');
  const close = current.indexOf('</main>', open);
  if (open === -1 || close === -1) return writeFileEnsured(filePath, fallbackHtml);
  const closeDiv = current.lastIndexOf('</div>', close);
  if (closeDiv === -1 || closeDiv < open) return writeFileEnsured(filePath, fallbackHtml);
  const inner =
    `<div class="legal-document">
` +
    `        <h1>${escapeHtml(title)}</h1>
` +
    `        <p class="meta">
` +
    `          Application: <strong style="color:var(--km-text)">Phraseman</strong> &middot; Developer:
` +
    `          <strong style="color:var(--km-text)">Knowly</strong> &middot; Last updated <strong>${escapeHtml(date)}</strong>.
` +
    `        </p>

` +
    `${renderLegalBlocks(sections)}
  `;
  const next = current.slice(0, open) + inner + current.slice(closeDiv);
  return writeFileEnsured(filePath, next);
}

/** Страница удаления данных: в редизайн-версии обновляем только дату. */
function writeDataDeletionIntoExistingPage(filePath, { date }, fallbackHtml) {
  if (!fs.existsSync(filePath)) return writeFileEnsured(filePath, fallbackHtml);
  const current = fs.readFileSync(filePath, 'utf8');
  if (!current.includes('<div class="legal-document">')) return writeFileEnsured(filePath, fallbackHtml);
  const next = current.replace(/Last updated <strong>[^<]*<\/strong>/, `Last updated <strong>${escapeHtml(date)}</strong>`);
  return writeFileEnsured(filePath, next);
}

function writeFileEnsured(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
}

function syncAppLegalJsons() {
  fs.mkdirSync(APP_LEGAL, { recursive: true });
  [
    'terms_of_use_en.json',
    'terms_of_use_en_ios.json',
    'privacy_policy_en.json',
    'privacy_policy_en_ios.json',
  ].forEach((name) => {
    fs.copyFileSync(path.join(LEGAL, name), path.join(APP_LEGAL, name));
  });
}

function main() {
  syncAppLegalJsons();

  const terms = JSON.parse(fs.readFileSync(path.join(LEGAL, 'terms_of_use_en.json'), 'utf8'));
  const privacy = JSON.parse(fs.readFileSync(path.join(LEGAL, 'privacy_policy_en.json'), 'utf8'));
  const termsDate = extractDate(terms);
  const privacyDate = extractDate(privacy);
  const termsTitle = 'Terms of Use - Phraseman by Knowly';
  const privacyTitle = 'Privacy Policy - Phraseman by Knowly';

  const termsRoot = rootPage({ title: termsTitle, sections: terms, date: termsDate });
  const privacyRoot = rootPage({ title: privacyTitle, sections: privacy, date: privacyDate });

  writeFileEnsured(path.join(ROOT, 'terms.html'), termsRoot);
  writeFileEnsured(path.join(ROOT, 'privacy.html'), privacyRoot);
  writeFileEnsured(path.join(ROOT, 'admin', 'oauth-privacy.html'), privacyRoot);
  writeLegalIntoExistingPage(
    path.join(KNOWLY_WWW, 'legal', 'terms', 'index.html'),
    { title: termsTitle, sections: terms, date: termsDate },
    knowlyPage({ title: termsTitle, sections: terms, date: termsDate, active: 'terms' }),
  );
  writeLegalIntoExistingPage(
    path.join(KNOWLY_WWW, 'legal', 'privacy', 'index.html'),
    { title: privacyTitle, sections: privacy, date: privacyDate },
    knowlyPage({ title: privacyTitle, sections: privacy, date: privacyDate, active: 'privacy' }),
  );
  writeDataDeletionIntoExistingPage(
    path.join(KNOWLY_WWW, 'legal', 'data-deletion', 'index.html'),
    { date: privacyDate },
    dataDeletionPage({ date: privacyDate }),
  );

  console.log('Wrote app/legal JSON, root, admin, and knowly-www legal HTML from legal/*.json');
}

main();
