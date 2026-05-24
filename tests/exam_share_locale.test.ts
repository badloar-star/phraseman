import fs from 'fs';
import path from 'path';
import { buildCertificateShareMessage, buildExamShareMessage } from '../app/exam_share';
import type { Lang } from '../constants/i18n';

const ROOT = path.resolve(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'app', 'exam_share.ts'), 'utf8');
const PLANNED_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const satisfies readonly Lang[];
const LEGACY_RUNTIME_RE = /\b(lang === 'ru'|lang === 'uk'|lang === 'es'|return\s+[^;\n]*(?:RU|UK|ES)\b|\?\?\s*[^;\n]*(?:RU|UK|ES)\b|fallback)\b/u;

describe('exam share planned locale copy', () => {
  it('does not route planned share messages through RU/UK/ES runtime branches', () => {
    expect(SOURCE).not.toMatch(LEGACY_RUNTIME_RE);
    expect(SOURCE).toContain('const pools: Record<ShareExamLang, readonly string[]>');
  });

  it('serves explicit planned locale exam share messages', () => {
    for (const locale of PLANNED_LOCALES) {
      const message = buildExamShareMessage(locale, 8, 10, 80, 'https://example.test');

      expect(message).toContain('https://example.test');
      expect(message).not.toMatch(/[А-Яа-яЁёІіЇїЄєҐґ]/u);
    }
  });

  it('serves explicit planned locale B2 reward share messages', () => {
    for (const locale of PLANNED_LOCALES) {
      const message = buildCertificateShareMessage(locale, 'Alex', 88, 'https://example.test');

      expect(message).toContain('https://example.test');
      expect(message).toContain('Alex');
      expect(message).not.toMatch(/[А-Яа-яЁёІіЇїЄєҐґ]/u);
    }
  });
});
