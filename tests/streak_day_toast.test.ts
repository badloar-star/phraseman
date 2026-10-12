import { streakDayToastPayload } from '../app/streak_day_toast';

// зачем (§137, 04.10): отклик «День засчитан» — только на первое учебное действие дня (activity:*),
// не на сверку открытия в день перехода (migration:*); число дней — текущая серия.
describe('streak day toast', () => {
  it('celebrates the first counted activity of the day with the streak length', () => {
    const payload = streakDayToastPayload({ days: 8, dayKey: '2026-10-04', source: 'activity:cards' });
    expect(payload?.type).toBe('reward');
    expect(payload?.messageRu).toBe('День засчитан 🔥 8');
    expect(payload?.messageEn).toBe('Day counted 🔥 8');
    // R1 dialogs-041: сквозная строка сверху, а не нижняя карточка поверх кнопки «Готово»
    expect(payload?.layout).toBe('top_line');
    expect(payload?.lineIcon).toBe('flame');
  });

  it('stays silent for the migration day (old rule counted the app open)', () => {
    expect(streakDayToastPayload({ days: 8, dayKey: '2026-10-04', source: 'migration:cold_start' })).toBeNull();
    expect(streakDayToastPayload({ days: 8, dayKey: '2026-10-04', source: 'migration:foreground' })).toBeNull();
  });

  it('never shows zero days', () => {
    expect(streakDayToastPayload({ days: 0, dayKey: '2026-10-04', source: 'activity:lesson' })?.messageRu).toBe('День засчитан 🔥 1');
  });
});
