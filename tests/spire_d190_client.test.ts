// Сторож D190 на клиенте (владелец 14.10): в режиме монет экран «Все участники» показывает ту же зону, что даст итог недели
// (shared/spire_coins_zones.ts), а тур говорит «5 последних по монетам за неделю спускаются»; в режиме ступеней — как раньше.
import { spireZonesFor } from '../components/spire/spire_zones';
import { setSpireTextRankBy, spireGameText } from '../components/spire/spire_game_strings';
import type { SpireMemberRow } from '../components/spire/spire_room_types';

const row = (uid: string, weekCoins: number, steps = 0): SpireMemberRow => ({ uid, name: uid, steps, isMe: false, weekCoins });

afterEach(() => setSpireTextRankBy('steps'));

describe('D190: зоны «Всех участников» в режиме монет', () => {
  it('боты не в зонах; 6 живых → 2 вверх, 2 вниз', () => {
    const sorted = [row('a', 900), row('res_1', 800), row('b', 700), row('c', 500), row('res_2', 400), row('d', 300), row('e', 100), row('f', 50)];
    const zones = spireZonesFor(sorted, 'coins');
    const byUid = Object.fromEntries(sorted.map((m, i) => [m.uid, zones[i]]));
    expect(byUid).toMatchObject({ a: 'up', b: 'up', c: 'stay', d: 'stay', e: 'down', f: 'down', res_1: 'stay', res_2: 'stay' });
  });

  it('нули сверх k — остаются (полная ничья не делится наугад)', () => {
    const sorted = [row('a', 500), row('b', 0), row('c', 0), row('d', 0)];
    const zones = spireZonesFor(sorted, 'coins');
    expect(zones).toEqual(['up', 'stay', 'stay', 'stay']);
  });

  it('режим ступеней не изменился', () => {
    const sorted = [row('a', 0, 9), row('b', 0, 5), row('c', 0, 0)];
    // прежняя формула: зона 15% от строк (здесь 1), нули — вниз.
    expect(spireZonesFor(sorted, 'steps')).toEqual(['up', 'stay', 'down']);
  });
});

describe('D190: текст тура по рубильнику rankBy', () => {
  const vars = { a: 'A', b: 'B', c: 'C', z: 'Z' };
  it('ступени — прежний текст; монеты — «5 последних по монетам за неделю спускаются» на 9 языках', () => {
    expect(spireGameText('ru', 'tour3Text', vars)).toContain('Нижние 15%');
    setSpireTextRankBy('coins');
    expect(spireGameText('ru', 'tour3Text', vars)).toContain('5 последних по монетам за неделю спускаются');
    for (const lang of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
      const text = spireGameText(lang, 'tour3Text', vars);
      expect(text).toContain('5');
      expect(text).not.toMatch(/15%/);
    }
  });
});
