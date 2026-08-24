import fs from 'fs';
import path from 'path';

const read = (file: string): string => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('energy start confirmation contract', () => {
  it('opens vocabulary and irregular verbs on training first', () => {
    const menu = read('app/lesson_menu.tsx');
    const words = read('app/lesson_words.tsx');
    const verbs = read('app/lesson_irregular_verbs.tsx');

    expect(menu).toContain("params: { id: lessonId, tab: 'train' }");
    expect(words).not.toContain('lesson-words-tab-train-energy-cost');
    expect(verbs).toContain("userTab !== null ? userTab : 'learn'");
    expect(words).toContain("userTab !== null ? userTab : 'train'");
    expect(verbs).toContain("(['learn', 'dict'] as const).map");
    expect(verbs).not.toContain('irregular-verbs-tab-learn-energy-cost');
  });

  it('uses one shared confirmation gate with distinct outcomes', () => {
    const context = read('components/EnergyContext.tsx');
    const model = read('components/energy_start_confirmation.ts');
    const modal = read('components/EnergyStartConfirmModal.tsx');

    expect(model).toContain("'spent' | 'unlimited' | 'cancelled' | 'insufficient'");
    expect(context).toContain('confirmSpendOne');
    expect(context).toContain('confirmSpendAmount');
    expect(context).toContain('pendingConfirmationRef');
    expect(context).toContain('confirmationCommitInFlightRef');
    expect(context).toContain('createEnergySpendMotionWaiter');
    expect(context).toContain('<EnergyStartConfirmModal');
    expect(model).toContain('Потратить');
    expect(model).toContain('и начать?');
    expect(modal).toContain('accessibilityViewIsModal');
    expect(modal).toContain('color: t.correctText');
  });

  it('routes every direct paid activity entry through confirmation', () => {
    const paidEntryFiles = [
      'app/ai_dialog_session.tsx',
      'app/arena_friend_duel.tsx',
      'app/arena_invite.tsx',
      'app/arena_matchmaking.tsx',
      'app/arena_today.tsx',
      'app/diagnostic_test.tsx',
      'app/exam.tsx',
      'app/flashcards_blitz_session.tsx',
      'app/flashcards_listening_session.tsx',
      'app/flashcards_speaking_session.tsx',
      'app/flashcards_swipe.tsx',
      'app/learning-v2/session/[id].tsx',
      'app/lesson_irregular_verbs.tsx',
      'app/lesson_words.tsx',
      'app/lesson1.tsx',
      'app/level_exam.tsx',
      'app/max_call_prestart.tsx',
      'app/mistake_practice_session.tsx',
      'app/personal_plan_exercise.tsx',
      'app/preposition_drill.tsx',
      'components/level-exam/LevelExamV2.tsx',
    ];

    for (const file of paidEntryFiles) {
      const source = read(file);
      expect(source).toMatch(/confirmSpend(?:One|Amount)|confirm[A-Z][A-Za-z]+Energy/);
      expect(source).not.toMatch(/\bspendOne\s*:/);
      expect(source).not.toMatch(/\bspendAmount\s*[,}]/);
    }
  });

  it('uses the approved premium light-transfer motion', () => {
    const flight = read('components/EnergySpendFlightHost.tsx');
    const tokens = read('constants/motionHybrid.ts');

    expect(tokens).toContain('ENERGY_SPEND_TRANSFER_HYBRID');
    expect(flight).toContain('sourceX');
    expect(flight).toContain('targetX');
    expect(flight).toContain('curveY');
    expect(flight).toContain('impactRing');
    expect(flight).toContain('trailCore');
    expect(flight).toContain('useReduceMotion');
    expect(flight).toContain('useNativeDriver: true');
    expect(flight).toContain('marginRight: 8');
    expect(flight).toContain("emitAppEvent('energy_spend_motion_complete')");
    expect(flight).toContain('measuredTarget');
    expect(tokens).toContain('reducedMotionMs: 160');
  });
});
