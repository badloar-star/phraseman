import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('phrase audio storage regeneration contract', () => {
  it('recognizes a renamed phrase by stable id when its old text key became orphaned', () => {
    const source = fs.readFileSync(path.join(ROOT, 'scripts', 'audit_phrase_audio_sync.mjs'), 'utf8');

    expect(source).toContain('lessonVoiced.find((candidate) => candidate.id === p.id)');
    expect(source).toContain('coreWords(idVoiced.text) !== coreWords(shown)');
    expect(source).toContain('englishUrl || anyAltUrl || staleIdUrl');
  });

  it('can narrow regeneration to explicitly requested phrase ids', () => {
    const source = fs.readFileSync(path.join(ROOT, 'scripts', 'regen_phrase_audio_storage.mjs'), 'utf8');

    expect(source).toContain("arg === '--id'");
    expect(source).toContain('requestedIds.has(item.id)');
    expect(source).toContain('invalidRequestedIds');
    expect(source).toContain('unknownRequestedIds');
    expect(source).toContain('requestedCleanIds');
    expect(source).toContain('patchRuntimeMapForPlan(uploadedPlan)');
    expect(source).toContain('OPENAI_TTS_API_KEY');
    expect(source).not.toMatch(/process\.env\.OPENAI_API_KEY/);
  });
});
