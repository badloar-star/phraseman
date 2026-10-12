// зачем ([R1-PAGE] координатор 15.10): приёмка стиля арта одной командой — сжатие до 400 КБ, сторож альфы, «всё или ничего», --dry-run ничего не пишет,
// заменяемое уезжает в _backup. Проверяется на синтетической папке стиля во временной директории (assets и реальные trials не трогаются).
import { execFileSync } from 'child_process';
import { join } from 'path';

const ROOT = join(__dirname, '..');

const PROBE = `
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { importStyle } from './scripts/import_art_style.mjs';
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'art-style-'));
const src = path.join(base, 'src');
const dest = path.join(base, 'dest');
const png = async (raw, w, h) => sharp(raw, { raw: { width: w, height: h, channels: 4 } }).webp({ lossless: true }).toBuffer();
const shape = (size) => { const b = Buffer.alloc(size * size * 4, 0); for (let y = size / 4; y < (size * 3) / 4; y += 1) for (let x = size / 4; x < (size * 3) / 4; x += 1) { const i = (y * size + x) * 4; b[i] = 255; b[i + 1] = 255; b[i + 2] = 255; b[i + 3] = 255; } return b; };
// градиент + слабый шум: без потерь тяжёлый (> 400 КБ), с потерями сжимается легко — как настоящая картинка
const noisy = () => { const b = Buffer.alloc(900 * 900 * 4); const r = crypto.randomBytes(900 * 900); for (let y = 0; y < 900; y += 1) for (let x = 0; x < 900; x += 1) { const i = (y * 900 + x) * 4; const n = r[y * 900 + x] & 15; b[i] = (x >> 2) + n; b[i + 1] = (y >> 2) + n; b[i + 2] = ((x + y) >> 3) + n; b[i + 3] = (x < 8 || x >= 892) && (y < 8 || y >= 892) ? 0 : 255; } return b; };
const put = (dir, name, buf) => { fs.mkdirSync(path.join(src, 'trials', dir.style, dir.b), { recursive: true }); fs.writeFileSync(path.join(src, 'trials', dir.style, dir.b, name), buf); };
// стиль OK: тяжёлая основа (шум, будет сжата), accent-силуэт, незнакомое имя
put({ style: 'OK', b: 'dark' }, 'lessons.webp', await png(noisy(), 900, 900));
put({ style: 'OK', b: 'dark' }, 'lessons.accent.webp', await png(shape(256), 256, 256));
put({ style: 'OK', b: 'dark' }, 'not_in_registry.webp', await png(shape(256), 256, 256));
// стиль BAD: годная основа + картинка с непрозрачными углами (шахматка)
put({ style: 'BAD', b: 'dark' }, 'dialogs.webp', await png(shape(256), 256, 256));
put({ style: 'BAD', b: 'dark' }, 'lessons.webp', await png(Buffer.alloc(256 * 256 * 4, 255), 256, 256));
// уже лежащая в dest версия, которую OK заменит
fs.mkdirSync(path.join(dest, 'dark'), { recursive: true });
fs.writeFileSync(path.join(dest, 'dark', 'lessons.webp'), Buffer.from('OLD'));
const list = (d) => (fs.existsSync(d) ? fs.readdirSync(d, { recursive: true }).map((f) => String(f).split(String.fromCharCode(92)).join('/')).sort() : []);
const out = {};
const log = console.log; const err = console.error; const warn = console.warn;
console.log = () => {}; console.error = () => {}; console.warn = () => {};
out.dry = (await importStyle({ style: 'OK', srcRoot: src, destRoot: dest, dryRun: true, gen: false })).map((p) => p.file);
out.afterDry = { oldIntact: fs.readFileSync(path.join(dest, 'dark', 'lessons.webp'), 'utf8') === 'OLD', files: list(dest) };
try { await importStyle({ style: 'BAD', srcRoot: src, destRoot: dest, dryRun: false, gen: false }); out.bad = 'no-error'; } catch (e) { out.bad = String(e.message); }
out.afterBad = list(dest);
try { await importStyle({ style: 'NOPE', srcRoot: src, destRoot: dest, dryRun: true, gen: false }); out.missing = 'no-error'; } catch (e) { out.missing = String(e.message); }
out.skipDry = (await importStyle({ style: 'OK', srcRoot: src, destRoot: dest, dryRun: true, gen: false, skip: ['lessons'] })).map((p) => p.file);
out.applied = (await importStyle({ style: 'OK', srcRoot: src, destRoot: dest, dryRun: false, gen: false })).map((p) => p.file);
out.sizeKb = Math.round(fs.statSync(path.join(dest, 'dark', 'lessons.webp')).size / 1024);
out.destFiles = list(path.join(dest, 'dark'));
out.backup = list(path.join(src, '_backup')).filter((f) => f.endsWith('.webp'));
console.log = log; console.error = err; console.warn = warn;
try { fs.rmSync(base, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch { /* временная папка — не повод падать */ }
process.stdout.write('PROBE_JSON' + JSON.stringify(out));
`;

describe('приёмка стиля арта scripts/import_art_style.mjs', () => {
  const raw = execFileSync(process.execPath, ['--input-type=module', '-e', PROBE], { cwd: ROOT, encoding: 'utf8', timeout: 180000, stdio: ['ignore', 'pipe', 'pipe'] });
  const out = JSON.parse(raw.slice(raw.indexOf('PROBE_JSON') + 'PROBE_JSON'.length));

  it('--dry-run перечисляет файлы, но ничего не записывает и не заменяет', () => {
    expect(out.dry.sort()).toEqual(['lessons.accent.webp', 'lessons.webp']);
    expect(out.afterDry.oldIntact).toBe(true);
    expect(out.afterDry.files).toEqual(['dark', 'dark/lessons.webp']);
  });

  it('«всё или ничего»: картинка с непрозрачными углами останавливает приёмку стиля без записи', () => {
    expect(out.bad).toMatch(/приёмка остановлена/);
    expect(out.afterBad).toEqual(['dark', 'dark/lessons.webp']);
  });

  // зачем (координатор 15.10): spire_tile Codex от 16:34 ещё не одобрен — приёмка очереди должна уметь исключить предмет по имени
  it('--skip исключает предмет по имени (и основу, и accent)', () => {
    expect(out.skipDry).toEqual([]);
  });

  it('несуществующий стиль — понятная ошибка со списком доступных', () => {
    expect(out.missing).toMatch(/стиль «NOPE» не найден/);
  });

  it('применение: тяжёлая основа сжата до ≤ 400 КБ, accent добавлен, незнакомое имя пропущено, прежняя версия в _backup', () => {
    expect(out.applied.sort()).toEqual(['lessons.accent.webp', 'lessons.webp']);
    expect(out.sizeKb).toBeLessThanOrEqual(400);
    expect(out.destFiles).toEqual(['lessons.accent.webp', 'lessons.webp']);
    expect(out.backup.some((f: string) => f.endsWith('dark/lessons.webp'))).toBe(true);
  });
});
