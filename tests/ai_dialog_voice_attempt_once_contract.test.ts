// Ревизор/координатор 15.10: в ИИ-диалоге одно удержание микрофона = одна попытка голоса у Free.
// Раньше commitStartedAttempt звался на КАЖДОЕ событие 'start' движка: повторный 'start' в той же сессии захвата
// списывал вторую попытку, а OEM без 'start' (сразу result) не списывали вовсе.
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'ai_dialog_session.tsx'), 'utf8');

describe('ИИ-диалог: списание голоса один раз на сессию захвата', () => {
  it('списание только через commitAttemptOnce с флагом сессии и логом [VOICE-LIMIT]', () => {
    expect(src.match(/voiceInputGate\.commitStartedAttempt\(\)/g)).toHaveLength(1);
    expect(src).toMatch(/let attemptCommitted = false;[\s\S]{0,700}if \(attemptCommitted\) return;\s*attemptCommitted = true;\s*voiceInputGate\.commitStartedAttempt\(\);/);
    expect(src).toContain('[VOICE-LIMIT] ai_dialog engine_');
  });

  it("и 'start', и первый result при удержании идут через одно списание", () => {
    expect(src).toMatch(/addListener\('start'[\s\S]{0,600}commitAttemptOnce\('start'\)/);
    expect(src).toMatch(/addListener\('result'[\s\S]{0,400}commitAttemptOnce\('result'\)/);
  });
});
