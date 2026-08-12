export interface LearningV2SessionResultPresentation {
  readonly localSessionId: string;
  readonly provisionalStars: number;
  readonly maxStars: 36;
  /** Presentation-only: never a wallet, access, mastery or league input. */
  readonly authority: 'local_presentation_only';
}

export interface LearningV2SessionResultRouteParams {
  readonly resultSessionId: string;
  readonly resultStars: string;
}

const SESSION_ID = /^[A-Za-z0-9._:-]{1,160}$/;
const MAX_STARS = 36;
const INPUT_KEYS = ['localSessionId', 'provisionalStars'] as const;
const ROUTE_KEYS = ['resultSessionId', 'resultStars'] as const;

const readExactDataRecord = (
  input: unknown,
  keys: readonly string[],
): Readonly<Record<string, unknown>> | null => {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return null;
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const ownKeys = Reflect.ownKeys(descriptors);
  if (ownKeys.length !== keys.length || ownKeys.some((key) =>
    typeof key !== 'string' || !keys.includes(key))) return null;
  const result = Object.create(null) as Record<string, unknown>;
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) return null;
    result[key] = descriptor.value;
  }
  return result;
};

const validSessionId = (value: unknown): value is string =>
  typeof value === 'string' && SESSION_ID.test(value);

const validStars = (value: unknown): value is number =>
  Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= MAX_STARS;

/**
 * Encodes only a transient local celebration. These params never authorize a
 * wallet credit, course unlock, mastery decision or competitive result.
 */
export const buildLearningV2SessionResultRouteParams = (
  input: unknown,
): LearningV2SessionResultRouteParams => {
  const value = readExactDataRecord(input, INPUT_KEYS);
  if (!value || !validSessionId(value.localSessionId) ||
    !validStars(value.provisionalStars)) {
    throw new Error('learning_v2_session_result_handoff_invalid');
  }
  return Object.freeze({
    resultSessionId: value.localSessionId,
    resultStars: String(value.provisionalStars),
  });
};

export const parseLearningV2SessionResultRouteParams = (
  input: unknown,
): LearningV2SessionResultPresentation | null => {
  const value = readExactDataRecord(input, ROUTE_KEYS);
  if (!value || !validSessionId(value.resultSessionId) ||
    typeof value.resultStars !== 'string' ||
    !/^(?:0|[1-9]|[12][0-9]|3[0-6])$/.test(value.resultStars)) return null;
  const provisionalStars = Number(value.resultStars);
  if (!validStars(provisionalStars)) return null;
  return Object.freeze({
    localSessionId: value.resultSessionId,
    provisionalStars,
    maxStars: MAX_STARS,
    authority: 'local_presentation_only',
  });
};
