// зачем (координатор 12.10, находка контраста «Авроры»): у градиентных тем в светлом оформлении сырой `accent` — пастель (1,0–1,8 на фоне/карточке), и графика, значки и текст,
// красящиеся им, невидимы с level ≈ 0,55–0,75. Для светлого есть глубокие токены: текст/значки → accentText, графика → accentBorder/progressGradient.
// Храповик: число таких мест (scripts/light_accent_graphics_scan.mjs) по файлам и в сумме может только уменьшаться; новое место ломает тест.
// Осознанное исключение — пометка `light-accent-ok: причина` в строке. Список мест и замен — docs/phraseman-2.0/LIGHT_ACCENT_GRAPHICS_AUDIT_2026-10-13.md.
import { execFileSync } from 'child_process';
import fs from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const baseline = JSON.parse(fs.readFileSync(join(ROOT, 'config', 'light-accent-graphics-baseline.json'), 'utf8')) as { total: number; counts: Record<string, number> };

const raw = execFileSync(process.execPath, [join(ROOT, 'scripts', 'light_accent_graphics_scan.mjs'), '--json'], { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
const current = JSON.parse(raw) as { total: number; counts: Record<string, number> };

describe('графика на сыром accent в светлой теме (храповик)', () => {
  it('в файле нет новых мест сверх базовой линии', () => {
    const grew = Object.entries(current.counts)
      .filter(([file, n]) => n > (baseline.counts[file] ?? 0))
      .map(([file, n]) => `${file}: ${n} > ${baseline.counts[file] ?? 0}`);
    expect(grew).toEqual([]);
  });

  it('общее число не растёт; уменьшилось — обновите базовую линию (config/light-accent-graphics-baseline.json)', () => {
    expect(current.total).toBeLessThanOrEqual(baseline.total);
    const shrank = Object.entries(baseline.counts).filter(([file, n]) => (current.counts[file] ?? 0) < n).map(([file, n]) => `${file}: было ${n}, стало ${current.counts[file] ?? 0}`);
    // сжатие — хорошо, но базовую линию подтягиваем сразу, иначе запас позволит вернуть старое место незаметно
    expect(shrank).toEqual([]);
  });

  it('документ аудита существует и называет число мест', () => {
    const doc = fs.readFileSync(join(ROOT, 'docs', 'phraseman-2.0', 'LIGHT_ACCENT_GRAPHICS_AUDIT_2026-10-13.md'), 'utf8');
    expect(doc).toContain('accentBorder');
    expect(doc).toMatch(/сейчас \*\*\d+\*\*/);
  });
});
