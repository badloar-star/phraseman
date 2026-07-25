import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const PLANNED_LANGS = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const CYRILLIC_RE = /[А-Яа-яЁёІіЇїЄєҐґ]/u;

describe('bot names locale runtime', () => {
  it('uses latin-only display names for planned locales', () => {
    (global as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;
    const {
      BOT_NAMES_LATIN,
      pickRandomBotNameForLang,
    } = require('../app/constants/bot_names') as typeof import('../app/constants/bot_names');

    expect(BOT_NAMES_LATIN.length).toBeGreaterThan(0);
    expect(BOT_NAMES_LATIN.some((name) => CYRILLIC_RE.test(name))).toBe(false);

    for (const lang of PLANNED_LANGS) {
      for (let i = 0; i < 20; i += 1) {
        expect(pickRandomBotNameForLang(lang)).not.toMatch(CYRILLIC_RE);
      }
    }
  });

  // зачем: тест проверял имена ботов в app/arena_game.tsx и app/arena_results.tsx —
  // оба экрана удалены вместе с Ареной. Живая проверка latin-only локалей выше остаётся.
});
