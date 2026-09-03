import fs from 'node:fs';
import path from 'node:path';
import { FC_TRAIN_OPTIONS, visibleFcTrainOptions } from '../app/flashcards/tabbar_state';

const source = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'flashcards', 'FlashcardsTabBar.tsx'),
  'utf8',
);
const read = (relativePath: string): string =>
  fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

describe('Cards training menu after Errors moved to Home', () => {
  test('contains only card-native training modes', () => {
    expect(FC_TRAIN_OPTIONS).toEqual(['train', 'listen', 'speak', 'blitz']);
    expect(visibleFcTrainOptions(0, { speakingEnabled: false })).toEqual(['train', 'listen', 'blitz']);
  });

  test('does not load or render the mistake-practice entry from Cards', () => {
    expect(source).not.toContain('MistakePracticeSetupSheet');
    expect(source).not.toContain('mistakeReadyCount');
    expect(source).not.toContain("option === 'errors'");
    expect(source).not.toContain("context: 'mistake_practice'");
    expect(read('app/premium_context.ts')).toContain("| 'mistake_practice'");
    expect(read('app/paywall_copy.ts')).toContain('mistake_practice: {');
    expect(source).not.toContain('fc-tabbar-train-option-errors');
    expect(source).not.toMatch(/mistakeVoiceReadyCount|voiceReadyCount|voiceOnly|voice_only/);
    expect(source).not.toContain('getMistakePracticeReadyCount');
    expect(source).not.toContain('loadMistakeEventJournal');
    expect(source).not.toContain('projectMistakes');
    expect(source).not.toContain('selectMistakesForSession');
  });
});
