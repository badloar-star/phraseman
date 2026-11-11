// зачем (координатор 04.11): модель экрана Пика не зависит от варианта макета — топ-5, вершинники, зоны, рекорд ступени, время.
import { buildPeakModel, formatPeakTime, peakStepRecord, PEAK_TOP_COUNT } from '../modules/spire/peak_model';
import { spireRivalsByFloor } from '../components/spire/spire_tower_model';
import type { SpireRoomRow } from '../modules/spire/room_rows';

function row(uid: string, weekCoins: number, steps: number, isMe = false): SpireRoomRow {
  return { uid, name: uid, steps, reachedAtMs: 1, isMe, weekCoins, coinRank: null };
}

// 12 участников, уже по монетам; u9 и u11 дошли до вершины (135)
const rows: SpireRoomRow[] = Array.from({ length: 12 }, (_, i) =>
  row('u' + i, (12 - i) * 100, i === 9 || i === 11 ? 135 : 10 + i, i === 7));

describe('модель экрана Пика', () => {
  it('groups all players on their current floors with their rank coins', () => {
    const occupants = spireRivalsByFloor([
      { ...row('me', 100, 0, true), coinRank: 4 },
      { ...row('same', 50, 2), coinRank: 7 },
      { ...row('higher', 80, 5), coinRank: 12 },
    ], true);
    expect(occupants.get(1)?.map(({ uid, coinRank }) => [uid, coinRank])).toEqual([['me', 4], ['same', 7]]);
    expect(occupants.get(2)?.map(({ uid }) => uid)).toEqual(['higher']);
  });

  it('топ-5 по монетам недели, места с единицы', () => {
    const m = buildPeakModel(rows);
    expect(m.top).toHaveLength(PEAK_TOP_COUNT);
    expect(m.top.map((r) => r.uid)).toEqual(['u0', 'u1', 'u2', 'u3', 'u4']);
    expect(m.top[0].place).toBe(1);
  });

  it('вершинники — только дошедшие до 135 и не вошедшие в топ-5', () => {
    const m = buildPeakModel(rows);
    expect(m.summiters.map((r) => r.uid)).toEqual(['u9', 'u11']);
    const withTop = buildPeakModel([row('a', 900, 135), ...rows.slice(1)]);
    expect(withTop.summiters.map((r) => r.uid)).not.toContain('a');
    expect(withTop.top[0].reachedTop).toBe(true);
  });

  it('мои монеты, место и зона; нет меня в комнате — пустые значения', () => {
    const m = buildPeakModel(rows);
    expect(m.me.place).toBe(8);
    expect(m.me.weekCoins).toBe(500);
    expect(m.me.inTop).toBe(false);
    expect(['up', 'stay', 'down']).toContain(m.me.zone);
    const none = buildPeakModel(rows.map((r) => ({ ...r, isMe: false })));
    expect(none.me).toEqual({ place: null, weekCoins: 0, value: 0, zone: null, inTop: false, reachedTop: false });
  });

  it('зоны: лучшие — вверх, худшие — вниз, списки согласованы с зонами строк', () => {
    const m = buildPeakModel(rows);
    expect(m.promotion.every((r) => r.zone === 'up')).toBe(true);
    expect(m.demotion.every((r) => r.zone === 'down')).toBe(true);
    expect(m.promotion[0]?.uid).toBe('u0');
    expect(m.demotion.map((r) => r.uid)).toContain('u11');
  });

  it('тихая комната (ни у кого нет монет) никого не понижает и не повышает', () => {
    const quiet = buildPeakModel(rows.map((r) => ({ ...r, weekCoins: 0 })));
    expect(quiet.promotion).toHaveLength(0);
    expect(quiet.demotion).toHaveLength(0);
  });

  it('пустая комната не падает', () => {
    const m = buildPeakModel([]);
    expect(m.top).toHaveLength(0);
    expect(m.me.place).toBeNull();
  });

  it('рекорд ступени по адресу этаж:ступень; нет данных или адрес вне схемы — null', () => {
    expect(peakStepRecord(null, 3, 2)).toBeNull();
    expect(peakStepRecord({}, 3, 2)).toBeNull();
    expect(peakStepRecord({ '3:2': { uid: 'u1', durationMs: 8123 } }, 3, 2)).toEqual({ uid: 'u1', durationMs: 8123 });
    expect(peakStepRecord({ '3:2': { uid: 'u1', durationMs: 8123 } }, 3, 9)).toBeNull();
    expect(peakStepRecord({ '3:2': { uid: 'u1', durationMs: 0 } }, 3, 2)).toBeNull();
    expect(peakStepRecord({ '16:1': { uid: 'u1', durationMs: 5 } }, 16, 1)).toBeNull();
  });

  it('время мм:сс.сс', () => {
    expect(formatPeakTime(8123)).toBe('00:08.12');
    expect(formatPeakTime(61_050)).toBe('01:01.05');
    expect(formatPeakTime(599_999)).toBe('09:59.99');
    expect(formatPeakTime(0)).toBeNull();
    expect(formatPeakTime(Number.NaN)).toBeNull();
    expect(formatPeakTime(-5)).toBeNull();
  });

  it('режим ступеней: значение строки — ступени, зоны считаются по ступеням', () => {
    const bySteps: SpireRoomRow[] = Array.from({ length: 12 }, (_, i) => row('s' + i, 0, 100 - i * 5, i === 3));
    const m = buildPeakModel(bySteps, 'steps');
    expect(m.top[0].value).toBe(100);
    expect(m.me.value).toBe(85);
    expect(m.promotion.length).toBeGreaterThan(0);
  });
});
