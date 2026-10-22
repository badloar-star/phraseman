// зачем (закон владельца 22.10: «ЦВЕТА ДОЛЖНЫ БЫТЬ СТРОГО ЦВЕТАМИ И ОТТЕНКАМИ ТЕКУЩЕЙ ТЕМЫ»; координатор → 8 · МОМЕНТЫ): в окнах моментов
// и в дуэли друзей нет ни одного зашитого цвета — даже с пометкой «theme-exempt», которую допускает общий храповик.
// Нужный оттенок — токен темы (liquidGlassTokens через useShadowGlass / useSpirePalette) или colorWithAlpha(токен, α)
// (components/spire/moments/moment_glow_math.ts); нужного токена нет — попросить сессию «Темы», свой HEX не вводить.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIRS = [
  'components/moments',
  'components/spire/moments',
  'components/streak/moments',
  'components/lesson_moments',
  'components/coin_rank_moments',
  'components/dialog_moments',
];
const FILES = [
  'components/feedback/ComboMomentLayer.tsx',
  'components/friends_together/FriendEventMarker.tsx',
  'components/friends_together/FriendDuelChallengeSheet.tsx',
  'components/friends_together/FriendDuelIncomingSheet.tsx',
  'components/friends_together/FriendDuelIncomingHost.tsx',
  'components/friends_together/FriendDuelResultView.tsx',
  'components/friends_together/DuelVersus.tsx',
  'components/friends_together/DuelPhraseBoard.tsx',
  'components/friends_together/DuelPlayTopBar.tsx',
  'app/friends_duel.tsx',
];

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?)$/.test(name) && !/\.test\./.test(name)) out.push(p);
  }
  return out;
}

/** Код без комментариев: старые значения в пояснениях («прежде rgba(…)») — не цвет. */
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');

const LITERALS = [
  /(['"`])#(?:[0-9A-Fa-f]{8}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{3,4})\1/g, // '#FFF', "#FFFFFF", `#FFFFFF80`
  /#(?:[0-9A-Fa-f]{8}|[0-9A-Fa-f]{6})(?![0-9A-Za-z$])/g, // #FFFFFF внутри строки ('0 0 10px #FFFFFF')
  /rgba?\(\s*\d/g, // rgba(0,0,0,.5) — но не пересборка цвета темы rgb(${…})
  /(['"])(?:white|black)\1/g,
];

test('moment windows and the friends duel use only current-theme colours — no literals, not even theme-exempt', () => {
  const files = [
    ...DIRS.flatMap((d) => walk(join(ROOT, d), [])),
    ...FILES.map((f) => join(ROOT, f)).filter((f) => existsSync(f)),
  ];
  assert.ok(files.length > 60, `обход подозрительно мал: ${files.length}`);
  const found = [];
  for (const f of files) {
    const rel = relative(ROOT, f).split(sep).join('/');
    const code = stripComments(readFileSync(f, 'utf8').replace(/\r\n/g, '\n'));
    code.split('\n').forEach((line, i) => {
      for (const re of LITERALS) {
        re.lastIndex = 0;
        if (re.test(line)) {
          found.push(`${rel}:${i + 1}: ${line.trim().slice(0, 120)}`);
          break;
        }
      }
    });
  }
  assert.deepEqual(found, [], `зашитые цвета (берите токен темы или colorWithAlpha(токен, α)):\n${found.join('\n')}`);
});
