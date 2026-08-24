export type PersonalPlanChoiceAttemptState = {
  itemKey: string;
  attemptRecorded: boolean;
  resolved: boolean;
};

type BeginPersonalPlanChoiceAttemptInput = {
  itemKey: string;
  isCorrect: boolean;
};

export type BeginPersonalPlanChoiceAttemptResult = {
  accepted: boolean;
  shouldPersist: boolean;
  state: PersonalPlanChoiceAttemptState;
};

export function beginPersonalPlanChoiceAttempt(
  current: PersonalPlanChoiceAttemptState | null,
  input: BeginPersonalPlanChoiceAttemptInput,
): BeginPersonalPlanChoiceAttemptResult {
  const active = current?.itemKey === input.itemKey
    ? current
    : { itemKey: input.itemKey, attemptRecorded: false, resolved: false };

  if (active.resolved) {
    return { accepted: false, shouldPersist: false, state: active };
  }

  return {
    accepted: true,
    shouldPersist: !active.attemptRecorded,
    state: {
      itemKey: input.itemKey,
      attemptRecorded: true,
      resolved: input.isCorrect,
    },
  };
}
