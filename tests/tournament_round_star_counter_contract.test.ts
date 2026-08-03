// ════════════════════════════════════════════════════════════════════════════
// tournament_round_star_counter_contract.test.ts — счётчик звёзд и поле пар.
//
// зачем 2026-08-03 (владелец): две жалобы по экрану раунда.
//   1) «анимация получения звёзд показывается в каждом раунде, но счёт
//      изменяется только 1 раз в первом задании каждого раунда, и счёт не
//      отображает актуальное состояние — он всегда начинается с нуля»;
//   2) «в задании пары при соединении слова исчезают совсем (а должны просто
//      стать неактивные), но затем они возвращаются».
//
// Экран целиком в jest не поднимается (react-native-svg, reanimated), поэтому
// тест читает ИСХОДНИК и фиксирует контракт кода — тот же приём, что уже
// используют tournament_round_feedback_ux_contract и tournament_round_visual_fidelity.
// ════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';

const ROUND_SOURCE = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'tournament_round.tsx'),
  'utf8',
);

/** Вырезает участок исходника между двумя якорями. */
function section(source: string, from: string, to: string): string {
  const start = source.indexOf(from);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = source.indexOf(to, start + from.length);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('счётчик звёзд в шапке раунда', () => {
  test('показывает ОБЩИЙ счёт даже в режиме пар', () => {
    // Баг владельца «счёт всегда начинается с нуля»: в парах счётчик показывал
    // matchStars — локальный счётчик пар этого задания, стартующий с нуля.
    const counter = section(ROUND_SOURCE, '<V2Counter ref={starCounterRef}', '/>');
    expect(counter).toContain('value={stars}');
    expect(counter).not.toContain('matchStars');
  });

  test('счёт складывается из серверного и неподтверждённых локальных звёзд', () => {
    // Мгновенный показ награды не должен подменять авторитет сервера.
    expect(ROUND_SOURCE).toContain('const serverStars');
    expect(ROUND_SOURCE).toMatch(/const stars = pendingStars/);
  });

  test('несколько ответов подряд НЕ затирают друг друга', () => {
    // Корень бага «счёт меняется только на первом задании»: одна надбавка
    // перезаписывалась следующей. Начисления обязаны накапливаться.
    const adder = section(ROUND_SOURCE, 'const addPendingStars', '}, [serverStars]);');
    expect(adder).toContain('current.amount + amount');
    // Опора берётся только когда ожидающих ещё нет, иначе baseline поедет.
    expect(adder).toContain('baseline: current.baseline');
  });

  test('поздний снапшот не откатывает цифру назад', () => {
    // Гонка: снапшот может относиться к состоянию ДО ответа игрока.
    expect(ROUND_SOURCE).toContain('Math.max(serverStars, pendingStars.baseline + pendingStars.amount)');
  });

  test('надбавка гасится, когда сервер её подтвердил', () => {
    expect(ROUND_SOURCE).toMatch(/serverStars >= pendingStars\.baseline \+ pendingStars\.amount/);
  });
});

describe('поле пар: собранная карточка гаснет, а не исчезает', () => {
  test('есть отдельная прозрачность решённой пары и она НЕ ноль', () => {
    const match = /const MATCH_SOLVED_OPACITY = ([\d.]+);/.exec(ROUND_SOURCE);
    expect(match).not.toBeNull();
    const value = Number(match![1]);
    // Ноль = карточка пропала с поля (ровно то, на что жаловался владелец).
    expect(value).toBeGreaterThan(0);
    // Но и не полная непрозрачность — собранная пара обязана читаться как «уже неактивна».
    expect(value).toBeLessThan(1);
  });

  test('решённая карточка НИКОГДА не уходит в нулевую прозрачность', () => {
    const card = section(ROUND_SOURCE, 'const opacity = useSharedValue(hidden', 'const animatedStyle');
    // Все переходы прозрачности в карточке ведут либо к 1, либо к MATCH_SOLVED_OPACITY.
    const targets = card.match(/opacity\.value = with\w+\(\s*([^,)]+)/g) ?? [];
    expect(targets.length).toBeGreaterThan(0);
    expect(card).not.toMatch(/opacity\.value = withTiming\(0,/);
    expect(card).toContain('MATCH_SOLVED_OPACITY');
  });

  test('стартовое состояние решённой карточки тоже приглушённое, а не пустое', () => {
    expect(ROUND_SOURCE).toContain('useSharedValue(hidden ? MATCH_SOLVED_OPACITY : 1)');
  });

  test('собранная карточка остаётся недоступной для нажатия', () => {
    // Гаснет визуально, но не должна принимать тапы и попадать в скринридер.
    const pressable = section(ROUND_SOURCE, 'accessibilityState={{ disabled: disabled || hidden', 'onPress={onPress}');
    expect(pressable).toContain('accessibilityElementsHidden={hidden}');
    expect(pressable).toContain('disabled={disabled || hidden}');
  });

  /**
   * КОРЕНЬ бага «пары откатываются, звёзд максимум 4» (владелец 2026-08-03:
   * «сегодня пытались исправить 10 раз и не исправили»).
   *
   * По истечении 30 секунд экран помечал задание закрытым, но НЕ отправлял
   * собранные пары. Сервер же считает звёзды за раунд только когда пришли
   * чеки по ВСЕМ заданиям (hasCompleteReceiptSet) — без чека по парам не
   * досчитывался весь раунд, и собранное выглядело как несделанное.
   */
  describe('таймаут поля пар не теряет собранное', () => {
    const TIMEOUT_EFFECT = section(
      ROUND_SOURCE,
      '// Время вышло — пропуск, серия обнуляется.',
      '// Сервер перевёл комнату дальше',
    );

    test('по истечении времени собранные пары уходят на сервер', () => {
      expect(TIMEOUT_EFFECT).toContain("question.kind === 'match'");
      expect(TIMEOUT_EFFECT).toContain('finishMatchEarlyRef.current?.()');
      // Отправка обязана идти ДО пометки задания закрытым: markTaskResolved
      // закрывает окно ответа, после него слать уже нечего. Сравниваем позиции
      // самих ВЫЗОВОВ (с точным аргументом), а не первое упоминание имени —
      // оно встречается и в пояснительных комментариях выше.
      expect(TIMEOUT_EFFECT.indexOf('finishMatchEarlyRef.current?.()'))
        .toBeLessThan(TIMEOUT_EFFECT.indexOf('markTaskResolved(question.taskId)'));
    });

    test('автоотправка не зависит от matchStatus напрямую', () => {
      // Прямая зависимость пересоздавала бы таймаут-эффект на КАЖДОЙ собранной
      // паре — ровно та нестабильность, из-за которой баг и жил.
      expect(ROUND_SOURCE).toContain('const finishMatchEarlyRef = useRef<(() => void) | null>(null)');
      expect(ROUND_SOURCE).toContain('finishMatchEarlyRef.current = submitMatchProgress');
    });

    test('автоотправка молчит — звук тапа только у кнопки «Готово»', () => {
      const submitProgress = section(
        ROUND_SOURCE,
        'const submitMatchProgress = useCallback',
        'const finishMatchEarly = useCallback',
      );
      expect(submitProgress).not.toContain('fk.tap()');
      expect(ROUND_SOURCE).toMatch(/const finishMatchEarly = useCallback\(\(\) => \{[\s\S]*?fk\.tap\(\);/);
    });
  });
});
