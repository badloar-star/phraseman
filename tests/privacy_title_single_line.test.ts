// зачем (координатор 12.10, кадр settings-gap-016): крупный заголовок экрана приватности переносился на две строки. Сжимать шрифт нельзя
// (правило владельца: без adjustsFontSizeToFit) — заголовок укорочен. Сторож меряет ширину по настоящему шрифту Inter Bold 34 (−0,5)
// и требует одну строку на самом узком телефоне: 360 dp − 2×20 поля = 320 dp.
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(__dirname, '..');
const screen = fs.readFileSync(path.join(root, 'app', 'privacy_settings.tsx'), 'utf8');

/** Ширина строки по таблицам cmap (формат 4) и hmtx, без кернинга. */
function makeMeasure(fontPath: string): (text: string, size: number, spacing: number) => number {
  const data = fs.readFileSync(fontPath);
  const tables = new Map<string, number>();
  const numTables = data.readUInt16BE(4);
  for (let i = 0; i < numTables; i += 1) {
    tables.set(data.toString('latin1', 12 + 16 * i, 16 + 16 * i), data.readUInt32BE(20 + 16 * i));
  }
  const units = data.readUInt16BE(tables.get('head')! + 18);
  const numMetrics = data.readUInt16BE(tables.get('hhea')! + 34);
  const hmtx = tables.get('hmtx')!;
  const advance = (gid: number) => data.readUInt16BE(hmtx + 4 * Math.min(gid, numMetrics - 1));
  const cmapOff = tables.get('cmap')!;
  let fmt4 = -1;
  for (let i = 0; i < data.readUInt16BE(cmapOff + 2); i += 1) {
    const sub = cmapOff + data.readUInt32BE(cmapOff + 8 + 8 * i);
    if (data.readUInt16BE(sub) === 4) { fmt4 = sub; break; }
  }
  if (fmt4 < 0) throw new Error('no cmap format 4');
  const seg = data.readUInt16BE(fmt4 + 6) / 2;
  const glyph = (cp: number): number => {
    for (let k = 0; k < seg; k += 1) {
      const end = data.readUInt16BE(fmt4 + 14 + 2 * k);
      if (cp > end) continue;
      const start = data.readUInt16BE(fmt4 + 16 + 2 * seg + 2 * k);
      if (cp < start) return 0;
      const delta = data.readInt16BE(fmt4 + 16 + 4 * seg + 2 * k);
      const roAddr = fmt4 + 16 + 6 * seg + 2 * k;
      const ro = data.readUInt16BE(roAddr);
      if (ro === 0) return (cp + delta) & 0xffff;
      const g = data.readUInt16BE(roAddr + ro + 2 * (cp - start));
      return g ? (g + delta) & 0xffff : 0;
    }
    return 0;
  };
  return (text, size, spacing) => {
    const chars = [...text];
    const raw = chars.reduce((sum, ch) => sum + (advance(glyph(ch.codePointAt(0)!)) / units) * size, 0);
    return raw + spacing * (chars.length - 1);
  };
}

describe('privacy screen title fits one line on every interface language', () => {
  const titleBlock = screen.slice(screen.indexOf('testID="privacy-settings-title"'), screen.indexOf('</Text>', screen.indexOf('testID="privacy-settings-title"')));
  const titles = [...titleBlock.matchAll(/(?:ru|uk|en|es|'pt-BR'|vi|id|tr|pl): '([^']+)'/g)].map((m) => m[1]);

  it('has a title for all 9 languages, 34 pt bold, no font shrinking', () => {
    expect(titles).toHaveLength(9);
    expect(titleBlock).toContain('fontSize: scaled(34)');
    expect(titleBlock).toContain("fontWeight: '700'");
    expect(screen).not.toContain('adjustsFontSizeToFit');
  });

  it('every title is narrower than 320 dp in Inter Bold 34 (360 dp phone minus 20 dp margins)', () => {
    const measure = makeMeasure(path.join(root, 'assets', 'fonts', 'Inter-Bold.ttf'));
    const tooWide = titles.map((t) => [t, Math.round(measure(t, 34, -0.5))] as const).filter(([, w]) => w > 320);
    expect(tooWide).toEqual([]);
    // калибровка: старый заголовок «Приватность и данные» действительно не помещался на Pixel 8 (372 dp)
    expect(measure('Приватность и данные', 34, -0.5)).toBeGreaterThan(372);
  });
});
