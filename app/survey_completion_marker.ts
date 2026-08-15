import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import type { Lang } from '../constants/i18n';
import { getUtcDayKey } from './local_date';
import { buildServerConfirmedLegacyCompletion, type SurveyOfferSnapshot } from './survey_offer_model';
import type { ActiveSurveyLookupResult } from './survey_client';

export const LEGACY_SURVEY_DONE_KEY = 'shard_survey_done_daykey_v1';

type MarkerSummary = Pick<SurveyOfferSnapshot, 'surveyId' | 'title'> | { surveyId: string; title: string };

async function scopedKey(stableId: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, stableId);
  return `shard_survey_done_v2:${digest.slice(0, 24)}`;
}

export async function markSurveyOfferDone(input?: { stableId: string; dayKey: string; summary: MarkerSummary }): Promise<boolean> {
  try {
    if (!input) {
      await AsyncStorage.setItem(LEGACY_SURVEY_DONE_KEY, getUtcDayKey());
      return true;
    }
    await AsyncStorage.setItem(await scopedKey(input.stableId), JSON.stringify({ version: 2, dayKey: input.dayKey, summary: input.summary }));
    return true;
  } catch { return false; }
}

export async function isSurveyOfferDone(input: { stableId: string; dayKey: string }): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(await scopedKey(input.stableId));
    if (!raw) return false;
    return JSON.parse(raw)?.dayKey === input.dayKey;
  } catch { return false; }
}

export async function isSurveyOfferDoneToday(): Promise<boolean> {
  try { return (await AsyncStorage.getItem(LEGACY_SURVEY_DONE_KEY)) === getUtcDayKey(); } catch { return false; }
}

function utcDayKey(atMs: number): string | null {
  const d = new Date(atMs);
  return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : null;
}

export async function migrateLegacySurveyCompletion(input: { stableId: string; dayKey: string; completion: ActiveSurveyLookupResult['completion']; lang: Lang }): Promise<boolean> {
  if (!input.completion || utcDayKey(input.completion.completedAtMs) !== input.dayKey) return false;
  const summary = buildServerConfirmedLegacyCompletion(input.lang);
  const marked = await markSurveyOfferDone({ stableId: input.stableId, dayKey: input.dayKey, summary });
  if (!marked) return false;
  await AsyncStorage.removeItem(LEGACY_SURVEY_DONE_KEY);
  return true;
}

export default function __RouteShim() { return null; }
