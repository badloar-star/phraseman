import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  buildLocalStatsInsights,
  generateStatsInsights,
  getStatsInsightsState,
  type StatsInsightsBriefing,
} from '../app/stats_insights_client';
import { statsInsightsStorageKey } from '../app/target_storage_keys';

const resetStorage = () => {
  (AsyncStorage as unknown as { __reset?: () => void }).__reset?.();
};

function briefing(overrides: Partial<StatsInsightsBriefing> = {}): StatsInsightsBriefing {
  return {
    lang: 'ru',
    studyTarget: 'en',
    balance: { score: 44, isWarmup: false, active7: 4, avgMinutes: 21 },
    rhythm: { active7: 4, xp7: 320, minutes7: 84, bestDay: 'среда' },
    year: { activeDays: 40, currentStreak: 5, longestStreak: 9, bestMonth: 'май', goalPct: 12 },
    percentiles: { totalXp: 72, week: 51, daily7: null },
    lifetime: { words: 120, phrases: 18, quizzes: 7, arenaWins: 2, daysActive: 12 },
    weakCategories: [],
    ...overrides,
  };
}

describe('stats insights client copy', () => {
  beforeEach(() => {
    resetStorage();
  });

  it('describes practice behaviour instead of exposing balance score points', () => {
    const notes = buildLocalStatsInsights(briefing());
    expect(notes.balance).toContain('4 активных');
    expect(notes.balance).toContain('21 мин');
    expect(notes.balance).not.toMatch(/баланс|балл/i);
  });

  it('drops stale cached balance notes with internal score wording', async () => {
    await AsyncStorage.setItem(statsInsightsStorageKey('en'), JSON.stringify({
      notes: {
        balance: 'У вас 44 балла за баланс. Это начало.',
        rhythm: 'На этой неделе 4 дня практики.',
        year: '',
        percentiles: '',
        lifetime: '',
      },
      generatedAtMs: 1,
      nextAllowedAtMs: 999999,
      lang: 'ru',
    }));

    const state = await getStatsInsightsState('en');
    expect(state.kind).toBe('cached');
    if (state.kind === 'cached') {
      expect(state.notes.balance).toBe('');
      expect(state.notes.rhythm).toContain('4 дня практики');
    }
  });

  it('refreshes the practice note when cached wording was filtered out', async () => {
    await AsyncStorage.setItem(statsInsightsStorageKey('en'), JSON.stringify({
      notes: {
        balance: 'У вас 44 балла за баланс. Это начало.',
        rhythm: 'На этой неделе 4 дня практики.',
        year: '',
        percentiles: '',
        lifetime: '',
      },
      generatedAtMs: 1,
      nextAllowedAtMs: 999999,
      lang: 'ru',
    }));

    const state = await generateStatsInsights({
      briefing: briefing(),
      isPremium: true,
      nowMs: 10,
    });

    expect(state.kind).toBe('cached');
    if (state.kind === 'cached') {
      expect(state.notes.balance).toContain('4 активных');
      expect(state.notes.balance).not.toMatch(/баланс|балл/i);
    }
  });

  it('does not reuse cached notes from another interface language', async () => {
    await AsyncStorage.setItem(statsInsightsStorageKey('en'), JSON.stringify({
      notes: {
        balance: 'За 7 дней у тебя 4 активных дн.',
        rhythm: 'На этой неделе 4 дня практики.',
        year: '',
        percentiles: '',
        lifetime: '',
      },
      generatedAtMs: 1,
      nextAllowedAtMs: 999999,
      lang: 'ru',
    }));

    const cached = await getStatsInsightsState('en', 10, 'uk');
    expect(cached.kind).toBe('none');

    const state = await generateStatsInsights({
      briefing: briefing({
        lang: 'uk',
        rhythm: { active7: 4, xp7: 320, minutes7: 84, bestDay: 'середа' },
        year: { activeDays: 40, currentStreak: 5, longestStreak: 9, bestMonth: 'травень', goalPct: 12 },
      }),
      isPremium: true,
      nowMs: 10,
    });

    expect(state.kind).toBe('cached');
    if (state.kind === 'cached') {
      expect(state.lang).toBe('uk');
      expect(state.notes.balance).toContain('4 активних');
      expect(state.notes.balance).toContain('21 хв');
    }
  });
});
