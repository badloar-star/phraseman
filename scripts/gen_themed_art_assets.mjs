#!/usr/bin/env node
// зачем (ТЕМЫ 2.0, 2026-10-04): Metro подключает картинки только статическим require —
// путь к ещё не существующему файлу ломает сборку. Поэтому новые предметы 2.0 подключаются
// ЭТИМ скриптом по факту наличия файлов в assets/images/v2art/{dark,light}/:
//   <name>.webp         → основа предмета
//   <name>.accent.webp  → слой цветной детали (красится в цвет темы)
// Запуск: node scripts/gen_themed_art_assets.mjs        — пересобрать generated-файл
//         node scripts/gen_themed_art_assets.mjs --check — только проверить, что он актуален (для тестов/CI)
// Имена берутся из реестра (THEMED_ART_NAMES); файл с незнакомым именем — предупреждение, не ошибка.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artDir = path.join(root, 'assets', 'images', 'v2art');
const registryPath = path.join(root, 'components', 'theme', 'themed_art_registry.ts');
const outPath = path.join(root, 'components', 'theme', 'themed_art_assets.generated.ts');

export function knownNames() {
  const src = fs.readFileSync(registryPath, 'utf8');
  const block = src.match(/THEMED_ART_NAMES = \[([\s\S]*?)\] as const/);
  if (!block) throw new Error('[THEMED-ART] THEMED_ART_NAMES not found in registry');
  const names = new Set([...block[1].matchAll(/'([a-z0-9_]+)'/g)].map(m => m[1]));
  // Обложки уроков lesson_01…lesson_50 заданы диапазоном, а не списком.
  for (let i = 1; i <= 50; i += 1) names.add(`lesson_${String(i).padStart(2, '0')}`);
  return names;
}

export function scan(names) {
  const slots = new Map();
  const unknown = [];
  for (const brightness of ['dark', 'light']) {
    const dir = path.join(artDir, brightness);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).sort()) {
      const m = file.match(/^([a-z0-9_]+)(\.accent)?\.webp$/);
      if (!m) continue; // .glow.webp и прочие черновики не подключаем
      const [, name, accent] = m;
      if (!names.has(name)) { unknown.push(`${brightness}/${file}`); continue; }
      const key = `${brightness}${accent ? 'Accent' : ''}`;
      const entry = slots.get(name) ?? {};
      entry[key] = `../../assets/images/v2art/${brightness}/${file}`;
      slots.set(name, entry);
    }
  }
  return { slots, unknown };
}

export function render(slots) {
  const lines = [...slots.keys()].sort().map((name) => {
    const e = slots.get(name);
    const parts = ['dark', 'darkAccent', 'light', 'lightAccent']
      .filter(k => e[k])
      .map(k => `${k}: require('${e[k]}')`);
    return `  ${name}: { ${parts.join(', ')} },`;
  });
  return [
    '// АВТОГЕНЕРАЦИЯ: node scripts/gen_themed_art_assets.mjs — руками не править.',
    '// Новые предметы 2.0, которые реально лежат в assets/images/v2art/{dark,light}/.',
    "import type { ThemedArtSlots } from './themed_art_registry';",
    '',
    'export const THEMED_ART_GENERATED: Readonly<Partial<Record<string, ThemedArtSlots>>> = {',
    ...lines,
    '};',
    '',
  ].join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { slots, unknown } = scan(knownNames());
  for (const u of unknown) console.warn(`[THEMED-ART] неизвестное имя, пропущено: ${u}`);
  const next = render(slots);
  if (process.argv.includes('--check')) {
    const cur = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf8').replace(/\r\n/g, '\n') : '';
    if (cur !== next) { console.error('[THEMED-ART] generated-файл устарел: node scripts/gen_themed_art_assets.mjs'); process.exit(1); }
    console.log(`[THEMED-ART] ok: ${slots.size} предметов`);
  } else {
    fs.writeFileSync(outPath, next);
    console.log(`[THEMED-ART] записано ${slots.size} предметов → ${path.relative(root, outPath)}`);
  }
}
