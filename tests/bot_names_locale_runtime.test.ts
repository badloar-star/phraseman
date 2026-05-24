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

  it('keeps arena bot display names routed through the locale-aware picker', () => {
    const botNames = fs.readFileSync(path.join(ROOT, 'app', 'constants', 'bot_names.ts'), 'utf8');
    const arenaGame = fs.readFileSync(path.join(ROOT, 'app', 'arena_game.tsx'), 'utf8');
    const arenaResults = fs.readFileSync(path.join(ROOT, 'app', 'arena_results.tsx'), 'utf8');
    const legacyLocaleBranch = ["lang === 'es' ? pickRandom", 'BotNameEs()'].join('');

    expect(botNames).toContain('export function pickRandomBotNameForLang');
    expect(arenaGame).toContain('pickRandomBotNameForLang(lang)');
    expect(arenaResults).toContain('pickRandomBotNameForLang(lang)');
    expect(`${arenaGame}\n${arenaResults}`).not.toContain(legacyLocaleBranch);
    expect(arenaResults).not.toContain(`mockOppName${['Fall', 'back'].join('')}Ref`);
  });
});
