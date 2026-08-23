// Вписывает арт плиток главной для темы «Янтарь» в те же поля, что у всех
// остальных тем.
//
// зачем: владелец — «иконки на главной в теме Янтарь больше и даже за рамки
// вылезает». Замер подтвердил: у восьми тем рисунок занимает ровно 74% холста
// (190x~180 из 256), у «Янтаря» — 95-98%, то есть нарисован почти впритык к
// краю без полей. Плитка масштабирует холст целиком, поэтому янтарный рисунок
// выходит крупнее соседних и режется рамкой плитки. Ломались четыре ассета:
// home_menu lessons/cards/league и home_supporting_art phrase-of-day.
//
// Правим НЕ размер плитки в коде, а сами ассеты: плитка общая для всех тем и
// работает верно, дефект именно в четырёх картинках «Янтаря».
//
// Метод: содержимое ужимается так, чтобы его габарит стал равен целевой доле
// холста, и центрируется. Холст, его размер и прозрачный фон не меняются —
// значит вёрстка плитки не трогается вообще.
//
// Запуск:
//   node scripts/fix_ember_home_art_padding.mjs           (отчёт)
//   node scripts/fix_ember_home_art_padding.mjs --apply   (перезапись)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// Порог альфы, выше которого пиксель считается частью рисунка.
// зачем не 0: у артов мягкая тень с альфой 1-15, она тянется до самого края
// холста и без порога габарит всегда равнялся бы холсту.
const ALPHA_THRESHOLD = 16;

// Насколько ассет должен отличаться от медианы соседей, чтобы считаться битым.
const DRIFT_TOLERANCE = 0.06;

// Наборы, где у каждой темы своя папка с параллельными файлами.
const ASSET_SETS = [
  { dir: path.join(ROOT, 'assets', 'images', 'home_menu'), reference: 'midnight' },
  { dir: path.join(ROOT, 'assets', 'images', 'home_supporting_art'), reference: 'midnight' },
];

const BROKEN_THEME = 'ember';

const fillRatio = async (file) => {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  let minX = W, minY = H, maxX = -1, maxY = -1;
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (data[(y * W + x) * 4 + 3] > ALPHA_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return {
    W, H, minX, minY, maxX, maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    ratio: Math.max((maxX - minX + 1) / W, (maxY - minY + 1) / H),
  };
};

/** Имя вида ассета: home-<theme>-<kind>.webp -> kind */
const kindOf = (file, theme) => file.replace(`home-${theme}-`, '').replace(/\.webp$/, '');

const main = async () => {
  const apply = process.argv.includes('--apply');
  const planned = [];

  for (const set of ASSET_SETS) {
    if (!fs.existsSync(set.dir)) continue;
    const themes = fs.readdirSync(set.dir).filter((t) => {
      try { return fs.statSync(path.join(set.dir, t)).isDirectory(); } catch { return false; }
    });
    if (!themes.includes(BROKEN_THEME)) continue;

    console.log(`\n### ${path.relative(ROOT, set.dir)}`);

    const emberDir = path.join(set.dir, BROKEN_THEME);
    for (const file of fs.readdirSync(emberDir).filter((f) => f.endsWith('.webp'))) {
      const kind = kindOf(file, BROKEN_THEME);

      // Медиана доли заполнения по остальным темам — это и есть норма набора.
      const peers = [];
      for (const theme of themes) {
        if (theme === BROKEN_THEME) continue;
        const dir = path.join(set.dir, theme);
        const peer = fs.readdirSync(dir).find((f) => kindOf(f, theme) === kind);
        if (!peer) continue;
        const measured = await fillRatio(path.join(dir, peer));
        if (measured) peers.push(measured.ratio);
      }
      if (peers.length < 3) continue;
      peers.sort((a, b) => a - b);
      const target = peers[peers.length >> 1];

      const emberFile = path.join(emberDir, file);
      const current = await fillRatio(emberFile);
      if (!current) continue;

      const drift = current.ratio - target;
      const broken = drift > DRIFT_TOLERANCE;
      console.log(`  ${kind.padEnd(18)} янтарь ${(current.ratio * 100).toFixed(0)}% | норма ${(target * 100).toFixed(0)}%` +
        `${broken ? `  <<< ЧИНИМ (×${(target / current.ratio).toFixed(3)})` : ''}`);
      if (broken) planned.push({ emberFile, current, target, kind });
    }
  }

  if (!planned.length) {
    console.log('\nничего чинить не нужно');
    return;
  }
  if (!apply) {
    console.log(`\nк правке: ${planned.length} файлов (--apply чтобы записать)`);
    return;
  }

  console.log('');
  for (const { emberFile, current, target, kind } of planned) {
    const { W, H, minX, minY, width, height } = current;
    const scale = target / current.ratio;
    const newW = Math.max(1, Math.round(width * scale));
    const newH = Math.max(1, Math.round(height * scale));

    // Вырезаем рисунок, ужимаем и кладём в центр исходного холста.
    // Холст того же размера и с тем же прозрачным фоном — вёрстка не меняется.
    const source = fs.readFileSync(emberFile);
    const shrunk = await sharp(source)
      .extract({ left: minX, top: minY, width, height })
      .resize(newW, newH, { fit: 'fill', kernel: 'lanczos3' })
      .png()
      .toBuffer();

    const canvas = await sharp({
      create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    }).png().toBuffer();

    const out = await sharp(canvas)
      .composite([{ input: shrunk, left: Math.round((W - newW) / 2), top: Math.round((H - newH) / 2) }])
      .webp({ lossless: true, effort: 6 })
      .toBuffer();

    fs.writeFileSync(emberFile, out);
    const after = await fillRatio(emberFile);
    console.log(`  ${kind.padEnd(18)} -> ${(after.ratio * 100).toFixed(0)}%  (${path.relative(ROOT, emberFile)})`);
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
