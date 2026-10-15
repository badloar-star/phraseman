import fs from 'fs';
import path from 'path';

const read = (relative: string): string => fs.readFileSync(path.join(process.cwd(), relative), 'utf8');

// зачем (03.10, законный сдвиг): квоту тренировок теперь списывает consumeMonthlyTrainingSession
// (app/monthly_training_sessions.ts) вместо удалённой consumeFlashcardTrainingQuota; отказ уходит в
// ветку else после `=== 'allowed'`; обычный старт «Вспомни» — resetRound(restoredRound, true) (03.10: компактный manifest, карточки восстанавливаются по отпечаткам).
// Смысл сторожа прежний: квота списывается только перед успешным стартом сессии.
const QUOTA_CONSUMER = 'consumeMonthlyTrainingSession';

describe('Revenue VNext flashcard training quota wiring', () => {
  const direct = [
    ['app/flashcards_swipe.tsx', "mode: 'swipe'", 'setPhase(\'play\')'],
    ['app/flashcards_blitz_session.tsx', "mode: 'blitz'", 'setEnergyGate(\'ok\')'],
    ['app/flashcards_recall_session.tsx', "mode: 'recall'", 'resetRound(restoredRound, true)'],
    ['app/flashcards_speaking_session.tsx', "mode: 'speaking'", 'setSession(initialSpeakingState(restoredCards))'],
  ] as const;

  test.each(direct)('%s consumes only at the successful session boundary', (file, mode, grantMarker) => {
    const source = read(file);
    expect(source).toMatch(new RegExp(`import \\{[^}]*\\b${QUOTA_CONSUMER}\\b`));
    expect(source).toContain(mode);
    expect(source).toContain("quotaResult.status === 'exhausted'");
    expect(source).toContain("quotaResult.status === 'allowed'");
    expect(source).toContain("'quota_refused'");
    expect(source.indexOf(`await ${QUOTA_CONSUMER}(`)).toBeGreaterThan(-1);
    expect(source.indexOf(`await ${QUOTA_CONSUMER}(`)).toBeLessThan(source.lastIndexOf(grantMarker));
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
    expect(swipe.indexOf('const resumePendingDraft')).toBeLessThan(swipe.lastIndexOf(QUOTA_CONSUMER));
  });

  test.each([
    'app/flashcards/FlashcardsHubScreen.tsx',
    'app/flashcards_training_setup.tsx',
  ])('%s previews quota and never consumes it', (file) => {
    const source = read(file);
    expect(source).toContain('useFlashcardTrainingQuotaPreview');
    expect(source).not.toContain(QUOTA_CONSUMER);
  });

  test('monthly quota exhaustion disables Hub entry without reviving a purchase gate', () => {
    const hub = read('app/flashcards/FlashcardsHubScreen.tsx');
    const speaking = read('app/flashcards_speaking_session.tsx');
    expect(hub).toContain('quotaPreview.limit');
    expect(hub).toContain('limitLabel');
    // зачем (законный сдвиг, §90 + D152): кнопка «Тренировка» больше НЕ бывает disabled — при исчерпанном
    // лимите (замок) она ведёт в единый пейвол, пока квота грузится — открывает окно и ждёт (early_tap).
    // Прежняя проверка `disabled={trainingLocked || !trainingEntryReady}` охраняла отменённое поведение.
    expect(hub).not.toContain('disabled={trainingLocked || !trainingEntryReady}');
    expect(hub).toContain("openTrainingPaywall('flashcard_training', 'flashcards_hub_train')");
    expect(speaking).toContain("quotaResult.status === 'exhausted'");
    expect(speaking).toContain("pathname: '/flashcards_training_setup'");
    expect(speaking).not.toContain('premium_modal');
  });

  test('quota-authorized Flashcard Speaking bypasses only the nested microphone gate', () => {
    const screen = read('app/flashcards_speaking_session.tsx');
    const button = read('app/flashcards/SpeakHoldButton.tsx');
    expect(screen).toContain('sessionAuthorized={quotaSessionAuthorized}');
    expect(screen).toContain('setQuotaSessionAuthorized(true)');
    expect(button).toContain('sessionAuthorized?: boolean;');
    // зачем (владелец 15.10, D196): голос — ОДИН общий дневной счётчик 3/день на все микрофоны, без исключений: прежний гейт кнопки (серверная квота «speaking»)
    // и обход для авторизованной карточной сессии убраны; гейт и цифра остатка приходят от хозяина через `allowance` (плеер курса) или живут в значке (MicAllowanceBadge).
    expect(button).not.toContain('hooks/useSpeakingAttemptGate');
    expect(button).not.toContain('const speakingAllowed =');
    // отпускание завершает ТОЛЬКО начатое удержание — иначе поздний onHoldEnd приходил после отказа.
    expect(button).toContain('if (!holdStartedRef.current) return;');
    // зачем (04.10, §SPEECH-NA): на телефоне без распознавания речи значок остатка/PLUS не показываем — кнопка уже перечёркнута.
    expect(button).toContain('{allowance && !speechNa ? (');
  });

  // зачем (законный сдвиг, 03.10): createChargedOperationGuard() в «Вспомни»/«Устно» заменён защитой
  // уровнем ниже: возврат идёт ТОЛЬКО через abandonFlashcardTrainingPendingGrant, а тот атомарно «занимает»
  // возврат в журнале (energyState → refund_in_progress), второй вызов получает refund_in_progress и
  // adapter НЕ вызывает. Поведение доказано тестом «explicit abandon refunds once…» в
  // tests/flashcard_training_pending_grant.test.ts (два конкурентных abandon → один refund).
  // Здесь сторожим проводку: экран не зовёт адаптер возврата напрямую, мимо журнала.
  test('Recall and Speaking refund energy only through the journal-claimed abandon (no direct refund calls)', () => {
    const recall = read('app/flashcards_recall_session.tsx');
    const speaking = read('app/flashcards_speaking_session.tsx');
    expect(recall).not.toContain('createChargedOperationGuard');
    expect(recall).not.toMatch(/refundOne\(/);
    expect(recall.match(/abandonFlashcardTrainingPendingGrant\(/g)?.length).toBeGreaterThanOrEqual(3);
    // «Устно» дополнительно схлопывает параллельные возвраты одним промисом (speakingRefundInFlightRef).
    expect(speaking).toContain('speakingRefundInFlightRef');
    expect(speaking.match(/refundSpeakEnergy\(/g)?.length).toBe(1);
    expect(speaking.match(/abandonFlashcardTrainingPendingGrant\(/g)?.length).toBeGreaterThanOrEqual(3);
    for (const source of [recall, speaking]) {
      expect(source).not.toContain('if (chargedOperationId && !entryGranted)');
    }
  });

  // зачем (законный сдвиг): Свайп гасит двойной возврат не очисткой ref до вызова, а общим промисом
  // возврата (activeSwipeRefundPromiseRef): параллельный вызов ждёт тот же промис, последовательный видит
  // обнулённую операцию. Блиц по-прежнему обнуляет ref ДО refundBlitzEnergy.
  test('Swipe shares one in-flight refund promise; Blitz clears its charged ref before invoking the refund adapter', () => {
    const swipe = read('app/flashcards_swipe.tsx');
    const blitz = read('app/flashcards_blitz_session.tsx');
    expect(swipe).toMatch(/if \(activeSwipeRefundPromiseRef\.current\) \{[\s\S]*?await activeSwipeRefundPromiseRef\.current;[\s\S]*?return;[\s\S]*?const operationId = activeSwipeSpentOperationRef\.current;[\s\S]*?await refundSwipeEnergy\(operationId, reason\)/);
    expect(blitz).toMatch(/const operationId = blitzSpentOperationRef\.current;[\s\S]*?blitzSpentOperationRef\.current = null;[\s\S]*?await refundBlitzEnergy/);
  });

  test('keeps the existing saved-card cap unchanged', () => {
    const source = read('hooks/use-flashcards.ts');
    // зачем (законный сдвиг, 60155883a): лимит бесплатных карточек теперь живёт в custom_card_access
    // (FREE_CUSTOM_CARD_LIMIT), а FREE_FLASHCARD_LIMIT — его алиас; число 20 отменено вместе со старым пейволом.
    expect(source).toContain('export const FREE_FLASHCARD_LIMIT = FREE_CUSTOM_CARD_LIMIT;');
    // зачем (ревью Opus, LOW 2): алиас без закреплённого числа ничего не охраняет.
    expect(read('app/flashcards/custom_card_access.ts')).toContain('export const FREE_CUSTOM_CARD_LIMIT = 50;');
  });
});
