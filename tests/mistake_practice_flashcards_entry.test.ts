import fs from 'node:fs';
import path from 'node:path';
import { FC_TRAIN_OPTIONS, visibleFcTrainOptions } from '../app/flashcards/tabbar_state';

const source = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'flashcards', 'FlashcardsTabBar.tsx'),
  'utf8',
);
const read = (relativePath: string): string =>
  fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

describe('Cards Errors entry', () => {
  test('places Errors first in the training menu and never hides it with speaking', () => {
    expect(FC_TRAIN_OPTIONS[0]).toBe('errors');
    expect(visibleFcTrainOptions(0, { speakingEnabled: false })).toContain('errors');
  });

  test('shows exact count, Plus gate and setup sheet from the tabbar', () => {
    expect(source).toContain('MistakePracticeSetupSheet');
    expect(source).toContain('mistakeReadyCount');
    expect(source).toContain('hasPremiumAccess');
    expect(source).toContain("context: 'mistake_practice'");
    expect(read('app/premium_context.ts')).toContain("| 'mistake_practice'");
    expect(read('app/paywall_copy.ts')).toContain('mistake_practice: {');
    expect(source).toContain('fc-tabbar-train-option-errors');
    expect(source).not.toMatch(/mistakeVoiceReadyCount|voiceReadyCount|voiceOnly|voice_only/);
    expect(source).toContain('getMistakePracticeReadyCount');
    expect(source).not.toContain('loadMistakeEventJournal');
    expect(source).not.toContain('projectMistakes');
    expect(source).not.toContain('selectMistakesForSession');
  });
});
