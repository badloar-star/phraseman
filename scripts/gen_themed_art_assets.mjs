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
import sharp from 'sharp';
import { accentAlignment } from './accent_alignment.mjs';

// зачем (координатор 15.10, [THEMED-ART-GUARD]): Codex положил в v2art фэнтези-башню по 1,7 МБ с нарисованной шахматкой вместо прозрачности — такое не должно
// попадать в сборку. Файл тяжелее 400 КБ или с непрозрачными углами (нет настоящей альфы) в реестр не регистрируется, причина пишется в журнал.
export const ART_MAX_BYTES = 400 * 1024;
const ART_CORNER_MAX_ALPHA = 16;

// зачем (координатор 12.10): слой .accent красится tintColor и обязан совпадать с деталью основы (scripts/accent_alignment.mjs). Сторож отвергает несовпавший слой
// (accent_misaligned). Файлы ниже — ИЗВЕСТНЫЙ ДОЛГ: лежат в assets до замены (аудит 12.10: intro_* — заглушки; слои lessons/dialogs/intro_cards_hub/intro_cards_swipe(тёмный) заменены вырезкой из основы 12.10 и из долга убраны).
// Список может только УМЕНЬШАТЬСЯ (убирать строку при замене слоя); добавлять сюда новое — нельзя, это отключает сторож.
export const ACCENT_MISALIGNED_DEBT = new Set([
  'light/intro_cards_swipe.accent.webp', // светлая стрелка не вырезается автоматически (сливается с тенью) — пересдача Codex
  'dark/intro_legacy_lessons.accent.webp', 'light/intro_legacy_lessons.accent.webp',
  // зачем (координатор 22.10): порог сторожа ужесточён до 12 %; эти два слоя от Codex дают 12,2 % и 13,4 % и ждут перерисовки — убрать из долга после замены
  'dark/mistakes_entry.accent.webp', 'dark/spire_rank_6.accent.webp',
]);

/** Проверка одного файла арта: { ok, reason }. Не бросает — причина отказа всегда в reason. */
export async function checkArtFile(file) {
  try {
    const bytes = fs.statSync(file).size;
    if (bytes > ART_MAX_BYTES) return { ok: false, reason: `размер ${Math.round(bytes / 1024)} КБ больше лимита ${ART_MAX_BYTES / 1024} КБ` };
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width, height } = info;
    const patch = Math.min(4, width, height);
    let maxCornerAlpha = 0;
    for (const [x0, y0] of [[0, 0], [width - patch, 0], [0, height - patch], [width - patch, height - patch]]) {
      for (let y = y0; y < y0 + patch; y += 1) for (let x = x0; x < x0 + patch; x += 1) maxCornerAlpha = Math.max(maxCornerAlpha, data[(y * width + x) * 4 + 3]);
    }
    if (maxCornerAlpha > ART_CORNER_MAX_ALPHA) return { ok: false, reason: `углы непрозрачные (альфа ${maxCornerAlpha}/255) — нет настоящей прозрачности (нарисованный фон или шахматка)` };
    return { ok: true, reason: `${Math.round(bytes / 1024)} КБ, углы прозрачны` };
  } catch (error) {
    return { ok: false, reason: `файл не читается: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/** Все кандидаты v2art, не прошедшие сторож: Map<'dark/name.webp', reason>. */
export async function rejectedArtFiles() {
  const rejected = new Map();
  for (const brightness of ['dark', 'light']) {
    const dir = path.join(artDir, brightness);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).sort()) {
      if (!/^([a-z0-9_]+)(\.accent)?\.webp$/.test(file)) continue;
      const verdict = await checkArtFile(path.join(dir, file));
      if (!verdict.ok) {
        rejected.set(`${brightness}/${file}`, verdict.reason);
        console.error(`[THEMED-ART-GUARD] отказ: ${brightness}/${file} — ${verdict.reason}`);
        continue;
      }
      const accentName = file.match(/^([a-z0-9_]+)\.accent\.webp$/)?.[1];
      if (accentName) {
        const baseFile = path.join(dir, `${accentName}.webp`);
        if (!fs.existsSync(baseFile)) continue; // слой без основы — предмет и так не соберётся; основа проверяется отдельно
        const align = await accentAlignment(baseFile, path.join(dir, file));
        if (!align.ok) {
          const key = `${brightness}/${file}`;
          if (ACCENT_MISALIGNED_DEBT.has(key)) console.warn(`[THEMED-ART-GUARD] долг ${key} — ${align.reason}`);
          else { rejected.set(key, align.reason); console.error(`[THEMED-ART-GUARD] отказ: ${key} — ${align.reason}`); }
        }
      }
    }
  }
  return rejected;
}

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

export function scan(names, exclude = new Set()) {
  const slots = new Map();
  const unknown = [];
  for (const brightness of ['dark', 'light']) {
    const dir = path.join(artDir, brightness);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).sort()) {
      const m = file.match(/^([a-z0-9_]+)(\.accent)?\.webp$/);
      if (!m) {
        // зачем (S2_clay 15.10): .glow.webp прежнего стиля генератор и экраны не читают — это мёртвый вес сборки, а не свечение; говорим вслух, а не молчим
        if (/\.glow\.webp$/.test(file)) console.warn(`[THEMED-ART] ${brightness}/${file}: .glow не подключается ни генератором, ни экранами — удалите из assets`);
        continue; // прочие черновики не подключаем
      }
      const [, name, accent] = m;
      if (exclude.has(`${brightness}/${file}`)) continue; // отвергнут сторожем [THEMED-ART-GUARD]
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
  const rejected = await rejectedArtFiles();
  const { slots, unknown } = scan(knownNames(), new Set(rejected.keys()));
  for (const u of unknown) console.warn(`[THEMED-ART] неизвестное имя, пропущено: ${u}`);
  const next = render(slots);
  if (process.argv.includes('--check')) {
    const cur = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf8').replace(/\r\n/g, '\n') : '';
    if (cur !== next) { console.error('[THEMED-ART] generated-файл устарел: node scripts/gen_themed_art_assets.mjs'); process.exit(1); }
    console.log(`[THEMED-ART] ok: ${slots.size} предметов`);
    if (rejected.size > 0) { console.error(`[THEMED-ART-GUARD] ${rejected.size} файл(ов) отвергнуто — уберите их из assets/images/v2art`); process.exit(1); }
  } else {
    fs.writeFileSync(outPath, next);
    console.log(`[THEMED-ART] записано ${slots.size} предметов → ${path.relative(root, outPath)}`);
  }
}
