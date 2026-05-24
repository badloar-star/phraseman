import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const LEADERBOARD_SOURCE = fs.readFileSync(path.join(ROOT, 'app', 'arena_leaderboard.tsx'), 'utf8');
const LEADERBOARD_FETCH_SOURCE = fs.readFileSync(path.join(ROOT, 'app', 'arena_leaderboard_fetch.ts'), 'utf8');
const LOBBY_SOURCE = fs.readFileSync(path.join(ROOT, 'app', 'arena_lobby.tsx'), 'utf8');
const LEGACY_RUNTIME_RE =
  /\b(lang === 'ru'|lang === 'uk'|lang === 'es'|return\s+[^;\n]*(?:RU|UK|ES)\b|\?\?\s*[^;\n]*(?:RU|UK|ES)\b|fallback)\b/u;

describe('arena leaderboard planned locale runtime labels', () => {
  it('uses explicit rank tier names for planned interface locales', () => {
    expect(LEADERBOARD_SOURCE).toContain("'pt-BR': TIER_PTBR");
    expect(LEADERBOARD_SOURCE).toContain('vi: TIER_VI');
    expect(LEADERBOARD_SOURCE).toContain('id: TIER_ID');
    expect(LEADERBOARD_SOURCE).toContain('tr: TIER_TR');
    expect(LEADERBOARD_SOURCE).toContain('pl: TIER_PL');
    expect(LEADERBOARD_SOURCE).toContain("diamond: 'Diamante'");
    expect(LEADERBOARD_SOURCE).toContain("grandmaster: 'Đại cao thủ'");
    expect(LEADERBOARD_SOURCE).toContain("bronze: 'Perunggu'");
    expect(LEADERBOARD_SOURCE).toContain("silver: 'Gümüş'");
    expect(LEADERBOARD_SOURCE).toContain("master: 'Mistrz'");
  });

  it('keeps arena leaderboard runtime free of legacy locale fallback markers', () => {
    expect(LEADERBOARD_SOURCE).not.toMatch(LEGACY_RUNTIME_RE);
    expect(LEADERBOARD_FETCH_SOURCE).not.toMatch(LEGACY_RUNTIME_RE);
    expect(LOBBY_SOURCE).not.toMatch(LEGACY_RUNTIME_RE);
  });
});
