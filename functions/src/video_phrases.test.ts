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
      listingStatus: 'published_video',
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

  // зачем (владелец, журнал строки 4–5): sourceName = имя файла из админки; в витрине было «… 500 фраз.docx»
  // и автор «Автор сообщества». Название — без хвоста файла, автор — признак официального набора.
  it('пишет название без расширения файла и признак официального набора', () => {
    const doc = build({ sourceName: 'Английский по-человечески — 500 фраз.docx' });
    expect(doc).toMatchObject({
      title: 'Английский по-человечески — 500 фраз',
      titleRu: 'Английский по-человечески — 500 фраз',
      videoTitle: 'Английский по-человечески — 500 фраз',
      authorStableId: 'video:dQw4w9WgXcQ',
    });
    const cards = doc.cards as { origin: { sourceTitle: string } }[];
    expect(cards[0].origin.sourceTitle).toBe('Английский по-человечески — 500 фраз');
  });

  it('из одного расширения не делает пустое название', () => {
    expect(build({ sourceName: '.docx' }).titleRu).toBe('Фразы из видео');
  });

  it('кладёт объяснение фразы в description карточки — это и даёт шеврон подробностей', () => {
    const cards = build().cards as { description: string; en: string }[];
    expect(cards[0]).toMatchObject({ en: 'boarding pass', description: 'Дают на стойке регистрации.' });
    expect(cards).toHaveLength(2);
  });

  it('D131: таймкод фразы доезжает до карточки набора как videoStartSec', () => {
    const timed = [
      { ...phrases[0], startSec: 12.5 },
      phrases[1],
    ];
    const cards = build({ phrases: timed }).cards as Record<string, unknown>[];
    expect(cards[0]).toMatchObject({ id: 'p1', videoStartSec: 12.5 });
    // Без транскрипта поля нет вовсе — клиент не рисует кнопку «к моменту».
    expect(cards[1]).not.toHaveProperty('videoStartSec');
    for (const card of build().cards as Record<string, unknown>[]) expect(card).not.toHaveProperty('videoStartSec');
  });

  it('D131: секунда 0 — тоже таймкод (фраза в самом начале ролика)', () => {
    const cards = build({ phrases: [{ ...phrases[0], startSec: 0 }] }).cards as Record<string, unknown>[];
    expect(cards[0].videoStartSec).toBe(0);
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
    // PM-109/D130: итальянский — язык набора; общая с французским «è» не перетягивает.
    expect(detect(say('questo volo è in ritardo', 'grazie mille'))).toBe('it');
    expect(detect(say('ok', '123'))).toBe('en');
    expect(detect([])).toBe('en');
  });

});

/** PM-109: повтор публикации не создаёт дублей и не падает; пустое не публикуется. */
describe('video phrase publish decision', () => {
  const decide = __videoPhrasesTestHooks.decideVideoPhrasePublish;
  const base = { versionExists: true, versionStatus: 'draft', phraseCount: 3, activeVersion: '', selectedVersion: 'draft-1' };

  it('черновик с фразами публикуется', () => {
    expect(decide(base)).toEqual({ action: 'publish' });
  });

  it('повтор публикации активной версии — успех без записи', () => {
    expect(decide({ ...base, versionStatus: 'published', activeVersion: 'draft-1' })).toEqual({ action: 'already_published' });
  });

  it('опубликованная, но не активная версия, архив или отсутствующая — отказ', () => {
    expect(decide({ ...base, versionStatus: 'published', activeVersion: 'draft-2' }))
      .toEqual({ action: 'reject', reason: 'draft_version_required' });
    expect(decide({ ...base, versionStatus: 'archived' })).toEqual({ action: 'reject', reason: 'draft_version_required' });
    expect(decide({ ...base, versionExists: false })).toEqual({ action: 'reject', reason: 'draft_version_required' });
  });

  it('пустой список фраз не публикуется', () => {
    expect(decide({ ...base, phraseCount: 0 })).toEqual({ action: 'reject', reason: 'phrases_empty' });
  });
});
