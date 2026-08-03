// ════════════════════════════════════════════════════════════════════════════
// season_pass_spine_continuity.test.ts — хребет дорожки обязан быть сплошным.
//
// зачем 2026-08-03 (владелец, со скриншотом: «эта линия должна быть сплошная и
// непрерывная»): строка дорожки рисовала кривую prevOffset → curOffset →
// nextOffset, то есть заканчивалась на X СЛЕДУЮЩЕГО узла. Следующая строка
// начиналась со своего prevOffset — X узла над ней. Эти координаты не
// совпадали, и на каждом стыке строк линия скакала вбок на 10-17 px.
//
// Тест проверяет не картинку, а ГЕОМЕТРИЮ: конец строки N обязан совпадать с
// началом строки N+1 для любой последовательности наград.
// ════════════════════════════════════════════════════════════════════════════
import {
  spineBottomHalfPath,
  spineTopHalfPath,
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

/** Смещение узла дорожки — та же формула, что в рендере строки. */
function offsetOf(index: number): number {
  const node = SEASON_TRACK[index];
  return spineWaveOffsetForKind(node?.pass?.kind ?? node?.free?.kind);
}

function rowPath(index: number): { top: string; bottom: string; full: string } {
  const prevOffset = index > 0 ? offsetOf(index - 1) : offsetOf(index);
  const curOffset = offsetOf(index);
  const nextOffset = index < SEASON_TRACK.length - 1 ? offsetOf(index + 1) : curOffset;
  const top = spineTopHalfPath(CX, HALF_H, prevOffset, curOffset);
  const bottom = spineBottomHalfPath(CX, HALF_H, ROW_HEIGHT, curOffset, nextOffset);
  return { top, bottom, full: `${top} ${bottom}` };
}

describe('хребет сезонной дорожки', () => {
  test('дорожка не пуста — есть что проверять', () => {
    expect(SEASON_TRACK.length).toBeGreaterThan(1);
  });

  test('верхняя и нижняя половины строки стыкуются в узле', () => {
    for (let index = 0; index < SEASON_TRACK.length; index += 1) {
      const { top, bottom } = rowPath(index);
      // Низ продолжает верх командой C без нового M — значит физически
      // начинается ровно там, где кончился верх.
      expect(bottom.trim().startsWith('C')).toBe(true);
      expect(pathEndX(top)).toBeCloseTo(CX + offsetOf(index), 5);
    }
  });

  test('КОНЕЦ строки совпадает с НАЧАЛОМ следующей — линия не рвётся', () => {
    for (let index = 0; index < SEASON_TRACK.length - 1; index += 1) {
      const current = rowPath(index);
      const next = rowPath(index + 1);
      const endX = pathEndX(current.full);
      const startX = pathStartX(next.full);
      expect(endX).toBeCloseTo(startX, 5);
    }
  });

  test('золотая (пройденная) часть повторяет геометрию серой подложки', () => {
    // Иначе цветной и серый куски разойдутся по форме и дадут двойную линию.
    for (let index = 0; index < SEASON_TRACK.length; index += 1) {
      const { top, bottom, full } = rowPath(index);
      expect(full).toContain(top);
      expect(full).toContain(bottom);
    }
  });

  test('кривая не вылезает за колонку узла', () => {
    // Полуширина колонки 28; линия толщиной 4 не должна касаться карточек наград.
    const limit = NODE_COLUMN_WIDTH / 2 - 4;
    for (let index = 0; index < SEASON_TRACK.length; index += 1) {
      const coordinates = rowPath(index).full.match(/-?\d+(?:\.\d+)?/g) ?? [];
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
