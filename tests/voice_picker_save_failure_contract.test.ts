// зачем (аудит Optimistic UI 15.10, решение координатора): экран выбора голоса не молчит при сбое записи — журнал [VOICE-PICK] с причиной, откат выбора/скорости
// на прежнее значение и короткая подсказка; поздний ответ старого тапа не откатывает свежий выбор; загрузка списка не затирает выбор человека и не зависает при отказе.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('экран выбора голоса: сбой записи', () => {
  const src = read('app/flashcards_voice_picker.tsx');

  it('выбор голоса: ждёт результат записи, откатывает на прежнее, показывает подсказку, учитывает номер выбора', () => {
    expect(src).toContain('void setEnVoiceId(voiceId).then((saved) => {');
    expect(src).toContain('откат на ${previous ?? \'авто\'}');
    expect(src).toContain('pickSeqRef.current !== seq');
    expect(src).toContain('notifySaveFailed();');
  });

  it('скорость: запись вне setState-апдейтера, откат на прежние настройки', () => {
    expect(src).toContain('void applyUserSettingsNow(next).then((saved) => {');
    expect(src).not.toMatch(/setSettings\(\(prev\) => \{[^}]*applyUserSettingsNow/s);
    expect(src).toContain('rateSeqRef.current !== seq');
  });

  it('загрузка списка: catch с причиной, loading снимается в finally, выбор человека не затирается', () => {
    expect(src).toContain('[VOICE-PICK] загрузка списка голосов/выбора не удалась');
    expect(src).toMatch(/finally \{\s*if \(!cancelled && !isDevCardsHeld\('voices_loading'\)\) setLoading\(false\);/);
    expect(src).toContain('userPickedRef.current');
  });
});
