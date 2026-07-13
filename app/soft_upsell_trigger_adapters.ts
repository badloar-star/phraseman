import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  type AccountGenerationToken,
} from './account_generation';
import type { SoftUpsellCandidate, SoftUpsellStudyTarget } from './soft_upsell_core';

export type SoftUpsellTriggerEnvelope = Readonly<{
  candidate: SoftUpsellCandidate;
  accountToken: AccountGenerationToken;
}>;

type Listener = (value: SoftUpsellTriggerEnvelope) => void;
const listeners = new Set<Listener>();

function candidate(
  trigger: SoftUpsellCandidate['trigger'],
  value: number,
  studyTarget: SoftUpsellStudyTarget,
  hasPremiumAccess: boolean,
): SoftUpsellCandidate | null {
  return hasPremiumAccess ? null : { trigger, value, studyTarget };
}

export function weeklyReviewCandidate(input: {
  completed: boolean; studyTarget: SoftUpsellStudyTarget; hasPremiumAccess: boolean;
}): SoftUpsellCandidate | null {
  return input.completed ? candidate('weekly_review', 1, input.studyTarget, input.hasPremiumAccess) : null;
}

export function aiDialogueCandidate(input: {
  successful: boolean; completedLifetime: number; newlyCompleted: boolean;
  studyTarget: SoftUpsellStudyTarget; hasPremiumAccess: boolean;
}): SoftUpsellCandidate | null {
  return input.successful && input.newlyCompleted && input.completedLifetime === 2
    ? candidate('second_ai_dialogue', 2, input.studyTarget, input.hasPremiumAccess)
    : null;
}

export function streakCandidate(input: {
  previous: number; current: number; studyTarget: SoftUpsellStudyTarget; hasPremiumAccess: boolean;
}): SoftUpsellCandidate | null {
  return input.current > input.previous && [7, 14, 30].includes(input.current)
    ? candidate('streak_milestone', input.current, input.studyTarget, input.hasPremiumAccess)
    : null;
}

export function repeatedTrainingCandidate(input: {
  successful: boolean; completedLifetime: number; newlyCompleted: boolean;
  studyTarget: SoftUpsellStudyTarget; hasPremiumAccess: boolean;
}): SoftUpsellCandidate | null {
  return input.successful && input.newlyCompleted && input.completedLifetime === 2
    ? candidate('repeated_training', 1, input.studyTarget, input.hasPremiumAccess)
    : null;
}

export function emitSoftUpsellTrigger(value: SoftUpsellCandidate | null): void {
  if (!value) return;
  const accountToken = captureAccountGeneration();
  if (!isCurrentAccountGeneration(accountToken)) return;
  const envelope = Object.freeze({ candidate: Object.freeze({ ...value }), accountToken });
  listeners.forEach((listener) => { try { listener(envelope); } catch { /* UI signal only */ } });
}

export function subscribeSoftUpsellTriggers(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const TRAINING_COMPLETIONS_KEY = 'soft_upsell_successful_training_count_v1';

export async function recordSuccessfulTraining(studyTarget: SoftUpsellStudyTarget): Promise<{
  newlyCompleted: boolean; completedLifetime: number;
}> {
  const token = captureAccountGeneration();
  if (!isCurrentAccountGeneration(token)) return { newlyCompleted: false, completedLifetime: 0 };
  const identity = token.stableId ? `uid:${token.stableId}` : `generation:${token.generation}`;
  const key = `${TRAINING_COMPLETIONS_KEY}:${identity}:${studyTarget}`;
  const raw = await AsyncStorage.getItem(key).catch(() => null);
  if (!isCurrentAccountGeneration(token)) return { newlyCompleted: false, completedLifetime: 0 };
  const previous = Math.max(0, Number.parseInt(raw || '0', 10) || 0);
  const next = Math.min(2, previous + 1);
  if (next !== previous) await AsyncStorage.setItem(key, String(next)).catch(() => undefined);
  if (!isCurrentAccountGeneration(token)) return { newlyCompleted: false, completedLifetime: 0 };
  return { newlyCompleted: next !== previous, completedLifetime: next };
}

export function __resetSoftUpsellTriggerListenersForTests(): void { listeners.clear(); }
