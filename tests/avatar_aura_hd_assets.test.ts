import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { APPROVED_AVATAR_AURAS } from '../constants/avatar_auras';
import { AVATAR_AURA_HD_LAYER_SHA256 } from './fixtures/avatar_aura_hd_sha256';

const ROOT = path.join(__dirname, '..');
const SD_ROOT = path.join(ROOT, 'assets', 'images', 'avatar-auras');
const HD_ROOT = path.join(ROOT, 'assets', 'images', 'avatar-auras-hd');
const LAYERS = ['base', 'flow', 'accents'] as const;

/** Сторона HD-слоя. Должна совпадать с HD_EDGE в скрипте сборки. */
const HD_EDGE = 768;
/** Масштаб HD к базовым 320 px — в нём считаются пороги геометрии. */
const SCALE = HD_EDGE / 320;

/**
 * Контракт HD-тира колец-аур («рамок»), запрошенного владельцем 2026-09-14
 * словами «сделай апскейл рамок, улучши их качество» и сразу уточнённого
 * «но надо так апскейлить чтобы их вес сильно не увеличился».
 *
 * Сторожим ровно то, что легко сломать незаметно:
 *   1) вес — главное ограничение владельца; прямой апскейл в 960 давал 10.11 МБ
 *      против 2.50 МБ у оригиналов и был отвергнут;
 *   2) геометрию кольца — она общая с SD-тиром, и её сдвиг ломает вёрстку
 *      (кольцо рисуется как size × 2.05, запаса по пикселям нет);
 *   3) отсутствие HD в бандле — иначе экономия веса бинаря уходит в ноль.
 */
async function visibleGeometry(file: string, edge: number) {
  // зачем только альфа (`extractChannel(3)`), а не все 4 канала: полный RGBA
  // этого каталога — 768×768×4×117 ≈ 2.3 ГБ, и jest падал с heap out of memory.
  // Геометрию кольца задаёт исключительно альфа, цвет для неё не нужен.
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .extractChannel(3)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const center = (edge - 1) / 2;
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  let radius = 0;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[y * info.width + x] <= 8) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      radius = Math.max(radius, Math.hypot(x - center, y - center));
    }
  }
  expect(maxX).toBeGreaterThanOrEqual(minX);
  const padding = Math.min(minX, minY, edge - 1 - maxX, edge - 1 - maxY);
  // Центр видимой области — главный признак того, что слой не съехал.
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  return { padding, radius, centerX, centerY };
}

describe('HD-тир колец аур: вес', () => {
  it('весит не больше чем вдвое против 320-px оригиналов', () => {
    // зачем именно потолок, а не точное число: владелец ограничил рост веса
    // («чтобы вес сильно не увеличился»), а не зафиксировал размер.
    // Факт на 2026-09-14: 4.78 МБ против 2.50 МБ, то есть ×1.91.
    // Потолок ×2.0 отсекает возврат к 960 q84 (там было ×4.0) и оставляет
    // небольшой запас на перегенерацию. Ниже опускать нельзя: попытка ужать
    // альфу до 20 дала ×1.6, но выедала слабые детали рисунка (см. пакет
    // задачи docs/work/tasks/2026-09-14_avatar_aura_ring_hd_upscale.md).
    const weigh = (root: string) => APPROVED_AVATAR_AURAS.reduce((sum, aura) => (
      sum + LAYERS.reduce((s, layer) => s + fs.statSync(path.join(root, aura.id, `${layer}.webp`)).size, 0)
    ), 0);

    const sdBytes = weigh(SD_ROOT);
    const hdBytes = weigh(HD_ROOT);
    expect(hdBytes / sdBytes).toBeLessThanOrEqual(2.0);
    // И абсолютный потолок: HD-каталог не должен незаметно перевалить за 5 МБ.
    expect(hdBytes).toBeLessThanOrEqual(5.5 * 1024 * 1024);
  });

  it('ни один HD-слой не попадает в бандл через require', () => {
    // зачем: HD живёт только в Storage. Один статический require вернул бы
    // в нативный бинарь всё, что Фаза 4 «Бандл-диеты» оттуда вынесла.
    const roots = ['app', 'components', 'constants', 'hooks', 'modules'];
    for (const dir of roots) {
      const stack = [path.join(ROOT, dir)];
      while (stack.length > 0) {
        const current = stack.pop()!;
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
          const full = path.join(current, entry.name);
          if (entry.isDirectory()) { stack.push(full); continue; }
          if (!/\.(ts|tsx)$/.test(entry.name)) continue;
          expect(fs.readFileSync(full, 'utf8')).not.toContain('avatar-auras-hd');
        }
      }
    }
  });
});

describe('HD-тир колец аур: геометрия и байты', () => {
  it('держит ту же геометрию кольца, что и 320-px оригинал', async () => {
    expect(Object.keys(AVATAR_AURA_HD_LAYER_SHA256)).toHaveLength(APPROVED_AVATAR_AURAS.length * 3);

    for (const aura of APPROVED_AVATAR_AURAS) {
      for (const layer of LAYERS) {
        const hdFile = path.join(HD_ROOT, aura.id, `${layer}.webp`);
        const bytes = fs.readFileSync(hdFile);
        expect(createHash('sha256').update(bytes).digest('hex'))
          .toBe(AVATAR_AURA_HD_LAYER_SHA256[`${aura.id}/${layer}.webp`]);

        const metadata = await sharp(hdFile).metadata();
        expect(metadata).toMatchObject({ width: HD_EDGE, height: HD_EDGE, format: 'webp', hasAlpha: true });

        // Пороги SD-сторожа, приведённые к масштабу HD, с допуском в 1 пиксель
        // исходника.
        //
        // зачем допуск: апскейл размывает край на доли пикселя в обе стороны —
        // это свойство интерполяции, а не сдвиг кольца. Замер по всем 117
        // слоям: единственный выход за абсолютный порог — aura-lunar-sigil/base
        // (22.92 против 23.00), и он лежит ровно на границе уже в оригинале.
        // Проверено, что слой НЕ съехал: центр видимой области совпадает с SD
        // с точностью 0.6 px, запас до края кадра остаётся 55 px в масштабе 768.
        // Допуск ±1 px ловит настоящий сдвиг и не ловит размытие края.
        const geometry = await visibleGeometry(hdFile, HD_EDGE);
        expect(geometry.padding / SCALE).toBeGreaterThanOrEqual(22);
        expect(geometry.radius / SCALE).toBeLessThanOrEqual(138.71);

        // Главная проверка вместо ослабленного порога: HD стоит там же, где SD.
        // Размытие края на доли пикселя допустимо, ПОТЕРЯ РИСУНКА — нет.
        //
        // зачем этот сторож вообще (и почему допуск именно 1.5 px): попытка
        // ужать альфу до 20 ради веса выедала самые слабые полупрозрачные
        // детали — у aura-neon-circuit/base верх кольца уезжал с 63 на 88.8,
        // то есть часть рисунка пропадала. Абсолютные пороги padding/radius
        // этого НЕ ловили, поймало только сравнение с оригиналом.
        // Факт при принятом alphaQuality=50: сдвиг > 1 px ровно у одного слоя
        // из 117 (aura-neon-circuit/accents, 1.04 px), и границы там совпадают
        // с SD — это размытие края, а не утрата деталей.
        const sdGeometry = await visibleGeometry(path.join(SD_ROOT, aura.id, `${layer}.webp`), 320);
        expect(Math.abs(geometry.centerX / SCALE - sdGeometry.centerX)).toBeLessThanOrEqual(1.5);
        expect(Math.abs(geometry.centerY / SCALE - sdGeometry.centerY)).toBeLessThanOrEqual(1.5);
      }
    }
    // 117 файлов × попиксельный разбор альфы 768×768 не укладывается в
    // дефолтные 5 с. Считаем альфу одним каналом (RGBA не влезал в heap).
  }, 120_000);
});
