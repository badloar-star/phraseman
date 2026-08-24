import { readFileSync } from 'node:fs';
import path from 'node:path';

const adminHtml = readFileSync(
  path.join(process.cwd(), 'admin', 'v2', 'legacy.html'),
  'utf8',
);

describe('admin V4 navigation observer contract', () => {
  it('does not rewrite an already translated tab label observed as childList', () => {
    const translateNavigation = adminHtml.match(
      /function translateNavigation\(\) \{([\s\S]*?)\n  \}\n\n  function classifyButtons/,
    )?.[1];

    expect(translateNavigation).toBeDefined();
    expect(translateNavigation).toContain(
      'if (cleanText(label.textContent) !== meta.title) label.textContent = meta.title;',
    );
  });

  it('keeps the navigation observer idempotent after V7 installs tab labels', () => {
    expect(adminHtml).toContain("const navObserver = new MutationObserver(() => { translateNavigation(); translateUI(tabs); });");
    expect(adminHtml).not.toContain('if (label) { label.textContent = meta.title; return; }');
  });
});
