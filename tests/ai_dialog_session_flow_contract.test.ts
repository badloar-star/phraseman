import fs from 'fs';
import path from 'path';

describe('ai dialog session flow contract', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'ai_dialog_session.tsx'), 'utf8');

  it('keeps dictated text editable until the user sends it', () => {
    expect(source).toContain('setInput(next)');
    expect(source).not.toContain('sendRef.current(spoken)');
    expect(source).not.toContain('voiceAutoSendArmedRef');
    expect(source).toContain('onPress={() => send(input)}');
    expect(source).toContain('editable={!sending && !voiceInputBusy}');
  });

  // зачем 14, а не 8 (владелец 2026-09-17): заданий в сценарии стало 4–7, одно
  // задание — примерно 2–3 реплики. При старом потолке страховка объявляла бы
  // «заглох» раньше, чем человек успевал закрыть последнюю цель.
  it('keeps manual finish and only uses the 14-turn fallback when game JSON is unavailable', () => {
    expect(source).toContain('const RECOMMENDED_EXCHANGES = 14');
    expect(source).toContain('finishDialog');
    expect(source).toContain('Завершить');
    expect(source).toContain('gameModeAvailable === false');
    expect(source).toContain('!res.turnState');
    expect(source).toContain('exchangeIndex >= RECOMMENDED_EXCHANGES');
    expect(source).not.toContain('/ {MAX_EXCHANGES}');
  });

  /**
   * Пауза перед вердиктом (владелец 2026-09-17: «пусть появится реплика
   * собеседника, подождём 3–5 секунд, и после этого экран завершения»).
   *
   * Сторожим ровно то, что легко сломать не глядя:
   *  • вердикт ждёт verdictReady, а не просто ended;
   *  • награда и отметка «Пройдено» НЕ привязаны к показу — правило фундамента
   *    «удаляешь показ, не унеси награду»: они живут в applyTurnState рядом с
   *    setEnded, а не в ветке вердикта;
   *  • ручное «Завершить» открывает итог сразу (своей реплики там нет);
   *  • таймер снимается при размонтировании.
   */
  it('holds the verdict for a beat so the closing line can be read, without delaying the reward', () => {
    expect(source).toContain('const VERDICT_DELAY_MS = 3000');
    expect(source).toContain('const [verdictReady, setVerdictReady] = useState(false)');
    expect(source).toContain('ended && verdictReady && !verdictHidden');
    expect(source).toContain('setTimeout(() => setVerdictReady(true), VERDICT_DELAY_MS)');
    expect(source).toContain('return () => clearTimeout(timer)');
    // Пропуск паузы тапом и живая шапка под ним.
    expect(source).toContain('ended && !verdictReady');
    expect(source).toContain('onPress={() => setVerdictReady(true)}');
    expect(source).toContain('top: VERDICT_SKIP_LAYER_TOP');
    // Награда идёт по ФАКТУ конца диалога, а не по показу модалки.
    expect(source).toContain('void awardDialogXp(ts.outcome)');
    expect(source).toContain('void markDialogCompleted(scenario.id)');
  });

  it('sends the current scenario state with every turn', () => {
    expect(source).toContain('gameState: {');
    expect(source).toContain('exchangeIndex');
    expect(source).toContain('objectivesMet: Array.from(objectivesMet)');
    expect(source).toContain('noProgressTurns: stuckTurnsRef.current');
  });

  it('records privacy-safe quality metadata with mode and outcome', () => {
    expect(source).toContain("trackEvent('ai_dialog_reply_quality'");
    expect(source).toContain("mode: 'scenario'");
    expect(source).toContain('outcome: qualityTurnState.outcome');
  });

  it('shows a Russian next-step recommendation instead of tappable canned answers', () => {
    // Подсказка идёт через локализованный помощник (ru/uk/es), не из сырого
    // scenario.nextStepHintRu — иначе не-русские интерфейсы видели бы русский текст.
    // зачем проверки строки «Что сделать дальше» больше НЕТ: она жила в
    // комментарии к мёртвому состоянию hintOpen, у которого не было UI вообще
    // (владелец 2026-09-17, «кнопка подсказка лампочка не работает»). Сторож
    // держал существование КОММЕНТАРИЯ, а не кнопки. Теперь проверяем саму
    // кнопку — тестом ниже.
    expect(source).toContain('dialogScenarioNextStepHint(scenario, lang)');
    expect(source).not.toContain('scenario.suggestedReplies.map');
    expect(source).not.toContain('Можно тапнуть готовый ответ');
  });

  /**
   * ⛔ ЛАМПОЧКА ПОКАЗЫВАЕТ ПОДСКАЗКУ, А НЕ ВСТАВЛЯЕТ ЕЁ (владелец 2026-09-17:
   * «говорит взять и вставляет русский текст, что за дичь»).
   *
   * `nextStepHintRu` — инструкция АВТОРА на языке интерфейса («Попроси
   * капучино, уточни размер…»). Однажды она уже попала в строку помощника как
   * вставляемый текст, и тап клал русскую фразу в поле ввода вместо реплики на
   * изучаемом языке. Сторож держит границу: подсказка живёт в своей модалке, а
   * строка помощника вставляет ТОЛЬКО ответы сервера (они на target-языке).
   *
   * Плюс проверяем САМО СУЩЕСТВОВАНИЕ кнопки: до 2026-09-17 состояния hintOpen
   * и hintVisible были объявлены, но не отрисованы — «кнопка не работает»
   * означало «кнопки нет».
   */
  it('keeps the interface-language hint out of the input field', () => {
    expect(source).toContain('ai-dialog-hint-button');
    expect(source).toContain('setHintOpen(true)');

    // зачем проверки `hint=""` больше нет, а условие СТРОЖЕ (владелец
    // 2026-09-18): строка-помощник со вставными фразами удалена целиком, так
    // что вставлять стало физически нечем. Сторожим теперь отсутствие самой
    // механики, а не её обезвреженный параметр.
    expect(source).not.toContain('DialogHelperRow');
    expect(source).not.toContain('onUseSuggestion');
    // Единственная платная подсказка в разделе — лампочка. Шторка «Почему так»
    // бесплатна: понимание чужой речи не продаём.
    expect(source).not.toContain('hintEconomy');
    // Отказ покупки виден, а не только слышен (звук без текста = «сломалось»).
    expect(source).toContain('setHintDenied');
  });

  /**
   * Строка целей нажимаемая и открывает список ВСЕХ заданий (владелец
   * 2026-09-17: «цели должно быть нажимабельным и открывать модал лист и
   * показывать какие цели все»). Раньше это был мёртвый View с role="text",
   * показывавший только текущую цель.
   */
  it('opens the full goals list from the header line', () => {
    expect(source).toContain('setGoalsOpen(true)');
    expect(source).toContain('<DialogGoalsSheet');
    expect(source).toContain('objectives={objectives}');
    expect(source).toContain('objectivesMet={objectivesMet}');
  });
});
