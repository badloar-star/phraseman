import fs from 'node:fs';
import path from 'node:path';

describe('MAX voice consent callable contract', () => {
  test('records a dedicated aiVoiceConsent field through the shared factory', () => {
    const source = fs.readFileSync(path.join(__dirname, 'record_ai_voice_consent.ts'), 'utf8');
    expect(source).toContain("createRecordAiConsentCallable('aiVoiceConsent')");
  });

  test('is exported from the Functions entrypoint', () => {
    const source = fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8');
    expect(source).toContain('recordAiVoiceConsent');
    expect(source).toContain('record_ai_voice_consent');
  });
});
