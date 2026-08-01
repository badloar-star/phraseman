import fs from 'fs';
import path from 'path';

import { FRENCH_TARGET_REMOTE_SURFACES } from '../app/french_target_remote_registration';

const ROOT = path.join(__dirname, '..');

describe('retired French remote personal-practice pack', () => {
  it('is no longer registered or shipped as an app runtime', () => {
    expect(FRENCH_TARGET_REMOTE_SURFACES).not.toContain('personal_practice');
    expect(fs.existsSync(path.join(ROOT, 'app/french_personal_practice_remote_runtime.ts'))).toBe(false);
  });

  it('is not imported by any trainer runtime boundary', () => {
    for (const relativePath of [
      'app/trainer_store.ts',
      'app/trainer_practice_prefetch.ts',
      'app/trainer_words_session.tsx',
      'app/trainer_phrases_session.tsx',
    ]) {
      const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
      expect(source).not.toContain('french_personal_practice_remote_runtime');
      expect(source).not.toContain('ensureFrenchRemotePersonalPractice');
      expect(source).not.toContain('getCachedFrenchRemotePersonalPractice');
    }
  });
});
