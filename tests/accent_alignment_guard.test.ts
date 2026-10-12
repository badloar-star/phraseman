// зачем (координатор 12.10): слой .accent обязан совпадать с деталью основы. Прежний сторож проверял размер и альфу, но не совпадение: лента lessons стояла на ~120 px
// ниже закладки, кружки dialogs — мимо точек. Здесь: (1) на синтетике совпавший слой проходит, сдвинутый — отказ accent_misaligned с цифрами;
// (2) ратчет долга: каждая строка ACCENT_MISALIGNED_DEBT обязана реально не проходить (заменили слой — строку убрать), новое в долг добавлять нельзя.
import { execFileSync } from 'child_process';
import { join } from 'path';

const ROOT = join(__dirname, '..');

const PROBE = `
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { accentAlignment } from './scripts/accent_alignment.mjs';
import { ACCENT_MISALIGNED_DEBT } from './scripts/gen_themed_art_assets.mjs';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'accent-align-'));
const W = 512;
// основа: тёмная плитка с зерном; светлая лента-деталь (узкий прямоугольник) и «корешки» — горизонтальные светлые полосы, через которые пройдёт сдвинутая лента
const base = Buffer.alloc(W * W * 4);
const noise = crypto.randomBytes(W * W);
for (let y = 0; y < W; y += 1) for (let x = 0; x < W; x += 1) {
  const i = (y * W + x) * 4;
  const n = noise[y * W + x] & 7;
  let v = 70 + n;
  if ((y >= 300 && y < 330) || (y >= 380 && y < 410)) v = 200 + n; // полосы-«страницы»
  const ribbon = x >= 230 && x < 280 && y >= 120 && y < 250;
  if (ribbon) v = 235 + (n >> 1);
  base[i] = v; base[i + 1] = v; base[i + 2] = v; base[i + 3] = x < 24 || x >= W - 24 ? 0 : 255;
}
const accent = (dy) => { const b = Buffer.alloc(W * W * 4, 0); for (let y = 120 + dy; y < 250 + dy; y += 1) for (let x = 230; x < 280; x += 1) { const i = (y * W + x) * 4; b[i] = 255; b[i + 1] = 255; b[i + 2] = 255; b[i + 3] = 255; } return b; };
const save = async (name, buf) => { const f = path.join(dir, name); await sharp(buf, { raw: { width: W, height: W, channels: 4 } }).webp({ lossless: true }).toFile(f); return f; };
const baseFile = await save('item.webp', base);
const good = await accentAlignment(baseFile, await save('good.accent.webp', accent(0)));
const shifted = await accentAlignment(baseFile, await save('shifted.accent.webp', accent(170)));
const debt = {};
const v2 = path.join(process.cwd(), 'assets', 'images', 'v2art');
for (const key of ACCENT_MISALIGNED_DEBT) {
  const [mode, file] = key.split('/');
  const accentFile = path.join(v2, mode, file);
  const baseF = path.join(v2, mode, file.replace('.accent.webp', '.webp'));
  if (!fs.existsSync(accentFile) || !fs.existsSync(baseF)) { debt[key] = 'нет файла'; continue; }
  debt[key] = (await accentAlignment(baseF, accentFile)).ok ? 'ok' : 'fail';
}
try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch { /* временная папка */ }
process.stdout.write('PROBE_JSON' + JSON.stringify({ good, shifted, debt }));
`;

describe('сторож совпадения .accent с основой (accent_misaligned)', () => {
  const raw = execFileSync(process.execPath, ['--input-type=module', '-e', PROBE], { cwd: ROOT, encoding: 'utf8', timeout: 180000, stdio: ['ignore', 'pipe', 'pipe'] });
  const out = JSON.parse(raw.slice(raw.indexOf('PROBE_JSON') + 'PROBE_JSON'.length));

  it('слой, вырезанный по детали основы, проходит', () => {
    expect(out.good.ok).toBe(true);
    expect(out.good.onOpaquePct).toBeGreaterThanOrEqual(90);
    expect(out.good.edgeAlignedPct).toBeGreaterThanOrEqual(60);
  });

  it('тот же слой, сдвинутый на 170 px вниз (через «страницы»), отвергается с цифрами', () => {
    expect(out.shifted.ok).toBe(false);
    expect(out.shifted.reason).toMatch(/accent_misaligned/);
    expect(out.shifted.reason).toMatch(/%/);
  });

  it('ратчет долга: в списке только реально не совпадающие слои (заменили слой — уберите строку)', () => {
    for (const [key, verdict] of Object.entries(out.debt)) {
      expect({ key, verdict: verdict === 'ok' ? 'ok' : 'fail-or-missing' }).toEqual({ key, verdict: 'fail-or-missing' });
    }
  });
});
