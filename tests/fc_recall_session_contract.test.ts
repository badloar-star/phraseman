import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (...parts: string[]) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');

describe('full-phrase recall session contract', () => {
  test('uses the same Cards session shell, HUD, rewards and result screen', () => {
    const file = path.join(ROOT, 'app', 'flashcards_recall_session.tsx');
    expect(fs.existsSync(file)).toBe(true);
    if (!fs.existsSync(file)) return;

    const source = fs.readFileSync(file, 'utf8');
    expect(source).toContain('SessionAttemptsHud');
    expect(source).toContain('useSessionAttempts');
    expect(source).toContain('useSessionAttemptAutoReset');
    expect(source).toContain('hydrated: attempts.hydrated');
    expect(source).toContain('PracticeRuneCounter');
    expect(source).toContain('LearningV2RuneFlight');
    expect(source).toContain('SessionResultScreen');
    expect(source).toContain('TextInput');
    expect(source).toContain('NoEnergyModal');
    expect(source).toContain('isFullPhraseFuzzyCorrect');
    expect(source).toContain('styles.focusCard');
    expect(source).toContain('styles.compactInputShell');
    expect(source).toContain('fc-recall-hint');
    expect(source).toContain('fc-recall-guidance');
    expect(source).toContain('automaticallyAdjustKeyboardInsets');
    expect(source).not.toContain('styles.promptCard');
    expect(source).not.toContain('SessionAttemptsRecoveryModal');
    expect(source).not.toContain('Попытки закончились');
  });

  test('result screen animates both counts and the rune settlement flight', () => {
    const source = read('app', 'flashcards', 'SessionResultScreen.tsx');
    expect(source).toContain('AnimatedCountUpText');
    expect(source).toContain('usePracticeRuneFlight');
    expect(source).toContain('LearningV2RuneFlight');
    expect(source).not.toContain('listeningStats');
    expect(source).not.toContain('карточек прослушано');
    expect(source).not.toContain('Отличная работа');
    expect(source).not.toContain('Награда уже в пути');
  });

  test('durably authorizes the exact Recall manifest before making the session playable', () => {
    const source = read('app', 'flashcards_recall_session.tsx');
    const prepared = source.indexOf('prepareFlashcardTrainingPendingGrant({');
    const energy = source.indexOf('confirmSpendOne(restored.energyIntent)');
    const quota = source.indexOf('consumeFlashcardTrainingQuota({');
    const playable = source.indexOf('resetRound(restored.round, true)');
    const markedPlayable = source.indexOf('markFlashcardTrainingPendingGrantPlayable(');
    const acknowledged = source.indexOf('acknowledgeAndClearFlashcardTrainingPendingGrant(');

    expect(prepared).toBeGreaterThan(-1);
    expect(energy).toBeGreaterThan(prepared);
    expect(quota).toBeGreaterThan(energy);
    expect(playable).toBeGreaterThan(quota);
    expect(markedPlayable).toBeGreaterThan(playable);
    expect(acknowledged).toBeGreaterThan(markedPlayable);
    expect(source).toContain("mode: 'recall' as const");
    expect(source).toContain('payload: JSON.parse(JSON.stringify({ round, energyIntent }))');
    expect(source).toContain('receiptId: pendingRecord.receiptId');
    expect(source).toContain('if (cancelled || recallExplicitlyAbandonedRef.current) return;');
    expect(source).toContain('return () => {\n      cancelled = true;\n    };');
    expect(source).not.toContain('createChargedOperationGuard');
  });
});
