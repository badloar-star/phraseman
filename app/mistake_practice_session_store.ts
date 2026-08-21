import AsyncStorage from '@react-native-async-storage/async-storage';
import { canonicalJsonV1 } from '../modules/learning-v2/policies/decision_registry';
import type { MistakeStudyTarget } from '../modules/mistake-practice/contracts';
import type { MistakePracticeSession } from '../modules/mistake-practice/session';
import type { MistakePracticeStorage } from './mistake_practice_store';
import { mistakePracticeSessionKey } from './target_storage_keys';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
} from './account_generation';

type Scope = {
  accountScope: string;
  studyTarget: MistakeStudyTarget;
  storage?: MistakePracticeStorage;
};

type SessionEnvelope = {
  version: 1;
  accountScope: string;
  studyTarget: MistakeStudyTarget;
  session: MistakePracticeSession;
};

export type MistakePracticeSessionAccountFence = Readonly<{
  assertCurrent: () => void;
}>;

export function captureMistakePracticeSessionAccountFence(
  accountScope: string,
): MistakePracticeSessionAccountFence {
  const generation = captureAccountGeneration();
  const assertCurrent = () => {
    if (
      generation.phase !== 'uninitialized'
      && !isCurrentAccountGeneration(generation, accountScope)
    ) throw new Error('stale_account_generation');
  };
  assertCurrent();
  return Object.freeze({ assertCurrent });
}

const isSession = (value: unknown): value is MistakePracticeSession => {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<MistakePracticeSession>;
  return session.version === 1
    && typeof session.sessionId === 'string'
    && typeof session.startedAtMs === 'number'
    && typeof session.cursor === 'number'
    && Array.isArray(session.queue)
    && Array.isArray(session.answeredAttemptIds)
    && !!session.failureCounts
    && typeof session.failureCounts === 'object';
};

export async function saveMistakePracticeSession(
  input: Scope & { session: MistakePracticeSession },
): Promise<void> {
  const storage = input.storage ?? AsyncStorage;
  const envelope: SessionEnvelope = {
    version: 1,
    accountScope: input.accountScope,
    studyTarget: input.studyTarget,
    session: input.session,
  };
  const generation = captureAccountGeneration();
  await withAccountTransitionLock(async () => {
    if (generation.phase !== 'uninitialized' && !isCurrentAccountGeneration(generation, input.accountScope)) {
      throw new Error('stale_account_generation');
    }
    await storage.setItem(
      mistakePracticeSessionKey(input.accountScope, input.studyTarget),
      canonicalJsonV1(envelope),
    );
    if (generation.phase !== 'uninitialized' && !isCurrentAccountGeneration(generation, input.accountScope)) {
      throw new Error('stale_account_generation');
    }
  });
}

export async function loadMistakePracticeSession(
  input: Scope,
): Promise<MistakePracticeSession | null> {
  const storage = input.storage ?? AsyncStorage;
  const accountFence = captureMistakePracticeSessionAccountFence(input.accountScope);
  const raw = await storage.getItem(mistakePracticeSessionKey(input.accountScope, input.studyTarget));
  accountFence.assertCurrent();
  if (!raw) return null;
  try {
    const envelope = JSON.parse(raw) as Partial<SessionEnvelope>;
    if (
      envelope.version !== 1
      || envelope.accountScope !== input.accountScope
      || envelope.studyTarget !== input.studyTarget
      || !isSession(envelope.session)
    ) return null;
    accountFence.assertCurrent();
    return envelope.session;
  } catch {
    return null;
  }
}

export async function clearMistakePracticeSession(input: Scope): Promise<void> {
  const storage = input.storage ?? AsyncStorage;
  const generation = captureAccountGeneration();
  await withAccountTransitionLock(async () => {
    if (generation.phase !== 'uninitialized' && !isCurrentAccountGeneration(generation, input.accountScope)) {
      throw new Error('stale_account_generation');
    }
    await storage.removeItem(mistakePracticeSessionKey(input.accountScope, input.studyTarget));
  });
}
