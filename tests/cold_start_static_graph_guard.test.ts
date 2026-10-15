// зачем (координатор 14.10, правило «новая работа ничего не замедляет»): при выключенном флаге moments_v3 блок «Сегодня» Главной не тянет на холодном старте тяжёлые модули колец
// (TodayRings, MomentCoin, слот колец): от карточки HomeV2TodayCard в СТАТИЧЕСКОМ графе импортов их нет — слот подключается require'ом только при включённом флаге.
// Граф: `import … from` / `export … from` (без `import type`) и require верхнего уровня; require внутри функции и динамический import() — ленивые, в граф не входят.
import fs from 'node:fs';
import path from 'node:path';
import { normalizeEol } from './helpers/read_source'; // зачем (координатор 05.10): на ПК владельца рабочая копия в CRLF — исходник читаем через normalizeEol

const ROOT = path.join(__dirname, '..').replace(/\\/g, '/') + '/';
const EXTS = ['.ts', '.tsx', '.js', '.jsx'];
const IMP = /^\s*(?:import|export)\s+(?!type\b)(?:[^;]*?\sfrom\s+)?['"]([^'"]+)['"]/gm;
const REQ_TOP = /^(?:const|let|var|export const)\s+[^=\n]*=\s*require\(['"]([^'"]+)['"]\)|^require\(['"]([^'"]+)['"]\)/gm;

function resolve(from: string, spec: string): string | null {
  const base = spec.startsWith('@/') ? ROOT + spec.slice(2) : spec.startsWith('.') ? path.posix.normalize(`${path.posix.dirname(from)}/${spec}`) : null;
  if (!base) return null;
  for (const cand of [base, ...EXTS.map((e) => base + e), ...EXTS.map((e) => `${base}/index${e}`)]) {
    if (fs.existsSync(cand) && fs.statSync(cand).isFile()) return cand;
  }
  return null;
}

function staticGraph(rootRel: string): Set<string> {
  const seen = new Set<string>();
  const queue = [ROOT + rootRel];
  while (queue.length) {
    const cur = queue.pop()!;
    if (seen.has(cur) || !/\.(ts|tsx|js|jsx)$/.test(cur)) continue;
    seen.add(cur);
    const src = normalizeEol(fs.readFileSync(cur, 'utf8')).replace(/^\s*\/\/.*$/gm, '');
    for (const m of src.matchAll(IMP)) { const r = resolve(cur, m[1]!); if (r) queue.push(r); }
    for (const m of src.matchAll(REQ_TOP)) { const r = resolve(cur, (m[1] ?? m[2])!); if (r) queue.push(r); }
  }
  return seen;
}

describe('холодный старт: новые модули моментов не тянутся статически блоком «Сегодня» при выключенном флаге', () => {
  const graph = staticGraph('components/home/v2/HomeV2TodayCard.tsx');
  const rel = [...graph].map((p) => p.replace(ROOT, ''));

  it('граф карточки не пуст (проверка не вхолостую)', () => {
    expect(rel.length).toBeGreaterThan(10);
    expect(rel).toContain('components/streak/moments/use_streak_colors.ts');
    expect(rel).toContain('components/streak/moments/use_moments_v3_flag.ts');
  });

  it('тяжёлых модулей колец и монеты в статическом графе нет', () => {
    for (const heavy of ['components/streak/moments/TodayRings.tsx', 'components/streak/moments/TodayRingsSlot.tsx', 'components/moments/MomentCoin.tsx', 'components/spire/moments/moments_effects.tsx', 'modules/sound_v2/sound_bank.ts', 'modules/sound_v2/catalog.ts']) {
      expect(`${heavy}: ${rel.includes(heavy)}`).toBe(`${heavy}: false`);
    }
  });

  it('слот колец подключается лениво (require внутри компонента, только при включённом флаге)', () => {
    const card = normalizeEol(fs.readFileSync(`${ROOT}components/home/v2/HomeV2TodayCard.tsx`, 'utf8'));
    expect(card).toContain("ringsOn ? (require('../../streak/moments/TodayRingsSlot')");
    expect(card).not.toMatch(/^import .*TodayRingsSlot/m);
  });
});
