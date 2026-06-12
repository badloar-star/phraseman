import AsyncStorage from '@react-native-async-storage/async-storage';
import { FREE_AI_MISTAKE_EXPLAINS_PER_DAY_DEFAULT } from './ai_mistake_explain_flags';

export { FREE_AI_MISTAKE_EXPLAINS_PER_DAY_DEFAULT };

export const DAILY_AI_MISTAKE_EXPLAIN_KEY = 'ai_mistake_explain_session_v1';

interface DailyMistakeExplainState {
  date: string;
  count: number;
}

const todayKey = (): string => new Date().toISOString().split('T')[0];

function parseState(raw: string | null): DailyMistakeExplainState | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as DailyMistakeExplainState;
    return typeof data?.date === 'string' && typeof data?.count === 'number' ? data : null;
  } catch {
    return null;
  }
}

export async function getAiMistakeExplainsLeftToday(): Promise<number> {
  try {
    const data = parseState(await AsyncStorage.getItem(DAILY_AI_MISTAKE_EXPLAIN_KEY));
    if (!data || data.date !== todayKey()) return FREE_AI_MISTAKE_EXPLAINS_PER_DAY_DEFAULT;
    return Math.max(0, FREE_AI_MISTAKE_EXPLAINS_PER_DAY_DEFAULT - data.count);
  } catch {
    return FREE_AI_MISTAKE_EXPLAINS_PER_DAY_DEFAULT;
  }
}

export async function markAiMistakeExplainUsed(): Promise<void> {
  try {
    const existing = parseState(await AsyncStorage.getItem(DAILY_AI_MISTAKE_EXPLAIN_KEY));
    const data = existing && existing.date === todayKey() ? existing : { date: todayKey(), count: 0 };
    await AsyncStorage.setItem(
      DAILY_AI_MISTAKE_EXPLAIN_KEY,
      JSON.stringify({ date: data.date, count: data.count + 1 }),
    );
  } catch {}
}
