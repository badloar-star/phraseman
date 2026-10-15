/**
 * Reads canonical legal/terms_of_use_en.json + legal/privacy_policy_en.json and writes:
 * - app/legal/*.json
 * - terms.html
 * - privacy.html
 * - admin/oauth-privacy.html (легаси-путь) + admin/v2/oauth-privacy.html (публикуемый)
 * - knowly-www/legal/terms/index.html
 * - knowly-www/legal/privacy/index.html
 * - knowly-www/legal/privacy-ios/index.html (iOS-версия, с 12.10)
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
        <p>Open Phraseman and go to Settings &gt; Account &gt; Delete account. Confirm the deletion in the app. The app starts an authenticated deletion request to Knowly, then may sign you out and clear local app data from the device while server-side deletion continues in the background. A technical offline cache kept by the Firebase database library is cleared the next time the app starts.</p>
        <p>If you cannot access the app, if the in-app deletion request does not complete, or if you want follow-up, email <a href="mailto:support.phraseman@gmail.com?subject=Delete%20My%20Data">support.phraseman@gmail.com</a> with subject "Delete My Data". Include the email, sign-in method, or other account details you used with Phraseman. We may need to verify your request before deleting account data.</p>

        <h2>14-day recovery window</h2>
        <p>For an account signed in with Google or Apple, server-side deletion is scheduled after a 14-day grace period, so that an accidental deletion can still be undone. If you signed in with Google or Apple and sign in again during those 14 days, the app offers to restore the account; accepting cancels the deletion and returns your data in full. Once the 14 days elapse, deletion runs and becomes irreversible.</p>
        <p>A guest account (used without signing in with Google or Apple) has no sign-in method and therefore cannot be restored after you delete it. The app clears local app data on the device immediately and sends the deletion request to our servers in the background; server-side data of a guest account is deleted as soon as the request reaches our servers. If your device is offline at that moment, the app keeps the deletion pending and sends the request again the next time it starts with a connection. If you uninstall the app before that, contact us as described below.</p>

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
// зачем (координатор 15.10, к выкладке 17.10): обвязка сайта русская (<html lang="ru">, меню), а текст документов — английский
// канон. Помечаем сам блок документа lang="en", а <title> — английским, чтобы поисковики, сторы и экранные чтецы читали
// документ как английский; меню и подвал не трогаем. Открывающий тег ищем с любыми атрибутами — иначе повторный sync
// не нашёл бы контейнер и перезаписал редизайн-страницу запасным шаблоном.
const LEGAL_DOC_OPEN_RE = /<div class="legal-document"[^>]*>/;
const LEGAL_DOC_OPEN_EN = '<div class="legal-document" lang="en">';

function withSiteTitle(html, siteTitle) {
  return html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(siteTitle)}</title>`);
}

// зачем (координатор 15.10): sync писал разделы без оглавления, якорей id="s…" и обёртки .prose — страницы 2.0 теряли
// ~60 строк и левое оглавление (собиралось бы только скриптом в браузере, с другими id). Теперь генератор рендерит ровно
// ту разметку, что лежит на страницах: id по правилу s{N}-{slug до 40 символов}, <details class="toc" data-toc>, <div class="prose">.
// Сторож идемпотентности — tests/legal_sync_idempotent_contract.test.mjs.
const LEGAL_TOC_LABEL = 'Содержание';

function legalSectionId(heading, index) {
  const slug = String(heading || '').toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return `s${index + 1}${slug ? `-${slug}` : ''}`;
}

function renderLegalToc(sections) {
  const links = sections.map((s, i) => `<a href="#${legalSectionId(s.heading, i)}">${escapeHtml(s.heading)}</a>`).join('');
  return `<details class="toc" open data-toc><summary>${LEGAL_TOC_LABEL}</summary><nav aria-label="${LEGAL_TOC_LABEL}">${links}</nav></details>`;
}

function renderLegalProse(sections) {
  return sections
    .map((s, i) => {
      const inner = bodyHtmlSimple(s.body);
      return `        <h2 id="${legalSectionId(s.heading, i)}">${escapeHtml(s.heading)}</h2>\n${inner.split('\n').map((line) => `        ${line}`).join('\n')}`;
    })
    .join('\n\n');
}

/**
 * Чистая часть sync для редизайн-страницы: текущий HTML + документ → новый HTML (или причина, почему контейнера нет).
 * Экспорт — для сторожа идемпотентности; файлы не трогает.
 */
export function mergeLegalIntoPage(current, { title, sections, date, siteTitle }) {
  const openMatch = LEGAL_DOC_OPEN_RE.exec(current);
  const open = openMatch ? openMatch.index : -1;
  const close = current.indexOf('</main>', open);
  if (open === -1 || close === -1) return { ok: false, reason: 'no_legal_document_container' };
  // конец документа — строка «  </div>…</main>» после закрытия .prose; обёртки страницы за ней не трогаем
  const docEnd = current.lastIndexOf('\n  </div>', close);
  if (docEnd === -1 || docEnd < open) return { ok: false, reason: 'no_document_closing_line' };
  const inner =
    `${LEGAL_DOC_OPEN_EN}\n` +
    `        <h1>${escapeHtml(title)}</h1>\n` +
    `        <p class="meta">\n` +
    `          Application: <strong style="color:var(--km-text)">Phraseman</strong> &middot; Developer:\n` +
    `          <strong style="color:var(--km-text)">Knowly</strong> &middot; Last updated <strong>${escapeHtml(date)}</strong>.\n` +
    `        </p>\n` +
    `        ${renderLegalToc(sections)}\n` +
    `        <div class="prose">\n\n` +
    `${renderLegalProse(sections)}\n` +
    `        </div>\n`;
  const next = current.slice(0, open) + inner + current.slice(docEnd + 1);
  return { ok: true, html: siteTitle ? withSiteTitle(next, siteTitle) : next };
}

function writeLegalIntoExistingPage(filePath, doc, fallbackHtml) {
  if (!fs.existsSync(filePath)) return writeFileEnsured(filePath, fallbackHtml);
  const merged = mergeLegalIntoPage(fs.readFileSync(filePath, 'utf8'), doc);
  if (!merged.ok) {
    console.warn(`[LEGAL-SYNC] ${filePath}: ${merged.reason} — пишу запасной шаблон`); // guard-ok: ранний выход с причиной
    return writeFileEnsured(filePath, fallbackHtml);
  }
  return writeFileEnsured(filePath, merged.html);
}

/** Страница удаления данных: в редизайн-версии обновляем дату, язык блока документа и <title>. */
function writeDataDeletionIntoExistingPage(filePath, { date, siteTitle }, fallbackHtml) {
  if (!fs.existsSync(filePath)) return writeFileEnsured(filePath, fallbackHtml);
  const current = fs.readFileSync(filePath, 'utf8');
  if (!LEGAL_DOC_OPEN_RE.test(current)) return writeFileEnsured(filePath, fallbackHtml);
  const next = current
    .replace(/Last updated <strong>[^<]*<\/strong>/, `Last updated <strong>${escapeHtml(date)}</strong>`)
    .replace(LEGAL_DOC_OPEN_RE, LEGAL_DOC_OPEN_EN);
  return writeFileEnsured(filePath, withSiteTitle(next, siteTitle));
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
  const privacyIos = JSON.parse(fs.readFileSync(path.join(LEGAL, 'privacy_policy_en_ios.json'), 'utf8'));
  const termsDate = extractDate(terms);
  const privacyDate = extractDate(privacy);
  const termsTitle = 'Terms of Use - Phraseman by Knowly';
  const privacyTitle = 'Privacy Policy - Phraseman by Knowly';

  const termsRoot = rootPage({ title: termsTitle, sections: terms, date: termsDate });
  const privacyRoot = rootPage({ title: privacyTitle, sections: privacy, date: privacyDate });

  writeFileEnsured(path.join(ROOT, 'terms.html'), termsRoot);
  writeFileEnsured(path.join(ROOT, 'privacy.html'), privacyRoot);
  writeFileEnsured(path.join(ROOT, 'admin', 'oauth-privacy.html'), privacyRoot);
  // зачем: hosting-таргет admin публикует ТОЛЬКО admin/v2, поэтому копия в admin/
  // никуда не деплоилась и https://phraseman-ea0b3.web.app/oauth-privacy.html отдавал
  // 404 (аудит 2026-08-25). Пишем вторую копию в публикуемую папку.
  writeFileEnsured(path.join(ROOT, 'admin', 'v2', 'oauth-privacy.html'), privacyRoot);
  writeLegalIntoExistingPage(
    path.join(KNOWLY_WWW, 'legal', 'terms', 'index.html'),
    { title: termsTitle, sections: terms, date: termsDate, siteTitle: 'Terms of Use · Phraseman' },
    knowlyPage({ title: termsTitle, sections: terms, date: termsDate, active: 'terms' }),
  );
  writeLegalIntoExistingPage(
    path.join(KNOWLY_WWW, 'legal', 'privacy', 'index.html'),
    { title: privacyTitle, sections: privacy, date: privacyDate, siteTitle: 'Privacy Policy · Phraseman' },
    knowlyPage({ title: privacyTitle, sections: privacy, date: privacyDate, active: 'privacy' }),
  );
  // зачем (12.10, PRIVACY_R1_GAP): в приложении на iOS показывается privacy_policy_en_ios.json, а на сайте была только
  // общая (Android) версия — ссылка в App Store вела на текст с Google Play. Отдельная страница /legal/privacy-ios/;
  // публикует владелец (деплой hosting:knowly-www) и ставит ссылку в App Store Connect.
  const privacyIosTitle = 'Privacy Policy (iOS) - Phraseman by Knowly';
  const privacyIosDate = extractDate(privacyIos);
  writeLegalIntoExistingPage(
    path.join(KNOWLY_WWW, 'legal', 'privacy-ios', 'index.html'),
    { title: privacyIosTitle, sections: privacyIos, date: privacyIosDate, siteTitle: 'Privacy Policy (iOS) · Phraseman' },
    knowlyPage({ title: privacyIosTitle, sections: privacyIos, date: privacyIosDate, active: 'privacy' }),
  );
  writeDataDeletionIntoExistingPage(
    path.join(KNOWLY_WWW, 'legal', 'data-deletion', 'index.html'),
    { date: privacyDate, siteTitle: 'Data Deletion · Phraseman' },
    dataDeletionPage({ date: privacyDate }),
  );

  console.log('Wrote app/legal JSON, root, admin, and knowly-www legal HTML from legal/*.json');
}

// зачем: импорт из сторожа (mergeLegalIntoPage) не должен перезаписывать файлы — main только при запуске скрипта
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
