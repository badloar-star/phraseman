import fs from 'fs';
import path from 'path';

const read = (relativePath: string): string =>
  fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

describe('MAX voice consent contract', () => {
  test('uses a dedicated local key and cloud callable', () => {
    const source = read('app/max_voice_consent.ts');
    expect(source).toContain("createAiConsentModule('ai_voice_consent_v1', 'recordAiVoiceConsent')");
    expect(source).toContain('isAiVoiceConsentGranted');
    expect(source).toContain('hydrateAiVoiceConsentFromStorage');
  });

  test('uses the shared Hybrid consent sheet with all eight languages', () => {
    const source = read('components/MaxVoiceConsentModal.tsx');
    expect(source).toContain('AiConsentSheetModal');
    expect(source).toContain('motionVariant="hybrid"');
    for (const locale of ['ru:', 'uk:', 'es:', "'pt-BR':", 'vi:', 'id:', 'tr:', 'pl:']) {
      expect(source).toContain(locale);
    }
    expect(source).toContain('Это диалог с искусственным интеллектом, который обрабатывает ваш голос.');
    expect(source).not.toContain('сохраняются');
    expect(source).not.toContain('не сохраняются');
  });

  test('hydrates before the first MAX entry', () => {
    const layout = read('app/_layout.tsx');
    expect(layout).toContain("import { hydrateAiVoiceConsentFromStorage } from './max_voice_consent'");
    expect(layout).toContain('hydrateAiVoiceConsentFromStorage().catch(() => {})');
  });
});
