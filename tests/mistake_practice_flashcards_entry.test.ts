import fs from 'node:fs';
import path from 'node:path';
import { FC_TRAIN_OPTIONS, visibleFcTrainOptions } from '../app/flashcards/tabbar_state';

// зачем: капсула «Карточек» (FlashcardsTabBar) удалена как мёртвый код 2.0 — меню
// тренировки живёт в tabbar_state; проверки исходника капсулы сняты вместе с ней.
const read = (relativePath: string): string =>
  fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

describe('Cards training menu after Errors moved to Home', () => {
  test('contains only card-native training modes', () => {
    expect(FC_TRAIN_OPTIONS).toEqual(['train', 'speak', 'blitz']);
    expect(visibleFcTrainOptions(0, { speakingEnabled: false })).toEqual(['train', 'blitz']);
  });

  test('mistake practice keeps its own paywall context outside Cards', () => {
    expect(read('app/premium_context.ts')).toContain("| 'mistake_practice'");
    expect(read('app/paywall_copy.ts')).toContain('mistake_practice: {');
  });
});
