import {
  SUPPORT_REPORT_TEMPLATES,
  getSupportReportTemplate,
  isSupportReportCommentValid,
} from '../app/support_report_validation';
import fs from 'node:fs';
import path from 'node:path';

const screen = fs.readFileSync(path.join(__dirname, '..', 'app/support_report.tsx'), 'utf8');

describe('support report comment validation', () => {
  it('rejects every untouched localized support template', () => {
    expect(SUPPORT_REPORT_TEMPLATES).toEqual({
      ru: 'Что я делал(а):\nЧто ожидал(а):\nЧто произошло:\n',
      uk: 'Що я робив(ла):\nЩо очікував(ла):\nЩо сталося:\n',
      en: 'What I did:\nWhat I expected:\nWhat happened:\n',
      es: 'Lo que hice:\nLo que esperaba:\nLo que pasó:\n',
      'pt-BR': 'O que eu fiz:\nO que eu esperava:\nO que aconteceu:\n',
      vi: 'Tôi đã làm:\nTôi mong đợi:\nĐiều đã xảy ra:\n',
      id: 'Yang saya lakukan:\nYang saya harapkan:\nYang terjadi:\n',
      tr: 'Ne yaptım:\nNe bekliyordum:\nNe oldu:\n',
      pl: 'Co zrobiłem(am):\nCo oczekiwałem(am):\nCo się stało:\n',
    });

    for (const [locale, template] of Object.entries(SUPPORT_REPORT_TEMPLATES)) {
      expect(getSupportReportTemplate(locale)).toBe(template);
      expect(isSupportReportCommentValid(template)).toBe(false);
      expect(isSupportReportCommentValid(`\n  ${template}\n\n`)).toBe(false);
    }
  });

  it('falls back to the exact English template for unknown and inherited locale keys', () => {
    for (const locale of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'zz', '']) {
      const template = getSupportReportTemplate(locale);
      expect(typeof template).toBe('string');
      expect(template).toBe(SUPPORT_REPORT_TEMPLATES.en);
    }
  });

  it('accepts genuine comments without rewriting them', () => {
    const partialTemplate = `${getSupportReportTemplate('en')}The app closes after I tap Listen.`;
    expect(isSupportReportCommentValid(partialTemplate)).toBe(true);
    expect(isSupportReportCommentValid('The app closes after I tap Listen.')).toBe(true);
    expect(isSupportReportCommentValid('Unknown locale comment: the button does nothing.')).toBe(true);
  });

  it('keeps heading words inside a substantive sentence and rejects only raw under-minimum text', () => {
    expect(isSupportReportCommentValid('What I did: I opened Cards and tapped Listen.')).toBe(true);
    expect(isSupportReportCommentValid('  short  ')).toBe(false);
  });

  it('rejects normalized heading-only and punctuation-only variants without adding a substantive-length floor', () => {
    for (const comment of [
      'What I did :\nWhat I expected :\nWhat happened :',
      'What I did\nWhat I expected\nWhat happened',
      'What I did...\nWhat I expected…\nWhat happened...',
      '...\n…\n!!!',
    ]) {
      expect(isSupportReportCommentValid(comment)).toBe(false);
    }

    expect(isSupportReportCommentValid('What I did:\nX')).toBe(true);
  });

  it('binds the same helper before button enablement and all submission side effects', () => {
    expect(screen).toContain("import { getSupportReportTemplate, isSupportReportCommentValid } from './support_report_validation';");
    expect(screen).toContain('() => isSupportReportCommentValid(description)');
    const guard = screen.indexOf('if (!isSupportReportCommentValid(description) || submissionStartedRef.current) return;');
    expect(guard).toBeGreaterThanOrEqual(0);
    expect(screen.indexOf("setState('sent');")).toBeGreaterThan(guard);
    expect(screen.indexOf('void sendSupportReportInBackground(')).toBeGreaterThan(guard);
    expect(screen).toContain('const comment = description;');
  });
});
