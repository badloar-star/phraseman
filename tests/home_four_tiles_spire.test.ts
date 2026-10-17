// зачем (владелец 17.10: «На Главной должен быть Пик тоже — кнопка-иконка… 4: Уроки, Диалоги, Карточки и Пик»):
// четвёртая плитка только когда все три раздела есть и Пик открыт для языка; вид — эталон #four-tiles (а): квадрат-иконка, название под ним.
import fs from 'node:fs';
import path from 'node:path';

import { spireHomePlaceFrom } from '../app/spire/spire_home_place';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('Главная: 4 плитки с Пиком', () => {
  const home = read('app/(tabs)/home.tsx');
  const tiles = read('components/home/v2/HomeV2FeatureTiles.tsx');

  it('Пик — четвёртым, только при трёх разделах и открытом Пике; иначе прежний ряд из трёх', () => {
    expect(home).toContain('const homeV2WithSpire = homeV2BaseTiles.length === 3 && homeV2SpireTile.available;');
    expect(home).toContain("available: isLearningSurfaceReady(studyTarget, 'spire') && spireTabEnabled,");
    expect(home).toMatch(/\.slice\(0, 3\);/);
  });

  it('журнал [HOME-TILES] со списком и причиной — только на смену набора', () => {
    expect(home).toContain('reason={`${homeV2TilesReason};lang=${studyTarget}`}');
    expect(tiles).toContain('if (tilesLog !== lastTilesLog) {');
    expect(tiles).toContain("console.log('[HOME-TILES]'");
  });

  it('вариант (в): бейдж места у Пика — заливка ctaFill/ctaFillInk, место из копии на устройстве (без сети)', () => {
    expect(tiles).toContain("tile.key === 'spire' && spirePlace !== null");
    expect(tiles).toContain('backgroundColor: g.ctaFill');
    const place = read('app/spire/spire_home_place.ts');
    expect(place).not.toMatch(/spireSyncRoom|getDoc|httpsCallable|fetch\(/);
    expect(read('app/spire/spire_load_trace.ts')).toContain("m.refreshSpireHomePlace(uid, lang, room)");
  });

  it('место: своя строка по порядку; новичок без ступеней — без бейджа', () => {
    expect(spireHomePlaceFrom([{ isMe: false, steps: 9 }, { isMe: false, steps: 5 }, { isMe: true, steps: 4 }])).toBe(3);
    expect(spireHomePlaceFrom([{ isMe: false, steps: 2 }, { isMe: true, steps: 0 }])).toBeNull();
    expect(spireHomePlaceFrom([{ isMe: false, steps: 2 }])).toBeNull();
  });

  it('4 плитки — иконка с артом, название под плашкой с переносом, без обрезки и ужатия шрифта', () => {
    expect(tiles).toContain('if (tiles.length === 4) {');
    expect(tiles).not.toMatch(/numberOfLines=/);
    expect(tiles).not.toMatch(/adjustsFontSizeToFit/);
  });
});
