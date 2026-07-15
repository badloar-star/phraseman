import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Lang } from '../../constants/i18n';
import {
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from '../../app/account_generation';
import { TODAY_RECOMMENDATION_HISTORY_KEY } from './storage_keys';
import type { TodayRecommendation } from './types';
import type { TodayRecommendationHistory } from './recommendation_selector';
import { registerTodayRuntimeReset } from './runtime_reset';

type MutableRuleHistory = { lastShownAt: number | null; variants: Record<string, Partial<Record<Lang, number>>> };
type PersistedState = { version: 1; scopes: Record<string, Record<string, MutableRuleHistory>> };

const MAX_RULE_RECORDS = 80;
const HISTORY_TTL_MS = 90 * 24 * 60 * 60 * 1000;
let state: PersistedState = { version: 1, scopes: {} };
let mutationRevision = 0;

function mergeRuleHistory(base: MutableRuleHistory | undefined, incoming: MutableRuleHistory): MutableRuleHistory {
  const merged: MutableRuleHistory = {
    lastShownAt: Math.max(base?.lastShownAt ?? 0, incoming.lastShownAt ?? 0) || null,
    variants: { ...(base?.variants ?? {}) },
  };
  for (const [variantId, localeTimes] of Object.entries(incoming.variants ?? {})) {
    const target = merged.variants[variantId] ?? (merged.variants[variantId] = {});
    for (const [locale, at] of Object.entries(localeTimes)) {
      if (typeof at === 'number') target[locale as Lang] = Math.max(target[locale as Lang] ?? 0, at);
    }
  }
  return merged;
}

function mergeState(base: PersistedState, incoming: PersistedState): PersistedState {
  const merged: PersistedState = { version: 1, scopes: {} };
  for (const [scopeKey, rules] of Object.entries(base.scopes)) {
    merged.scopes[scopeKey] = { ...rules };
  }
  for (const [scopeKey, rules] of Object.entries(incoming.scopes)) {
    const target = merged.scopes[scopeKey] ?? (merged.scopes[scopeKey] = {});
    for (const [ruleId, history] of Object.entries(rules)) {
      target[ruleId] = mergeRuleHistory(target[ruleId], history);
    }
  }
  return merged;
}

export function resetTodayRecommendationHistoryMemory(): void {
  state = { version: 1, scopes: {} };
  mutationRevision += 1;
}

registerTodayRuntimeReset(resetTodayRecommendationHistoryMemory);

function parseState(raw: string | null): PersistedState {
  if (!raw) return { version: 1, scopes: {} };
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return parsed.version === 1 && parsed.scopes && typeof parsed.scopes === 'object'
      ? { version: 1, scopes: parsed.scopes }
      : { version: 1, scopes: {} };
  } catch {
    return { version: 1, scopes: {} };
  }
}

function prune(nowMs: number): void {
  const records: Array<{ scopeKey: string; ruleId: string; at: number }> = [];
  for (const [scopeKey, rules] of Object.entries(state.scopes)) {
    for (const [ruleId, history] of Object.entries(rules)) {
      const at = history.lastShownAt ?? 0;
      if (at > 0 && nowMs - at > HISTORY_TTL_MS) delete rules[ruleId];
      else records.push({ scopeKey, ruleId, at });
    }
    if (Object.keys(rules).length === 0) delete state.scopes[scopeKey];
  }
  records.sort((a, b) => b.at - a.at);
  for (const stale of records.slice(MAX_RULE_RECORDS)) {
    delete state.scopes[stale.scopeKey]?.[stale.ruleId];
    if (state.scopes[stale.scopeKey] && Object.keys(state.scopes[stale.scopeKey]!).length === 0) delete state.scopes[stale.scopeKey];
  }
}

export function getTodayRecommendationHistory(scopeKey: string): TodayRecommendationHistory {
  return state.scopes[scopeKey] ?? {};
}

export async function hydrateTodayRecommendationHistory(token: AccountGenerationToken): Promise<void> {
  if (!isCurrentAccountGeneration(token)) return;
  const revisionAtStart = mutationRevision;
  const raw = await AsyncStorage.getItem(TODAY_RECOMMENDATION_HISTORY_KEY).catch(() => null);
  if (!isCurrentAccountGeneration(token)) return;
  const diskState = parseState(raw);
  state = mutationRevision === revisionAtStart ? diskState : mergeState(diskState, state);
  prune(Date.now());
}

export async function recordTodayRecommendationShown(input: {
  scopeKey: string;
  recommendation: TodayRecommendation;
  locale: Lang;
  nowMs: number;
  token: AccountGenerationToken;
}): Promise<void> {
  if (!isCurrentAccountGeneration(input.token)) return;
  mutationRevision += 1;
  const rules = state.scopes[input.scopeKey] ?? (state.scopes[input.scopeKey] = {});
  const rule = rules[input.recommendation.ruleId] ?? (rules[input.recommendation.ruleId] = { lastShownAt: null, variants: {} });
  rule.lastShownAt = Math.max(rule.lastShownAt ?? 0, input.nowMs);
  const variant = rule.variants[input.recommendation.variantId] ?? (rule.variants[input.recommendation.variantId] = {});
  variant[input.locale] = Math.max(variant[input.locale] ?? 0, input.nowMs);
  prune(input.nowMs);
  await withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(input.token)) {
      state = { version: 1, scopes: {} };
      return;
    }
    await AsyncStorage.setItem(TODAY_RECOMMENDATION_HISTORY_KEY, JSON.stringify(state));
  });
}

export function __resetTodayRecommendationHistoryForTests(): void {
  resetTodayRecommendationHistoryMemory();
}
