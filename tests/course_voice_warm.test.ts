// зачем (владелец 11.11.2026: Пик и фраза дня звучат записью, «а загрузка этих фраз как будет происходить?»):
// записи качаются на диск заранее своей маленькой очередью — без неё первое нажатие ждёт сеть или говорит телефон.
const mockEnsure = jest.fn(async (_text: string, _url: string) => true);
let mockNet = 'online';
jest.mock('../hooks/phrase_audio_player', () => ({ ensurePhraseAudioCached: (text: string, url: string) => mockEnsure(text, url) }));
jest.mock('../app/net_status', () => ({ getNetStatus: () => mockNet }));
jest.mock('../app/content_lazy', () => ({ lazyContent: (_key: string, load: () => unknown) => load }));

/* eslint-disable import/first */
import fs from 'node:fs';
import path from 'node:path';
import { __resetCourseVoiceWarmForTests, warmCourseVoice } from '../hooks/course_voice_warm';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('подкачка записей озвучки заранее', () => {
  beforeEach(async () => {
    await __resetCourseVoiceWarmForTests();
    mockEnsure.mockClear();
    mockEnsure.mockImplementation(async () => true);
    mockNet = 'online';
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => { jest.restoreAllMocks(); });

  it('фраза дня и фраза Пика, записанные 11.11, ставятся на скачивание; повтор второй раз не качает', async () => {
    expect(warmCourseVoice('daily_phrase', ['Break a leg'], 'en-US')).toBe(1);
    expect(warmCourseVoice('spire_step', ['magazine', 'Break a leg'], 'en')).toBe(1);
    await __resetCourseVoiceWarmForTests();
    expect(mockEnsure).toHaveBeenCalledTimes(2);
    expect(mockEnsure.mock.calls[0][1]).toMatch(/course-v1%2Fen%2F[0-9a-f]{16}\.mp3/);
  });

  it('фраза дня каждого языка имеет запись', async () => {
    expect(warmCourseVoice('daily_phrase', ['auf dem Holzweg sein'], 'de-DE')).toBe(1);
    expect(warmCourseVoice('daily_phrase', ['essere al verde'], 'it')).toBe(1);
    expect(warmCourseVoice('daily_phrase', ['Avoir le cafard'], 'fr-FR')).toBe(1);
    expect(warmCourseVoice('daily_phrase', ['Caballo grande, ande o no ande'], 'es')).toBe(1);
    await __resetCourseVoiceWarmForTests();
  });

  it('незаписанная фраза, пустой текст, язык без записей и отсутствие сети ничего не качают', async () => {
    expect(warmCourseVoice('t', ['zzz такой фразы нет', '', null, 42], 'en')).toBe(0);
    expect(warmCourseVoice('t', ['Break a leg'], 'ru-RU')).toBe(0);
    mockNet = 'offline';
    expect(warmCourseVoice('t', ['Break a leg'], 'en')).toBe(0);
    await __resetCourseVoiceWarmForTests();
    expect(mockEnsure).not.toHaveBeenCalled();
  });

  it('неудачное скачивание не запоминается как сделанное — следующий показ пробует снова', async () => {
    mockEnsure.mockImplementationOnce(async () => false);
    expect(warmCourseVoice('t', ['Break a leg'], 'en')).toBe(1);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(warmCourseVoice('t', ['Break a leg'], 'en')).toBe(1);
    await __resetCourseVoiceWarmForTests();
    expect(mockEnsure).toHaveBeenCalledTimes(2);
  });

  it('подкачка подключена к карточке фразы дня и к подготовке ступени Пика', () => {
    expect(read('components/DailyPhraseCard.tsx')).toMatch(/warmCourseVoiceSoon\('daily_phrase'/);
    // зачем: сторож карточки запрещает в ней таймеры — отсрочка живёт в модуле подкачки
    expect(read('components/DailyPhraseCard.tsx')).not.toContain('setTimeout');
    // 11.11: вызов переехал в модуль «ступень подготовлена» — у файла подготовки ступени сторож длины
    expect(read('app/spire/use_spire_game.ts')).toContain('spireOnStepPrepared(floor, pick.plan.budgetMs, { tier: stepTier, tasks: pick.tasks, lang });');
    const prepared = read('app/spire/spire_step_prepared.ts');
    expect(prepared).toContain("detail.tasks.filter((task) => task.kind === 'listen' || task.kind === 'dictate')");
    expect(prepared).toContain("warmCourseVoice('spire_step', listen.map((task) => task.payload.phrase), detail.lang)");
  });
});
