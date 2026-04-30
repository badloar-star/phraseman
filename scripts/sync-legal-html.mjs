/**
 * Reads canonical legal/terms_of_use_en.json + legal/privacy_policy_en.json
 * and writes terms.html + privacy.html + admin/oauth-privacy.html (same wording as the in-app screens).
 * Run: npm run legal:sync
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const LEGAL = path.join(ROOT, 'legal');

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Split on double newline to <p>; single newlines to <br/> */
function bodyHtmlSimple(body) {
  return body
    .split(/\n\n+/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, '<br/>')}</p>`)
    .join('\n');
}

function wrapPage({ title, sections, metaLine }) {
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
      --radius: 10px;
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
    <p class="meta">${metaLine}</p>
  </header>
${blocks}
</div>
</body>
</html>
`;
}

function main() {
  const termsPath = path.join(LEGAL, 'terms_of_use_en.json');
  const privacyPath = path.join(LEGAL, 'privacy_policy_en.json');
  const terms = JSON.parse(fs.readFileSync(termsPath, 'utf8'));
  const privacy = JSON.parse(fs.readFileSync(privacyPath, 'utf8'));

  const firstTerms = terms[0]?.body?.split('\n\n')[0] || '';
  const dateMatch = firstTerms.match(/Last updated:\s*([^\n]+)/i);
  const dateStr = dateMatch ? dateMatch[1].trim() : '';

  const metaTerms = `Application: <span class="app-name">Phraseman</span> &nbsp;|&nbsp; Developer: <span class="app-name">Knowly</span> &nbsp;|&nbsp; <strong>${escapeHtml(dateStr)}</strong> — same text as in the Phraseman app (English).`;

  const firstPriv = privacy[0]?.body?.split('\n\n')[0] || '';
  const d2 = firstPriv.match(/Last updated:\s*([^\n]+)/i);
  const dateStr2 = d2 ? d2[1].trim() : '';
  const metaPriv = `Application: <span class="app-name">Phraseman</span> &nbsp;|&nbsp; Developer: <span class="app-name">Knowly</span> &nbsp;|&nbsp; <strong>${escapeHtml(dateStr2)}</strong> — same text as in the Phraseman app (English).`;

  fs.writeFileSync(
    path.join(ROOT, 'terms.html'),
    wrapPage({ title: 'Terms of Use — Phraseman by Knowly', sections: terms, metaLine: metaTerms }),
    'utf8',
  );
  const privacyHtml = wrapPage({
    title: 'Privacy Policy — Phraseman by Knowly',
    sections: privacy,
    metaLine: metaPriv,
  });
  fs.writeFileSync(path.join(ROOT, 'privacy.html'), privacyHtml, 'utf8');
  const adminOAuthPrivacy = path.join(ROOT, 'admin', 'oauth-privacy.html');
  try {
    fs.writeFileSync(adminOAuthPrivacy, privacyHtml, 'utf8');
  } catch (e) {
    console.warn('Could not write admin/oauth-privacy.html:', e?.message || e);
  }
  console.log('Wrote terms.html, privacy.html, and admin/oauth-privacy.html from legal/*.json');
}

main();
