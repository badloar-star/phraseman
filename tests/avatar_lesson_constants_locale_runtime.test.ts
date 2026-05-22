import fs from 'fs';
import path from 'path';
import { FRAMES, frameNameForLang } from '../constants/avatars';
import { customAvatarNameForLang, customAvatarGradientNameForLang } from '../constants/custom_avatars';
import { lessonNamesForLang } from '../constants/lessons';

const ROOT = path.resolve(__dirname, '..');
const PLANNED_LANGS = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('avatar and lesson constants locale runtime', () => {
  it('keeps locale resolvers out of old RU/UK/ES branch patterns', () => {
    for (const file of ['constants/avatars.ts', 'constants/custom_avatars.ts', 'constants/lessons.ts']) {
      const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
      expect(source).not.toContain("lang === 'uk'");
      expect(source).not.toContain("lang === 'es'");
      expect(source).not.toContain('const fallback');
    }
  });

  it('serves explicit planned locale frame names', () => {
    for (const frame of FRAMES) {
      for (const lang of PLANNED_LANGS) {
        expect(frameNameForLang(frame, lang)).toBeTruthy();
        expect(frameNameForLang(frame, lang)).not.toMatch(/^needs-review:/);
        expect(frameNameForLang(frame, lang)).not.toBe(frame.nameRU);
      }
    }
  });

  it('serves planned custom avatar and lesson labels explicitly', () => {
    expect(customAvatarNameForLang('custom-gen-01', 'pt-BR')).toBe('Oráculo encapuzado');
    expect(customAvatarGradientNameForLang('aurora', 'pl')).toBe('Grafit');

    for (const lang of PLANNED_LANGS) {
      const names = lessonNamesForLang(lang);
      expect(names).toHaveLength(32);
      expect(names).not.toBe(lessonNamesForLang('ru'));
    }
  });
});
