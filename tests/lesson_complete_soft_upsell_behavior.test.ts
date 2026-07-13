import {
  candidateAfterLessonGrant,
  createLessonSoftUpsellCtaHandler,
  lessonSoftUpsellPersistenceScope,
  sameLessonSoftUpsellIdentity,
  shouldRenderLessonSoftUpsell,
  type LessonSoftUpsellIdentity,
} from '../app/lesson_complete_soft_upsell';

const identity = (overrides: Partial<LessonSoftUpsellIdentity> = {}): LessonSoftUpsellIdentity => ({
  accountScope: 'a',
  generation: 1,
  lessonId: 1,
  studyTarget: 'en',
  ...overrides,
});

describe('lesson completion soft upsell behavior', () => {
  it('rejects a deferred grant after the account generation changes', () => {
    const captured = identity();
    const current = identity({ accountScope: 'b', generation: 2 });
    expect(candidateAfterLessonGrant({ status: 'granted', captured, current, mounted: true, accountGenerationCurrent: false })).toBeNull();
  });

  it('keeps durable scope stable across generations and isolates different accounts', () => {
    expect(lessonSoftUpsellPersistenceScope({ phase: 'active', stableId: 'alice', generation: 1 })).toBe('alice');
    expect(lessonSoftUpsellPersistenceScope({ phase: 'active', stableId: 'alice', generation: 2 })).toBe('alice');
    expect(lessonSoftUpsellPersistenceScope({ phase: 'active', stableId: 'bob', generation: 2 })).toBe('bob');
    expect(lessonSoftUpsellPersistenceScope({ phase: 'transitioning', stableId: 'alice', generation: 3 })).toBe('');
    expect(sameLessonSoftUpsellIdentity(identity(), identity({ generation: 2 }))).toBe(false);
  });

  it('rejects a deferred grant after unmount or route identity change', () => {
    const captured = identity();
    expect(candidateAfterLessonGrant({ status: 'granted', captured, current: captured, mounted: false, accountGenerationCurrent: true })).toBeNull();
    expect(candidateAfterLessonGrant({ status: 'granted', captured, current: identity({ lessonId: 8 }), mounted: true, accountGenerationCurrent: true })).toBeNull();
    expect(sameLessonSoftUpsellIdentity(captured, identity({ studyTarget: 'fr' }))).toBe(false);
  });

  it('emits only canonical first-completion candidates for lessons 1 and 8', () => {
    const first = identity();
    expect(candidateAfterLessonGrant({ status: 'granted', captured: first, current: first, mounted: true, accountGenerationCurrent: true })).toEqual({ trigger: 'first_lesson', value: 1, studyTarget: 'en' });
    const boundary = identity({ lessonId: 8 });
    expect(candidateAfterLessonGrant({ status: 'granted', captured: boundary, current: boundary, mounted: true, accountGenerationCurrent: true })).toEqual({ trigger: 'free_lessons_complete', value: 8, studyTarget: 'en' });
    expect(candidateAfterLessonGrant({ status: 'already_granted', captured: first, current: first, mounted: true, accountGenerationCurrent: true })).toBeNull();
    const ninth = identity({ lessonId: 9 });
    expect(candidateAfterLessonGrant({ status: 'granted', captured: ninth, current: ninth, mounted: true, accountGenerationCurrent: true })).toBeNull();
  });

  it('gates rendering on the completed sequence', () => {
    expect(shouldRenderLessonSoftUpsell(false, { milestoneId: 'x' })).toBe(false);
    expect(shouldRenderLessonSoftUpsell(true, null)).toBe(false);
    expect(shouldRenderLessonSoftUpsell(true, { milestoneId: 'x' })).toBe(true);
  });

  it('ignores a concurrent double tap and sends first lesson through the real paywall with attribution', async () => {
    const onCta = jest.fn(async () => true);
    const attribution = { impressionId: '12345678-test', trigger: 'first_lesson' as const, context: 'first_lesson_success' as const, mode: 'production' as const };
    const navigatePaywall = jest.fn();
    const handler = createLessonSoftUpsellCtaHandler({ onCta, getAttribution: () => attribution, navigatePaywall });

    const first = handler('first_lesson');
    const second = handler('first_lesson');
    expect(onCta).toHaveBeenCalledTimes(1);
    await Promise.all([first, second]);
    expect(navigatePaywall).toHaveBeenCalledWith(attribution);
  });

  it('does not navigate without authorization or a valid captured attribution', async () => {
    let release!: () => void;
    const onCta = jest.fn().mockImplementationOnce(async () => {
      await new Promise<void>((resolve) => { release = resolve; });
      return false;
    }).mockResolvedValue(false);
    const navigatePaywall = jest.fn();
    const attribution = { impressionId: '12345678-test', trigger: 'first_lesson' as const, context: 'first_lesson_success' as const, mode: 'production' as const };
    const handler = createLessonSoftUpsellCtaHandler({ onCta, getAttribution: () => attribution, navigatePaywall });
    const pending = handler('first_lesson');
    release();
    await pending;
    expect(navigatePaywall).not.toHaveBeenCalled();
    await handler('first_lesson');
    expect(onCta).toHaveBeenCalledTimes(2);

    const missing = createLessonSoftUpsellCtaHandler({ onCta, getAttribution: () => null, navigatePaywall });
    await missing('first_lesson');
    expect(onCta).toHaveBeenCalledTimes(2);
  });
});
