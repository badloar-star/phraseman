// Governance-ID: TG-HOMEVIDEO-0511
import fs from 'node:fs';
import path from 'node:path';
import { homeVideoPacksTileReason, logHomeVideoPacksTile, __resetHomeVideoPacksTileLogForTests } from '../app/home_video_packs_tile_log';

// зачем (слово владельца через координатора, e4331d3b4; макет одобрен «да! оно!!!»): на Главной плитка «Фразы из видео» есть ВСЕГДА, даже у
// нового аккаунта ранга 0 с закрытым разделом «Видео». Сторож падает, если ранговый замок Видео снова спрячет плитку.

const home = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'home.tsx'), 'utf8');
const tileBlock = (() => {
  const start = home.indexOf("key: 'video_packs',");
  return home.slice(start, start + 1600);
})();

describe('Главная: плитка «Фразы из видео» не зависит от рангового замка Видео', () => {
  test('условие доступности плитки не содержит rankLockedVideo', () => {
    const availableLine = tileBlock.split('\n').find((l) => l.includes('available:')) ?? '';
    expect(availableLine).toContain("isLearningSurfaceReady(studyTarget, 'videos')");
    expect(availableLine).not.toContain('rankLockedVideo');
  });

  // зачем (Макеты 05.11, эмулятор: «на Главной с пятью вкладками плитки нет»): раньше плитка добавлялась только пока в ряду было меньше трёх — на ранге ≥1 пропадала
  test('плитка добавляется ВСЕГДА, когда доступна, а не только при свободном месте в ряду из трёх', () => {
    expect(home).toContain("const homeV2VideoTile = homeV2FillerTiles.find((tile) => tile.key === 'video_packs');");
    expect(home).toContain("homeV2VideoTile?.available && !homeV2TilesCore.some((tile) => tile.key === 'video_packs')");
    expect(home).toContain('[...homeV2TilesCore, (({ available: _available, ...tile }) => tile)(homeV2VideoTile)]');
  });

  test('плитка ведёт на экран наборов из видео', () => {
    expect(tileBlock).toContain("nav.push('/flashcards_video_packs' as never)");
  });

  test('название плитки — «Фразы из видео» на русском и украинском', () => {
    expect(tileBlock).toContain("ru: 'Фразы из видео'");
    expect(tileBlock).toContain("uk: 'Фрази з відео'");
  });

  test('ранг 0, видео закрыто: журнал называет плитку показанной, замок Видео в причину не входит', () => {
    const reason = homeVideoPacksTileReason({ surfaceVideosReady: true, flashcardsVisible: true, available: true, shown: true });
    expect(reason).toBe('shown');
  });

  test('причины скрытия названы (язык без видео, карточки скрыты, ряд занят)', () => {
    expect(homeVideoPacksTileReason({ surfaceVideosReady: false, flashcardsVisible: true, available: false, shown: false })).toBe('hidden:language_has_no_video_packs');
    expect(homeVideoPacksTileReason({ surfaceVideosReady: true, flashcardsVisible: false, available: false, shown: false })).toBe('hidden:flashcards_not_visible');
    expect(homeVideoPacksTileReason({ surfaceVideosReady: true, flashcardsVisible: true, available: true, shown: false })).toBe('available_but_row_full');
  });

  test('журнал [HOME-VIDEO-PACKS-TILE] пишется один раз на смену решения и не бросает', () => {
    __resetHomeVideoPacksTileLogForTests();
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const facts = { studyTarget: 'en', surfaceVideosReady: true, flashcardsVisible: true, rankLockedVideo: true, rankLockedCardsHub: true, available: true, shown: true, rowKeys: ['lessons', 'saved', 'video_packs'] };
    expect(() => { logHomeVideoPacksTile(facts); logHomeVideoPacksTile(facts); }).not.toThrow();
    const lines = log.mock.calls.filter((c) => c[0] === '[HOME-VIDEO-PACKS-TILE]');
    expect(lines).toHaveLength(1);
    expect(String(lines[0][1])).toContain('"rankLockedVideo":true');
    expect(String(lines[0][1])).toContain('"reason":"shown"');
    log.mockRestore();
  });

  test('на Главной вызван журнал плитки', () => {
    expect(home).toContain('logHomeVideoPacksTile({');
  });
});
