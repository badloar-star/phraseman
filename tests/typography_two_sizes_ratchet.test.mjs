// зачем (D145, владелец 01.10): обычный текст — ровно 2 размера, 16 и 13; заголовки (≥19) — по макетам.
// Экранов сотни, переводим пачками. Этот сторож-«храповик» считает в коде размеры текста меньше 19,
// которые не 13 и не 16, и не даёт их числу расти: базу можно только уменьшать.
// Обновить базу после пачки: node tests/typography_two_sizes_ratchet.test.mjs --update
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeEol } from './helpers/read_source_esm.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BASELINE = join(ROOT, 'config', 'typography-two-sizes-baseline.json');
const DIRS = ['app', 'components', 'modules', 'constants'];
// Исключения D145: онбординг не трогаем (решение владельца), дев-экраны не видит пользователь.
const SKIP = [/(^|\/)dev\//, /onboarding/i, /CleanOnboarding/, /\.test\./, /_dev_/, /dev_hub/i, /motion_showcase/,
  // зачем (координатор 03.10, PM-026): витрины и лаборатории DEV Hub пользователь не видит —
  // их размеры не входят в шкалу D145 (dev-account, showcase, kit/authoring preview, smoke, lab, гибрид-таббар).
  /(^|\/)dev-/, /modes_showcase/, /_preview\.tsx$/, /_smoke\.tsx$/, /learning-v2-lab\//, /DevBotsSheet/, /TabBarHybridPreview/];
const ALLOWED = new Set([13, 16]);
// зачем (координатор §129, 04.10): исключение D145 «оси графиков и бейджи» — микроцифры, которым 13 физически
// не влезает (колонка 26 pt, бейдж на углу кнопки). Строка с пометкой «d145-micro: <причина>» не считается,
// но ТОЛЬКО в этих файлах: в любом другом файле пометка игнорируется, чтобы не стать лазейкой.
const MICRO_MARKER = /d145-micro:\s*\S/;
// зачем (владелец 11.10, прямое слово): мета видео-карточек (длительность/автор/число фраз) — 11 sp; только эти четыре файла.
const MICRO_FILES = new Set(['app/streak_stats.tsx', 'app/ai_dialog_session.tsx',
  'app/flashcards/VideoPackRow.tsx', 'components/youtube/YoutubePlaylistGridCard.tsx', 'components/youtube/YoutubeVideoCard.tsx', 'components/youtube/YoutubeVideoGridCard.tsx',
  // зачем (координатор 13.10, макет п.82, dialogs-028): значок «PLUS» на углу кнопки микрофона — бейдж на углу кнопки (§129), 10 px как в образце; помечена одна строка `d145-micro:`.
  'components/dialogs/DialogueV2SessionScreen.tsx']);
function lineAt(src, index) {
  const start = src.lastIndexOf('\n', index) + 1;
  const end = src.indexOf('\n', index);
  return src.slice(start, end === -1 ? undefined : end);
}

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { walk(p, out); continue; }
    if (/\.(tsx?|jsx?)$/.test(name)) out.push(p);
  }
  return out;
}

function offenders() {
  const counts = {};
  for (const d of DIRS) {
    for (const f of walk(join(ROOT, d), [])) {
      const rel = relative(ROOT, f).split(sep).join('/');
      if (SKIP.some((re) => re.test(rel))) continue;
      const src = normalizeEol(readFileSync(f, 'utf8'));
      let n = 0;
      for (const m of src.matchAll(/fontSize:\s*([0-9]+(?:\.[0-9]+)?)\b/g)) {
        const size = Number(m[1]);
        if (size >= 19 || ALLOWED.has(size)) continue;
        if (MICRO_FILES.has(rel) && MICRO_MARKER.test(lineAt(src, m.index))) continue;
        n++;
      }
      if (n > 0) counts[rel] = n;
    }
  }
  return counts;
}

const current = offenders();
const total = Object.values(current).reduce((a, b) => a + b, 0);

if (process.argv.includes('--update')) {
  writeFileSync(BASELINE, JSON.stringify({ total, files: current }, null, 2) + '\n');
  console.log(`typography baseline updated: ${total}`);
}

test('text sizes other than 16/13 (below title size) never grow — D145', () => {
  const base = JSON.parse(normalizeEol(readFileSync(BASELINE, 'utf8')));
  const grown = Object.entries(current).filter(([f, n]) => n > (base.files[f] ?? 0));
  assert.deepEqual(grown, [], `новые размеры текста кроме 16/13: ${JSON.stringify(grown)} — используйте 16 или 13 (D145)`);
  assert.ok(total <= base.total, `всего ${total} > базы ${base.total}`);
});

test('V2 type scale uses only 16/13 for text and regular/bold weights — D145', () => {
  const v2 = normalizeEol(readFileSync(join(ROOT, 'constants', 'v2Style.ts'), 'utf8'));
  const block = v2.slice(v2.indexOf('export const V2_TYPE'), v2.indexOf('} as const;', v2.indexOf('export const V2_TYPE')));
  for (const name of ['headline', 'body', 'subtitle', 'caption', 'overline']) {
    const line = block.split('\n').find((l) => l.trim().startsWith(`${name}:`)) ?? '';
    const size = Number((line.match(/fontSize: (\d+)/) ?? [])[1]);
    assert.ok(ALLOWED.has(size), `${name}: ${size}`);
    assert.match(line, /fontWeight: '(400|700)'/, `${name}: только обычный или жирный`);
  }
});
