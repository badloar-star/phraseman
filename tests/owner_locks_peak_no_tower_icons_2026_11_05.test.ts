// Governance-ID: TG-59579F3AB225
// ЗАМОК ВЛАДЕЛЬЦА 05.11 (~19:10–19:12, через координатора): «наложения зелёная полоска на иконку — убери, там иконку не надо отображать!»;
// «и с башни убирай иконки юзеров, не надо они там». На башне экрана Пика нет монет участников и метки «я»; зелёную полоску списка ничто не перекрывает.
// Отменяет слово 07:38 «на башне все еще надо показывать иконки юзеров». Список ТОП-5 и строка «Ты» остаются.
import * as fs from 'node:fs';
import * as path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('Пик: на башне нет иконок пользователей', () => {
  const screen = read('components/spire/peak/PeakScreenV2.tsx');

  it('слой монет участников удалён: файлов и импортов нет', () => {
    expect(fs.existsSync(path.join(__dirname, '..', 'components/spire/peak/PeakTowerPlayers.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(__dirname, '..', 'components/spire/peak/peak_tower_players.ts'))).toBe(false);
    expect(screen).not.toMatch(/<PeakTowerPlayers|pickPeakTowerPlayers|towerPlayers/);
  });

  it('башня экрана Пика не рисует монету-метку «я» (myCoinRank=null) и не получает соперников', () => {
    expect(screen).toMatch(/<SpireTower [^>]*variant="scene"[^>]*rivalsByFloor={undefined} myCoinRank={null} onPressMe={undefined}/);
    // метка без ранга не рисуется вовсе — ни рамки, ни кружка (координатор: «на месте маркера не должно быть ничего»)
    expect(read('components/spire/SpireTowerMarker.tsx')).toContain('if (myCoinRank === null) return null;');
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

  it('журнал [PEAK-LINE-MARKER] на месте', () => {
    expect(screen).toContain('[PEAK-LINE-MARKER]');
  });
});
