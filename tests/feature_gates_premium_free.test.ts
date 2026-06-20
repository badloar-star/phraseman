// Покрывает «Пульт → Премиум/Фри»: перевод фичи в «Фри» снимает замок, поурочные
// исключения поверх порога, и хелперы feature_gates. Драйвим через мок remote_flags.

const mockBools: Record<string, boolean> = {};
const mockFreeExtra = new Set<number>();
const mockPremiumExtra = new Set<number>();
let mockFreeLessonLimit = 8;

jest.mock('../app/remote_flags', () => ({
  __esModule: true,
  getRemoteBool: (key: string) => (key in mockBools ? mockBools[key] : true),
  getFreeLessonLimit: () => mockFreeLessonLimit,
  getFreeLessonsExtra: () => mockFreeExtra,
  getPremiumLessonsExtra: () => mockPremiumExtra,
}));

import {
  FEATURE_GATE_KEYS,
  isFeatureFreeForEveryone,
  isFeaturePremiumGated,
  shouldGateFeature,
} from '../app/feature_gates';
import { isFreeLesson, requiresPremiumForLesson } from '../app/monetization_policy';

beforeEach(() => {
  for (const k of Object.keys(mockBools)) delete mockBools[k];
  mockFreeExtra.clear();
  mockPremiumExtra.clear();
  mockFreeLessonLimit = 8;
});

describe('feature_gates', () => {
  it('defaults every feature to premium-gated (no admin change = today behavior)', () => {
    for (const f of FEATURE_GATE_KEYS) {
      expect(isFeaturePremiumGated(f)).toBe(true);
      expect(isFeatureFreeForEveryone(f)).toBe(false);
    }
  });

  it('flips to free when the admin sets gate_<feature>_premium=false', () => {
    mockBools['gate_speaking_premium'] = false;
    expect(isFeaturePremiumGated('speaking')).toBe(false);
    expect(isFeatureFreeForEveryone('speaking')).toBe(true);
    // другие фичи не затронуты
    expect(isFeaturePremiumGated('stats')).toBe(true);
  });

  it('shouldGateFeature: premium user never gated; free user gated only while premium-locked', () => {
    expect(shouldGateFeature('stats', true)).toBe(false); // премиум — всегда доступ
    expect(shouldGateFeature('stats', false)).toBe(true); // фри + замок → пейвол
    mockBools['gate_stats_premium'] = false; // админ → «Фри»
    expect(shouldGateFeature('stats', false)).toBe(false); // замок снят
  });
});

describe('lesson gate with overrides', () => {
  it('respects the plain threshold by default', () => {
    expect(isFreeLesson(8)).toBe(true);
    expect(isFreeLesson(9)).toBe(false);
    expect(requiresPremiumForLesson(9)).toBe(true);
  });

  it('whole-feature free unlocks every lesson', () => {
    mockBools['gate_lessons_premium'] = false;
    expect(isFreeLesson(9)).toBe(true);
    expect(isFreeLesson(32)).toBe(true);
    expect(requiresPremiumForLesson(32)).toBe(false);
  });

  it('free_lessons_extra opens specific lessons above the threshold', () => {
    mockFreeExtra.add(15);
    expect(isFreeLesson(15)).toBe(true);
    expect(isFreeLesson(16)).toBe(false); // соседний остаётся премиум
  });

  it('premium_lessons_extra closes a lesson below the threshold (priority over free)', () => {
    mockPremiumExtra.add(3);
    expect(isFreeLesson(3)).toBe(false);
    expect(requiresPremiumForLesson(3)).toBe(true);
    // премиум-исключение приоритетнее фри-исключения на тот же урок
    mockFreeExtra.add(3);
    expect(isFreeLesson(3)).toBe(false);
  });

  it('ignores out-of-range / invalid lesson ids safely', () => {
    expect(isFreeLesson(0)).toBe(false);
    expect(isFreeLesson(-5)).toBe(false);
    expect(isFreeLesson(NaN)).toBe(false);
  });
});
