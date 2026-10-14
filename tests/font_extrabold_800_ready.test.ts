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
    expect(extra.names[5]).toBe(bold.names[5]);
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
