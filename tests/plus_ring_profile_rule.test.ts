// зачем (Ядро cbdecef56, координатор 22.10): кольцо у чужих = isPlus === true && (plusUntilMs === 0 || plusUntilMs + 72 ч > сейчас).
// Без isPlus кольца нет; на isPremium не откатываемся (у части профилей там устаревшее true — вводный доступ, просроченное).
import { PLUS_RENEWAL_GRACE_MS, isPlusProfile, readPlusUntilMs } from '../components/plus/plus_ring_spec';

const NOW = 1_800_000_000_000;
const H = 60 * 60 * 1000;

describe('isPlusProfile · другие люди (правило Ядра)', () => {
  it('запас на продление — ровно 72 часа', () => {
    expect(PLUS_RENEWAL_GRACE_MS).toBe(72 * H);
  });
  it('пожизненный/бессрочный (plusUntilMs = 0) — кольцо', () => {
    expect(isPlusProfile({ isPlus: true, plusUntilMs: 0 }, NOW)).toBe(true);
  });
  it('срок в будущем — кольцо', () => {
    expect(isPlusProfile({ isPlus: true, plusUntilMs: NOW + H }, NOW)).toBe(true);
  });
  it('срок истёк меньше 72 ч назад — кольцо ещё держится (вебхук продления не пришёл)', () => {
    expect(isPlusProfile({ isPlus: true, plusUntilMs: NOW - 71 * H }, NOW)).toBe(true);
  });
  it('срок истёк ровно 72 ч назад и раньше — кольца нет', () => {
    expect(isPlusProfile({ isPlus: true, plusUntilMs: NOW - 72 * H }, NOW)).toBe(false);
    expect(isPlusProfile({ isPlus: true, plusUntilMs: NOW - 200 * H }, NOW)).toBe(false);
  });
  it('plusUntilMs = null или нет поля при isPlus=true — Plus нет', () => {
    expect(isPlusProfile({ isPlus: true, plusUntilMs: null }, NOW)).toBe(false);
    expect(isPlusProfile({ isPlus: true }, NOW)).toBe(false);
  });
  it('isPlus=false, null или нет поля — кольца нет, даже со сроком', () => {
    expect(isPlusProfile({ isPlus: false, plusUntilMs: 0 }, NOW)).toBe(false);
    expect(isPlusProfile({ isPlus: null, plusUntilMs: 0 }, NOW)).toBe(false);
    expect(isPlusProfile({ plusUntilMs: 0 }, NOW)).toBe(false);
  });
  it('старые поля isPremium/isVip/isLifetime кольца НЕ дают', () => {
    expect(isPlusProfile({ isPremium: true, isVip: true, isLifetime: true } as never, NOW)).toBe(false);
  });
  it('нет профиля — кольца нет', () => {
    expect(isPlusProfile(null, NOW)).toBe(false);
    expect(isPlusProfile(undefined, NOW)).toBe(false);
  });
  it('readPlusUntilMs: число ≥ 0 как есть, мусор и отрицательное — null', () => {
    expect(readPlusUntilMs(0)).toBe(0);
    expect(readPlusUntilMs(123)).toBe(123);
    for (const bad of [null, undefined, '5', -1, NaN, Infinity, {}]) expect(readPlusUntilMs(bad)).toBeNull();
  });
});
