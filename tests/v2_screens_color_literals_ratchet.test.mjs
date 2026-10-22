// зачем (закон владельца 22.10: «ЦВЕТА СТРОГО ЦВЕТАМ И ОТТЕНКАМ ТЕКУЩЕЙ ТЕМЫ» — сильнее CSS макетов): храповик цветовых литералов в экранах 2.0.
// Отличие от theme_hardcoded_colors_ratchet: считает и .ts (токены, палитры сцен), и зоны, которые тот пропускает (components/home/**), и строки с «theme-exempt» —
// пометка не делает новый литерал невидимым. Число литералов по файлу может только падать; новый файл в зоне стартует с нуля.
// Нужен цвет — токен темы (liquidGlassTokens). Обновить базу после пачки замен: node tests/v2_screens_color_literals_ratchet.test.mjs --update
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BASELINE = join(ROOT, 'config', 'v2-screens-color-literals-baseline.json');
const ZONE = [
  'components/home', 'components/DailyPhraseCard.tsx', 'components/v2', 'modules/today-tasks',
  'modules/spire', 'components/spire', 'components/dialogs', 'components/learning-v2/season',
  'components/learning-v2/LearningV2ChaptersCourse.tsx', 'components/learning-v2/LearningV2ChapterExam',
  'components/learning-v2/learning_v2_task_theme_tokens.ts', 'components/streak', 'components/moments', 'components/friends_together',
  // зона «Друзья / лента / Сообщество» (координатор → 8 · МОМЕНТЫ, аудит 4 · ТЕМЫ 22.10): вкладки, визитка игрока, наборы сообщества
  'app/(tabs)/friends.tsx', 'app/(tabs)/community.tsx', 'components/friends', 'app/community_packs', 'app/community_pack_create.tsx',
  'components/PlayerProfileModal.tsx', 'components/profile-card',
];
const SKIP = /\.test\.|preview|fixtures|\.generated\.|v2_kit|KitLiquidGlass|plateTone/i;
const reHex = /#(?:[0-9A-Fa-f]{8}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{3,4})(?![0-9A-Za-z])/g;
const reRgb = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*[\d.]+)?\s*\)/g;

function files(rel) {
  let st;
  try { st = statSync(join(ROOT, rel)); } catch { return []; }
  if (st.isFile()) return [rel];
  if (st.isDirectory()) return readdirSync(join(ROOT, rel)).flatMap((n) => (n === 'node_modules' ? [] : files(`${rel}/${n}`)));
  return [];
}
// префиксные пути (LearningV2ChapterExam…) — все файлы папки, чьё имя начинается с префикса
function zoneFiles() {
  const out = new Set();
  for (const z of ZONE) {
    const dir = z.includes('/') ? z.slice(0, z.lastIndexOf('/')) : '.';
    const prefix = z.slice(z.lastIndexOf('/') + 1);
    for (const name of readdirSync(join(ROOT, dir))) {
      if (name === prefix || name.startsWith(prefix)) for (const f of files(`${dir}/${name}`)) out.add(f);
    }
  }
  return [...out].filter((f) => /\.(ts|tsx)$/.test(f) && !SKIP.test(f));
}

function count() {
  const res = {};
  for (const f of zoneFiles()) {
    let inBlock = false;
    let n = 0;
    for (const l of readFileSync(join(ROOT, f), 'utf8').replace(/\r\n/g, '\n').split('\n')) {
      const t = l.trim();
      if (inBlock) { if (t.includes('*/')) inBlock = false; continue; }
      if (t.startsWith('/*') && !t.includes('*/')) { inBlock = true; continue; }
      if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) continue;
      const code = l.replace(/\/\/.*$/, '');
      n += (code.match(reHex) || []).length + (code.match(reRgb) || []).length;
    }
    if (n > 0) res[f] = n;
  }
  return res;
}

const current = count();
const total = Object.values(current).reduce((a, b) => a + b, 0);

if (process.argv.includes('--update')) {
  writeFileSync(BASELINE, `${JSON.stringify({ total, files: current }, null, 2)}\n`);
  console.log(`v2 color literals baseline updated: ${total} in ${Object.keys(current).length} files`);
}

test('v2 screens: цветовые литералы (включая theme-exempt и .ts) не растут — цвета только из токенов текущей темы', () => {
  const base = JSON.parse(readFileSync(BASELINE, 'utf8').replace(/\r\n/g, '\n'));
  const grown = Object.entries(current).filter(([file, n]) => n > (base.files[file] ?? 0));
  assert.deepEqual(grown, [], `новые цветовые литералы в экранах 2.0: ${JSON.stringify(grown)} — берите токены темы (liquidGlassTokens); закон владельца 22.10`);
  assert.ok(total <= base.total, `всего ${total} > базы ${base.total}`);
});
