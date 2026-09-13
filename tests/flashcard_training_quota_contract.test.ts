import fs from 'fs';
import path from 'path';

const read = (relative: string): string => fs.readFileSync(path.join(process.cwd(), relative), 'utf8');

describe('Revenue VNext flashcard training quota wiring', () => {
  const direct = [
    ['app/flashcards_swipe.tsx', "mode: 'swipe'", 'setPhase(\'play\')'],
    ['app/flashcards_blitz_session.tsx', "mode: 'blitz'", 'setEnergyGate(\'ok\')'],
    ['app/flashcards_recall_session.tsx', "mode: 'recall'", 'resetRound(cards)'],
    ['app/flashcards_speaking_session.tsx', "mode: 'speaking'", 'setSession(initialSpeakingState(cards))'],
  ] as const;

  test.each(direct)('%s consumes only at the successful session boundary', (file, mode, grantMarker) => {
    const source = read(file);
    expect(source).toContain("import { consumeFlashcardTrainingQuota");
    expect(source).toContain(mode);
    expect(source).toContain("quotaResult.status === 'exhausted'");
    expect(source).toContain("quotaResult.status !== 'allowed'");
    expect(source).toContain("'quota_refused'");
    expect(source.indexOf('consumeFlashcardTrainingQuota')).toBeLessThan(source.lastIndexOf(grantMarker));
  });

  test('retry/resume identities are stable while a new Blitz round gets a new receipt', () => {
    const swipe = read('app/flashcards_swipe.tsx');
    const blitz = read('app/flashcards_blitz_session.tsx');
    const recall = read('app/flashcards_recall_session.tsx');
    const speaking = read('app/flashcards_speaking_session.tsx');
    expect(swipe).toContain('receiptId: `swipe:${attemptSessionId}`');
    expect(blitz).toContain('receiptId: `blitz:${feedbackAttemptId}:${roundId}`');
    expect(recall).toContain('receiptId: `recall:${attemptSessionId}`');
    expect(speaking).toContain('receiptId: `speaking:${attemptSessionId}`');
    expect(swipe.indexOf('const resumePendingDraft')).toBeLessThan(swipe.lastIndexOf('consumeFlashcardTrainingQuota'));
  });

  test.each([
    'app/flashcards/FlashcardsHubScreen.tsx',
    'app/flashcards_training_setup.tsx',
  ])('%s previews quota and never consumes it', (file) => {
    const source = read(file);
    expect(source).toContain('useFlashcardTrainingQuotaPreview');
    expect(source).not.toContain('consumeFlashcardTrainingQuota');
  });

  test('shared quota exhaustion uses the flashcard-training paywall context for Speaking too', () => {
    const hub = read('app/flashcards/FlashcardsHubScreen.tsx');
    const speaking = read('app/flashcards_speaking_session.tsx');
    expect(hub).toContain("openTrainingPaywall('flashcard_training', 'flashcards_hub_speaking')");
    expect(hub).not.toContain("openTrainingPaywall('speaking', 'flashcards_hub_speaking')");
    expect(speaking).toContain("context: 'flashcard_training', source: 'flashcards_speaking_direct'");
    expect(speaking).not.toContain("context: 'speaking', source: 'flashcards_speaking_direct'");
  });

  test('quota-authorized Flashcard Speaking bypasses only the nested microphone gate', () => {
    const screen = read('app/flashcards_speaking_session.tsx');
    const button = read('app/flashcards/SpeakHoldButton.tsx');
    expect(screen).toContain('sessionAuthorized={quotaSessionAuthorized}');
    expect(screen).toContain('setQuotaSessionAuthorized(true)');
    expect(button).toContain('sessionAuthorized?: boolean;');
    // 2026-09-13: вне авторизованной сессии действует дневной лимит голоса (useSpeakingAttemptGate).
    expect(button).toContain('const speakingAllowed = sessionAuthorized || !speakingGate.locked;');
    // Вход в запись решает гейт дневного лимита (а не булев премиум-флаг),
    // отпускание завершает ТОЛЬКО начатое удержание — иначе поздний onHoldEnd
    // приходил после отказа гейта.
    expect(button).toContain('if (!sessionAuthorized && !speakingGate.tryStartAttempt())');
    expect(button).toContain('if (!holdStartedRef.current) return;');
    expect(button).toContain('{!speakingAllowed ? (');
  });

  test('Recall and Speaking synchronously take a charged energy operation before every refund', () => {
    const recall = read('app/flashcards_recall_session.tsx');
    const speaking = read('app/flashcards_speaking_session.tsx');
    for (const source of [recall, speaking]) {
      expect(source).toContain('createChargedOperationGuard()');
      expect(source).toContain('.take()');
      expect(source).not.toContain('if (chargedOperationId && !entryGranted)');
    }
  });

  test('Swipe and Blitz clear their charged ref before invoking the refund adapter', () => {
    const swipe = read('app/flashcards_swipe.tsx');
    const blitz = read('app/flashcards_blitz_session.tsx');
    expect(swipe).toMatch(/const operationId = activeSwipeSpentOperationRef\.current;[\s\S]*?activeSwipeSpentOperationRef\.current = null;[\s\S]*?await refundSwipeEnergy/);
    expect(blitz).toMatch(/const operationId = blitzSpentOperationRef\.current;[\s\S]*?blitzSpentOperationRef\.current = null;[\s\S]*?await refundBlitzEnergy/);
  });

  test('keeps the existing saved-card cap unchanged', () => {
    const source = read('hooks/use-flashcards.ts');
    expect(source).toContain('export const FREE_FLASHCARD_LIMIT = 20;');
  });
});
