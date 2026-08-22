import fs from 'node:fs';
import path from 'node:path';

import { shouldApplyMaxVoiceMemoryUpdate } from './max_voice_finalize';

const src = (name: string) => fs.readFileSync(path.join(__dirname, name), 'utf8');
const repo = (...parts: string[]) => fs.readFileSync(path.resolve(__dirname, '..', '..', ...parts), 'utf8');

describe('MAX voice privacy lifecycle contract', () => {
  test('a clear tombstone wins over every conversation that started before it', () => {
    expect(shouldApplyMaxVoiceMemoryUpdate(9_999, 10_000)).toBe(false);
    expect(shouldApplyMaxVoiceMemoryUpdate(10_000, 10_000)).toBe(false);
    expect(shouldApplyMaxVoiceMemoryUpdate(10_001, 10_000)).toBe(true);
    expect(shouldApplyMaxVoiceMemoryUpdate(10_001, 0)).toBe(true);
    expect(shouldApplyMaxVoiceMemoryUpdate(0, 10_000)).toBe(false);
  });

  test('durable MAX documents and logs never contain the full conversation or audio', () => {
    const finalize = src('max_voice_finalize.ts');
    const sessionEnd = src('max_voice_session_end.ts');
    expect(finalize).not.toMatch(/console\.(?:log|info|warn|error)\([^\n]*(?:request|history|transcript|userText|assistantText)/i);
    expect(sessionEnd).not.toMatch(/console\.(?:log|info|warn|error)\([^\n]*(?:request|history|transcript|audio|utterance|userText|assistantText)/i);

    const billingWrite = sessionEnd.slice(
      sessionEnd.indexOf(`db.collection(VOICE_BILLING_COLLECTION).doc().set({`),
      sessionEnd.indexOf('});', sessionEnd.indexOf(`db.collection(VOICE_BILLING_COLLECTION).doc().set({`)) + 3,
    );
    for (const forbidden of ['history', 'transcript', 'audio', 'utterance', 'userText', 'assistantText']) {
      expect(billingWrite).not.toMatch(new RegExp(`\\b${forbidden}\\s*:`));
    }
  });

  test('clear is durable, account deletion covers receipts and memory, and privacy copy is explicit', () => {
    const controls = src('max_voice_memory_controls.ts');
    expect(controls).toContain('memoryClearedAtMs');
    expect(controls).not.toContain('ref(authUid, stableUid).delete()');

    const deletion = src('account_delete.ts');
    expect(deletion).toContain("{ collection: 'voice_tutor_memory', field: 'stableUid', values: 'stable' }");
    expect(deletion).toContain("{ collection: 'voice_call_reviews', field: 'stableUid', values: 'stable' }");

    const policy = `${repo('app', 'legal', 'privacy_policy_en.json')}\n${repo('app', 'legal', 'privacy_policy_en_ios.json')}`;
    expect(policy).toContain('full transcript is not retained');
    expect(policy).toContain('delete individual notes, clear all MAX memory in the App');
  });
});
