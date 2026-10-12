// зачем (координатор 15.10, [THEMED-ART-GUARD]): в v2art не должны попадать файлы тяжелее 400 КБ и картинки без настоящей прозрачности (нарисованная шахматка) —
// Codex уже положил такие по 1,7 МБ. Сторож живёт в генераторе реестра; здесь он проверяется на синтетических картинках и на всех файлах репозитория.
import { execFileSync } from 'child_process';
import { join } from 'path';

const ROOT = join(__dirname, '..');

const PROBE = `
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { checkArtFile, rejectedArtFiles, ART_MAX_BYTES } from './scripts/gen_themed_art_assets.mjs';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'art-guard-'));
const size = 256;
const transparentCorners = Buffer.alloc(size * size * 4, 0);
for (let y = 64; y < 192; y += 1) for (let x = 64; x < 192; x += 1) { const i = (y * size + x) * 4; transparentCorners[i] = 200; transparentCorners[i + 1] = 120; transparentCorners[i + 2] = 40; transparentCorners[i + 3] = 255; }
const checker = Buffer.alloc(size * size * 4, 255);
for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) { const i = (y * size + x) * 4; const v = ((x >> 4) + (y >> 4)) % 2 ? 235 : 255; checker[i] = v; checker[i + 1] = v; checker[i + 2] = v; checker[i + 3] = 255; }
const noise = Buffer.alloc(900 * 900 * 4);
crypto.randomFillSync(noise);
for (let y = 0; y < 900; y += 1) for (let x = 0; x < 900; x += 1) { const corner = (x < 8 || x >= 892) && (y < 8 || y >= 892); noise[(y * 900 + x) * 4 + 3] = corner ? 0 : 255; } // зачем: настоящий шум (не сжимается) и прозрачные углы — тяжёлый, но «честный» по альфе файл
const write = async (name, raw, w, h, opts) => { const f = path.join(dir, name); await sharp(raw, { raw: { width: w, height: h, channels: 4 } }).webp(opts).toFile(f); return f; };
const good = await write('good.webp', transparentCorners, size, size, { lossless: true });
const bad = await write('checker.webp', checker, size, size, { lossless: true });
const heavy = await write('heavy.webp', noise, 900, 900, { lossless: true });
const out = { limit: ART_MAX_BYTES, heavyBytes: fs.statSync(heavy).size, good: await checkArtFile(good), checker: await checkArtFile(bad), heavy: await checkArtFile(heavy), missing: await checkArtFile(path.join(dir, 'nope.webp')) };
const repo = await rejectedArtFiles();
out.repoRejected = [...repo.entries()];
fs.rmSync(dir, { recursive: true, force: true });
process.stdout.write('PROBE_JSON' + JSON.stringify(out));
`;

describe('сторож арта 2.0 [THEMED-ART-GUARD]', () => {
  const raw = execFileSync(process.execPath, ['--input-type=module', '-e', PROBE], { cwd: ROOT, encoding: 'utf8', timeout: 120000, stdio: ['ignore', 'pipe', 'pipe'] });
  const out = JSON.parse(raw.slice(raw.indexOf('PROBE_JSON') + 'PROBE_JSON'.length));

  it('годная картинка (прозрачные углы, малый вес) проходит', () => {
    expect(out.good.ok).toBe(true);
  });

  it('картинка с непрозрачными углами (нарисованная шахматка) отвергается с причиной', () => {
    expect(out.checker.ok).toBe(false);
    expect(out.checker.reason).toMatch(/углы непрозрачные/);
  });

  it('файл тяжелее 400 КБ отвергается с причиной', () => {
    expect(out.limit).toBe(400 * 1024);
    expect(out.heavyBytes).toBeGreaterThan(out.limit);
    expect(out.heavy.ok).toBe(false);
    expect(out.heavy.reason).toMatch(/больше лимита/);
  });

  it('нечитаемый файл отвергается, а не роняет сторож', () => {
    expect(out.missing.ok).toBe(false);
    expect(out.missing.reason).toMatch(/не читается/);
  });

  it('в репозитории (assets/images/v2art) нет ни одного отвергнутого файла', () => {
    expect(out.repoRejected).toEqual([]);
  });
});
