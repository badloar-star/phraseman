// зачем (владелец, OWNER_REQUESTS_LEDGER строки 4–5; координатор 14:10): в витрине набор ролика назывался
// «… 500 фраз.docx», а автором стоял «Автор сообщества». Сторожим чистку названия (одна функция на сервер и клиент),
// чтение уже записанных документов и строгий признак официального набора.
import { cleanPackSourceTitle } from '../shared/pack_source_title';
import { isOfficialVideoPack, officialVideoPackAuthorId, OFFICIAL_PACK_AUTHOR_NAME } from '../shared/official_pack_marker';
import { mapCommunityPackDocToMarket } from '../app/community_packs/communityFirestore';

jest.mock('@react-native-firebase/firestore', () => () => ({}));

describe('cleanPackSourceTitle', () => {
  it.each([
    ['Английский по-человечески — 500 фраз.docx', 'Английский по-человечески — 500 фраз'],
    ['Phrases.DOCX', 'Phrases'],
    ['Фразы (1).docx', 'Фразы'],
    ['Фразы - копия.docx', 'Фразы'],
    ['Phrases - Copy (2).txt', 'Phrases'],
    ['  Фразы   в аэропорту.pdf  ', 'Фразы в аэропорту'],
  ])('%s → %s', (raw, expected) => {
    expect(cleanPackSourceTitle(raw)).toBe(expected);
  });

  it('не трогает честные названия', () => {
    expect(cleanPackSourceTitle('Hard copy')).toBe('Hard copy');
    expect(cleanPackSourceTitle('Mr. Smith (часть 2)')).toBe('Mr. Smith (часть 2)');
    expect(cleanPackSourceTitle('U.S. English')).toBe('U.S. English');
  });

  it('от одного расширения остаётся пустая строка — запасное имя ставит вызывающий', () => {
    expect(cleanPackSourceTitle('.docx')).toBe('');
    expect(cleanPackSourceTitle(undefined)).toBe('');
  });
});

describe('isOfficialVideoPack', () => {
  const videoId = 'dQw4w9WgXcQ';

  it('официальный — только набор, записанный сервером для своего ролика', () => {
    expect(isOfficialVideoPack({ authorStableId: officialVideoPackAuthorId(videoId), videoId })).toBe(true);
    expect(OFFICIAL_PACK_AUTHOR_NAME).toBe('Professor Lingman');
  });

  it('чужой ролик, пустой videoId или обычный автор — не официальный', () => {
    expect(isOfficialVideoPack({ authorStableId: 'video:aaaaaaaaaaa', videoId })).toBe(false);
    expect(isOfficialVideoPack({ authorStableId: officialVideoPackAuthorId(videoId) })).toBe(false);
    expect(isOfficialVideoPack({ authorStableId: 'abc123stableid', videoId })).toBe(false);
    expect(isOfficialVideoPack({ authorStableId: 'video:bad', videoId: 'bad' })).toBe(false);
  });
});

describe('каталог: уже записанные наборы', () => {
  it('показывает название без «.docx» и сохраняет признак автора', () => {
    const pack = mapCommunityPackDocToMarket('video_dQw4w9WgXcQ', {
      listingStatus: 'published',
      packLanguage: 'en',
      titleRu: 'Английский по-человечески — 500 фраз.docx',
      titleUk: 'Английский по-человечески — 500 фраз.docx',
      videoId: 'dQw4w9WgXcQ',
      videoTitle: 'Английский по-человечески — 500 фраз.docx',
      authorStableId: 'video:dQw4w9WgXcQ',
      category: 'daily',
      cardCount: 500,
    });
    expect(pack?.titleRu).toBe('Английский по-человечески — 500 фраз');
    expect(pack?.titleUk).toBe('Английский по-человечески — 500 фраз');
    expect(pack?.videoTitle).toBe('Английский по-человечески — 500 фраз');
    expect(pack && isOfficialVideoPack(pack)).toBe(true);
  });
});
