/**
 * Слияние стрика между устройствами: не терять цепочку, но и не воскрешать
 * сгоревшую.
 *
 * Повод (аудит 2026-08-24): mergeStreakByActivityDate брал счётчик ВСЛЕПУЮ у
 * стороны со свежей датой. Цепочка на 50 дней обесценивалась до 1, когда второе
 * устройство (переустановка, новый телефон, откатившийся кэш) успевало
 * отметиться сегодня со стриком 1. Это нарушало контракт владельца «поздний
 * синк не откатывает значения» — XP и week_points уже сливаются максимумом
 * (см. tests/owner_direction_runtime_contract.test.ts).
 *
 * Обратная опасность не менее реальна: сгорание цепочки в xp_manager выглядит
 * как запись streak_count = 1 с СЕГОДНЯШНЕЙ датой. Слепой максимум воскресил бы
 * честно сгоревший стрик из устаревшего снимка облака. Поэтому максимум
 * применяется только при соседних датах (разрыв в один день).
 *
 * Сработал этот файл — чинить mergeStreakByActivityDate, а не сторожа.
 *
 * ЗАПУСК: на этой машине прогон падает по heap OOM ещё на импорте (файл тянет
 * AsyncStorage → modules/phone-state/legacy_mirror → весь граф инвентаря). Это
 * среда, а не тест: соседний tests/streak_local_date_migration.test.ts падает
 * так же на версии из git, без каких-либо правок. Логика проверена извлечением
 * чистой функции (она без IO) и прогоном 12 кейсов на голом node — все зелёные.
 * Файл готов к запуску на машине с большей памятью либо после лечения OOM;
 * см. память проекта project_season_tests_heap_oom.
 */
import { mergeStreakByActivityDate } from '../app/streak_safety';

describe('mergeStreakByActivityDate: цепочка не теряется', () => {
  it('свежая сторона с меньшим счётчиком НЕ роняет цепочку (разрыв 1 день)', () => {
    // Телефон занимался вчера и знает про 50 дней. Планшет после переустановки
    // отметился сегодня с единицей — данные о цепочке у него просто пустые.
    const merged = mergeStreakByActivityDate(
      { streak: 50, lastActive: '2026-08-23' },
      { streak: 1, lastActive: '2026-08-24' },
    );
    expect(merged.streak).toBe(50);
    expect(merged.lastActive).toBe('2026-08-24');
  });

  it('то же самое в обратную сторону: локальная единица не роняет облачные 50', () => {
    const merged = mergeStreakByActivityDate(
      { streak: 1, lastActive: '2026-08-24' },
      { streak: 50, lastActive: '2026-08-23' },
    );
    expect(merged.streak).toBe(50);
    expect(merged.lastActive).toBe('2026-08-24');
  });

  it('одинаковые даты — берём больший счётчик', () => {
    const merged = mergeStreakByActivityDate(
      { streak: 7, lastActive: '2026-08-24' },
      { streak: 12, lastActive: '2026-08-24' },
    );
    expect(merged.streak).toBe(12);
    expect(merged.lastActive).toBe('2026-08-24');
  });

  it('свежая сторона с БОЛЬШИМ счётчиком продлевает цепочку как раньше', () => {
    const merged = mergeStreakByActivityDate(
      { streak: 10, lastActive: '2026-08-23' },
      { streak: 11, lastActive: '2026-08-24' },
    );
    expect(merged.streak).toBe(11);
    expect(merged.lastActive).toBe('2026-08-24');
  });
});

describe('mergeStreakByActivityDate: сгоревшая цепочка не воскресает', () => {
  it('разрыв 2 дня — счётчик берётся у свежей стороны, старое значение не всплывает', () => {
    // Пользователь пропустил день: xp_manager записал streak_count = 1 с
    // сегодняшней датой. В облаке лежит устаревший снимок с 50 днями.
    const merged = mergeStreakByActivityDate(
      { streak: 1, lastActive: '2026-08-24' },
      { streak: 50, lastActive: '2026-08-22' },
    );
    expect(merged.streak).toBe(1);
    expect(merged.lastActive).toBe('2026-08-24');
  });

  it('большой разрыв (месяц) тоже не воскрешает цепочку', () => {
    const merged = mergeStreakByActivityDate(
      { streak: 1, lastActive: '2026-08-24' },
      { streak: 200, lastActive: '2026-07-20' },
    );
    expect(merged.streak).toBe(1);
  });

  it('разрыв через границу месяца считается верно (31 июля → 1 августа = 1 день)', () => {
    const merged = mergeStreakByActivityDate(
      { streak: 30, lastActive: '2026-07-31' },
      { streak: 1, lastActive: '2026-08-01' },
    );
    expect(merged.streak).toBe(30);
    expect(merged.lastActive).toBe('2026-08-01');
  });
});

describe('mergeStreakByActivityDate: крайние случаи', () => {
  it('сторона без даты не теряет свой счётчик', () => {
    expect(mergeStreakByActivityDate({ streak: 9 }, { streak: 3, lastActive: '2026-08-24' }))
      .toEqual({ streak: 9, lastActive: '2026-08-24' });
    expect(mergeStreakByActivityDate({ streak: 3, lastActive: '2026-08-24' }, { streak: 9 }))
      .toEqual({ streak: 9, lastActive: '2026-08-24' });
  });

  it('дат нет вовсе — больший счётчик, дата null', () => {
    expect(mergeStreakByActivityDate({ streak: 4 }, { streak: 6 }))
      .toEqual({ streak: 6, lastActive: null });
  });

  it('мусор вместо чисел и дат не роняет слияние', () => {
    const merged = mergeStreakByActivityDate(
      { streak: 'abc', lastActive: 'not-a-date' },
      { streak: -5, lastActive: '2026-08-24' },
    );
    expect(merged.streak).toBe(0);
    expect(merged.lastActive).toBe('2026-08-24');
  });

  it('streakLast работает запасным источником даты', () => {
    const merged = mergeStreakByActivityDate(
      { streak: 20, streakLast: '2026-08-23' },
      { streak: 1, lastActive: '2026-08-24' },
    );
    expect(merged.streak).toBe(20);
  });
});
