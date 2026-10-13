// зачем (приоритет владельца 13.10, «в Шпиле как на макетах видно, кто с тобой на этаже и кто выше, кто ниже»): в кадрах превью соперники стоят ВОКРУГ этажа игрока
// (раньше все выше), башня проверяет, что окно прокрутки встало на свой этаж, и повторяет запрос при срезе до нуля.
import fs from 'node:fs';
import path from 'node:path';
import { spirePreviewModel } from '../components/spire/spire_preview_fixtures';
import { spireRivalsByFloor } from '../components/spire/spire_tower_model';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));

describe('превью Шпиля: соперники ниже, на и выше этажа игрока', () => {
  for (const floor of [2, 4, 7, 12]) {
    it(`этаж ${floor}: есть соседи на этаже, выше и (кроме низа) ниже`, () => {
      const model = spirePreviewModel('room', { floor });
      const map = spireRivalsByFloor(model.game.rows);
      const myFloor = model.week?.floor ?? 0;
      let below = 0; let same = 0; let above = 0;
      for (const [f, list] of map) { if (f < myFloor) below += list.length; else if (f === myFloor) same += list.length; else above += list.length; }
      expect(same).toBeGreaterThan(0);
      expect(above).toBeGreaterThan(0);
      if (myFloor >= 3) expect(below).toBeGreaterThan(0);
      expect(below + same + above).toBe(29); // все 29 чужих строк комнаты в 30 человек разложены по этажам
      expect([...map.values()].flat().every((r) => r.coinRank === null || (r.coinRank >= 0 && r.coinRank <= 19))).toBe(true); // ранг монеты едет вместе с соперником
    });
  }
});

describe('башня Шпиля: окно встаёт на свой этаж', () => {
  const tower = read('components/spire/SpireTower.tsx');
  it('после мгновенного показа сверяется реальное смещение и при срезе повторяется запрос (до 3 раз)', () => {
    expect(tower).toContain('function verifyScroll(g: ScrollGuard, attempt: number): void');
    expect(tower).toContain("if (attempt >= 3)");
    expect(tower).toContain('verifyScroll({ scroll: scrollRef, last: lastReqRef, offset: offsetRef, dragged: draggedRef }, 0)');
    expect(tower).toContain('offsetRef.current = e.nativeEvent.contentOffset.y;');
    expect(tower).toContain('onScrollBeginDrag={() => { draggedRef.current = true; }}'); // ручная прокрутка человека отменяет повторы
  });
  it('журнал [SPIRE-RIVALS] window показывает, сколько соперников попало в окно', () => {
    expect(tower).toContain("console.log('[SPIRE-RIVALS] window'");
    expect(read('components/spire/SpireFloorInfo.tsx')).not.toContain('комнату недели ещё никто не читает');
  });
});
