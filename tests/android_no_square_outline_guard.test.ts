/**
 * ПРЕДОХРАНИТЕЛЬ: на Android не должно появляться новых КВАДРАТОВ вокруг
 * скруглённых элементов.
 *
 * Класс бага: `elevation` на Android — это системный ViewOutlineProvider,
 * а не blur-тень. Форму он берёт ТОЛЬКО из непрозрачного background-drawable.
 * Если фон полупрозрачный (`rgba(...)`, `#RRGGBBAA`) или его рисует дочерний
 * слой (LinearGradient/Image), формы не видно — и система заливает
 * прямоугольник по bounding box. Отсюда светлый квадрат вокруг круглой плитки.
 * На iOS не воспроизводится: там тень строится по alpha-каналу слоя.
 *
 * зачем: владелец видел эти квадраты «почти везде» — на кнопках, пейволах и
 * онбординге. Разово починили 79 мест; этот тест не даёт им вернуться.
 *
 * Если тест упал — НЕ ослабляй его. Замени `elevation: N` на
 * `...noAndroidOutline` из constants/androidGlow.ts (и добавь импорт),
 * либо задай элементу НЕПРОЗРАЧНЫЙ backgroundColor.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const SCAN_DIRS = ['app', 'components'];
const SKIP = new Set(['node_modules', '.git', '.expo', 'android', 'ios', 'dist', 'build']);

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (SKIP.has(e.name)) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name)) out.push(p);
    }
  };
  walk(dir);
  return out;
}

/** Блок стиля вокруг позиции — со сбалансированными скобками (учитывает вложенный shadowOffset). */
function blockAround(src: string, idx: number): string | null {
  let depth = 0;
  let start = -1;
  for (let i = idx; i >= 0; i--) {
    const ch = src[i];
    if (ch === '}') depth++;
    else if (ch === '{') { if (depth === 0) { start = i; break; } depth--; }
  }
  if (start === -1) return null;
  depth = 0;
  for (let i = start; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return src.slice(start, i + 1); }
  }
  return null;
}

const isOpaqueBlack = (c: string) => /^(#0{3}|#0{6}|#0{6}ff|black)$/i.test(c.trim());
const isTranslucent = (v: string) => /rgba\(/i.test(v) || /^#[0-9a-fA-F]{8}$/.test(v.trim());

type Offender = { file: string; line: number; reason: string };

function findOffenders(): Offender[] {
  const offenders: Offender[] = [];
  const files = SCAN_DIRS.flatMap((d) => listSourceFiles(path.join(ROOT, d)));

  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    if (!src.includes('elevation')) continue;

    const re = /\belevation\s*:\s*([1-9]\d*)/g;
    let m: RegExpExecArray | null;
    const seen = new Set<number>();
    while ((m = re.exec(src))) {
      const block = blockAround(src, m.index);
      if (!block || seen.has(m.index)) continue;
      seen.add(m.index);

      const colorMatch = block.match(/shadowColor\s*:\s*['"`]([^'"`]+)['"`]/);
      const tinted = !!colorMatch && !isOpaqueBlack(colorMatch[1]!);

      const bgMatch = block.match(/backgroundColor\s*:\s*['"`]([^'"`]+)['"`]/);
      const hasOpaqueBg = !!bgMatch && !isTranslucent(bgMatch[1]!);

      const radiusMatch = block.match(/borderRadius\s*:\s*(\d+)/);
      const rounded = !!radiusMatch && Number(radiusMatch[1]) > 0;

      const line = src.slice(0, m.index).split('\n').length;
      const rel = path.relative(ROOT, file).split(path.sep).join('/');

      if (tinted) {
        offenders.push({ file: rel, line, reason: `цветное свечение shadowColor '${colorMatch![1]}' + elevation` });
      } else if (rounded && !hasOpaqueBg) {
        offenders.push({ file: rel, line, reason: `borderRadius ${radiusMatch![1]} + elevation без непрозрачного фона` });
      }
    }
  }
  return offenders;
}

describe('Android: нет квадратных outline вокруг скруглённых элементов', () => {
  it('ни один элемент со скруглением не использует elevation без непрозрачного фона', () => {
    const offenders = findOffenders();
    const report = offenders.map((o) => `  ${o.file}:${o.line} — ${o.reason}`).join('\n');
    expect(
      offenders.length === 0
        ? ''
        : `Найдены места, где Android нарисует КВАДРАТ вместо скруглённой тени:\n${report}\n\n` +
          'Почини: замени elevation на ...noAndroidOutline (constants/androidGlow.ts) ' +
          'или задай непрозрачный backgroundColor. Ослаблять этот тест нельзя.',
    ).toBe('');
  });
});
