import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('core runtime audit markers', () => {
  it('keeps technical helpers out of locale fallback audit patterns', () => {
    const files = [
      'app/user_id_policy.ts',
      'app/pos_workout_engine.ts',
      'app/mistake_log.ts',
      'app/source_locales.ts',
      'app/lesson_data_types.ts',
    ];

    expect(fs.existsSync(path.join(ROOT, 'app/services/arena_pulse.ts'))).toBe(false);

    for (const file of files) {
      const source = fs.readFileSync(path.join(ROOT, file), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
      expect(source).not.toContain('fallback');
      expect(source).not.toContain('Fallback');
      expect(source).not.toMatch(/return [^;\n]*(?:RU|UK|ES)\b/);
    }
  });
});
