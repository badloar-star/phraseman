#!/usr/bin/env node
// Монохромная иконка Android 13+ (themed icons) из цветного foreground.
//
// зачем (владелец, 2026-08-24): android-icon-monochrome.png был ПОБАЙТОВОЙ
// копией цветного foreground — система ждёт одноцветный силуэт, а получала
// полноцветный арт, из-за чего темизированная иконка выглядела грязно.
// Логотип (очки + усы) читается силуэтом, поэтому строим его программно:
// фигура отделяется от тёмного фона по яркости, заливается белым, альфа —
// мягкая маска фигуры. Цвет система подставит сама (белое = «чернила»).
//
// Безопасная зона: Android рисует монохром в том же адаптивном контейнере,
// что и foreground — видимая часть примерно центральные 66%. Исходный арт уже
// нарисован с полями, поэтому геометрию НЕ трогаем: тот же кадр 1024×1024,
// иначе силуэт «прыгнет» относительно цветной иконки.
//
// Usage:
//   node scripts/build_android_monochrome_icon.mjs            # превью в .codex-tmp
//   node scripts/build_android_monochrome_icon.mjs --write    # записать иконку

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');
sharp.cache(false);

const SOURCE = path.join(ROOT, 'assets/images/android-icon-foreground.png');
const TARGET = path.join(ROOT, 'assets/images/android-icon-monochrome.png');
const PREVIEW_DIR = path.join(ROOT, '.codex-tmp');

// Фон арта тёмный (яркость ~22/255), фигура золотая (~100–190). Порог 90
// проверен визуально на всех промежуточных значениях (42/70/90/110): ниже него
// в силуэт затекает фоновое свечение вокруг логотипа, выше — истончаются дужки.
const FIGURE_LUMA_MIN = 90;
// Замыкание закрывает точечные дыры от бликов; радиус мал, чтобы не заплыли
// просветы между дужкой и линзой.
const CLOSE_RADIUS = 3;
// зачем: разделить оправу и линзы по цвету НЕЛЬЗЯ — замер показал, что линза
// (sat 122) даже насыщеннее оправы (sat 103), это один золотой тон. Силуэт
// остаётся сплошным «штампом» — так и задумано в Android themed icons:
// система заливает его одним цветом, полутона внутри всё равно не передаются.
// Поэтому маска строится бинарно, а мягкость даёт только финальное сглаживание
// контура — серая дымка от бликов внутри фигуры недопустима.

const source = fs.readFileSync(SOURCE);
const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

// 1) Грубая маска по яркости: фигура светлее фона.
let mask = Buffer.alloc(width * height);
for (let p = 0, i = 0; p < width * height; p++, i += channels) {
  const luma = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  mask[p] = luma >= FIGURE_LUMA_MIN ? 1 : 0;
}

// 2) Морфологическое замыкание (дилатация → эрозия). Разделяем на проходы по X
// и Y: квадратное ядро за 4 линейных прохода вместо O(r²) на пиксель.
// зачем именно max/min: дилатация = максимум по окну, эрозия = минимум. Первая
// версия оперировала «искомым значением» и на эрозии инвертировала маску —
// силуэт превращался в кашу.
const sweep = (src, radius, useMax) => {
  const tmp = new Uint8Array(width * height);
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      let v = useMax ? 0 : 1;
      const from = Math.max(0, x - radius);
      const to = Math.min(width - 1, x + radius);
      for (let xx = from; xx <= to; xx++) {
        const s2 = src[row + xx];
        v = useMax ? (s2 > v ? s2 : v) : (s2 < v ? s2 : v);
      }
      tmp[row + x] = v;
    }
  }
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let v = useMax ? 0 : 1;
      const from = Math.max(0, y - radius);
      const to = Math.min(height - 1, y + radius);
      for (let yy = from; yy <= to; yy++) {
        const s2 = tmp[yy * width + x];
        v = useMax ? (s2 > v ? s2 : v) : (s2 < v ? s2 : v);
      }
      out[y * width + x] = v;
    }
  }
  return out;
};
mask = sweep(mask, CLOSE_RADIUS, true);   // дилатация — заклеить дыры от бликов
mask = sweep(mask, CLOSE_RADIUS, false);  // эрозия — вернуть исходный габарит

// 3) Сглаживание контура: лёгкое размытие маски убирает «пилу» от бинаризации,
// при этом внутри фигуры остаётся полная непрозрачность.
const binary = Buffer.alloc(width * height);
for (let p = 0; p < width * height; p++) binary[p] = mask[p] ? 255 : 0;
// зачем toColourspace('b-w'): sharp после blur отдавал raw в ТРЁХ каналах
// (3 145 728 байт вместо 1 048 576), и чтение его как одноканального
// превращало силуэт в кашу. Явно фиксируем ч/б пространство.
const alpha = await sharp(binary, { raw: { width, height, channels: 1 } })
  .blur(1.6)
  .toColourspace('b-w')
  .raw()
  .toBuffer();
if (alpha.length !== width * height) {
  throw new Error(`ожидали одноканальную альфу ${width * height} Б, получили ${alpha.length} Б`);
}

// Белые пиксели + посчитанная альфа: система перекрасит белое в цвет темы.
// зачем именно так: composite с blend 'dest-in' на сгенерированном фоне в sharp
// давал пустой результат — надёжнее собрать RGBA-буфер напрямую.
const rgba = Buffer.alloc(width * height * 4);
for (let p = 0; p < width * height; p++) {
  rgba[p * 4] = 255;
  rgba[p * 4 + 1] = 255;
  rgba[p * 4 + 2] = 255;
  rgba[p * 4 + 3] = alpha[p];
}
const monochrome = await sharp(rgba, { raw: { width, height, channels: 4 } })
  .png({ compressionLevel: 9, effort: 10 })
  .toBuffer();

let filled = 0;
for (let p = 0; p < width * height; p++) if (mask[p]) filled++;
const covered = filled / (width * height);

if (WRITE) {
  const tmp = `${TARGET}.tmp_mono`;
  fs.writeFileSync(tmp, monochrome);
  fs.renameSync(tmp, TARGET);
  console.log(`записано: ${path.relative(ROOT, TARGET)} — ${(monochrome.length / 1024).toFixed(0)} КБ`);
} else {
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });
  // Превью на двух подложках — так видно и силуэт, и края.
  // зачем вручную: sharp.composite поверх create-фона в этой версии давал
  // мусор (та же беда, что с dest-in выше), поэтому смешиваем сами.
  const side = 320;
  const small = await sharp(monochrome).resize(side, side).ensureAlpha().raw().toBuffer();
  for (const [name, bg] of [['dark', [30, 30, 34]], ['light', [235, 235, 240]]]) {
    const flat = Buffer.alloc(side * side * 3);
    for (let p = 0; p < side * side; p++) {
      const a = small[p * 4 + 3] / 255;
      for (let c = 0; c < 3; c++) {
        flat[p * 3 + c] = Math.round(small[p * 4 + c] * a + bg[c] * (1 - a));
      }
    }
    await sharp(flat, { raw: { width: side, height: side, channels: 3 } })
      .png()
      .toFile(path.join(PREVIEW_DIR, `monochrome_preview_${name}.png`));
  }
  console.log(`превью: .codex-tmp/monochrome_preview_{dark,light}.png — ${(monochrome.length / 1024).toFixed(0)} КБ`);
}
console.log(`фигура занимает ${(covered * 100).toFixed(1)}% кадра (норма для иконки — 30–60%)`);
