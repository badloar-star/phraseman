import fs from 'node:fs';
import path from 'node:path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { countAvailableVocabularyWords } from '../app/daily_tasks';
import { isMojibake } from '../app/trainer_store';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/config', () => ({ IS_EXPO_GO: true, CLOUD_SYNC_ENABLED: false }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
jest.mock('../app/premium_guard', () => ({ getVerifiedPremiumStatus: jest.fn(async () => false) }));
jest.mock('../app/lifetime_profile_stats', () => ({
  bumpLifetimeShardsEarned: jest.fn(),
  bumpLifetimeShardsSpent: jest.fn(),
}));
jest.mock('../app/lesson_words', () => ({
  LESSONS_WITH_WORDS: new Set([1]),
  WORD_KEYS_BY_LESSON: { 1: new Set(['already known', 'still new']) },
}));

describe('reported user data integrity', () => {
  it('recognizes Cyrillic mojibake from legacy trainer records', () => {
    expect(isMojibake('\u00d0\u00a3 \u00d0\u00bc\u00d0\u00b5\u00d1\u008f \u00d0\u00b5\u00d1\u0081\u00d1\u0082\u00d1\u008c')).toBe(true);
    expect(isMojibake('\u0423 \u043c\u0435\u043d\u044f \u0435\u0441\u0442\u044c \u0441\u043b\u043e\u0432\u043e')).toBe(false);
    expect(isMojibake('a\u00f1o')).toBe(false);
  });

  it('counts only vocabulary items that are not completed', async () => {
    (AsyncStorage.multiGet as jest.Mock).mockResolvedValue([
      ['lesson1_words', JSON.stringify({ 'already known': 3, 'still new': 1 })],
    ]);
    await expect(countAvailableVocabularyWords()).resolves.toBe(1);
  });

  it('keeps a pronunciation-only override separate from visible lesson text', () => {
    const audioSource = fs.readFileSync(path.join(__dirname, '..', 'hooks', 'use-audio.ts'), 'utf8');
    const lessonSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson1.tsx'), 'utf8');
    expect(audioSource).toContain('speechText?: string');
    expect(lessonSource).toContain("return line.replace(/\\bread\\b/i, 'reed');");
    expect(lessonSource).toContain('speechText: pronunciationOverrideForLessonPhrase(line)');
  });

  it('uses the natural birthday sentence consistently in lesson content', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson_data_1_8_phrases_source.ts'), 'utf8');
    const generated = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson_data_1_8_phrases_es.gen.ts'), 'utf8');
    const theory = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson_help_theory_data.tsx'), 'utf8');
    const traps = fs.readFileSync(path.join(__dirname, '..', 'app', 'error_traps', 'error_traps_1_8.ts'), 'utf8');
    expect(source).toContain("english: 'His birthday is in October'");
    expect(generated).toContain("english: 'His birthday is in October'");
    expect(theory).toContain('His birthday is in October');
    const trapStart = traps.indexOf('His birthday is in October');
    const trapEnd = traps.indexOf('// 35:', trapStart);
    expect(trapStart).toBeGreaterThanOrEqual(0);
    expect(trapEnd).toBeGreaterThan(trapStart);
    expect(traps.slice(trapStart, trapEnd)).not.toContain('has a birthday');
  });

  it('keeps every audit comment and public draft free of internal diagnostics', () => {
    const audit = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'reports', 'user_error_reports_audit_2026-07-10.json'), 'utf8')) as Array<{ comment: string }>;
    const replies = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'replies_batch_2026-07-10.json'), 'utf8')) as Array<{ body: string }>;
    expect(audit).toHaveLength(48);
    expect(audit.every((row) => row.comment.trim().length > 0)).toBe(true);
    for (const row of replies) {
      expect(row.body).not.toMatch(/dataId|contentId|TextInput|watchdog|escape-path|device-repro|report №|забери 0 оскол/);
      expect(row.body).not.toMatch(/\.\s*\./);
    }
  });
});
