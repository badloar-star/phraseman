// ════════════════════════════════════════════════════════════════════════════
// season_pass_spine_continuity.test.ts — хребет дорожки обязан быть сплошным
// И не крашить нативный SVG-парсер.
//
// зачем 2026-08-03 (владелец, со скриншотом: «эта линия должна быть сплошная и
// непрерывная»): строка дорожки рисовала кривую prevOffset → curOffset →
// nextOffset, то есть заканчивалась на X СЛЕДУЮЩЕГО узла. Следующая строка
// начиналась со своего prevOffset — X узла над ней. Эти координаты не
// совпадали, и на каждом стыке строк линия скакала вбок на 10-17 px.
//
// зачем 2026-08-03 (владелец, скриншот РЕАЛЬНОГО краша приложения:
// «UnexpectedData: C 17.28 81, 19.68 81, 17.28 108» в RNSVGPathParser): прошлая
// версия этого теста ТРЕБОВАЛА, чтобы spineBottomHalfPath начиналась с `C` без
// `M` (`bottom.trim().startsWith('C')`) — то есть зафиксировала баг как
// контракт, а не поймала его. spineBottomHalfPath используется в
// season_pass.tsx И самостоятельно (золотая подсветка «пройденного низа»
// строки, отдельный <Path>), а path без ведущего moveto — синтаксически
// невалиден для RNSVGPathParser: он требует `M` первой командой и крашится,
// если её нет. Браузерный парсер такое прощает (продолжение subpath), нативный
// iOS — нет. Отсюда и разрыв на два симптома: видимый на скриншоте «излом у
// узла» (конкатенация двух M-путей — два independent subpath без общей
// касательной) и полный краш экрана (spineBottomHalfPath в одиночку).
//
// Тест проверяет: (1) каждый path валиден САМ ПО СЕБЕ — начинается с `M`;
// (2) геометрию — конец строки N обязан совпадать с началом строки N+1 для
// любой последовательности наград; (3) что склеенный путь строки — ОДНА
// гладкая кривая (spineFullRowPath), а не два независимых subpath.
// ════════════════════════════════════════════════════════════════════════════
import {
  spineBottomHalfPath,
  spineFullRowPath,
  spineTopHalfPath,
  spineTrackPath,
  spineTrackProgressPath,
  spineWaveOffsetForKind,
} from '../app/season_pass_spine';
import { SEASON_TRACK } from '../app/season_pass_track_config';

const NODE_COLUMN_WIDTH = 56;
const ROW_HEIGHT = 108;
const CX = NODE_COLUMN_WIDTH / 2;
const HALF_H = ROW_HEIGHT / 2;

/** Первая координата пути `M x y ...`. */
function pathStartX(d: string): number {
  const match = /^M\s+([-\d.]+)\s/.exec(d.trim());
  if (!match) throw new Error(`нет команды M в пути: ${d}`);
  return Number(match[1]);
}

/** Последняя пара координат пути — точка, где линия физически заканчивается. */
function pathEndX(d: string): number {
  const numbers = d.match(/-?\d+(?:\.\d+)?/g);
  if (!numbers || numbers.length < 2) throw new Error(`нет координат в пути: ${d}`);
  return Number(numbers[numbers.length - 2]);
}

/**
 * Число команд `M` (moveto) в path-строке — количество независимых subpath.
 * Гладкая непрерывная кривая обязана иметь РОВНО ОДНУ.
 */
function moveCommandCount(d: string): number {
  return (d.match(/M/g) ?? []).length;
}

/** Смещение узла дорожки — та же формула, что в рендере строки. */
function offsetOf(index: number): number {
  const node = SEASON_TRACK[index];
  return spineWaveOffsetForKind(node?.pass?.kind ?? node?.free?.kind);
}

function rowGeometry(index: number) {
  const prevOffset = index > 0 ? offsetOf(index - 1) : offsetOf(index);
  const curOffset = offsetOf(index);
  const nextOffset = index < SEASON_TRACK.length - 1 ? offsetOf(index + 1) : curOffset;
  return {
    top: spineTopHalfPath(CX, HALF_H, prevOffset, curOffset),
    bottom: spineBottomHalfPath(CX, HALF_H, ROW_HEIGHT, curOffset, nextOffset),
    full: spineFullRowPath(CX, HALF_H, ROW_HEIGHT, prevOffset, curOffset, nextOffset),
  };
}

describe('хребет сезонной дорожки', () => {
  test('дорожка не пуста — есть что проверять', () => {
    expect(SEASON_TRACK.length).toBeGreaterThan(1);
  });

  test('КАЖДЫЙ path валиден сам по себе — начинается с M (иначе краш RNSVGPathParser)', () => {
    // Это ловит именно класс бага из краш-лога: spineBottomHalfPath
    // используется в season_pass.tsx как САМОСТОЯТЕЛЬНЫЙ d золотой подсветки,
    // а не только как хвост склейки. Без своего M она невалидна.
    for (let index = 0; index < SEASON_TRACK.length; index += 1) {
      const { top, bottom, full } = rowGeometry(index);
      expect(top.trim().startsWith('M')).toBe(true);
      expect(bottom.trim().startsWith('M')).toBe(true);
      expect(full.trim().startsWith('M')).toBe(true);
    }
  });

  test('строка целиком — ОДНА гладкая кривая, не два независимых subpath', () => {
    // зачем: конкатенация двух M-путей визуально давала излом ровно в точке
    // узла (две независимые касательные вместо одной). spineFullRowPath строит
    // путь с ОДНИМ M и общей симметричной точкой — гладкость по построению.
    for (let index = 0; index < SEASON_TRACK.length; index += 1) {
      expect(moveCommandCount(rowGeometry(index).full)).toBe(1);
    }
  });

  test('верхняя и нижняя половины строки стыкуются в узле', () => {
    for (let index = 0; index < SEASON_TRACK.length; index += 1) {
      const { top } = rowGeometry(index);
      expect(pathEndX(top)).toBeCloseTo(CX + offsetOf(index), 5);
    }
  });

  test('КОНЕЦ строки совпадает с НАЧАЛОМ следующей — линия не рвётся', () => {
    for (let index = 0; index < SEASON_TRACK.length - 1; index += 1) {
      const endX = pathEndX(rowGeometry(index).full);
      const startX = pathStartX(rowGeometry(index + 1).full);
      expect(endX).toBeCloseTo(startX, 5);
    }
  });

  test('кривая не вылезает за колонку узла', () => {
    // Полуширина колонки 28; линия толщиной 4 не должна касаться карточек наград.
    const limit = NODE_COLUMN_WIDTH / 2 - 4;
    for (let index = 0; index < SEASON_TRACK.length; index += 1) {
      const coordinates = rowGeometry(index).full.match(/-?\d+(?:\.\d+)?/g) ?? [];
      // Чётные позиции — X, нечётные — Y; проверяем только X.
      coordinates.forEach((value, position) => {
        if (position % 2 !== 0) return;
        const x = Number(value);
        expect(Math.abs(x - CX)).toBeLessThanOrEqual(limit);
      });
    }
  });

  test('одинаковые награды дают одинаковый изгиб — картинка стабильна', () => {
    // Изгиб детерминирован по kind: один и тот же подарок всегда одна волна,
    // без случайного дребезга между перерендерами.
    expect(spineWaveOffsetForKind('pearls')).toBe(spineWaveOffsetForKind('pearls'));
    expect(spineWaveOffsetForKind(undefined)).toBe(0);
  });
});

/**
 * зачем 2026-08-03 (владелец, СНОВА со скриншотом — «линия прерывается на
 * КАЖДОМ подарке» — уже ПОСЛЕ того, как spineFullRowPath сделала гладкой
 * геометрию ВНУТРИ одной строки): экран рисовал хребет как 60 независимых
 * <Svg>-полотен, по одному на renderItem FlatList. Даже с идеально гладкой
 * кривой внутри каждого полотна между СОСЕДНИМИ SVG-канвасами нет физической
 * связи — разный антиалиасинг края, округление субпикселей соседних View,
 * непредсказуемый порядок монтирования строк. Линия читалась рваной не из-за
 * формулы (та была верна для КАЖДОЙ отдельной строки), а потому что кривых
 * было 60, а не 1.
 *
 * spineTrackPath — доказательство того, что теперь линия ФИЗИЧЕСКИ одна: если
 * весь путь через N узлов даёт РОВНО одну команду `M`, разрыва между строками
 * не может быть в принципе — SVG не умеет прерывать одну незакрытую кривую
 * посередине без явной новой M.
 */
describe('единое SVG-полотно хребта на всю дорожку (spineTrackPath)', () => {
  const CX2 = NODE_COLUMN_WIDTH / 2;
  const offsets = SEASON_TRACK.map((_, index) => offsetOf(index));

  test('путь через ВСЮ дорожку — РОВНО одна команда M (физически одна линия, не N склеек)', () => {
    const full = spineTrackPath(CX2, ROW_HEIGHT, offsets);
    expect(moveCommandCount(full)).toBe(1);
  });

  test('каждый сегмент валиден: путь начинается с M и не обрывается на полпути', () => {
    const full = spineTrackPath(CX2, ROW_HEIGHT, offsets);
    expect(full.trim().startsWith('M')).toBe(true);
    // Одна C-команда — это 3 пары координат (6 чисел); полный путь должен
    // состоять из целого числа таких троек плюс начальный M x y.
    const numbers = full.match(/-?\d+(?:\.\d+)?/g) ?? [];
    expect((numbers.length - 2) % 6).toBe(0);
  });

  test('пустой массив узлов не крашит — возвращает пустую строку', () => {
    expect(spineTrackPath(CX2, ROW_HEIGHT, [])).toBe('');
  });

  test('один узел — валидный путь без сегментов между несуществующими соседями', () => {
    const single = spineTrackPath(CX2, ROW_HEIGHT, [offsets[0]]);
    expect(single.trim().startsWith('M')).toBe(true);
    expect(moveCommandCount(single)).toBe(1);
  });

  test('золотая обрезка (progress) — тоже ОДНА команда M, останавливается на пройденном уровне', () => {
    const reachedLevel = Math.min(5, offsets.length - 1);
    const gold = spineTrackProgressPath(CX2, ROW_HEIGHT, offsets, reachedLevel);
    expect(moveCommandCount(gold)).toBe(1);
    expect(gold.trim().startsWith('M')).toBe(true);
  });

  test('золотая обрезка на уровне 0 — пусто (ничего не пройдено)', () => {
    expect(spineTrackProgressPath(CX2, ROW_HEIGHT, offsets, 0)).toBe('');
  });

  test('золотая обрезка не длиннее серого пути и заканчивается РАНЬШЕ или на нём же', () => {
    const reachedLevel = Math.min(10, offsets.length - 1);
    const gold = spineTrackProgressPath(CX2, ROW_HEIGHT, offsets, reachedLevel);
    const full = spineTrackPath(CX2, ROW_HEIGHT, offsets);
    expect(gold.length).toBeLessThanOrEqual(full.length);
  });

  test('X-координаты не выходят за колонку узла — как и в построчной версии', () => {
    const limit = NODE_COLUMN_WIDTH / 2 - 4;
    const full = spineTrackPath(CX2, ROW_HEIGHT, offsets);
    const coordinates = full.match(/-?\d+(?:\.\d+)?/g) ?? [];
    coordinates.forEach((value, position) => {
      if (position % 2 !== 0) return;
      expect(Math.abs(Number(value) - CX2)).toBeLessThanOrEqual(limit);
    });
  });
});

/**
 * зачем 2026-08-04 (владелец: «полоса посредине не должна начинаться под
 * словами ПРОПУСК — пусть идёт в самый верх, заходит за сейф-зоны сверху и
 * снизу, будто бесконечная, конец не видно»): у хребта было ДВА видимых торца
 * — сверху он начинался ровно под шапкой колонок, снизу обрывался на последней
 * награде. Оверскан — прямые продолжения за пределы дорожки в X крайних узлов.
 *
 * Сторож нужен именно здесь, потому что оверскан легко «починить» обратно в
 * ноль (например, убрав аргументы при рефакторинге вызова) — и торцы вернутся
 * молча, без падения любого другого теста: путь останется валидным и гладким.
 */
describe('оверскан хребта — линия уходит за экран, торцы не видны', () => {
  const CX3 = NODE_COLUMN_WIDTH / 2;
  const offsets = SEASON_TRACK.map((_, index) => offsetOf(index));
  const OVERSCAN_TOP = 470;
  const OVERSCAN_BOTTOM = 220;

  test('серый путь начинается ВЫШЕ дорожки — в отрицательном Y, а не в нуле', () => {
    const d = spineTrackPath(CX3, ROW_HEIGHT, offsets, OVERSCAN_TOP, OVERSCAN_BOTTOM);
    const startY = Number(/^M\s+[-\d.]+\s+(-?[\d.]+)/.exec(d.trim())![1]);
    expect(startY).toBe(-OVERSCAN_TOP);
  });

  test('серый путь заканчивается НИЖЕ последней награды на величину хвоста', () => {
    const d = spineTrackPath(CX3, ROW_HEIGHT, offsets, OVERSCAN_TOP, OVERSCAN_BOTTOM);
    const numbers = d.match(/-?\d+(?:\.\d+)?/g)!;
    const endY = Number(numbers[numbers.length - 1]);
    expect(endY).toBe(offsets.length * ROW_HEIGHT + OVERSCAN_BOTTOM);
  });

  test('оверскан НЕ ломает главный контракт — путь остаётся ОДНОЙ линией', () => {
    const d = spineTrackPath(CX3, ROW_HEIGHT, offsets, OVERSCAN_TOP, OVERSCAN_BOTTOM);
    expect(moveCommandCount(d)).toBe(1);
    expect(d.trim().startsWith('M')).toBe(true);
  });

  test('хвосты идут ПРЯМО в X крайних узлов — не вылезают за колонку', () => {
    // Прямая, а не кривая: за пределами дорожки нет узла, к которому
    // изгибаться, и любая волна там читалась бы как ложный узел.
    const limit = NODE_COLUMN_WIDTH / 2 - 4;
    const d = spineTrackPath(CX3, ROW_HEIGHT, offsets, OVERSCAN_TOP, OVERSCAN_BOTTOM);
    for (const pair of d.matchAll(/(-?[\d.]+)\s+(-?[\d.]+)/g)) {
      expect(Math.abs(Number(pair[1]) - CX3)).toBeLessThanOrEqual(limit);
    }
  });

  test('золотой путь получает ВЕРХНИЙ хвост — иначе серый торчит над ним у шапки', () => {
    const gold = spineTrackProgressPath(CX3, ROW_HEIGHT, offsets, 5, OVERSCAN_TOP);
    const startY = Number(/^M\s+[-\d.]+\s+(-?[\d.]+)/.exec(gold.trim())![1]);
    expect(startY).toBe(-OVERSCAN_TOP);
    expect(moveCommandCount(gold)).toBe(1);
  });

  test('золотой путь НЕ получает нижний хвост — прогресс обязан обрываться на уровне', () => {
    // Иначе золото уехало бы за конец дорожки и «пройденным» выглядел бы весь
    // сезон независимо от реального уровня игрока.
    const gold = spineTrackProgressPath(CX3, ROW_HEIGHT, offsets, 5, OVERSCAN_TOP);
    const numbers = gold.match(/-?\d+(?:\.\d+)?/g)!;
    const endY = Number(numbers[numbers.length - 1]);
    expect(endY).toBeLessThan(offsets.length * ROW_HEIGHT);
  });

  test('без аргументов оверскана поведение прежнее — старые вызовы не сломаны', () => {
    const plain = spineTrackPath(CX3, ROW_HEIGHT, offsets);
    expect(/^M\s+[-\d.]+\s+0\s/.test(plain.trim())).toBe(true);
    expect(plain.includes('L')).toBe(false);
  });
});
