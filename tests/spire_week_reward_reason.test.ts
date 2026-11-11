jest.mock('react-native', () => ({
  Animated: {},
  Platform: { OS: 'android', select: (values: Record<string, unknown>) => values.android ?? values.default },
  StyleSheet: { create: (styles: unknown) => styles },
  Text: 'Text',
  View: 'View',
}));
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { View: 'View' },
  Easing: { bezier: () => () => 0 },
  useAnimatedStyle: (fn: () => unknown) => fn(),
  useSharedValue: (value: number) => ({ value }),
  withDelay: (_delay: number, value: unknown) => value,
  withSequence: (...values: unknown[]) => values[values.length - 1],
  withTiming: (value: unknown) => value,
}));
jest.mock('../hooks/use-haptics', () => ({ hapticSuccess: jest.fn() }));
jest.mock('../hooks/use_reduce_motion', () => ({ useReduceMotion: () => true }));
jest.mock('../components/streak/moments/use_moments_v3_flag', () => ({ useMomentsV3Enabled: () => false }));
jest.mock('../components/spire/useSpirePalette', () => ({ useSpirePalette: () => ({}) }));
jest.mock('../components/spire/useSpireShadow', () => ({ useSpireShadow: () => ({ plate: {} }) }));
jest.mock('../components/spire/SpireTowerDeferred', () => 'SpireTowerDeferred');
jest.mock('../components/AvatarView', () => 'AvatarView');
jest.mock('../app/spire_energy_bonus_store', () => ({ getSpireEnergyBonus: () => 0 }));

import type { Lang } from '../constants/i18n';
import type { SpireWeekResultView } from '../app/spire/spire_week_result_client';
import { spireWeekResultLines } from '../components/spire/SpireWeekResultCard';
import { momentText } from '../components/spire/moments/moments_strings';

const LANGS: readonly Lang[] = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const plain = (value: string): string => value.replace(/\u00a0/g, ' ');
const result = (patch: Partial<SpireWeekResultView> = {}): SpireWeekResultView => ({
  weekId: '2026-W45', lang: 'en', steps: 42, roomRank: 3, roomTotal: 30,
  promoted: true, demoted: false, prevTier: 0, newTier: 1,
  placeCoins: 150, promotionCoins: 100, rankBy: 'coins', weekCoins: 470,
  rewardStatus: 'paid', ...patch,
});

describe('подписи причин уже выплаченных наград недели', () => {
  it('paid: две положительные суммы подписаны разными причинами и место берётся из результата', () => {
    const { sub } = spireWeekResultLines('ru', result(), 0);
    expect(plain(sub)).toContain('+150 монет за 3 место');
    expect(plain(sub)).toContain('+100 монет за повышение');
    expect(sub).not.toContain('+150 · +100');
  });

  it('explicit pending никогда не выглядит выплаченным, даже если объект ошибочно содержит суммы', () => {
    const { sub } = spireWeekResultLines('ru', result({ rewardStatus: 'pending_wallet' }), 0);
    expect(sub).not.toMatch(/\+150|\+100|за место|за повышение/);
  });

  it('paid с нулевыми суммами сохраняет прежнее состояние новой недели', () => {
    const { sub } = spireWeekResultLines('ru', result({ placeCoins: 0, promotionCoins: 0 }), 0);
    expect(sub).not.toMatch(/за место|за повышение/);
    expect(sub).toMatch(/новая неделя/i);
  });

  it('legacy/preview без rewardStatus не трактуется как выплата', () => {
    const legacy = spireWeekResultLines('ru', result({ rewardStatus: undefined }), 0).sub;
    expect(legacy).not.toMatch(/\+150|\+100|за место|за повышение/);
  });

  it('paid с неизвестным местом не превращает причину в «0 место»', () => {
    const noRank = plain(spireWeekResultLines('ru', result({ roomRank: 0, promotionCoins: 0 }), 0).sub);
    expect(noRank).toContain('+150 монет за место');
    expect(noRank).not.toContain('0 место');
  });

  it('paid из старого кэша не показывает дробные, бесконечные или небезопасные числа как выплату/место', () => {
    const malformed = spireWeekResultLines('ru', result({
      roomRank: 3.5,
      placeCoins: Number.POSITIVE_INFINITY,
      promotionCoins: Number.MAX_SAFE_INTEGER + 1,
    }), 0).sub;
    expect(malformed).not.toMatch(/Infinity|9007199254740992|3\.5 место/);

    const validAmountUnknownRank = plain(spireWeekResultLines('ru', result({ roomRank: 3.5, promotionCoins: 0 }), 0).sub);
    expect(validAmountUnknownRank).toContain('+150 монет за место');
    expect(validAmountUnknownRank).not.toContain('3.5 место');
  });

  it.each(LANGS)('%s: подпись места локализована и не оставляет плейсхолдеры', (lang) => {
    const text = momentText(lang, 'placeBonus', { n: 150, place: 3 });
    expect(text).toMatch(/150/);
    expect(text).not.toMatch(/\{n\}|\{nw\}|\{place\}/);
  });
});
