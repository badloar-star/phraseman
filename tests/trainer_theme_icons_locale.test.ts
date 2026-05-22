import fs from 'fs';
import path from 'path';

import { trainerThemeIconPalette } from '../constants/trainerThemeIcons';

const ROOT = path.resolve(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'constants', 'trainerThemeIcons.ts'), 'utf8');
const LEGACY_RUNTIME_RE =
  /\b(lang === 'ru'|lang === 'uk'|lang === 'es'|return\s+[^;\n]*(?:RU|UK|ES)\b|\?\?\s*[^;\n]*(?:RU|UK|ES)\b|fallback)\b/u;

describe('trainer theme icons runtime locale guard', () => {
  it('keeps palette resolution free of legacy locale fallback markers', () => {
    expect(SOURCE).not.toMatch(LEGACY_RUNTIME_RE);
  });

  it('keeps unknown palette resolution stable', () => {
    expect(trainerThemeIconPalette('dark').primary).toBe('#2DD4BF');
    expect(trainerThemeIconPalette('unknown' as never)).toEqual(trainerThemeIconPalette('dark'));
  });
});
