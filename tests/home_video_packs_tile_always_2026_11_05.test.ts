// Governance-ID: TG-HOMEVIDEO-0511
import fs from 'node:fs';
import { HOME_TILE_ROW_MAX, homeVideoPacksTileWanted } from '../app/home_video_tile_rule';
import { VIDEO_PHRASES_NAME } from '../app/video_phrases_name';
import path from 'node:path';
import { homeVideoPacksTileReason, logHomeVideoPacksTile, __resetHomeVideoPacksTileLogForTests } from '../app/home_video_packs_tile_log';

// зачем (слово владельца через координатора, e4331d3b4; макет одобрен «да! оно!!!»): на Главной плитка «Фразы из видео» есть ВСЕГДА, даже у
// нового аккаунта ранга 0 с закрытым разделом «Видео». Сторож падает, если ранговый замок Видео снова спрячет плитку.

const home = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'home.tsx'), 'utf8');
const tileBlock = (() => {
  const start = home.indexOf("key: 'video_packs',");
  return home.slice(start, start + 1600);
})();

describe('Главная: плитка «Фразы из видео» живёт только пока раздел «Видео» закрыт', () => {
  test('условие доступности плитки не содержит rankLockedVideo', () => {
    const availableLine = tileBlock.split('\n').find((l) => l.includes('available:')) ?? '';
    expect(availableLine).toContain("isLearningSurfaceReady(studyTarget, 'videos')");
    expect(availableLine).not.toContain('rankLockedVideo');
  });

  // зачем (слово владельца ~20:41: «ФРАЗЫ ИЗ ВИДЕО НЕ СТАНОВИТСЯ 5 В РЯД! ОНА ТОЛЬКО ПОКА РАЗДЕЛ ВИДЕО НЕДОСТУПЕН»): плитка есть только пока Видео закрыт; при открытом — нет; в ряд из 4 пятой не встаёт
  test('в home.tsx плитка берётся из правила «только при закрытом Видео» и всегда вне ядра ряда', () => {
    expect(home).toContain('videoUnlocked: !rankLockedVideo');
    expect(home).toContain("homeV2TilesCore.filter((tile) => tile.key !== 'video_packs')");
    expect(home).toContain('[...homeV2TilesNoVideo, (({ available: _available, ...tile }) => tile)(homeV2VideoTile)]');
    expect(home).not.toContain('[...homeV2TilesCore, (({ available');
  });

  test.each([
    [true, false, 3, true],
    [true, true, 3, false],
    [true, true, 2, false],
    [true, false, 4, false],
    [false, false, 3, false],
  ])('правило: available=%s videoUnlocked=%s ряд=%s → плитка %s', (available, videoUnlocked, rowWithoutVideo, expected) => {
    expect(homeVideoPacksTileWanted({ available, videoUnlocked, rowWithoutVideo })).toBe(expected);
  });

  test('ряд никогда не становится пятым: при любом ранге и числе плиток итог ≤ 4', () => {
    for (const unlocked of [false, true]) for (let n = 0; n <= 6; n += 1) {
      const wanted = homeVideoPacksTileWanted({ available: true, videoUnlocked: unlocked, rowWithoutVideo: n });
      if (wanted) expect(n + 1).toBeLessThanOrEqual(4);
    }
  });

  test('плитка ведёт на экран наборов из видео', () => {
    expect(tileBlock).toContain("nav.push('/flashcards_video_packs' as never)");
  });

  // зачем (слово владельца ~21:00): название раздела — ОДНО слово «Видеофразы» на всех 9 языках
  test('название плитки — одно слово из общей таблицы, без пробелов, на всех 9 языках', () => {
    expect(tileBlock).toContain('title: triLang(lang, VIDEO_PHRASES_NAME)');
    expect(Object.keys(VIDEO_PHRASES_NAME).sort()).toEqual(['en', 'es', 'id', 'pl', 'pt-BR', 'ru', 'tr', 'uk', 'vi']);
    for (const name of Object.values(VIDEO_PHRASES_NAME)) expect(name).toMatch(/^S+$/);
    expect(VIDEO_PHRASES_NAME.ru).toBe('Видеофразы');
    expect(VIDEO_PHRASES_NAME.uk).toBe('Відеофрази');
  });

  // зачем (слово владельца ~20:50: «НИКОГДА НЕ 5! ИКОНОК ТОЛЬКО 4»): жёсткий потолок ряда на любом ранге, free и Plus
  test('итоговый ряд плиток режется до HOME_TILE_ROW_MAX и «Видеофразы» не сверх четырёх', () => {
    expect(HOME_TILE_ROW_MAX).toBe(4);
    expect(home).toContain('.slice(0, HOME_TILE_ROW_MAX);');
    expect(home).toContain("homeV2TilesCore.filter((tile) => tile.key !== 'video_packs').slice(0, HOME_TILE_ROW_MAX)");
  });

  test('на любом ранге 0…5, free/Plus, при любой длине ряда итог ≤ 4, «Видеофразы» только при закрытом Видео', () => {
    for (const rank of [0, 1, 2, 3, 4, 5]) for (const plus of [false, true]) for (let core = 0; core <= 6; core += 1) {
      const videoUnlocked = rank >= 1 || plus;
      const cappedCore = Math.min(core, HOME_TILE_ROW_MAX);
      const wanted = homeVideoPacksTileWanted({ available: true, videoUnlocked, rowWithoutVideo: cappedCore });
      expect(cappedCore + (wanted ? 1 : 0)).toBeLessThanOrEqual(4);
      if (videoUnlocked) expect(wanted).toBe(false);
    }
  });

  test('ранг 0, видео закрыто: журнал называет плитку показанной, замок Видео в причину не входит', () => {
    const reason = homeVideoPacksTileReason({ surfaceVideosReady: true, flashcardsVisible: true, available: true, shown: true });
    expect(reason).toBe('shown');
    expect(homeVideoPacksTileReason({ surfaceVideosReady: true, flashcardsVisible: true, available: true, shown: false, rankLockedVideo: false })).toBe('hidden:video_unlocked');
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
