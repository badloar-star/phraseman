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

  // зачем (2026-08-27): тест сторожил гейты в `app/flashcards.tsx` — хабе,
  // который переработка «Cards 2.0» превратила в 18-строчную обёртку над
  // коллекцией. Сами замки не потерялись, а переехали на входы в платные
  // режимы (свайп и аудио) и там даже усилились: теперь ловится и прямой
  // заход по диплинку, не только нажатие кнопки. Тест был красным ДО правки
  // пейволла создания — сторожил снесённый адрес, а не реальную защиту.
  it('keeps flashcard training and autoplay behind the flashcards Plus gate', () => {
    const swipe = read('app', 'flashcards_swipe.tsx');
    const audio = read('app', 'flashcards_audio.tsx');

    // Тренировка: замок и на кнопке старта, и на прямом заходе на экран.
    expect(swipe).toContain("useFeatureAccess('flashcards')");
    expect(swipe).toContain("openFlashcardsPlusPaywall('flashcards_training_start')");
    expect(swipe).toContain("openFlashcardsPlusPaywall('flashcards_training_direct')");
    expect(swipe).toContain("context: 'flashcard_training'");

    // Автовоспроизведение — тот же контракт на своём экране.
    expect(audio).toContain("useFeatureAccess('flashcards')");
    expect(audio).toContain("openFlashcardsPlusPaywall('flashcards_audio_start')");
    expect(audio).toContain("context: 'flashcard_autoplay'");
  });

  // зачем (2026-08-27, владелец «показывается неправильный пейволл»): создание
  // своей карточки и своего набора обязано открывать СВОЙ пейвол. Раньше гейт
  // переиспользовал чужие контексты — человек, нажавший «создать», читал
  // «20 из 20 — база собрана» про лимит, которого не исчерпывал.
  it('creator paywall uses its own honest contexts, not borrowed ones', () => {
    const gate = read('app', 'creator_access.ts');

    expect(gate).toContain("'flashcard_create'");
    expect(gate).toContain("'pack_create'");
    // Ровно тот возврат, который сломался в прошлый раз.
    expect(gate).not.toContain("? 'flashcard_training' : 'flashcard_limit'");

    // Контексты обязаны быть заведены во всех словарях, иначе экран падает в generic.
    const premiumContext = read('app', 'premium_context.ts');
    const copy = read('app', 'paywall_copy.ts');
    const icons = read('components', 'paywall', 'PaywallContextIcons.tsx');

    for (const ctx of ['flashcard_create', 'pack_create']) {
      expect(premiumContext).toContain(`| '${ctx}'`);
      expect(premiumContext).toContain(`  '${ctx}',`);
      expect(copy).toContain(`  ${ctx}: { accent:`);
      expect(copy).toContain(`PAYWALL_COPY.${ctx} = {`);
      expect(copy).toContain(`PAYWALL_PLANNED_COPY.${ctx} = {`);
      expect(copy).toContain(`CONTEXT_BENEFITS.${ctx} = [`);
      expect(copy).toContain(`CONTEXT_BENEFITS_PLANNED.${ctx} = [`);
      expect(icons).toContain(`  ${ctx}: [`);
    }

    // Персонализация «сохранено N карточек» осталась только у настоящего лимита.
    expect(copy).toContain("if (ctx !== 'flashcard_limit' || savedCards <= 0) return planned;");
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
