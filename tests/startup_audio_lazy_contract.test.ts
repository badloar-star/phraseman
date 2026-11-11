import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(__dirname, '..', 'hooks', 'use-audio.ts'), 'utf8');

test('the home startup graph does not statically evaluate the phrase audio corpus', () => {
  expect(source).not.toMatch(/import\s+\{[^}]*hasPhraseAudio[^}]*\}\s+from\s+['"]\.\/phrase_audio_player['"]/s);
  expect(source).toContain("import('./phrase_audio_player')");
  // зачем: при старте в общую функцию озвучки попадает только крошечный модуль ключа; список «что записано»
  // (course_voice_lookup + json) и плеер грузятся при первом произнесении, а не на первом кадре Главной.
  expect(source).not.toMatch(/from\s+['"][^'"]*course_voice_lookup['"]/);
  expect(source).not.toMatch(/from\s+['"][^'"]*phrase_audio_lookup['"]/);
});

// зачем (владелец 11.11.2026): было «записи только для английской речи и только если не выбран голос телефона»
// (`canUseClip = isEnglish && !requestedVoice`). Решения владельца: «Да, включай» — записи для es/de/fr/it;
// «Если в настройках выбран конкретный голос телефона для языка, нет! убирай голос телефона из настроек вообще» —
// сохранённый выбор голоса запись больше не отменяет. Сторож держит новое правило.
test('a course recording plays for any recorded language and is not cancelled by a saved phone voice', () => {
  expect(source).toContain('const clipLang = courseVoiceLangFromLocale(language);');
  expect(source).toContain('const canUseClip = clipLang !== null && !requestedVoice;');
  expect(source).not.toContain('isEnglish && !requestedVoice');
  expect(source).toContain('hasPhraseAudio(normalized, recordingLang)');
  // сохранённый выбор голоса (настройки, «Карточки») в общей функции озвучки не читается вовсе
  expect(source).not.toContain('speechVoiceId');
  expect(source).not.toContain('peekEnVoiceId');
  expect(source).not.toContain('peekVoiceIdForLocale');
});
