import fs from 'node:fs';
import path from 'node:path';

import { noteDeckHadChips, packDeckSkeletonHeight } from '../components/packs/packDeckModel';
import { noteSkeletonGeom } from '../app/skeleton_geom_log';

// зачем (координатор 18.10): журнал [SKELETON-GEOM] на устройстве — пара «скелетон / готово» и разница в dp, один раз за показ.
// Сверка снимает его в общей пересъёмке; здесь — поведение самого журнала и то, что все шесть экранов подключены.
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const lines = (spy: jest.SpyInstance) => spy.mock.calls.map((call) => call.join(' '));

describe('журнал [SKELETON-GEOM]', () => {
  it('печатает пару и разницу, помечает прыжок > 8 dp, затем сбрасывается', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    noteSkeletonGeom('t_pair', 'skeleton', 91);
    noteSkeletonGeom('t_pair', 'ready', 143);
    noteSkeletonGeom('t_pair', 'ready', 143); // повтор после пары — тишина
    noteSkeletonGeom('t_ok', 'skeleton', 112);
    noteSkeletonGeom('t_ok', 'ready', 114);
    const out = lines(spy);
    spy.mockRestore();
    expect(out.filter((line) => line.includes('t_pair'))).toHaveLength(1);
    expect(out.find((line) => line.includes('t_pair'))).toContain('"delta":52');
    expect(out.find((line) => line.includes('t_pair'))).toContain('"verdict":"JUMP"');
    expect(out.find((line) => line.includes('t_ok'))).toContain('"verdict":"ok"');
  });

  it('готовый блок без скелетона игнорируется, плохая высота называет причину', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    noteSkeletonGeom('t_none', 'ready', 100);
    noteSkeletonGeom('t_bad', 'skeleton', 0);
    const logged = lines(log);
    const warned = lines(warn);
    log.mockRestore();
    warn.mockRestore();
    expect(logged.some((line) => line.includes('t_none'))).toBe(false);
    expect(warned.some((line) => line.includes('t_bad') && line.includes('bad height'))).toBe(true);
  });

  it('скелетон стопки берёт высоту по факту: видели стопку без чипов — 91, с чипами — 143', () => {
    noteDeckHadChips(false);
    expect(packDeckSkeletonHeight()).toBe(91);
    noteDeckHadChips(true);
    expect(packDeckSkeletonHeight()).toBe(143);
  });

  it('шесть экранов подключены: и скелетон, и готовый блок мерят одно имя экрана', () => {
    const wired: ReadonlyArray<readonly [string, readonly string[]]> = [
      ['cards_hub', ['app/flashcards/FlashcardsCategoryHub.tsx']],
      ['my_packs', ['app/flashcards/MyPacksV2.tsx']],
      ['saved', ['app/flashcards/SavedCollectionStates.tsx', 'app/flashcards/FlashcardListItem.tsx']],
      ['dialogs', ['components/dialogs/DialogueV2CatalogueSkeleton.tsx', 'components/dialogs/DialogueV2CatalogueSection.tsx']],
      ['video_grid', ['app/lingman_videos.tsx', 'components/youtube/YoutubeVideoGridCard.tsx']],
      ['friends_search', ['app/(tabs)/friends.tsx', 'components/friends/FriendsFoundCard.tsx']],
    ];
    for (const [screen, files] of wired) {
      for (const file of files) expect(read(file)).toContain(`'${screen}'`);
    }
    // стопка набора: готовый блок меряется внутри PackDeck по geomScreen, обе экрана его передают
    expect(read('components/packs/PackRow.tsx')).toContain("noteSkeletonGeom(geomScreen, 'ready'");
    expect(read('app/flashcards/FlashcardsCategoryHub.tsx')).toContain('geomScreen="cards_hub"');
    expect(read('app/flashcards/MyPacksV2.tsx')).toContain('geomScreen="my_packs"');
  });
});
