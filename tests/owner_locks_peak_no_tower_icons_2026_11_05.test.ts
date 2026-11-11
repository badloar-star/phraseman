// Governance-ID: TG-59579F3AB225
// ЗАМОК ВЛАДЕЛЬЦА 11.11: rank coins on each floor and a clear promotion line.
import * as fs from 'node:fs';
import * as path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('Peak floor coins and sheet', () => {
  const screen = read('components/spire/peak/PeakScreenV2.tsx');

  it('uses rank coins grouped by floor and opens the sheet for the tapped floor', () => {
    expect(screen).toContain('spireRivalsByFloor(model.all, true)');
    expect(screen).toMatch(/rivalsOnTower rivalsByFloor=\{floorMembers\} myCoinRank=\{null\}/);
    expect(screen).toContain('onSelect={selectTowerFloor}');
    expect(screen).toContain('onSelectFloor(next); openSheet(next);');
    expect(screen).toContain('floorMembers.get(sheetFloor)');
    const layer = read('components/spire/SpireTowerRivals.tsx');
    expect(layer).toContain('marginLeft={index === 0 ? 0 : spread - size}');
    expect(layer).toContain('testID={`spire-floor-coins-${fl.f}`} pointerEvents="none"');
    // владелец 11.11: «иконки … увеличить, а то их вообще не видно» — монета на башне не меньше 24 dp
    expect(Number((layer.match(/export const TOWER_COIN_MIN = (\d+);/) ?? [])[1])).toBeGreaterThanOrEqual(24);
    expect(layer).toContain('Math.max(TOWER_COIN_MIN, (fl.h - 2) * scale)');
  });

  it('тур Пика (страница 3): башня без монеты пользователя; монета у «+1 000» — монета ранга, а не зашитая базовая', () => {
    const tour = read('components/spire/peak/PeakTourFull.tsx');
    expect(tour).toMatch(/<SpireTower [^>]*myFloor=\{15\}[^>]*myCoinRank=\{null\}/);
    expect(tour).not.toContain('<Coin rank={0}');
    expect(tour).toContain('useMyCoinRank()');
  });

  it('зелёная полоска списка лежит в панели списка и без указателя; маркера на ней нет', () => {
    expect(screen).toContain('testID="peak-up-line"');
    expect(screen).toMatch(/peak-up-line/);
    const at = screen.lastIndexOf('peak-up-line');
    const lineBlock = screen.slice(at - 260, at + 40);
    expect(lineBlock).toContain('pointerEvents="none"');
    expect(lineBlock).not.toMatch(/SpireRankCoin|SpireTowerMarker/);
  });

  it('строка «Ты» в списке Пика берёт текущий ранг пользователя, а не устаревший из комнаты (монета = ранг)', () => {
    expect(screen).toMatch(/m\.isMe && myRank !== null \? \{ coinRank: myRank \}/);
    expect(screen).toContain('const myRank = towerProps.myCoinRank;');
  });

});
