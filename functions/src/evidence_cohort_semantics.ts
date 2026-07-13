const DAY_MS = 24 * 60 * 60 * 1000;
const RETENTION_DAYS = [1, 7, 14, 30] as const;

type RetentionDay = typeof RETENTION_DAYS[number];

export interface FirstTouchInstanceFixture {
  firstTouchMs: number;
  activeDayMs: number[];
}

export interface RetentionCounts {
  eligible: number;
  exactReturned: number;
  rollingReturned: number;
}

export interface ActivationInstanceFixture {
  onboarding: boolean;
  learningStarted: boolean;
  learningCompleted: boolean;
  returnedWithin72h: boolean;
  returnedD7: boolean;
}

export interface OrderedActivationEventsFixture {
  firstTouchMs: number;
  onboardingCompletedMs: number[];
  lessonStartedMs: number[];
  lessonCompletedMs: number[];
  sessionStartedMs: number[];
}

function firstAtOrAfter(values: number[], threshold: number): number | null {
  return values.filter((value) => Number.isFinite(value) && value >= threshold).sort((a, b) => a - b)[0] ?? null;
}

export function resolveOrderedActivationMilestones(events: OrderedActivationEventsFixture) {
  const onboardingCompletedAt = firstAtOrAfter(events.onboardingCompletedMs, events.firstTouchMs);
  const learningStartedAt = onboardingCompletedAt == null
    ? null
    : firstAtOrAfter(events.lessonStartedMs, onboardingCompletedAt);
  const learningCompletedAt = learningStartedAt == null
    ? null
    : firstAtOrAfter(events.lessonCompletedMs, learningStartedAt);
  const returnWindowStart = events.firstTouchMs + DAY_MS;
  const returnWindowEnd = events.firstTouchMs + 3 * DAY_MS;
  const returnedWithin72hAt = learningCompletedAt == null
    ? null
    : events.sessionStartedMs
      .filter((value) => value >= learningCompletedAt && value >= returnWindowStart && value <= returnWindowEnd)
      .sort((a, b) => a - b)[0] ?? null;
  const firstTouchDay = utcDay(events.firstTouchMs);
  const returnedD7At = returnedWithin72hAt == null
    ? null
    : events.sessionStartedMs
      .filter((value) => value >= returnedWithin72hAt && (utcDay(value) - firstTouchDay) / DAY_MS === 7)
      .sort((a, b) => a - b)[0] ?? null;
  return { onboardingCompletedAt, learningStartedAt, learningCompletedAt, returnedWithin72hAt, returnedD7At };
}

function utcDay(value: number): number {
  const date = new Date(value);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function summarizeFirstTouchCohorts(
  instances: FirstTouchInstanceFixture[],
  reportThroughMs: number,
) {
  const summary = Object.fromEntries(
    RETENTION_DAYS.map((day) => [`d${day}`, { eligible: 0, exactReturned: 0, rollingReturned: 0 }]),
  ) as Record<`d${RetentionDay}`, RetentionCounts>;
  const activeDayBuckets = { one: 0, twoToThree: 0, fourToSeven: 0, eightPlus: 0 };
  let validInstances = 0;
  let invalidInstances = 0;
  const reportThroughDay = utcDay(reportThroughMs);

  for (const instance of instances) {
    const firstTouchDay = instance.firstTouchMs > 0 ? utcDay(instance.firstTouchMs) : 0;
    const activeDays = [...new Set(instance.activeDayMs.filter(Number.isFinite).map(utcDay))].sort((a, b) => a - b);
    if (!firstTouchDay || firstTouchDay > reportThroughDay || activeDays.some((day) => day < firstTouchDay)) {
      invalidInstances += 1;
      continue;
    }

    validInstances += 1;
    const distinctActiveDays = activeDays.length;
    if (distinctActiveDays <= 1) activeDayBuckets.one += 1;
    else if (distinctActiveDays <= 3) activeDayBuckets.twoToThree += 1;
    else if (distinctActiveDays <= 7) activeDayBuckets.fourToSeven += 1;
    else activeDayBuckets.eightPlus += 1;

    const offsets = activeDays.map((day) => Math.round((day - firstTouchDay) / DAY_MS));
    for (const retentionDay of RETENTION_DAYS) {
      if ((reportThroughDay - firstTouchDay) / DAY_MS < retentionDay) continue;
      const counts = summary[`d${retentionDay}`];
      counts.eligible += 1;
      if (offsets.includes(retentionDay)) counts.exactReturned += 1;
      if (offsets.some((offset) => offset >= retentionDay)) counts.rollingReturned += 1;
    }
  }

  return { validInstances, invalidInstances, summary, activeDayBuckets };
}

export function summarizeActivationCohort(instances: ActivationInstanceFixture[]) {
  const onboarding = instances.filter((instance) => instance.onboarding);
  const learningStarted = onboarding.filter((instance) => instance.learningStarted);
  const learningCompleted = learningStarted.filter((instance) => instance.learningCompleted);
  const returnedWithin72h = learningCompleted.filter((instance) => instance.returnedWithin72h);
  return {
    cohort: instances.length,
    onboarding: onboarding.length,
    learningStarted: learningStarted.length,
    learningCompleted: learningCompleted.length,
    returnedWithin72h: returnedWithin72h.length,
    returnedD7: returnedWithin72h.filter((instance) => instance.returnedD7).length,
  };
}
