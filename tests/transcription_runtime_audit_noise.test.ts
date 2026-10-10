import fs from 'fs';
import path from 'path';
import { getTranscription } from '../app/transcription';

describe('transcription runtime audit markers', () => {
  it('keeps English IPA approximation free of locale fallback markers', () => {
    const source = fs.readFileSync(path.join(__dirname, '../app/transcription.ts'), 'utf8');

    expect(source).not.toContain('fallback');
    expect(source).not.toContain('Fallback');
    // зачем (10.10): «правда или молчание» (21.09) — неизвестное длинное слово не выдумывается, а молчит.
    expect(getTranscription('unlistedword')).toBe('');
    expect(getTranscription('')).toBe('');
  });
});
