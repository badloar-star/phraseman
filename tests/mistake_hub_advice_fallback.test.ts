import {
  buildMistakeHubAdviceFallback,
  buildMistakeHubAdviceSummary,
  mistakeHubAdviceFingerprint,
  type MistakeHubAdviceSummary,
} from '../app/mistake_hub_advice';
import type { MistakePracticeInsights } from '../app/mistake_practice_insights';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined) },
}));
jest.mock('@react-native-firebase/app', () => ({ getApp: () => ({}) }));
jest.mock('@react-native-firebase/functions', () => ({ getFunctions: () => ({}), httpsCallable: () => async () => ({ data: {} }) }));
jest.mock('../app/ai_explain_consent', () => ({ isAiExplainConsentGranted: () => false }));
jest.mock('../app/net_status', () => ({ getNetStatus: () => 'unknown' }));
jest.mock('../app/stable_id', () => ({ getStableId: async () => 'stable-1' }));

const insights = (overrides: Partial<MistakePracticeInsights> = {}): MistakePracticeInsights => ({
  active: 14, corrected: 27, correctedPhrases: 20, hidden: 0, overdue: 3, totalTracked: 41,
  dueWords: 4, duePhrases: 10, mistakeCount7d: 7, mistakeCount30d: 41, mistakeCountPrevious7d: 10,
  uniqueMistakes30d: 30, uniqueMistakes7d: 6,
  frequentFacets: [{ facet: 'word_order', count: 16 }, { facet: 'missing_token', count: 10 }],
  frequentSources: [{ source: 'lessons', count: 22 }, { source: 'cards', count: 8 }],
  topMistakes: [{ mistakeId: 'm1', phrase: 'Where do you work?', count: 4, facet: 'word_order', lessonId: '4' }],
  ...overrides,
});

// зачем (владелец 2026-09-14): подсказка хаба обязана быть готова ДО открытия
// раздела - без кэша ИИ работает текст по правилам из тех же чисел, мгновенно.
describe('mistake hub advice fallback', () => {
  test('names the top facet with its share and the top source', () => {
    const summary = buildMistakeHubAdviceSummary({ insights: insights(), readyCount: 14, studyTarget: 'en', lang: 'ru' });
    const advice = buildMistakeHubAdviceFallback(summary);
    expect(advice.source).toBe('rules');
    expect(advice.hub).toContain('Порядок слов');
    expect(advice.hub).toContain('62%');
    expect(advice.map).toContain('Уроки');
    expect(advice.hub).not.toMatch(/ИИ|AI/);
  });

  test('says only what is true when there is no sample to generalise from', () => {
    // зачем (владелец 2026-09-15): «чаще всего» на одной ошибке — бессмыслица.
    const none = buildMistakeHubAdviceFallback(buildMistakeHubAdviceSummary({
      insights: insights({ frequentFacets: [], frequentSources: [], topMistakes: [] }),
      readyCount: 0, studyTarget: 'en', lang: 'en',
    }));
    expect(none.hub).toBe('Nothing is ready to practise right now.');
    expect(none.map).toBe('');

    const tiny = buildMistakeHubAdviceFallback(buildMistakeHubAdviceSummary({
      insights: insights({
        frequentFacets: [{ facet: 'word_order', count: 1 }],
        frequentSources: [{ source: 'lessons', count: 1 }],
        topMistakes: [],
      }),
      readyCount: 1, studyTarget: 'en', lang: 'en',
    }));
    // Ни «чаще всего», ни «больше всего», ни процентов — выборки нет.
    expect(tiny.hub).not.toMatch(/most|%/i);
    expect(tiny.hub).toContain('1');
    expect(tiny.map).toBe('');
  });

  test('fingerprint changes with the numbers and never carries phrases counts only', () => {
    const base = buildMistakeHubAdviceSummary({ insights: insights(), readyCount: 14, studyTarget: 'en', lang: 'ru' });
    const shifted: MistakeHubAdviceSummary = { ...base, ready: 9 };
    expect(mistakeHubAdviceFingerprint(base)).toHaveLength(24);
    expect(mistakeHubAdviceFingerprint(base)).not.toBe(mistakeHubAdviceFingerprint(shifted));
    expect(base.topPhrases.length).toBeLessThanOrEqual(5);
  });
});
