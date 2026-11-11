import fs from 'node:fs';
import path from 'node:path';

import { getPlayablePhraseAudioUrl, phraseAudioSpokenKey } from '../modules/audio/phrase_audio_lookup';
import { courseVoiceUrl } from '../modules/audio/course_voice_lookup';
import { COURSE_VOICE_LANGS, courseVoiceKey, courseVoiceText } from '../modules/audio/course_voice_key';

const ROOT = path.resolve(__dirname, '..');

// зачем (владелец 11.11.2026): утром — «удали всю озвучку» (карта прежнего голоса удалена), вечером — новая
// запись курсов своими голосами ElevenLabs, прослушана и принята словами «чисто, дальше». Сторож держит оба
// решения: старая карта не возвращается, а новая озвучка находится по тексту без карты в сборке.
describe('phrase audio lookup — новая озвучка курса без карты в сборке', () => {
  it('старая карта «фраза → mp3» не подключена к поиску клипа', () => {
    const source = fs.readFileSync(path.join(ROOT, 'modules', 'audio', 'phrase_audio_lookup.ts'), 'utf8');
    expect(source).not.toContain('require(');
    expect(source).not.toContain('firebasestorage');
    expect(source).not.toContain('phrase_audio_url_map');
    expect(fs.existsSync(path.join(ROOT, 'app', 'phrase_audio_url_map.generated.ts'))).toBe(false);
  });

  // 11.11: «A long shot» стала записанной фразой дня — пример незаписанного текста заменён
  it.each(['', '   ', 'A purple teapot sings loudly', 'zzz такой фразы в курсе нет'])('для незаписанного текста %j ссылки нет — говорит голос телефона', (text) => {
    expect(getPlayablePhraseAudioUrl(text)).toBeUndefined();
  });

  it('фраза английского курса получает ссылку в папке нового поколения', () => {
    const url = getPlayablePhraseAudioUrl('I am ready.');
    expect(url).toMatch(/phrase-audio%2Fcourse-v1%2Fen%2F[0-9a-f]{16}\.mp3\?alt=media$/);
  });

  it('строка из плиток находит ту же запись, что и фраза курса: запятые, ¿ и внутренняя точка не мешают', () => {
    // зачем: замер 11.11 — без этого находилось 1513 из 1600 фраз английского урока и 1161 из 1600 немецкого
    expect(getPlayablePhraseAudioUrl('Yes I am.')).toBe(getPlayablePhraseAudioUrl('Yes, I am.'));
    expect(getPlayablePhraseAudioUrl('Yes I am.')).toBeDefined();
    expect(getPlayablePhraseAudioUrl('I bought a lamp The lamp is broken.')).toBe(getPlayablePhraseAudioUrl('I bought a lamp. The lamp is broken.'));
    expect(courseVoiceUrl('Estás en casa?', 'es')).toBe(courseVoiceUrl('¿Estás en casa?', 'es'));
    expect(courseVoiceUrl('Estás en casa?', 'es')).toBeDefined();
  });

  it('знак конца различает записи: утверждение и вопрос звучат по-разному', () => {
    expect(courseVoiceText('¿Estás en casa?')).not.toBe(courseVoiceText('Estás en casa.'));
    expect(courseVoiceUrl('¿Estás en casa?', 'es')).not.toBe(courseVoiceUrl('Estás en casa.', 'es'));
  });

  // зачем (владелец 11.11.2026, игра «На слух»: «Да, ElevenLabs»): банки игр держат фразу урока без знака конца.
  // До правки точно находилось 68 фраз из 240 — остальные читал бы голос телефона, хотя запись уже лежит на сервере.
  it('фраза без знака конца находит запись той же фразы с точкой; свой знак конца не подменяется', () => {
    expect(courseVoiceUrl('She is busy', 'en')).toBe(courseVoiceUrl('She is busy.', 'en'));
    expect(courseVoiceUrl('She is busy', 'en')).toBeDefined();
    expect(courseVoiceUrl('zzz такой фразы в курсе нет?', 'en')).toBeUndefined();
    expect(courseVoiceUrl('Estás en casa.', 'es')).not.toBe(courseVoiceUrl('Estás en casa?', 'es'));
  });

  it('каждая фраза игры «На слух» на каждом языке уже записана — доплачивать за запись не нужно', () => {
    for (const lang of COURSE_VOICE_LANGS) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const bank = require(`../modules/games/bank/listen_${lang}`)[`LISTEN_BANK_${lang.toUpperCase()}`] as Record<string, { prompt?: { kind: string; text: string } }[]>;
      const texts = Object.values(bank).flat().map((round) => (round.prompt?.kind === 'audio' ? round.prompt.text : '')).filter(Boolean);
      const missing = texts.filter((text) => !courseVoiceUrl(text, lang));
      expect(texts.length).toBeGreaterThan(0);
      expect({ lang, missing: missing.slice(0, 5), count: missing.length }).toEqual({ lang, missing: [], count: 0 });
    }
  });

  it('один и тот же текст в разных языках — разные записи', () => {
    expect(courseVoiceKey('es', 'no')).not.toBe(courseVoiceKey('it', 'no'));
  });

  it('каждая фраза каждого урока каждого языка записана', () => {
    for (const lang of COURSE_VOICE_LANGS) {
      const missing: string[] = [];
      for (let lesson = 1; lesson <= 32; lesson += 1) {
        const file = path.join(ROOT, 'modules', 'classic-courses', lang, `lessons-${String(lesson).padStart(2, '0')}.json`);
        for (const phrase of JSON.parse(fs.readFileSync(file, 'utf8')).phrases as { target: string }[]) {
          if (!courseVoiceUrl(phrase.target, lang)) missing.push(phrase.target);
        }
      }
      expect({ lang, missing: missing.slice(0, 5), count: missing.length }).toEqual({ lang, missing: [], count: 0 });
    }
  });

  it('список «что записано» цел: ключи по 8 знаков, отсортированы, число совпадает', () => {
    for (const lang of COURSE_VOICE_LANGS) {
      const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'modules', 'audio', 'course-voice-index', `${lang}.json`), 'utf8'));
      expect(index.schema).toBe('phraseman.course-voice-index/1');
      const keys: string[] = index.keys.match(/.{8}/g) ?? [];
      expect(keys.length * 8).toBe(index.keys.length);
      expect(keys.length).toBe(index.count);
      expect([...keys].sort()).toEqual(keys);
    }
  });

  it('ключ произнесённой формы по-прежнему склеивает принятые варианты записи', () => {
    expect(phraseAudioSpokenKey("  I'm   okay ")).toBe(phraseAudioSpokenKey('I am okay'));
  });
});
