// зачем (владелец 17.10, R110): набор из фраз ролика получает короткое автоназвание (2–3 слова) на 9 языках;
// админ может поправить его до сохранения; публикация и пересборка (backfill) берут его из черновика, а не из имени файла.
import {
  buildVideoPackTitlePrompt,
  cleanVideoPackTitle,
  normalizeVideoPackTitles,
  parseVideoPackTitleResponse,
  VIDEO_PACK_TITLE_LANGS,
  VIDEO_PACK_TITLE_MAX_CHARS,
} from './video_pack_title';
import { buildVideoPackDoc } from './video_phrases';

const FULL = {
  Ru: 'Знаешь, как-то так', Uk: 'Знаєш, якось так', En: 'You know, kinda', Es: 'Ya sabes, algo así', PtBr: 'Sabe, tipo isso',
  Vi: 'Kiểu như vậy', Id: 'Ya, begitulah', Tr: 'Bilirsin işte', Pl: 'Wiesz, jakoś tak',
};

describe('video pack title rules', () => {
  it('cleans quotes, trailing period and line breaks; caps length', () => {
    expect(cleanVideoPackTitle('  «Вежливый отказ.»\n')).toBe('Вежливый отказ');
    expect(cleanVideoPackTitle('"Small talk"')).toBe('Small talk');
    expect(cleanVideoPackTitle('x'.repeat(80)).length).toBe(VIDEO_PACK_TITLE_MAX_CHARS);
  });

  it('requires Ru; empty languages fall back to Ru so the catalog never shows a code name', () => {
    expect(normalizeVideoPackTitles({ En: 'Hello' })).toBeNull();
    expect(normalizeVideoPackTitles('Привет')).toBeNull();
    const partial = normalizeVideoPackTitles({ Ru: 'Болтаем в кафе', En: 'Cafe chat' });
    expect(partial?.En).toBe('Cafe chat');
    expect(partial?.Pl).toBe('Болтаем в кафе');
    expect(Object.keys(partial ?? {})).toEqual(VIDEO_PACK_TITLE_LANGS.map((l) => l.key));
  });

  it('accepts lower-case keys from the admin page', () => {
    expect(normalizeVideoPackTitles({ ru: 'Вежливый отказ', ptBr: 'Recusa educada' })?.PtBr).toBe('Recusa educada');
  });

  it('prompt carries phrases, all 9 languages and previous suggestions to avoid', () => {
    const prompt = buildVideoPackTitlePrompt([{ phrase: 'You know what I mean', translation: 'Понимаешь, о чём я' }], ['Знаешь, как-то так']);
    expect(prompt).toContain('You know what I mean — Понимаешь, о чём я');
    expect(prompt).toContain('2–3 words');
    expect(prompt).toContain('«Знаешь, как-то так»');
    for (const { key } of VIDEO_PACK_TITLE_LANGS) expect(prompt).toContain(`"${key}"`);
  });

  it('parses the model JSON; prose or empty Ru is a clear error, not INTERNAL', () => {
    expect(parseVideoPackTitleResponse(JSON.stringify(FULL)).Tr).toBe('Bilirsin işte');
    expect(() => parseVideoPackTitleResponse('Sure! Here is a title')).toThrow(/ИИ не вернул название/);
    expect(() => parseVideoPackTitleResponse('{"En":"x"}')).toThrow(/пустое название/);
  });
});

describe('video pack document uses the auto title', () => {
  const base = {
    videoId: 'abc12345678',
    phrases: [{ ordinal: 1, phrase: 'You know', translation: 'Знаешь', explanation: '' }] as never,
    sourceName: 'Английский по-человечески — 500 фраз.docx',
    actorUid: 'admin',
    nowMs: 1,
    keepSocial: false,
  };

  it('writes every interface language from the titles, keeps the file name as videoTitle', () => {
    const doc = buildVideoPackDoc({ ...base, packTitles: normalizeVideoPackTitles(FULL) });
    expect(doc.titleRu).toBe('Знаешь, как-то так');
    expect(doc.titleEn).toBe('You know, kinda');
    expect(doc.titlePtBr).toBe('Sabe, tipo isso');
    expect(doc.titlePl).toBe('Wiesz, jakoś tak');
    expect(doc.title).toBe('Знаешь, как-то так');
    expect(doc.videoTitle).toBe('Английский по-человечески — 500 фраз');
    expect(doc.titleSource).toBe('auto_or_admin');
  });

  it('without titles keeps the previous behaviour (cleaned file name in every language)', () => {
    const doc = buildVideoPackDoc(base);
    expect(doc.titleRu).toBe('Английский по-человечески — 500 фраз');
    expect(doc.titleVi).toBe('Английский по-человечески — 500 фраз');
    expect(doc.titleSource).toBe('source_name');
  });
});
