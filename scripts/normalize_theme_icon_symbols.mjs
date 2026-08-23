// Приводит видимый размер значков тем к одной величине на всех девяти иконках.
//
// зачем: владелец заметил, что «Янтарь» смотрится не как остальные темы. Замер
// показал разброс: большая сторона нарисованного значка (огонёк, корона, лист,
// молния) гуляет от 67 px («Золото») до 86 px («Нефрит») на холсте 144x144 —
// 28% разницы. Плитка рисует иконку через contentFit="cover", то есть тянет
// ВЕСЬ холст на квадрат одинаково для всех, поэтому абсолютный размер значка
// на холсте и есть его видимый размер.
//
// Метрика — большая сторона bbox значка, а не площадь заливки: площадь меряет
// плотность силуэта, а не размер (сплошной лист «Нефрита» даёт 47% залитых
// пикселей, ажурная ёлка «Тёмной» 8%, хотя на глаз они одного размера).
// Не годится и габарит В ДОЛЯХ ПЛАШКИ: по нему «Янтарь» идеален (75.5% при
// медиане 75%), но плашка «Янтаря» сама мелкая (96x98 против 110x114 у
// «Нефрита»), поэтому огонёк всё равно физически меньше — владелец видит это.
//
// Метод: масштабируется ИКОНКА ЦЕЛИКОМ внутри холста, вокруг центра значка.
// Плашка и значок едут вместе, ничего не вырезается.
//
// зачем именно так, а не вырезанием значка из плашки: попытка вырезать значок
// по цветовой маске и вклеить увеличенным ЛОМАЕТ картинку. У иконок объёмный
// рендер с бликами и мягкими тенями; маска прихватывает блик плашки, а
// затирание освободившегося места фоном оставляет рваные горизонтальные шрамы
// (проверено на «Нефрите» и «Оливе» — кольцо порвалось). Целиковый масштаб
// артефактов не даёт в принципе: пиксели не разрезаются.
//
// Плата за этот метод: плашка меняет размер вместе со значком. Это допустимо —
// плашки и так были разными (94..110 px), единого габарита у них никогда не
// было, а видимый размер значка важнее.
//
// Запуск:
//   node scripts/normalize_theme_icon_symbols.mjs            (отчёт, без записи)
//   node scripts/normalize_theme_icon_symbols.mjs --apply    (перезапись)
//   node scripts/normalize_theme_icon_symbols.mjs --dir <p>  (прогон на копии)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dirFlag = process.argv.indexOf('--dir');
const ICON_DIR = dirFlag !== -1 && process.argv[dirFlag + 1]
  ? path.resolve(process.argv[dirFlag + 1])
  : path.join(ROOT, 'assets', 'theme-icons');

// Доля плашки, отсекаемая с каждой стороны перед поиском значка.
// зачем: у плашек светлая каёмка и блик по краю; без отсечения они попадают
// в маску и bbox значка раздувается до размеров всей плашки.
const RIM_INSET = 0.12;

// Порог непохожести на фон плашки (сумма модулей по R+G+B, максимум 765).
// 130 отделяет значок от градиента плашки на всех девяти иконках.
const SYMBOL_DELTA = 130;

// Целевая большая сторона значка в пикселях холста 144x144.
// Замер до правки: 67..86, медиана 74 — это ровно «Янтарь». Берём медиану,
// чтобы правка была выравниванием вокруг сложившейся нормы, а не поголовным
// укрупнением набора.
const TARGET_SYMBOL_SPAN = 74;

// Предохранитель: после масштаба плашка должна помещаться в холст с зазором.
// Без него крупная плашка «Нефрита» при увеличении упёрлась бы в края и
// обрезалась.
const MAX_PLATE_SPAN = 138;

const readPixels = async (buffer) => {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
};

/** Габарит плашки — всё, что заметно непрозрачно. */
const findPlate = ({ data, width, height }) => {
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] >= 128) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
};

/** Габарит значка, посчитанный внутри плашки (для замера, не для вырезания). */
const findSymbol = ({ data, width, height }, plate) => {
  const x0 = Math.round(plate.minX + plate.width * RIM_INSET);
  const x1 = Math.round(plate.maxX - plate.width * RIM_INSET);
  const y0 = Math.round(plate.minY + plate.height * RIM_INSET);
  const y1 = Math.round(plate.maxY - plate.height * RIM_INSET);

  const at = (x, y) => {
    const i = (y * width + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };

  // Фон плашки — медиана по рамке внутренней области. Медиана, а не среднее:
  // рамка местами задевает значок, и пара попаданий не должна сдвинуть фон.
  const ring = [];
  for (let x = x0; x <= x1; x += 1) ring.push(at(x, y0), at(x, y1));
  for (let y = y0; y <= y1; y += 1) ring.push(at(x0, y), at(x1, y));
  const median = (channel) => {
    const sorted = ring.map((p) => p[channel]).sort((a, b) => a - b);
    return sorted[sorted.length >> 1];
  };
  const bg = [median(0), median(1), median(2)];

  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      if (data[(y * width + x) * 4 + 3] < 200) continue;
      const [r, g, b] = at(x, y);
      if (Math.abs(r - bg[0]) + Math.abs(g - bg[1]) + Math.abs(b - bg[2]) <= SYMBOL_DELTA) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
};

// Сколько проходов выравнивания делать.
// зачем больше одного: детектор значка работает по контрасту к фону плашки, и
// после масштабирования сглаженные края чуть меняют замер — часть иконок
// промахивается мимо цели на 2-10 px за один проход. Второй проход добирает
// остаток, третий обычно уже ничего не меняет и выходит по допуску.
const MAX_PASSES = 4;
// Допуск, при котором иконка считается выровненной и больше не трогается.
const SPAN_TOLERANCE = 1;

const main = async () => {
  const apply = process.argv.includes('--apply');
  const files = fs.readdirSync(ICON_DIR).filter((f) => f.endsWith('.webp')).sort();

  const measure = async () => {
    const rows = [];
    for (const file of files) {
      const full = path.join(ICON_DIR, file);
      const source = fs.readFileSync(full);
      const pixels = await readPixels(source);
      const plate = findPlate(pixels);
      const symbol = findSymbol(pixels, plate);
      const span = Math.max(symbol.width, symbol.height);
      rows.push({ file, full, source, pixels, plate, symbol, span });
    }
    return rows;
  };

  const name = (m) => m.file.replace('.webp', '').padEnd(15);
  const report = (rows, title) => {
    console.log(title);
    for (const m of [...rows].sort((a, b) => a.span - b.span)) {
      console.log(`  ${name(m)} плашка ${String(m.plate.width).padStart(3)}x${String(m.plate.height).padStart(3)}` +
        ` | значок ${String(m.symbol.width).padStart(3)}x${String(m.symbol.height).padStart(3)}` +
        ` | видимый размер ${String(m.span).padStart(3)}`);
    }
    const s = rows.map((m) => m.span);
    console.log(`  разброс ${Math.min(...s)}..${Math.max(...s)} = ${((Math.max(...s) / Math.min(...s) - 1) * 100).toFixed(0)}%`);
  };

  let measured = await measure();
  report(measured, 'ДО:');
  console.log(`\nЦель: видимый размер значка = ${TARGET_SYMBOL_SPAN} px (допуск ±${SPAN_TOLERANCE})\n`);

  for (let pass = 1; pass <= (apply ? MAX_PASSES : 1); pass += 1) {
    const pending = measured.filter((m) => Math.abs(m.span - TARGET_SYMBOL_SPAN) > SPAN_TOLERANCE);
    if (!pending.length) {
      console.log(`проход ${pass}: все в допуске, останов`);
      break;
    }
    console.log(`проход ${pass}: правим ${pending.length}`);

  for (const m of pending) {
    let scale = TARGET_SYMBOL_SPAN / m.span;

    const plateSpan = Math.max(m.plate.width, m.plate.height);
    const maxScale = MAX_PLATE_SPAN / plateSpan;
    let clamped = false;
    if (scale > maxScale) { scale = maxScale; clamped = true; }

    const delta = (scale - 1) * 100;
    console.log(`  ${name(m)} ×${scale.toFixed(3)} (${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%)${clamped ? '  [срезан: плашка упёрлась в холст]' : ''}`);

    if (!apply || Math.abs(scale - 1) < 0.005) continue;

    const { width: W, height: H } = m.pixels;
    const newW = Math.round(W * scale);
    const newH = Math.round(H * scale);

    // Масштабируем весь холст, затем возвращаем к 144x144, центрируя по ЗНАЧКУ
    // (а не по холсту): у части иконок значок смещён от центра, и центровка по
    // холсту увела бы его ещё дальше.
    const scaled = await sharp(m.source)
      .resize(newW, newH, { fit: 'fill', kernel: 'lanczos3' })
      .png()
      .toBuffer();

    const symCx = (m.symbol.minX + m.symbol.maxX) / 2 * scale;
    const symCy = (m.symbol.minY + m.symbol.maxY) / 2 * scale;
    // Окно 144x144 вокруг значка, вырезаемое из увеличенного холста.
    // При scale>1 холст больше рамки, поэтому вырезаем; при scale<1 — меньше,
    // поэтому доклеиваем прозрачные поля. Обе ветки — один и тот же extend+extract.
    const offsetX = Math.round(W / 2 - symCx);
    const offsetY = Math.round(H / 2 - symCy);

    const padLeft = Math.max(0, offsetX);
    const padTop = Math.max(0, offsetY);
    const padRight = Math.max(0, W - newW - offsetX);
    const padBottom = Math.max(0, H - newH - offsetY);

    const padded = await sharp(scaled)
      .extend({
        left: padLeft, top: padTop, right: padRight, bottom: padBottom,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    const out = await sharp(padded)
      .extract({ left: padLeft - offsetX, top: padTop - offsetY, width: W, height: H })
      .webp({ lossless: true, effort: 6 })
      .toBuffer();

    fs.writeFileSync(m.full, out);
  }

    if (!apply) break;
    measured = await measure();
  }

  if (apply) {
    console.log('');
    report(measured, 'ПОСЛЕ:');
  } else {
    console.log('\n(отчёт; --apply чтобы записать)');
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
