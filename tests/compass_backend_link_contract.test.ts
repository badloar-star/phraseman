import { readFileSync } from 'fs';
import { join } from 'path';

const read = (...parts: string[]) => readFileSync(join(__dirname, '..', ...parts), 'utf8');

describe('Compass backend link contract', () => {
  it('keeps the client callable, Functions export, cache implementation, and rules connected', () => {
    const client = read('app', 'compass', 'compass_voice_client.ts');
    const functionsIndex = read('functions', 'src', 'index.ts');
    const cache = read('functions', 'src', 'compass', 'compass_cache.ts');
    const rules = read('firestore.rules');

    expect(client).toMatch(/httpsCallable<CompassVoiceRequest, CompassVoiceResponse>\([\s\S]*?'compassGenerate'/);
    expect(functionsIndex).toContain("const { compassGenerate } = require('./compass')");
    expect(functionsIndex).toContain('exports.compassGenerate = compassGenerate');
    expect(cache).toContain("COMPASS_COLLECTION = 'compass_briefings'");
    expect(cache).toContain('collection(COMPASS_COLLECTION)');
    expect(rules).toMatch(/match \/compass_briefings\/\{hash\}[\s\S]*?allow read: if true;[\s\S]*?allow create, update: if false;/);
  });
});
