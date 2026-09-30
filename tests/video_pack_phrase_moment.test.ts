/**
 * D131 / PM-288: «наборы из видео — тап по фразе открывает ролик на её моменте».
 *
 * Сторожит два звена цепочки, которые рвутся молча:
 * 1) данные — `videoStartSec` карточки документа набора доходит до CardItem
 *    (тем же чтением документа, без запросов к `video_phrase_sets`);
 * 2) поведение — кнопка момента существует ТОЛЬКО у фразы с таймкодом в наборе
 *    из видео; без транскрипта фраза не выглядит нажимаемой (D131).
 */
import * as fs from 'fs';
import * as path from 'path';
import { communityPackCardsToCardItems } from '../app/community_packs/communityFirestore';
import {
  cardVideoStartSecFromRaw,
  formatVideoMoment,
  packSupportsVideoMoments,
  resolveVideoMoment,
  youtubeStartParam,
} from '../app/flashcards/video_moment';

jest.mock('@react-native-firebase/firestore', () => () => ({}));
jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: false, IS_EXPO_GO: true }));

const VIDEO_ID = 'dQw4w9WgXcQ';
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('D131 data: videoStartSec карточки набора → CardItem', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => { warn = jest.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => warn.mockRestore());

  it('переносит таймкод на карточку, у фразы без таймкода поля нет', () => {
    const cards = communityPackCardsToCardItems(`video_${VIDEO_ID}`, [
      { id: 'p1', en: 'boarding pass', ru: 'посадочный талон', videoStartSec: 12.5 },
      { id: 'p2', en: 'carry-on', ru: 'ручная кладь' },
      { id: 'p3', en: 'gate', ru: 'выход', videoStartSec: 0 },
    ]);
    expect(cards[0].videoStartSec).toBe(12.5);
    expect(cards[1]).not.toHaveProperty('videoStartSec');
    expect(cards[2].videoStartSec).toBe(0);
  });

  it('мусорный таймкод не ломает карточку и пишет [VIDEO-SEEK]', () => {
    const [card] = communityPackCardsToCardItems('video_x', [{ id: 'p1', en: 'hi', ru: 'привет', videoStartSec: 'abc' }]);
    expect(card.en).toBe('hi');
    expect(card).not.toHaveProperty('videoStartSec');
    expect(warn.mock.calls.some((args) => String(args[0]).includes('[VIDEO-SEEK]'))).toBe(true);
    expect(cardVideoStartSecFromRaw(-3)).toBeUndefined();
    expect(cardVideoStartSecFromRaw(99999999)).toBeUndefined();
    expect(cardVideoStartSecFromRaw(null)).toBeUndefined();
    expect(cardVideoStartSecFromRaw(7.26)).toBe(7.3);
  });
});

describe('D131 behavior: момент открывается только при таймкоде', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => { warn = jest.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => warn.mockRestore());

  const videoPack = { videoId: VIDEO_ID, videoTitle: 'Аэропорт', packLanguage: 'en' };

  it('фраза с таймкодом в наборе из видео → момент ролика', () => {
    expect(resolveVideoMoment(videoPack, { id: 'c1', videoStartSec: 83.4 })).toEqual({
      videoId: VIDEO_ID, title: 'Аэропорт', startSec: 83.4, cardId: 'c1',
    });
  });

  it('без таймкода, без ролика или с мусорным videoId → null с причиной в логе', () => {
    expect(resolveVideoMoment(videoPack, { id: 'c1' })).toBeNull();
    expect(resolveVideoMoment({ packLanguage: 'en' }, { id: 'c1', videoStartSec: 5 })).toBeNull();
    expect(resolveVideoMoment({ videoId: 'bad id!', packLanguage: 'en' }, { id: 'c1', videoStartSec: 5 })).toBeNull();
    expect(resolveVideoMoment(null, { id: 'c1', videoStartSec: 5 })).toBeNull();
    expect(warn.mock.calls.filter((args) => String(args[0]).includes('[VIDEO-SEEK]')).length).toBeGreaterThanOrEqual(4);
  });

  it('D129: видеораздел учитывает таблицу готовности языков (неизвестный язык — закрыто)', () => {
    for (const lang of ['en', 'es', 'fr', 'de']) expect(packSupportsVideoMoments({ videoId: VIDEO_ID, packLanguage: lang })).toBe(true);
    expect(packSupportsVideoMoments({ videoId: VIDEO_ID, packLanguage: 'xx' })).toBe(false);
    expect(packSupportsVideoMoments(null)).toBe(false);
  });

  it('параметр start плеера и подпись кнопки', () => {
    expect(youtubeStartParam(83.9)).toBe(83);
    expect(youtubeStartParam(0)).toBeNull();
    expect(formatVideoMoment(5)).toBe('0:05');
    expect(formatVideoMoment(83.9)).toBe('1:23');
    expect(formatVideoMoment(3723)).toBe('1:02:03');
  });
});

describe('D131 contract (source): кнопка момента нажимаема только с таймкодом', () => {
  const item = read('app/flashcards/FlashcardListItem.tsx');
  const list = read('app/flashcards/CollectionListView.tsx');
  const screen = read('app/flashcards_collection.tsx');

  it('карточка рисует кнопку только при обработчике И числовом videoStartSec', () => {
    expect(item).toMatch(/const videoMomentSec = onOpenVideoMoment && typeof item\.videoStartSec === 'number' \? item\.videoStartSec : null;/);
    expect(item).toMatch(/\{videoMomentSec !== null && !savedGlass \? \(/);
    expect(item).toContain('testID={`fc-video-moment-${item.id}`}');
    // Кнопка не ужимает текст — правило владельца.
    expect(item).not.toMatch(/videoMoment[\s\S]{0,400}adjustsFontSizeToFit/);
  });

  it('список прокидывает обработчик в каждую строку (и в deps renderItem)', () => {
    expect(list).toContain('onOpenVideoMoment={onOpenVideoMoment}');
    expect(list).toMatch(/strengthForCard,\s*onOpenVideoMoment,\s*videoMomentLabel,/);
  });

  it('экран набора даёт обработчик ТОЛЬКО набору из видео и открывает плеер поверх, без перехода', () => {
    expect(screen).toContain('packDeeplink && packSupportsVideoMoments(currentMarketPack) ? currentMarketPack : null');
    expect(screen).toContain('onOpenVideoMoment={videoMomentPack ? openVideoMoment : null}');
    expect(screen).toContain('startSec={videoMoment.startSec}');
    // «Назад» возвращает в тот же набор: открытие — локальное состояние, а не router.push.
    const handler = screen.slice(screen.indexOf('const openVideoMoment = useCallback'), screen.indexOf('const closeVideoMoment'));
    expect(handler).toContain('setVideoMoment(moment)');
    expect(handler).not.toMatch(/router\.(push|navigate|replace)/);
  });

  it('плеер передаёт секунду в embed (параметр start)', () => {
    expect(read('components/youtube/YoutubeInlinePlayer.tsx')).toContain('buildLingmanEmbedHtml(videoId, { autoplay: autoPlay, startSec })');
    expect(read('components/home/v2/HomeV2VideoPlayerModal.tsx')).toContain('startSec={startSec}');
  });
});
