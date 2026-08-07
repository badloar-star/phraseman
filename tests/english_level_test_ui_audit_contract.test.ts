import fs from 'fs';
import path from 'path';
import vm from 'vm';

const root = path.resolve(__dirname, '..');
const surface = path.join(root, 'knowly-www', 'english-level-test');
const appSource = fs.readFileSync(path.join(surface, 'app.js'), 'utf8');
const certificateSource = fs.readFileSync(path.join(surface, 'certificate.js'), 'utf8');
const cssSource = fs.readFileSync(path.join(surface, 'styles.css'), 'utf8');
const indexSource = fs.readFileSync(path.join(surface, 'index.html'), 'utf8');

function loadI18n(): any {
  const sandbox: Record<string, unknown> = {};
  const locales = path.join(surface, 'i18n.locales.js');
  const absolute = path.join(surface, 'i18n.js');
  vm.runInNewContext(fs.readFileSync(locales, 'utf8'), sandbox, { filename: locales });
  vm.runInNewContext(fs.readFileSync(absolute, 'utf8'), sandbox, { filename: absolute });
  return sandbox.EnglishTestI18n;
}

function block(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = cssSource.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`));
  if (!match) throw new Error(`Missing CSS block: ${selector}`);
  return match[1];
}

function channel(value: string): number {
  const normalized = Number.parseInt(value, 16) / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const value = hex.replace('#', '');
  return 0.2126 * channel(value.slice(0, 2))
    + 0.7152 * channel(value.slice(2, 4))
    + 0.0722 * channel(value.slice(4, 6));
}

function contrast(foreground: string, background: string): number {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

describe('English level test full UI audit contract', () => {
  test('reduced motion removes delayed invisible animation states', () => {
    const reducedMotion = cssSource.match(
      /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\*, \*::before, \*::after\s*\{([^}]+)\}/,
    );
    expect(reducedMotion).not.toBeNull();
    expect(reducedMotion?.[1]).toContain('animation-delay: 0s !important');
  });

  test('localizes the visible question context and instruction for Russian and English', () => {
    const i18n = loadI18n();
    expect(Array.from(i18n.UI_LOCALES)).toEqual(expect.arrayContaining(['ru', 'en']));
    for (const locale of i18n.UI_LOCALES) {
      expect(i18n.t(locale, 'question.context')).toEqual(expect.any(String));
      expect(i18n.t(locale, 'question.contextInstruction')).toEqual(expect.any(String));
    }
    expect(i18n.t('en', 'question.context')).toBe('Context');
    expect(i18n.t('ru', 'question.context')).toBe('Контекст');
    expect(appSource).toContain("copy('question.contextInstruction')");
  });

  test('stacks the result header and card vertically on narrow screens', () => {
    expect(block('.elt-result')).toContain('flex-direction: column');
  });

  test('keeps normal text tokens at WCAG AA contrast on the light background', () => {
    const variables = Object.fromEntries(
      [...cssSource.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((match) => [match[1], match[2]]),
    );
    expect(contrast(variables.muted, variables.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(variables['accent-light'], variables.bg)).toBeGreaterThanOrEqual(4.5);
  });

  test('fits the full allowed learner name inside the certificate SVG', () => {
    expect(certificateSource).toContain('certificateNameFontSize');
    expect(certificateSource).toContain('font-size="${certificateNameFontSize(name)}"');
  });

  test('provides visible focus and 44px targets for every certificate control', () => {
    expect(cssSource).toContain('.elt-cert-close:focus-visible');
    expect(cssSource).toContain('.elt-cert-lang-btn:focus-visible');
    expect(cssSource).toContain('.elt-cert-theme-btn:focus-visible');
    expect(block('.elt-cert-close')).toContain('min-height: 44px');
    expect(block('.elt-cert-close')).toContain('min-width: 44px');
    expect(block('.elt-cert-theme-btn')).toContain('min-height: 44px');
    expect(block('.elt-cta-secondary .elt-btn')).toContain('min-height: 44px');
  });

  test('keeps animated counters out of repeated screen-reader announcements', () => {
    expect(appSource).toContain('class="elt-counter" role="status" aria-atomic="true"');
    expect(appSource).toContain('class="elt-counter-value" aria-hidden="true"');
    expect(appSource).toContain('class="elt-result-details" aria-live="off"');
  });

  test('uses one roving tab stop for radio answers and silences countdown announcements', () => {
    expect(appSource).toContain("tabindex=\"${i === 0 ? '0' : '-1'}\"");
    expect(appSource).toContain('setRovingOptionFocus');
    expect(appSource).toContain('role="timer" aria-live="off"');
  });

  test('unlocks the picker after exit/restart and preserves landing consent across rerenders', () => {
    expect(appSource).toContain('function returnToLanding()');
    expect(appSource).toContain('attemptTestLanguage = null;');
    expect(appSource).toContain("node.querySelector('#restartBtn').addEventListener('click', returnToLanding)");
    expect(appSource).toContain("id=\"consentCheckbox\"${consent ? ' checked' : ''}");
    expect(appSource).toContain("node.querySelector('#consentCheckbox').addEventListener('change', readConsent)");
  });

  test('preserves the selected test and UI languages in shared links', () => {
    expect(appSource).toContain("url.searchParams.set('test', attemptTestLanguage || selectedTestLanguage)");
    expect(appSource).toContain("url.searchParams.set('ui', uiLocale)");
  });

  test('fully localizes Russian navigation and English score summaries', () => {
    const i18n = loadI18n();
    expect(i18n.t('ru', 'header.brandHomeAria')).toBe('Phraseman — на главную');
    expect(i18n.t('en', 'certificate.summary', { correct: 8, answered: 12 })).toBe('8 correct out of 12');
  });

  test('exposes certificate theme state and safely handles blocked popup windows', () => {
    expect(certificateSource).toContain('aria-pressed="${String(key === currentTheme)}"');
    expect(certificateSource).toContain("button.setAttribute('aria-pressed', String(button.dataset.theme === currentTheme))");
    expect(certificateSource).toContain('if (!printWindow) return;');
    expect(appSource).toContain('if (!win) {');
  });

  test('allows worst-case certificate names to scale below 18px when needed', () => {
    expect(certificateSource).toContain('Math.max(10, Math.min(50');
    expect(certificateSource).toContain('CERTIFICATE_NAME_MAX_WIDTH / Math.max(1, Array.from(String(name || \'\')).length)');
  });

  test('keeps the English question-specific prompt when English is the tested language', () => {
    expect(appSource).toContain("testLanguage === 'en'");
    expect(appSource).toContain("{ scenario: q.scenario, instruction: q.prompt, language: 'en' }");
  });

  test('uses a consistent English no-JavaScript fallback document', () => {
    expect(indexSource).toContain('<html lang="en">');
    expect(indexSource).toContain('Discover your language level and get a personal result.');
    expect(indexSource).not.toContain('<meta name="description" content="Бесплатная');
  });
  test('offers the in-test error report form in Russian and English', () => {
    const i18n = loadI18n();
    for (const locale of i18n.UI_LOCALES) {
      expect(i18n.t(locale, 'report.trigger')).not.toBe('report.trigger');
      expect(i18n.t(locale, 'report.title')).not.toBe('report.title');
      expect(i18n.t(locale, 'report.placeholder')).not.toBe('report.placeholder');
      expect(i18n.t(locale, 'report.submit')).not.toBe('report.submit');
      expect(i18n.t(locale, 'report.successTitle')).not.toBe('report.successTitle');
    }
    expect(i18n.t('ru', 'report.trigger')).toBe('Заметили ошибку?');
    expect(i18n.t('en', 'report.trigger')).toBe('Noticed an error?');
  });

  test('keeps the report trigger at the bottom of active tests and submits only to the same-origin API', () => {
    expect(appSource).toContain('class="elt-report-trigger" id="reportErrorBtn"');
    expect(appSource.indexOf('id="reportErrorBtn"')).toBeGreaterThan(appSource.indexOf('class="elt-actions"'));
    expect(appSource).toContain("action: 'report_error'");
    expect(appSource).toContain('fetch(API_BASE');
    expect(appSource).toContain("source: 'site'");
    expect(appSource).not.toMatch(/collection\([^\n]*error_reports/);
  });

  test('reports the exact localized question chrome that the learner saw', () => {
    expect(appSource).toContain('buildReportQuestionText(q, displayedQuestion)');
    expect(appSource).toContain('openReportDialog(q, serviceQuestion, position, event.currentTarget)');
    expect(appSource).toContain('Displayed scenario: ${displayedQuestion.scenario || \'\'}');
    expect(appSource).toContain('Displayed instruction: ${displayedQuestion.instruction || \'\'}');
    expect(appSource).toContain('Canonical scenario: ${q.scenario || \'\'}');
    expect(appSource).toContain('Canonical instruction: ${q.prompt || \'\'}');
  });

  test('makes the report dialog accessible without shrinking the small visual trigger target', () => {
    expect(appSource).toContain('role="dialog"');
    expect(appSource).toContain('aria-modal="true"');
    expect(appSource).toContain('role="alert"');
    expect(appSource).toContain('maxLength = 500');
    expect(appSource).toContain('REPORT_COMMENT_MIN_LENGTH = 10');
    expect(appSource).toContain('button:not([disabled]):not([tabindex="-1"]), textarea:not([disabled])');
    expect(block('.elt-report-trigger')).toContain('min-height: 44px');
    expect(cssSource).toContain('.elt-report-trigger:focus-visible');
    expect(block('.elt-report-submit')).toContain('min-height: 44px');
  });
});
