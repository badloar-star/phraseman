// зачем: компиляция 12×12 карт детерминирована, но заметно тяжелее обычного
// рендера. Один ограниченный кэш урока позволяет прогреть её после анимации
// карты и не повторять работу при каждом входе. Кэш не растёт: в нём ровно Lesson 1.
import { buildE1DemoProfile } from '../content/e1_demo_bank';
import {
  buildLesson1LegacyActivityBindings,
  buildLesson1LegacyV2SourcePayload,
  type V2LegacyLessonSourcePayload,
} from '../content/legacy_lesson_payload';
import {
  compileV2RequiredSessions,
  type V2CompiledEpisodeContent,
} from '../content/session_compiler';
import { validateV2SessionSet, type V2SessionSetBodyV2 } from '../contracts/session';
import { requiredSessionSetId } from '../contracts/required_session_release_identity';
import { hashCanonicalBody } from '../policies/decision_registry';

export interface Lesson1SessionRuntime {
  readonly payload: Readonly<V2LegacyLessonSourcePayload>;
  readonly compiled: Readonly<V2CompiledEpisodeContent>;
  readonly sessionSetId: string;
  readonly sessionSetHash: string;
  readonly sessionSet: Readonly<V2SessionSetBodyV2>;
}

let payloadCache: Readonly<V2LegacyLessonSourcePayload> | undefined;
let runtimeCache: Readonly<Lesson1SessionRuntime> | undefined;

const deepFreeze = <T>(value: T): T => {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return value;
};

export function getLesson1SourcePayload(): Readonly<V2LegacyLessonSourcePayload> {
  payloadCache ??= buildLesson1LegacyV2SourcePayload();
  return payloadCache;
}

export function peekLesson1SessionRuntime(): Readonly<Lesson1SessionRuntime> | undefined {
  return runtimeCache;
}

export function getLesson1SessionRuntime(): Readonly<Lesson1SessionRuntime> {
  if (runtimeCache) return runtimeCache;
  const payload = getLesson1SourcePayload();
  const compiled = compileV2RequiredSessions({
    episodeId: payload.episodeId,
    canDoOutcomeId: 'obj-lesson-01-to-be-statements',
    profile: buildE1DemoProfile(),
    items: payload.contentItems,
    activityBindings: buildLesson1LegacyActivityBindings(payload.contentItems),
  });
  const candidate = {
    schemaVersion: 'v2-session-set.v2' as const,
    episodeId: payload.episodeId as V2SessionSetBodyV2['episodeId'],
    version: 1,
    sessions: compiled.sessions.map(({ support: _derivedSupport, ...session }) => session),
    optionalPracticeSlots: [],
  };
  const validated = validateV2SessionSet(candidate);
  if (!validated.ok || validated.value.schemaVersion !== 'v2-session-set.v2') {
    throw new Error(`lesson1_session_set_invalid:${validated.issues.join(',')}`);
  }
  const sessionSet = deepFreeze(validated.value);
  runtimeCache = Object.freeze({
    payload,
    compiled,
    sessionSetId: requiredSessionSetId(payload.episodeId, sessionSet.version),
    sessionSetHash: hashCanonicalBody(sessionSet),
    sessionSet,
  });
  return runtimeCache;
}

/** Safe to call after navigation interactions; later session mounts reuse the same frozen result. */
export function warmLesson1SessionRuntime(): void {
  getLesson1SessionRuntime();
}
