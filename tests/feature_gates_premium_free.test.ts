// Покрывает «Пульт → Премиум/Фри» для обычных фич и фиксированный контракт курса:
// main course всегда оставляет Free только 1–3, даже если старые remote-флаги шире.

const mockBools: Record<string, boolean> = {};
const mockFreeExtra = new Set<number>();
const mockPremiumExtra = new Set<number>();
let mockFreeLessonLimit = 3;

// зачем: мок перечислял функции remote_flags ВРУЧНУЮ, поэтому любой новый геттер
// в модуле ронял весь сьют («getWeeklyBoonsConfigRaw is not a function», затем
// «getMaxEnergy is not a function» — сьют вообще не запускался, скрывая всё, что
// внутри). Берём реальный модуль через requireActual и подменяем ТОЛЬКО те четыре
// функции, которые тест действительно драйвит. Новые флаги больше его не сломают.
jest.mock('../app/remote_flags', () => ({
  ...jest.requireActual('../app/remote_flags'),
  __esModule: true,
  getRemoteBool: (key: string) => (key in mockBools ? mockBools[key] : true),
  getFreeLessonLimit: () => mockFreeLessonLimit,
  getFreeLessonsExtra: () => mockFreeExtra,
  getPremiumLessonsExtra: () => mockPremiumExtra,
}));

import {
  FEATURE_GATE_KEYS,
  isFeatureBlockedForAge,
  isFeatureFreeForEveryone,
  isFeaturePremiumGated,
  shouldGateFeature,
} from '../app/feature_gates';
import { isFreeLesson, requiresPremiumForLesson } from '../app/monetization_policy';

beforeEach(() => {
  for (const k of Object.keys(mockBools)) delete mockBools[k];
  mockFreeExtra.clear();
  mockPremiumExtra.clear();
  mockFreeLessonLimit = 3;
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

  it('does not age-block app features after onboarding', () => {
    mockBools['gate_ai_dialog_premium'] = false;
    expect(isFeatureFreeForEveryone('ai_dialog')).toBe(true);
    expect(isFeatureBlockedForAge('ai_dialog')).toBe(false);
    expect(isFeatureBlockedForAge('lessons')).toBe(false);
  });
});

describe('lesson gate with overrides', () => {
  it('keeps the main-course Free sample fixed at lessons 1–3', () => {
    expect(isFreeLesson(3)).toBe(true);
    for (const lessonId of [4, 8, 9, 32]) {
      expect(isFreeLesson(lessonId)).toBe(false);
      expect(requiresPremiumForLesson(lessonId)).toBe(true);
    }
  });

  it('whole-feature free does not widen the main course', () => {
    mockBools['gate_lessons_premium'] = false;
    expect(isFreeLesson(4)).toBe(false);
    expect(isFreeLesson(32)).toBe(false);
    expect(requiresPremiumForLesson(32)).toBe(true);
  });

  it('legacy lesson limits and free extras do not widen the main course', () => {
    mockFreeLessonLimit = 16;
    mockFreeExtra.add(15);
    expect(isFreeLesson(15)).toBe(false);
    expect(isFreeLesson(16)).toBe(false);
  });

  it('stale premium_lessons_extra cannot close a main lesson', () => {
    mockPremiumExtra.add(3);
    expect(isFreeLesson(3)).toBe(true);
    expect(requiresPremiumForLesson(3)).toBe(false);
    // Старые конфликты удалённых флагов не закрывают основной курс.
    mockFreeExtra.add(3);
    expect(isFreeLesson(3)).toBe(true);
  });

  it('preserves the admin feature gate for non-course lesson content', () => {
    expect(isFreeLesson(33)).toBe(false);
    expect(requiresPremiumForLesson(33)).toBe(true);
    mockBools['gate_lessons_premium'] = false;
    expect(isFreeLesson(33)).toBe(true);
    expect(requiresPremiumForLesson(33)).toBe(false);
  });

  it('ignores out-of-range / invalid lesson ids safely', () => {
    expect(isFreeLesson(0)).toBe(false);
    expect(isFreeLesson(-5)).toBe(false);
    expect(isFreeLesson(NaN)).toBe(false);
  });
});
