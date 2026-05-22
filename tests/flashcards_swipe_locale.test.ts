import fs from 'fs';
import path from 'path';

import { resolveFlashcardBackText, type CardItem } from '../app/flashcards/types';

const ROOT = path.resolve(__dirname, '..');
const PLANNED_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('flashcards swipe planned locale runtime copy', () => {
  it('does not route planned flashcard backs through ES/RU/UK when sourceLocales are missing', () => {
    const card: CardItem = {
      id: 'custom_missing_planned',
      en: 'I am ready',
      ru: 'Я готов',
      uk: 'Я готовий',
      es: 'Estoy listo',
      categoryId: 'custom',
      isSystem: false,
    };

    for (const locale of PLANNED_LOCALES) {
      expect(resolveFlashcardBackText(card, locale)).toBe('');
    }
  });

  it('keeps planned rich detail fields isolated from RU/UK/ES detail fallbacks', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'flashcards_swipe.tsx'), 'utf8');
    const plannedGuard = "if (['pt-BR', 'vi', 'id', 'tr', 'pl'].includes(lang)) return '';";
    const legacyDetailReturn = 'return s(ru) || s(uk) || s(es);';

    expect(source).toContain(plannedGuard);
    expect(source.indexOf(plannedGuard)).toBeLessThan(source.indexOf(legacyDetailReturn));
    expect(source).not.toContain('let fallback: { insertAt: number; prompt: Prompt } | null = null;');
    expect(source).not.toContain('const picked = fallback ??');
  });
});
