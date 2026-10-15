// зачем (решение координатора 14.10): добавление Inter ExtraBold (800) готово «кроме файла». Пока файла нет — тест фиксирует это и проходит; как только файл положили и применили
// docs/work/font-extrabold-800/apply.py — тест проверяет, что всё согласовано: файл настоящий (вес 800, та же версия, PostScript-имя), app.json (android + ios), карта весов, расхождение 800→700 ушло.
import fs from 'node:fs';
import path from 'node:path';
import { REGISTERED_INTER_WEIGHTS, mismatchedWeights, resolveRenderedInterWeight } from '../app/font_weights';

const ROOT = path.join(__dirname, '..');
const FONT = path.join(ROOT, 'assets/fonts/Inter-ExtraBold.ttf');

function nameAndWeight(file: string): { names: Record<number, string>; weight: number } {
  const d = fs.readFileSync(file);
  const num = d.readUInt16BE(4);
  const tabs: Record<string, number> = {};
  for (let i = 0; i < num; i += 1) tabs[d.toString('latin1', 12 + 16 * i, 16 + 16 * i)] = d.readUInt32BE(20 + 16 * i);
  const off = tabs.name!;
  const count = d.readUInt16BE(off + 2);
  const soff = d.readUInt16BE(off + 4);
  const names: Record<number, string> = {};
  for (let i = 0; i < count; i += 1) {
    const rec = off + 6 + 12 * i;
    const pid = d.readUInt16BE(rec);
    const nid = d.readUInt16BE(rec + 6);
    const len = d.readUInt16BE(rec + 8);
    const so = d.readUInt16BE(rec + 10);
    if (names[nid] !== undefined) continue;
    const raw = d.subarray(off + soff + so, off + soff + so + len);
    names[nid] = pid === 0 || pid === 3 ? Buffer.from(raw).swap16().toString('utf16le') : raw.toString('latin1');
  }
  return { names, weight: d.readUInt16BE(tabs['OS/2']! + 4) };
}

// зачем (решение координатора 15.10, вариант A): четыре файла репозитория — нехинтованная сборка Inter 4.001 (git-66647c0bb), в официальном архиве v4.1
// статические ttf — хинтованная сборка той же версии (git-9221beed3). Хеш сборки не сравниваем: «Version 4.001» + метрики строки + кириллица.
function metrics(file: string): { upm: number; asc: number; desc: number; gap: number; cyrillic: Set<number> } {
  const d = fs.readFileSync(file);
  const num = d.readUInt16BE(4);
  const tabs: Record<string, number> = {};
  for (let i = 0; i < num; i += 1) tabs[d.toString('latin1', 12 + 16 * i, 16 + 16 * i)] = d.readUInt32BE(20 + 16 * i);
  const cyrillic = new Set<number>();
  const cmap = tabs.cmap!;
  const n = d.readUInt16BE(cmap + 2);
  for (let i = 0; i < n; i += 1) {
    const pid = d.readUInt16BE(cmap + 4 + 8 * i);
    const eid = d.readUInt16BE(cmap + 6 + 8 * i);
    if (!((pid === 3 && eid === 1) || (pid === 3 && eid === 10))) continue;
    const sub = cmap + d.readUInt32BE(cmap + 8 + 8 * i);
    const fmt = d.readUInt16BE(sub);
    if (fmt === 12) {
      const groups = d.readUInt32BE(sub + 12);
      for (let g = 0; g < groups; g += 1) {
        const s = d.readUInt32BE(sub + 16 + 12 * g);
        const e = d.readUInt32BE(sub + 20 + 12 * g);
        for (let c = Math.max(s, 0x400); c <= Math.min(e, 0x4ff); c += 1) cyrillic.add(c);
      }
    } else if (fmt === 4) {
      const seg = d.readUInt16BE(sub + 6) / 2;
      for (let g = 0; g < seg; g += 1) {
        const e = d.readUInt16BE(sub + 14 + 2 * g);
        const s = d.readUInt16BE(sub + 16 + 2 * seg + 2 * g);
        for (let c = Math.max(s, 0x400); c <= Math.min(e, 0x4ff); c += 1) cyrillic.add(c);
      }
    }
  }
  return {
    upm: d.readUInt16BE(tabs.head! + 18),
    asc: d.readInt16BE(tabs.hhea! + 4),
    desc: d.readInt16BE(tabs.hhea! + 6),
    gap: d.readInt16BE(tabs.hhea! + 8),
    cyrillic,
  };
}

describe('Inter ExtraBold (800): готовность', () => {
  if (!fs.existsSync(FONT)) {
    it('файл ещё не добавлен (ждём слова владельца): сейчас 800 рисуется как 700, это зафиксировано картой весов', () => {
      expect(REGISTERED_INTER_WEIGHTS).not.toContain(800);
      expect(resolveRenderedInterWeight('800')).toBe(700);
      expect(fs.existsSync(path.join(ROOT, 'docs/work/font-extrabold-800/apply.py'))).toBe(true); // правка готова к применению
    });
    return;
  }

  it('файл настоящий: вес 800, версия как у остальных начертаний, PostScript-имя Inter-ExtraBold', () => {
    const extra = nameAndWeight(FONT);
    const bold = nameAndWeight(path.join(ROOT, 'assets/fonts/Inter-Bold.ttf'));
    expect(extra.weight).toBe(800);
    expect(extra.names[5]!.split(';')[0]).toBe(bold.names[5]!.split(';')[0]); // «Version 4.001»; хеш сборки после «;» не сравниваем
    const a = metrics(FONT);
    const b = metrics(path.join(ROOT, 'assets/fonts/Inter-Bold.ttf'));
    expect([a.upm, a.asc, a.desc, a.gap]).toEqual([b.upm, b.asc, b.desc, b.gap]);
    expect(a.cyrillic.size).toBeGreaterThanOrEqual(Math.floor(b.cyrillic.size * 0.95));
    for (const cp of [0x0416, 0x0430, 0x044f, 0x0451]) expect(a.cyrillic.has(cp)).toBe(true);
    expect(extra.names[6]).toBe('Inter-ExtraBold');
  });

  it('app.json: android (вес 800) и ios содержат файл; карта весов знает 800 и расхождения 800→700 больше нет', () => {
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8')) as { expo: { plugins: unknown[] } };
    const plugin = app.expo.plugins.find((e) => Array.isArray(e) && e[0] === 'expo-font') as [string, { android: { fonts: Array<{ fontDefinitions: Array<{ path: string; weight: number }> }> }; ios: string[] }];
    expect(plugin[1].android.fonts[0]!.fontDefinitions).toContainEqual({ path: './assets/fonts/Inter-ExtraBold.ttf', weight: 800 });
    expect(plugin[1].ios).toContain('./assets/fonts/Inter-ExtraBold.ttf');
    expect(REGISTERED_INTER_WEIGHTS).toContain(800);
    expect(mismatchedWeights().some(([wanted]) => wanted === 800)).toBe(false);
    expect(resolveRenderedInterWeight('800')).toBe(800);
  });
});
