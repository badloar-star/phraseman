// Governance-ID: TG-41D858F6942D
// зачем (владелец 05.11): «если не написать имя набора, а оставить пусто — набор называется именем видео».
// Приоритет: название набора админа → имя видео → имя документа → «Фразы из видео». Видео не переименовывается.
import { normalizeVideoPackTitles } from './video_pack_title';
import { buildVideoPackDoc } from './video_phrases';

const base = {
  videoId: 'abc12345678',
  phrases: [{ ordinal: 1, phrase: 'You know', translation: 'Знаешь', explanation: '' }] as never,
  sourceName: 'Английский по-человечески — 500 фраз.docx',
  actorUid: 'admin',
  nowMs: 1,
  keepSocial: false,
};

const FULL = { Ru: 'Знаешь, как-то так', Uk: 'Знаєш', En: 'You know', Es: 'Sabes', PtBr: 'Sabe', Vi: 'Biet', Id: 'Tahu', Tr: 'Bilirsin', Pl: 'Wiesz' };

describe('название набора из видео: пусто → имя видео', () => {
  it('название набора админа важнее имени видео, видео не трогается', () => {
    const doc = buildVideoPackDoc({ ...base, packTitles: normalizeVideoPackTitles(FULL), videoTitleFallback: 'Как говорить по-английски' });
    expect(doc.titleRu).toBe('Знаешь, как-то так');
    expect(doc.titleSource).toBe('auto_or_admin');
  });

  it('пусто → название набора = имя видео на всех языках', () => {
    const doc = buildVideoPackDoc({ ...base, videoTitleFallback: 'Как говорить по-английски' });
    expect(doc.titleRu).toBe('Как говорить по-английски');
    expect(doc.titleEn).toBe('Как говорить по-английски');
    expect(doc.titlePl).toBe('Как говорить по-английски');
    expect(doc.titleSource).toBe('video_title');
  });

  it('нет и имени видео → прежнее имя документа', () => {
    const doc = buildVideoPackDoc(base);
    expect(doc.titleRu).toBe('Английский по-человечески — 500 фраз');
    expect(doc.titleSource).toBe('source_name');
  });

  it('пробельное имя видео не считается именем', () => {
    const doc = buildVideoPackDoc({ ...base, videoTitleFallback: '   ' });
    expect(doc.titleSource).toBe('source_name');
  });
});
