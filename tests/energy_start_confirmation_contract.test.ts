import fs from 'fs';
import path from 'path';

const read = (file: string): string => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('старт платной активности: без окна подтверждения', () => {
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

  it('старт НЕ переспрашивает: окна подтверждения траты нет', () => {
    // Владелец 2026-08-24: «убери вот этот спрашивающий готов ли потратить
    // энергию — не надо этот модал». Цена и так видна на самой кнопке знаком
    // «−1 ⚡», а лишний тап на каждый старт мешал. Тап по кнопке = согласие.
    //
    // Сторож охраняет ОТСУТСТВИЕ модалки. Единая точка списания
    // (confirmSpendOne/confirmSpendAmount) при этом обязана остаться: через неё
    // идут проверка безлимита, проверка нехватки и числовая анимация списания.
    const context = read('components/EnergyContext.tsx');
    const model = read('components/energy_start_confirmation.ts');

    // Единая точка траты жива.
    expect(model).toContain("'spent' | 'unlimited' | 'cancelled' | 'insufficient'");
    expect(context).toContain('confirmSpendOne');
    expect(context).toContain('confirmSpendAmount');
    // Числовая транзакция шлётся после durable commit и не задерживает старт.
    expect(context).toContain('energyVisualTransactions.publish({');
    expect(context).toContain("reason: 'spend'");
    expect(context).not.toContain("emitAppEvent('energy_spent_on_start'");
    expect(context).not.toContain('createEnergySpendMotionWaiter');

    // Модалки и её машинерии быть не должно.
    expect(context).not.toContain('EnergyStartConfirmModal');
    expect(context).not.toContain('pendingConfirmationRef');
    expect(context).not.toContain('requestStartConfirmation');
    expect(context).not.toContain('confirmationCommitInFlightRef');
    expect(fs.existsSync(path.join(process.cwd(), 'components/EnergyStartConfirmModal.tsx'))).toBe(false);
    // Тексты вопроса удалены вместе с окном.
    expect(model).not.toContain('confirm:');
    expect(model).not.toContain('cancel:');
    expect(model).not.toContain('energyStartConfirmationCopy');
  });

  it('каждый платный вход идёт через единую точку списания', () => {
    const paidEntryFiles = [
      'app/diagnostic_test.tsx',
      'app/exam.tsx',
      'app/flashcards_blitz_session.tsx',
      'app/flashcards_speaking_session.tsx',
      'app/flashcards_swipe.tsx',
      'app/learning-v2/session/[id].tsx',
      'app/lesson_irregular_verbs.tsx',
      'app/lesson_words.tsx',
      'app/lesson1.tsx',
      'app/level_exam.tsx',
      // зачем (03.10): app/max_call_prestart.tsx удалён в снимке 2.0 (efe19ae9d, раздел MAX законсервирован) — точки входа больше нет.
      'app/mistake_practice_session.tsx',
      // зачем (03.10): app/personal_plan_exercise.tsx удалён вместе с персональными планами (решение владельца 2026-09-27:
      // «персональные планы давно должны быть удалены из релизного контура»); читать его больше нечем, остальные платные входы охраняются ниже.
      'app/preposition_drill.tsx',
      'components/level-exam/LevelExamV2.tsx',
    ];

    for (const file of paidEntryFiles) {
      const source = read(file);
      // зачем (D72/D87, PM-084): экраны, переведённые на гейт первого вопроса,
      // списывают через него — он сам вызывает единую точку confirmActivityStart.
      expect(source).toMatch(/confirmSpend(?:One|Amount)|confirm[A-Z][A-Za-z]+Energy|useFirstQuestionEnergyGate\(/);
      expect(source).not.toMatch(/\bspendOne\s*:/);
      expect(source).not.toMatch(/\bspendAmount\s*[,}]/);
    }
  });

  it('uses the approved per-integer numeric motion instead of the old flight', () => {
    const number = read('components/energy/AnimatedEnergyNumber.tsx');
    expect(fs.existsSync(path.join(process.cwd(), 'components/EnergySpendFlightHost.tsx'))).toBe(false);
    expect(number).toContain('Array.from(');
    expect(number).toContain('withSequence(...steps)');
    expect(number).toContain('useReducedMotion()');
  });
  it('каждый платный тап защищён синхронным латчем от двойного нажатия', () => {
    // Инцидент аудита 2026-08-24: убрав окно подтверждения, я снял вместе с ним
    // и защиту от двойного тапа — раньше пока модалка висела, повторный запрос
    // отбивался (pendingConfirmationRef). После её удаления в пяти экранах
    // осталась щель: `if (busy) return` → `await confirmSpend*()` → `setBusy(true)`.
    // Флаг состояния React ставится ПОСЛЕ await и не виден второму тапу в том же
    // кадре, поэтому два быстрых нажатия списывали энергию дважды.
    //
    // Правильная защита — синхронный ref, взведённый ДО await. Сторож требует,
    // чтобы у каждого платного тапа он был; экраны, где списание происходит один
    // раз на монтирование (латч входа), в проверку не входят — там гонки нет.
    const tapPaidScreens: { file: string; latch: string }[] = [
      { file: 'app/flashcards_swipe.tsx', latch: 'startChargeInFlightRef' },
      { file: 'app/diagnostic_test.tsx', latch: 'diagnosticChargeInFlightRef' },
      // зачем (03.10): max_call_prestart.tsx удалён в снимке 2.0 (efe19ae9d) — латча проверять негде.
    ];

    for (const { file, latch } of tapPaidScreens) {
      const source = read(file);
      // Латч обязан быть синхронным ref, а не useState.
      expect(source).toContain(`const ${latch} = useRef(false)`);
      // Он читается как условие раннего выхода (до любого await).
      // зачем (12.10, сперва логи): ранний выход теперь с журналом — `if (… || latch.current) { fsLog(…); return; }`; смысл тот же:
      // латч читается условием выхода до любого await.
      const readsBeforeCharge =
        source.includes(`|| ${latch}.current) return`)
        || source.includes(`if (${latch}.current) return`)
        || new RegExp(`\\|\\| ${latch}\\.current\\) \\{[\\s\\S]{0,300}?return`).test(source)
        // 15.10 (Ревизор, диагностика): одиночное условие с журналом — `if (latch.current) { console.log(…); return; }`
        || new RegExp(`if \\(${latch}\\.current\\) \\{[\\s\\S]{0,300}?return`).test(source);
      expect(readsBeforeCharge).toBe(true);
      // ...взводится...
      expect(source).toContain(`${latch}.current = true`);
      // ...и обязательно снимается, иначе кнопка залипнет навсегда.
      expect(source).toContain(`${latch}.current = false`);
    }
  });
});
