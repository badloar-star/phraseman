import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const read = (...parts: string[]) => fs.readFileSync(path.join(root, ...parts), 'utf8');

describe('premium motivation gates contract', () => {
  it('keeps AI dialog voice input and final error analysis Plus-only', () => {
    const source = read('app', 'ai_dialog_session.tsx');
    const verdict = read('components', 'DialogVerdictScreen.tsx');

    expect(source).toContain('loadSpeechRecognitionModule');
    expect(source).toContain("source: 'ai_dialog_voice_input'");
    // зачем (D196, 15.10): пейвол лимита голоса открывает общий гейт хука, а не сам экран диалога — литерал контекста живёт там
    expect(read('hooks', 'use_voice_attempt_gate.ts')).toContain("context: 'ai_voice_input'");
    expect(source).toContain("useVoiceAttemptGate({ surface: 'ai_dialog', source: 'ai_dialog_voice_input' })");
    expect(verdict).toContain('AI-разбор ошибок — в Plus');
    expect(source).toContain("source: 'dialog_analysis'");
    expect(source).toContain("context: 'dialog_analysis'");
    expect(source).toContain('locked={!hasPremiumAccess}');
    expect(verdict).toContain('{!locked && coachTips.length > 0 && (');
    expect(verdict).toContain('{locked && (');
  });

  // зачем (2026-08-27): тест сторожил гейты в `app/flashcards.tsx` — хабе,
  // который переработка «Cards 2.0» превратила в 18-строчную обёртку над
  // коллекцией. Сами замки не потерялись, а переехали на входы в платные
  // режимы (свайп и аудио) и там даже усилились: теперь ловится и прямой
  // заход по диплинку, не только нажатие кнопки. Тест был красным ДО правки
  // пейволла создания — сторожил снесённый адрес, а не реальную защиту.
  it('keeps flashcard training behind Plus and the removed autoplay route closed', () => {
    const swipe = read('app', 'flashcards_swipe.tsx');
    const audio = read('app', 'flashcards_audio.tsx');

    // зачем (D152, владелец 01.10): тренировки больше не «только Plus» — бесплатно 30 в месяц. Замок теперь —
    // месячный лимит: свайп списывает его на старте (и на прямом заходе), исчерпан → настройка тренировки,
    // а хаб открывает окно Plus с контекстом flashcard_training (кнопка не гаснет без объяснения).
    const hub = read('app', 'flashcards', 'FlashcardsHubScreen.tsx');
    expect(swipe).toContain('consumeMonthlyTrainingSession({');
    expect(swipe).toContain("mode: 'swipe',");
    expect(swipe).toContain("if (quotaResult.status === 'exhausted') {");
    expect(swipe).toContain('openMonthlyTrainingLimit();');
    expect(hub).toContain("pathname: '/premium_modal', params: { context, source }");
    expect(hub).toContain("openTrainingPaywall('flashcard_training'");

    expect(audio).toContain('<Redirect href="/flashcards" />');
    expect(audio).not.toContain('flashcards_audio_start');
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
