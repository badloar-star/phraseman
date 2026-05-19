import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'quiz_daily_free_limit_v1';

export const FREE_DAILY_QUIZ_LIMIT = 3;

export type QuizDailyLimitState = {
  date: string;
  count: number;
  limit: number;
  left: number;
  exhausted: boolean;
};

type StoredQuizDailyLimit = {
  date?: string;
  count?: number;
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalize(raw: StoredQuizDailyLimit | null | undefined): QuizDailyLimitState {
  const date = todayKey();
  const count =
    raw?.date === date && Number.isFinite(raw.count)
      ? Math.max(0, Math.floor(Number(raw.count)))
      : 0;
  const left = Math.max(0, FREE_DAILY_QUIZ_LIMIT - count);
  return {
    date,
    count,
    limit: FREE_DAILY_QUIZ_LIMIT,
    left,
    exhausted: left <= 0,
  };
}

export async function getFreeDailyQuizState(): Promise<QuizDailyLimitState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return normalize(raw ? JSON.parse(raw) as StoredQuizDailyLimit : null);
  } catch {
    return normalize(null);
  }
}

export async function incrementFreeDailyQuizCount(): Promise<QuizDailyLimitState> {
  const state = await getFreeDailyQuizState();
  const nextCount = state.count + 1;
  await AsyncStorage.setItem(KEY, JSON.stringify({ date: state.date, count: nextCount }));
  return normalize({ date: state.date, count: nextCount });
}

export async function consumeFreeDailyQuizStart(): Promise<QuizDailyLimitState | null> {
  const state = await getFreeDailyQuizState();
  if (state.exhausted) return null;

  const nextCount = state.count + 1;
  await AsyncStorage.setItem(KEY, JSON.stringify({ date: state.date, count: nextCount }));
  return normalize({ date: state.date, count: nextCount });
}

export async function hasFreeDailyQuizzesLeft(): Promise<boolean> {
  return !(await getFreeDailyQuizState()).exhausted;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
