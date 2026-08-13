import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const read = (...parts: string[]) => fs.readFileSync(path.join(root, ...parts), 'utf8');

describe('premium motivation gates contract', () => {
  it('keeps AI dialog voice input and final error analysis Plus-only', () => {
    const source = read('app', 'ai_dialog_session.tsx');

    expect(source).toContain('loadSpeechRecognitionModule');
    expect(source).toContain("source: 'ai_dialog_voice_input'");
    expect(source).toContain("context: 'ai_voice_input'");
    expect(source).toContain('AI-разбор ошибок — в Plus');
    expect(source).toContain("source: 'dialog_analysis'");
    expect(source).toContain("context: 'dialog_analysis'");
    expect(source).toContain('ended && gameEnabled && isTerminalOutcome(outcome) && !hasPremiumAccess');
    expect(source).toContain('ended && gameEnabled && isTerminalOutcome(outcome) && hasPremiumAccess');
  });

  it('keeps flashcard training and autoplay behind the flashcards Plus gate', () => {
    const hub = read('app', 'flashcards.tsx');
    const categoryHub = read('app', 'flashcards', 'FlashcardsCategoryHub.tsx');
    const collection = read('app', 'flashcards_collection.tsx');
    const swipe = read('app', 'flashcards_swipe.tsx');
    const audio = read('app', 'flashcards_audio.tsx');

    expect(hub).toContain("useFeatureAccess('flashcards')");
    expect(hub).toContain("openFlashcardsPlusPaywall('flashcards_training')");
    expect(hub).toContain("openFlashcardsPlusPaywall('flashcards_audio')");
    expect(hub).toContain("'flashcard_training'");
    expect(hub).toContain("'flashcard_autoplay'");
    expect(hub).toContain('hasFlashcardsPlus={flashcardsAccess}');

    expect(categoryHub).toContain('hasFlashcardsPlus?: boolean');
    expect(categoryHub).toContain('function PlusCornerBadge');
    expect(categoryHub).toContain('{!hasFlashcardsPlus && <PlusCornerBadge themeMode={themeMode} />}');

    expect(collection).toContain("params: { context: 'flashcard_training', source: 'flashcards_collection_training' }");
    expect(collection).toContain("params: { context: 'flashcard_autoplay', source: 'flashcards_collection_audio' }");
    expect(collection).toContain('{!isPremium && (');

    expect(swipe).toContain("useFeatureAccess('flashcards')");
    expect(swipe).toContain("openFlashcardsPlusPaywall('flashcards_training_start')");
    expect(swipe).toContain("context: 'flashcard_training'");
    expect(audio).toContain("useFeatureAccess('flashcards')");
    expect(audio).toContain("openFlashcardsPlusPaywall('flashcards_audio_start')");
    expect(audio).toContain("context: 'flashcard_autoplay'");
  });

  it('does not promise offline lessons in paywall proof copy', () => {
    const proof = read('components', 'paywall', 'PaywallProofCards.tsx').toLowerCase();

    expect(proof).not.toContain('offline');
    expect(proof).not.toContain('офлайн');
    expect(proof).not.toContain('оффлайн');
    expect(proof).not.toContain('modo offline');
    expect(proof).not.toContain('mode offline');
  });
});
