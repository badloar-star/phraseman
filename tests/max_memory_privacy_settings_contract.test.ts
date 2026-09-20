import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('text tutor memory privacy settings contract', () => {
  it('exposes independent voice consent and a separate teacher-memory entry', () => {
    const source = read('app/privacy_settings.tsx');
    expect(source).toContain('privacy-ai-voice-consent');
    expect(source).toContain('setAiVoiceConsent');
    expect(source).toContain('recordAiVoiceConsentToCloud');
    expect(source).toContain('privacy-tutor-memory');
    expect(source).toContain("router.push('/max_memory_settings'");
    expect(source).not.toContain('privacy-max-memory');
    expect(source).not.toContain('clearMaxMemory');
  });

  it('registers the screen and deploys text controls without unsealing MAX', () => {
    expect(read('app/_layout.tsx')).toContain('<Stack.Screen name="max_memory_settings"');
    const defaultIndex = read('functions/src/index.ts');
    for (const name of ['tutorTextGetMemory', 'tutorTextUpdateMemory', 'tutorTextDeleteMemoryItem', 'tutorTextClearMemory']) {
      expect(defaultIndex).toContain(`exports.${name} = ${name};`);
    }
    const maxExecutable = read('functions-max/index.ts').split(/\r?\n/)
      .filter((line) => !line.trimStart().startsWith('//')).join('\n');
    expect(maxExecutable).not.toMatch(/maxVoice(?:Get|Update|Delete|Clear)Memory/);
  });

  it('keeps both personal MAX collections in account deletion', () => {
    const deletion = read('functions/src/account_delete.ts');
    for (const collection of ['voice_tutor_memory', 'voice_call_reviews']) {
      expect(deletion).toContain(`{ collection: '${collection}', field: 'stableUid', values: 'stable' }`);
      expect(deletion).toContain(`{ collection: '${collection}', field: 'authUid', values: 'auth' }`);
    }
  });
});
