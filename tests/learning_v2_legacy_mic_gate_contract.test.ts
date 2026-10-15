// Координатор 15.10 («3/день без исключений»): старый экран занятия открывается внешней ссылкой без runtimeMode=direct_v1
// у не-английского языка, и его микрофон шёл мимо общего дневного счётчика голоса. Сторож: тот же гейт, что у плеера курса.
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'learning-v2', 'session', '[id].tsx'), 'utf8');

describe('старый экран занятия: микрофон на общем лимите голоса', () => {
  it('проверка в кадре нажатия и списание при подтверждённом старте записи', () => {
    expect(src).toContain('useVoiceAttemptGate({ surface: "course_v2", source: "learning_v2_course_voice" })');
    expect(src).toMatch(/if \(command === "start" && !legacyVoiceGate\.canStartAttempt\([\s\S]{0,160}?\)\) \{[\s\S]{0,300}return;/);
    expect(src).toMatch(/outcome\.outcome === "started"\) \{\s*legacyVoiceGate\.commitStartedAttempt\(\);/);
    expect(src).not.toContain('ungated_legacy_mic');
  });
});
