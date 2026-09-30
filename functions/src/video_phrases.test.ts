import { __videoPhrasesTestHooks } from './video_phrases';

describe('video phrase publication metadata', () => {
  it('clears the draft pointer when publishing a version', () => {
    expect(__videoPhrasesTestHooks.publishedRootPatch({
      videoId: 'abc12345678',
      versionId: 'draft-1',
      phraseCount: 200,
      actorUid: 'admin-uid',
      nowMs: 1234,
    })).toMatchObject({
      videoId: 'abc12345678',
      activeVersion: 'draft-1',
      activePhraseCount: 200,
      draftVersion: null,
      draftPhraseCount: 0,
      updatedAtMs: 1234,
      updatedBy: 'admin-uid',
    });
  });
});

/**
 * Набор карточек, который собирается при публикации фраз ролика.
 *
 * зачем именно эти проверки: каждое значение ниже ломает раздел МОЛЧА и целиком,
 * причём сбой виден не здесь, а на клиенте — пустой список при полной базе или
 * набор, пропавший из каталога. Моки Firestore такое не ловят: мок принимает
 * любой мусор. Поэтому сверяем чистый документ с контрактом каталога.
 */
describe('video pack document', () => {
  const phrases = [
    { id: 'v:1', ordinal: 1, phrase: 'boarding pass', translation: 'посадочный талон', explanation: 'Дают на стойке регистрации.' },
    { id: 'v:2', ordinal: 2, phrase: 'carry-on luggage', translation: 'ручная кладь', explanation: 'То, что берут в салон.' },
  ] as const;

  const build = (over: Partial<Parameters<typeof __videoPhrasesTestHooks.buildVideoPackDoc>[0]> = {}) =>
    __videoPhrasesTestHooks.buildVideoPackDoc({
      videoId: 'dQw4w9WgXcQ',
      phrases,
      sourceName: 'Фразы в аэропорту',
      actorUid: 'admin-uid',
      nowMs: 1700000000000,
      keepSocial: false,
      ...over,
    });

  it('передаёт клиенту поля, по которым набор попадает в каталог и в раздел «Из видео»', () => {
    // Любое расхождение здесь = набор не виден людям вообще.
    expect(build()).toMatchObject({
      listingStatus: 'published',
      packLanguage: 'en',
      videoId: 'dQw4w9WgXcQ',
      titleRu: 'Фразы в аэропорту',
      cardCount: 2,
    });
  });

  it('ставит категорию из разрешённого списка', () => {
    // 'situations' уже была написана по ошибке: такой категории не существует.
    expect(['business', 'travel', 'daily', 'exam', 'slang', 'verbs'])
      .toContain(build().category);
  });

  it('никогда не отдаёт пустой titleRu — иначе маппер каталога отбросит набор', () => {
    const doc = build({ sourceName: '   ' });
    expect(String(doc.titleRu).trim().length).toBeGreaterThan(0);
  });

  it('кладёт объяснение фразы в description карточки — это и даёт шеврон подробностей', () => {
    const cards = build().cards as { description: string; en: string }[];
    expect(cards[0]).toMatchObject({ en: 'boarding pass', description: 'Дают на стойке регистрации.' });
    expect(cards).toHaveLength(2);
  });

  it('перепубликация не обнуляет лайки и добавления уже живущего набора', () => {
    // keepSocial=true — счётчиков в документе быть не должно, иначе merge их сотрёт.
    expect(build({ keepSocial: true })).not.toHaveProperty('likesCount');
    expect(build({ keepSocial: false })).toMatchObject({ likesCount: 0, addedCount: 0 });
  });

  it('определяет язык набора по фразам — иначе фильтр языка спрячет ролик', () => {
    const say = (...items: string[]) => items.map((phrase, i) => ({
      id: `v:${i + 1}`, ordinal: i + 1, phrase, translation: '—', explanation: '—',
    }));
    const detect = __videoPhrasesTestHooks.detectPackLanguage;
    expect(detect(say('the flight is delayed', 'boarding pass'))).toBe('en');
    expect(detect(say('le vol est retardé', 'une carte d’embarquement'))).toBe('fr');
    expect(detect(say('der Flug ist verspätet', 'die Bordkarte'))).toBe('de');
    expect(detect(say('el vuelo está retrasado', 'la tarjeta de embarque'))).toBe('es');
    // Сомнение трактуем в пользу английского: так набор не прячется ни от кого.
    expect(detect(say('ok', '123'))).toBe('en');
    expect(detect([])).toBe('en');
  });

});
