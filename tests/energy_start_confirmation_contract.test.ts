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
    // идут проверка безлимита, проверка нехватки и анимация списания.
    const context = read('components/EnergyContext.tsx');
    const model = read('components/energy_start_confirmation.ts');

    // Единая точка траты жива.
    expect(model).toContain("'spent' | 'unlimited' | 'cancelled' | 'insufficient'");
    expect(context).toContain('confirmSpendOne');
    expect(context).toContain('confirmSpendAmount');
    // Анимация списания шлётся из единой точки траты и НЕ задерживает старт:
    // ожидание её окончания (~1.15 с) пряталось за модалкой, а без модалки
    // превратилось бы в паузу между тапом и открытием активности.
    expect(context).toContain("emitAppEvent('energy_spent_on_start'");
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
    // Событие «анимация закончена» удалено вместе с ожидателем: старт больше
    // не ждёт полёта молнии, слушателей у события не осталось.
    expect(flight).not.toContain('energy_spend_motion_complete');
    expect(flight).toContain('measuredTarget');
    expect(tokens).toContain('reducedMotionMs: 160');
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
      { file: 'app/arena_today.tsx', latch: 'startChargeInFlightRef' },
      { file: 'app/arena_friend_duel.tsx', latch: 'chargeInFlightRef' },
      { file: 'app/arena_invite.tsx', latch: 'chargeInFlightRef' },
      { file: 'app/flashcards_swipe.tsx', latch: 'startChargeInFlightRef' },
      { file: 'app/diagnostic_test.tsx', latch: 'diagnosticChargeInFlightRef' },
      { file: 'app/max_call_prestart.tsx', latch: 'startInFlightRef' },
    ];

    for (const { file, latch } of tapPaidScreens) {
      const source = read(file);
      // Латч обязан быть синхронным ref, а не useState.
      expect(source).toContain(`const ${latch} = useRef(false)`);
      // Он читается как условие раннего выхода (до любого await).
      const readsBeforeCharge =
        source.includes(`|| ${latch}.current) return`)
        || source.includes(`if (${latch}.current) return`);
      expect(readsBeforeCharge).toBe(true);
      // ...взводится...
      expect(source).toContain(`${latch}.current = true`);
      // ...и обязательно снимается, иначе кнопка залипнет навсегда.
      expect(source).toContain(`${latch}.current = false`);
    }
  });
});
