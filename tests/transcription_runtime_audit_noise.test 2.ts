import fs from 'fs';
import path from 'path';
import { getTranscription } from '../app/transcription';

describe('transcription runtime audit markers', () => {
  it('keeps English IPA approximation free of locale fallback markers', () => {
    const source = fs.readFileSync(path.join(__dirname, '../app/transcription.ts'), 'utf8');

    expect(source).not.toContain('fallback');
    expect(source).not.toContain('Fallback');
    expect(getTranscription('unlistedword')).toMatch(/^\/.+\/$/);
    expect(getTranscription('')).toBe('');
  });
});
