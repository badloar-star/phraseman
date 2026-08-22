import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('MAX memory privacy settings contract', () => {
  it('exposes independent voice consent and learner-owned memory controls', () => {
    const source = read('app/privacy_settings.tsx');
    expect(source).toContain('privacy-ai-voice-consent');
    expect(source).toContain('setAiVoiceConsent');
    expect(source).toContain('recordAiVoiceConsentToCloud');
    expect(source).toContain('privacy-max-memory');
    expect(source).toContain("router.push('/max_memory_settings'");
    expect(source).not.toContain('clearMaxMemory');
  });

  it('registers the screen and all four server-owned callable controls', () => {
    expect(read('app/_layout.tsx')).toContain('<Stack.Screen name="max_memory_settings"');
    const index = read('functions/src/index.ts');
    for (const name of ['maxVoiceGetMemory', 'maxVoiceUpdateMemory', 'maxVoiceDeleteMemoryItem', 'maxVoiceClearMemory']) {
      expect(index).toContain(name);
    }
  });

  it('keeps both personal MAX collections in account deletion', () => {
    const deletion = read('functions/src/account_delete.ts');
    for (const collection of ['voice_tutor_memory', 'voice_call_reviews']) {
      expect(deletion).toContain(`{ collection: '${collection}', field: 'stableUid', values: 'stable' }`);
      expect(deletion).toContain(`{ collection: '${collection}', field: 'authUid', values: 'auth' }`);
    }
  });
});
