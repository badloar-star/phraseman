import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import type { Lang } from '../constants/i18n';
import { getTodayKey } from './daily_tasks';
import { buildServerConfirmedLegacyCompletion, type SurveyDailyChallengeSnapshot } from './survey_daily_challenge_model';
import type { ActiveSurveyLookupResult } from './survey_client';

export const LEGACY_SURVEY_DONE_KEY = 'shard_survey_done_daykey_v1';

type MarkerSummary = Pick<SurveyDailyChallengeSnapshot, 'surveyId' | 'title'> | { surveyId: string; title: string };

async function scopedKey(stableId: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, stableId);
  return `shard_survey_done_v2:${digest.slice(0, 24)}`;
}

export async function markSurveyDailyTaskDone(input?: { stableId: string; dayKey: string; summary: MarkerSummary }): Promise<void> {
  try {
    if (!input) {
      await AsyncStorage.setItem(LEGACY_SURVEY_DONE_KEY, getTodayKey());
      return;
    }
    await AsyncStorage.setItem(await scopedKey(input.stableId), JSON.stringify({ version: 2, dayKey: input.dayKey, summary: input.summary }));
  } catch { /* best effort */ }
}

export async function isSurveyDailyTaskDone(input: { stableId: string; dayKey: string }): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(await scopedKey(input.stableId));
    if (!raw) return false;
    return JSON.parse(raw)?.dayKey === input.dayKey;
  } catch { return false; }
}

export async function isSurveyDailyTaskDoneToday(): Promise<boolean> {
  try { return (await AsyncStorage.getItem(LEGACY_SURVEY_DONE_KEY)) === getTodayKey(); } catch { return false; }
}

function localDayKey(atMs: number): string {
  const d = new Date(atMs);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function migrateLegacySurveyCompletion(input: { stableId: string; dayKey: string; completion: ActiveSurveyLookupResult['completion']; lang: Lang }): Promise<boolean> {
  if (!input.completion || localDayKey(input.completion.completedAtMs) !== input.dayKey) return false;
  const summary = buildServerConfirmedLegacyCompletion(input.lang);
  await markSurveyDailyTaskDone({ stableId: input.stableId, dayKey: input.dayKey, summary });
  await AsyncStorage.removeItem(LEGACY_SURVEY_DONE_KEY);
  return true;
}

export default function __RouteShim() { return null; }
