// зачем (владелец 11.10: «пейвол почему-то не открывается… все пейволы должны быть контекстными всегда»):
// диспетчер /premium_modal в стор-сборке молча закрывает окно (rejectUnknown → dismiss), если context или source
// не из белого списка. Так ломался пуш «VIP заканчивается» ('notification_premium_expiry' не было в списках).
// Сторож проходит по КАЖДОЙ точке входа в коде и проверяет: context передан, а буквальные context/source — из списков.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { PREMIUM_CONTEXT_SET } from '../app/premium_context';
import { PAYWALL_SOURCE_VALUES } from '../app/paywall_entry_contract';

const ROOT = join(__dirname, '..');
const DIRS = ['app', 'components', 'hooks', 'modules'];
const LEGACY_CONTEXT_ALIASES = new Set(['ai_dialog', 'hall_of_fame']);
const SOURCES = new Set<string>(PAYWALL_SOURCE_VALUES);

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === 'node_modules' || name === 'dev') continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) {
      out.push(full);
    }
  }
}

/** Объект параметров вызова — от первой «{» после метки до парной «}». */
function objectAfter(source: string, from: number): string {
  const start = source.indexOf('{', from);
  if (start < 0) return '';
  let depth = 0;
  for (let i = start; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return '';
}

type EntryPoint = { file: string; line: number; params: string };

function collectEntryPoints(): EntryPoint[] {
  const files: string[] = [];
  for (const dir of DIRS) walk(join(ROOT, dir), files);
  const entries: EntryPoint[] = [];
  for (const file of files) {
    const rel = relative(ROOT, file).replace(/\\/g, '/');
    // Сам диспетчер, навигационный помощник и старый маршрут-переадресация пробрасывают чужие параметры.
    if (rel === 'app/premium_modal.tsx' || rel === 'app/premium_modal_v2.tsx'
      || rel === 'app/paywall_navigation.ts' || rel === 'app/navigation_back.ts') continue;
    const source = readFileSync(file, 'utf8');
    const patterns = [/pathname:\s*['"]\/premium_modal['"]/g, /openPremiumPaywall\(\s*\w+\s*,/g];
    for (const pattern of patterns) {
      for (const match of source.matchAll(pattern)) {
        const index = match.index ?? 0;
        const params = pattern.source.startsWith('pathname')
          ? objectAfter(source, source.indexOf('params', index))
          : objectAfter(source, index);
        entries.push({ file: rel, line: source.slice(0, index).split('\n').length, params });
      }
    }
  }
  return entries;
}

describe('пейвол: каждая точка входа передаёт контекст из белого списка', () => {
  const entries = collectEntryPoints();

  it('точки входа найдены', () => {
    expect(entries.length).toBeGreaterThan(30);
  });

  it('у каждой точки входа есть context', () => {
    const missing = entries.filter((entry) => !/\bcontext\b/.test(entry.params)).map((e) => `${e.file}:${e.line}`);
    expect(missing).toEqual([]);
  });

  it('буквальный context — из PREMIUM_CONTEXT_VALUES', () => {
    const bad = entries.flatMap((entry) => [...entry.params.matchAll(/context:\s*['"]([a-z0-9_]+)['"]/g)]
      .map((m) => m[1])
      .filter((value) => !PREMIUM_CONTEXT_SET.has(value as never) && !LEGACY_CONTEXT_ALIASES.has(value))
      .map((value) => `${entry.file}:${entry.line} context=${value}`));
    expect(bad).toEqual([]);
  });

  it('буквальный source — из PAYWALL_SOURCE_VALUES', () => {
    const bad = entries.flatMap((entry) => [...entry.params.matchAll(/source:\s*['"]([a-z0-9_]+)['"]/g)]
      .map((m) => m[1])
      .filter((value) => !SOURCES.has(value))
      .map((value) => `${entry.file}:${entry.line} source=${value}`));
    expect(bad).toEqual([]);
  });
});
