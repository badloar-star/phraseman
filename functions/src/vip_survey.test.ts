type DocData = Record<string, unknown>;

const docs = new Map<string, DocData>();

class FakeHttpsError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function refFor(path: string) {
  return { path };
}

const fakeDb = {
  collection: (collection: string) => ({
    doc: (id: string) => refFor(`${collection}/${id}`),
  }),
  runTransaction: async <T>(handler: (tx: {
    get: (ref: { path: string }) => Promise<{ exists: boolean; data: () => DocData | undefined }>;
    set: jest.Mock;
  }) => Promise<T>): Promise<T> => handler({
    get: async (ref) => ({ exists: docs.has(ref.path), data: () => docs.get(ref.path) }),
    set: jest.fn(),
  }),
};

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: FakeHttpsError,
  onCall: (_options: unknown, handler: unknown) => handler,
}));

jest.mock('firebase-admin', () => ({
  firestore: () => fakeDb,
}));

jest.mock('./auth_identity', () => ({
  resolveStableUidForAuth: async () => 'stable-1',
}));

jest.mock('./access_projection', () => ({
  writeAccessProjectionFromPatch: jest.fn(),
}));

import { submitVipSurvey as submitVipSurveyRaw } from './vip_survey';
import { VIP_SURVEY_ID } from './vip_survey_contract';

const NOW = 1_800_000_000_000;
const submitVipSurvey = submitVipSurveyRaw as unknown as (request: {
  auth: { uid: string };
  data: Record<string, unknown>;
}) => Promise<Record<string, unknown>>;

const validAnswers = {
  most_useful: { optionId: 'lessons' },
  linger_screen: { optionId: 'lessons' },
  less_interesting: { optionId: 'never' },
  first_time_confusing: { optionId: 'all_clear' },
  expected_missing: { optionId: 'found_all' },
  overloaded_screen: { optionId: 'none' },
  one_thing_week: { comment: 'More practice' },
  feature_request: { comment: 'Speaking' },
  friend_recommendation: { comment: 'Useful lessons' },
};

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(NOW);
  docs.clear();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('VIP survey free-tier authorization', () => {
  it.each([
    ['MAX monthly', { premium_plan: 'max_monthly', premium_expiry: String(NOW + 86_400_000) }],
    ['Pro/lifetime', { premium_plan: 'lifetime', premium_expiry: '0' }],
  ])('rejects active %s before granting the 30-day VIP reward', async (_label, progress) => {
    docs.set('users/stable-1', { progress });

    await expect(submitVipSurvey({
      auth: { uid: 'auth-1' },
      data: {
        surveyId: VIP_SURVEY_ID,
        answers: validAnswers,
        reviewIntent: 'not_now',
        messageId: 'message-1',
        platform: 'ios',
      },
    })).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'vip_survey_free_tier_required',
    });
  });
});
