// PM-200: общий opt-out пушей Шпиля и чтение prefs.
import { isSpirePushOptedOut, readSpirePushMark, readSpirePushPrefs } from './spire_notifications';

describe('readSpirePushPrefs / isSpirePushOptedOut (PM-200)', () => {
  it('читает только булевы league/streak', () => {
    expect(readSpirePushPrefs({ streak: false, offers: false })).toEqual({ streak: false });
    expect(readSpirePushPrefs({ league: 'false' })).toBeNull();
    expect(readSpirePushPrefs(null)).toBeNull();
  });
  it('выключено, если streak=false или league=false; иначе — шлём', () => {
    expect(isSpirePushOptedOut({ streak: false })).toBe(true);
    expect(isSpirePushOptedOut({ league: false })).toBe(true);
    expect(isSpirePushOptedOut({ streak: true })).toBe(false);
    expect(isSpirePushOptedOut(null)).toBe(false);
  });
  it('метка недели — только непустая строка', () => {
    expect(readSpirePushMark({ f: '2026-W40' }, 'f')).toBe('2026-W40');
    expect(readSpirePushMark({ f: 1 }, 'f')).toBeNull();
    expect(readSpirePushMark(undefined, 'f')).toBeNull();
  });
});
