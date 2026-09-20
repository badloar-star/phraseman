import { getVerifiedPremiumAccessStatus } from '../app/premium_guard';
import { buyLessonWithPearls, LESSON_PEARL_UNLOCK_PRICE } from '../app/lessons_pearl_unlock';
import { commitShardCompositeOperation, semanticShardOperationId } from '../app/shards_system';
import { emitAppEvent } from '../app/events';
import { isLessonUnlockedByPremiumCourse } from '../app/lesson_lock_system';
import { captureAccountGeneration, isCurrentAccountGeneration } from '../app/account_generation';

jest.mock('../app/premium_guard', () => ({
  getVerifiedPremiumAccessStatus: jest.fn(),
}));

jest.mock('../app/shards_system', () => ({
  commitShardCompositeOperation: jest.fn(),
  semanticShardOperationId: jest.fn(),
}));

jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));
jest.mock('../app/lesson_lock_system', () => ({
  isLessonUnlockedByPremiumCourse: jest.fn(),
}));
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: jest.fn(),
  isCurrentAccountGeneration: jest.fn(),
}));

const mockPremiumStatus = getVerifiedPremiumAccessStatus as jest.MockedFunction<
  typeof getVerifiedPremiumAccessStatus
>;
const mockCompositeCommit = commitShardCompositeOperation as jest.MockedFunction<
  typeof commitShardCompositeOperation
>;
const mockSemanticOperationId = semanticShardOperationId as jest.MockedFunction<
  typeof semanticShardOperationId
>;
const mockPremiumCourseAccess = isLessonUnlockedByPremiumCourse as jest.MockedFunction<
  typeof isLessonUnlockedByPremiumCourse
>;
const mockCaptureAccountGeneration = captureAccountGeneration as jest.MockedFunction<
  typeof captureAccountGeneration
>;
const mockIsCurrentAccountGeneration = isCurrentAccountGeneration as jest.MockedFunction<
  typeof isCurrentAccountGeneration
>;

beforeEach(() => {
  jest.clearAllMocks();
  mockPremiumStatus.mockResolvedValue(false);
  mockSemanticOperationId.mockResolvedValue('lesson_pearl_unlock:test:4');
  mockPremiumCourseAccess.mockResolvedValue(false);
  mockCaptureAccountGeneration.mockReturnValue({ generation: 1, stableId: 'account-a', phase: 'active' });
  mockIsCurrentAccountGeneration.mockReturnValue(true);
});

describe('lesson pearl purchase Plus boundary', () => {
  it('rejects Free before any debit or grant work', async () => {
    await expect(buyLessonWithPearls({ lessonId: 4 })).resolves.toEqual({
      ok: false,
      reason: 'premium_required',
    });

    expect(mockPremiumStatus).toHaveBeenCalledWith({
      generation: { generation: 1, stableId: 'account-a', phase: 'active' },
      bypassCache: true,
      allowCloudRefresh: false,
    });
    expect(mockCompositeCommit).not.toHaveBeenCalled();
    expect(emitAppEvent).not.toHaveBeenCalled();
  });

  // ВНИМАНИЕ: до 2026-09-20 сюда входили уроки 2 и 3 — Free получал отказ
  // ВСЕГДА. После закрытия уроков 2–3 это стало тупиком: пейвола на них нет,
  // а выхода за жемчужины не было. Здесь остались ТОЛЬКО платные уроки.
  it.each([
    [9, 'Plus section starter'],
    [7, 'prior pearl purchase'],
    [32, 'last paid lesson'],
  ] as ReadonlyArray<readonly [number, string]>)('returns premium_required to Free before checking accessible lesson %i (%s)', async (lessonId) => {
    mockPremiumCourseAccess.mockResolvedValue(true);

    await expect(buyLessonWithPearls({ lessonId })).resolves.toEqual({
      ok: false,
      reason: 'premium_required',
    });

    expect(mockPremiumCourseAccess).not.toHaveBeenCalled();
    expect(mockCompositeCommit).not.toHaveBeenCalled();
    expect(emitAppEvent).not.toHaveBeenCalled();
  });

  // Владелец 2026-09-20: Free МОЖЕТ купить урок без пейвола (2–3),
  // иначе замок прогресса на них — тупик без выхода.
  it.each([
    [2, 'Free sample'],
    [3, 'Free sample'],
  ] as ReadonlyArray<readonly [number, string]>)('lets Free buy non-paywalled lesson %i (%s)', async (lessonId) => {
    mockPremiumCourseAccess.mockResolvedValue(false);
    mockCompositeCommit.mockResolvedValue({
      status: 'applied',
      operation: { ownerStableId: 'account-a' },
    } as never);

    await expect(buyLessonWithPearls({ lessonId })).resolves.toEqual({
      ok: true,
      spent: LESSON_PEARL_UNLOCK_PRICE,
      lessonId,
      alreadyOwned: false,
    });

    expect(mockCompositeCommit).toHaveBeenCalledTimes(1);
  });

  it('у Free уже открытый урок 2 не доходит до дебета', async () => {
    mockPremiumCourseAccess.mockResolvedValue(true);

    await expect(buyLessonWithPearls({ lessonId: 2 })).resolves.toEqual({
      ok: false,
      reason: 'already_accessible',
    });

    expect(mockCompositeCommit).not.toHaveBeenCalled();
  });

  it('keeps the Plus purchase as one idempotent composite debit and grant', async () => {
    mockPremiumStatus.mockResolvedValue(true);
    mockCompositeCommit.mockResolvedValue({
      status: 'applied',
      operation: {
        ownerStableId: 'account-a',
      },
      balanceBefore: 150,
      balanceAfter: 50,
    } as Awaited<ReturnType<typeof commitShardCompositeOperation>>);

    await expect(buyLessonWithPearls({ lessonId: 4, studyTarget: 'en' })).resolves.toEqual({
      ok: true,
      spent: LESSON_PEARL_UNLOCK_PRICE,
      lessonId: 4,
      alreadyOwned: false,
    });

    expect(mockCompositeCommit).toHaveBeenCalledTimes(1);
    expect(mockCompositeCommit).toHaveBeenCalledWith({
      operationId: 'lesson_pearl_unlock:test:4',
      amount: LESSON_PEARL_UNLOCK_PRICE,
      reason: 'lesson_pearl_unlock',
      grant: {
        kind: 'lesson_pearl_unlock',
        subjectId: 'en:4',
        payload: {
          storageKey: 'lessons_pearl_unlocked_v1',
          lessonId: 4,
          studyTarget: 'en',
        },
      },
      localWrites: [],
    });
    expect(emitAppEvent).toHaveBeenCalledWith('lesson_pearl_unlock_granted', {
      lessonId: 4,
      studyTarget: 'en',
    });
  });

  it.each([
    [2, 'Free sample'],
    [3, 'Free sample'],
    [9, 'Plus section starter'],
    [19, 'Plus section starter'],
    [29, 'Plus section starter'],
    [7, 'prior pearl purchase'],
    [10, 'opened by prior-lesson progress'],
  ] as ReadonlyArray<readonly [number, string]>)('rejects already accessible lesson %i (%s) without a debit or grant', async (lessonId) => {
    mockPremiumStatus.mockResolvedValue(true);
    mockPremiumCourseAccess.mockResolvedValue(true);

    await expect(buyLessonWithPearls({ lessonId })).resolves.toEqual({
      ok: false,
      reason: 'already_accessible',
    });

    expect(mockPremiumCourseAccess).toHaveBeenCalledWith(lessonId, undefined);
    expect(mockCompositeCommit).not.toHaveBeenCalled();
    expect(emitAppEvent).not.toHaveBeenCalled();
  });

  it('fails closed when active Plus cannot be verified', async () => {
    mockPremiumStatus.mockRejectedValue(new Error('entitlement unavailable'));
    mockPremiumCourseAccess.mockResolvedValue(true);

    await expect(buyLessonWithPearls({ lessonId: 4 })).resolves.toEqual({
      ok: false,
      reason: 'premium_required',
    });

    expect(mockCompositeCommit).not.toHaveBeenCalled();
    expect(emitAppEvent).not.toHaveBeenCalled();
    expect(mockPremiumCourseAccess).not.toHaveBeenCalled();
  });

  it('does not carry Plus authorization across an account-generation change', async () => {
    mockPremiumStatus.mockResolvedValue(true);
    mockIsCurrentAccountGeneration.mockReturnValue(false);

    await expect(buyLessonWithPearls({ lessonId: 4 })).resolves.toEqual({
      ok: false,
      reason: 'stale_account',
    });

    expect(mockCompositeCommit).not.toHaveBeenCalled();
    expect(emitAppEvent).not.toHaveBeenCalled();
  });
});
