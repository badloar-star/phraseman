import fs from 'node:fs';
import path from 'node:path';

import { getPlayablePhraseAudioUrl, phraseAudioSpokenKey } from '../modules/audio/phrase_audio_lookup';

const ROOT = path.resolve(__dirname, '..');

// зачем (владелец 11.11.2026, «удали всю озвучку»): готовых клипов фраз больше нет,
// фразы читает только голос телефона. Сторож не даёт карте клипов вернуться незаметно.
describe('phrase audio lookup — готовых клипов нет', () => {
  it.each(['A long shot', "I'm okay", 'I am okay', '', '   '])('не отдаёт ссылку на клип для %j', (text) => {
    expect(getPlayablePhraseAudioUrl(text)).toBeUndefined();
  });

  // зачем: проверки «файл карты удалён» здесь нет намеренно — владелец 11.11 делает новую озвучку,
  // и её карта может лечь под тем же именем. Сторожим только то, что старая карта не подключена.
  it('старая карта «фраза → mp3» не подключена к поиску клипа', () => {
    const source = fs.readFileSync(path.join(ROOT, 'modules', 'audio', 'phrase_audio_lookup.ts'), 'utf8');
    expect(source).not.toContain('require(');
    expect(source).not.toContain('firebasestorage');
  });

  it('ключ произнесённой формы по-прежнему склеивает принятые варианты записи', () => {
    expect(phraseAudioSpokenKey("  I'm   okay ")).toBe(phraseAudioSpokenKey('I am okay'));
  });
});
