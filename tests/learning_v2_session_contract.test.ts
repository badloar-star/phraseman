import {
  validateV2SessionSet,
  type V2SessionSetBody,
} from "../modules/learning-v2/contracts/session";
import {
  buildValidSessionSet,
  buildV2E1,
  readLegacyE1,
} from "./support/learning_v2_session_builders";
import { validateV2EpisodeContract } from "../modules/learning-v2/contracts/validation";
import {
  parseSessionId,
  V2IdentityError,
  V2_SESSION_ID_ERROR_CODE,
} from "../modules/learning-v2/contracts/identities";

const clone = <Value>(value: Value): Value =>
  JSON.parse(JSON.stringify(value)) as Value;

const expectSessionSetInputRejectedWithoutThrowing = (value: unknown): void => {
  let result: ReturnType<typeof validateV2SessionSet> | undefined;
  expect(() => {
    result = validateV2SessionSet(value);
  }).not.toThrow();
  expect(result).toEqual({
    ok: false,
    issues: ["session_set_input_invalid"],
  });
};

test("requires exactly twelve ordered required sessions in three zones", () => {
  const value = buildValidSessionSet();
  expect(validateV2SessionSet(value)).toMatchObject({ ok: true });
  expect(value.sessions.map((session) => session.zone)).toEqual([
    "understand",
    "understand",
    "understand",
    "understand",
    "use",
    "use",
    "use",
    "use",
    "master",
    "master",
    "master",
    "master",
  ]);
  expect(
    validateV2SessionSet({ ...value, sessions: value.sessions.slice(0, 11) }),
  ).toMatchObject({
    ok: false,
    issues: expect.arrayContaining(["session_set_required_count"]),
  });
  const wrongOrder = clone(value) as V2SessionSetBody;
  (wrongOrder.sessions as unknown as Array<{ ordinal: number }>)[1].ordinal = 3;
  expect(validateV2SessionSet(wrongOrder)).toMatchObject({
    ok: false,
    issues: expect.arrayContaining(["session_set_required_order"]),
  });
});

test("uses the shared identity grammar for the new session identity without mutating legacy codes", () => {
  expect(parseSessionId("episode-01.session-01")).toBe("episode-01.session-01");
  expect(() => parseSessionId("episode-01/session-01")).toThrow(
    new V2IdentityError(V2_SESSION_ID_ERROR_CODE),
  );
});

test("enforces duration, card count and family diversity per required session", () => {
  const duration = clone(buildValidSessionSet()) as V2SessionSetBody;
  (
    duration.sessions as unknown as Array<{ targetSeconds: number }>
  )[0].targetSeconds = 149;
  expect(validateV2SessionSet(duration)).toMatchObject({
    ok: false,
    issues: expect.arrayContaining(["session_target_seconds"]),
  });

  const cards = clone(buildValidSessionSet()) as V2SessionSetBody;
  (cards.sessions as unknown as Array<{ cards: unknown[] }>)[0].cards.pop();
  (cards.sessions as unknown as Array<{ cards: unknown[] }>)[0].cards.pop();
  expect(validateV2SessionSet(cards)).toMatchObject({
    ok: false,
    issues: expect.arrayContaining(["session_card_count"]),
  });

  const families = clone(buildValidSessionSet()) as V2SessionSetBody;
  const firstCards = (
    families.sessions as unknown as Array<{ cards: Array<{ family: string }> }>
  )[0].cards;
  firstCards.forEach((card, index) => {
    card.family = index % 2 === 0 ? "visual_discovery" : "listen_choose";
  });
  expect(validateV2SessionSet(families)).toMatchObject({
    ok: false,
    issues: expect.arrayContaining(["session_family_count"]),
  });
});

test("rejects an unapproved family in a required V2 session", () => {
  const value = clone(buildValidSessionSet()) as V2SessionSetBody;
  const firstCard = (
    value.sessions as unknown as Array<{
      cards: Array<{ family: string; learningFunction: string }>;
    }>
  )[0].cards[0];
  firstCard.family = "quick_spoken_response";
  firstCard.learningFunction = "respond";

  expect(validateV2SessionSet(value)).toMatchObject({
    ok: false,
    issues: expect.arrayContaining(["session_card_family_unapproved"]),
  });
});

test("rejects duplicate card identities anywhere in the SessionSet", () => {
  const value = clone(buildValidSessionSet()) as V2SessionSetBody;
  const sessions = value.sessions as unknown as Array<{
    cards: Array<{ cardId: string }>;
  }>;
  sessions[1].cards[0].cardId = sessions[0].cards[0].cardId;

  expect(validateV2SessionSet(value)).toEqual({
    ok: false,
    issues: ["session_set_duplicate_card_id"],
  });
});

test("keeps optional practice outside the twelve required sessions", () => {
  const value = buildValidSessionSet();
  expect(value.optionalPracticeSlots.length).toBeLessThanOrEqual(2);
  expect(
    value.optionalPracticeSlots.every(
      (slot) =>
        slot.requiredForProgress === false && slot.canWriteMastery === false,
    ),
  ).toBe(true);

  const unsafe = clone(value) as V2SessionSetBody;
  (
    unsafe.optionalPracticeSlots as unknown as Array<{
      canWriteMastery: boolean;
    }>
  )[0].canWriteMastery = true;
  expect(validateV2SessionSet(unsafe)).toMatchObject({
    ok: false,
    issues: expect.arrayContaining(["optional_practice_mastery_forbidden"]),
  });

  const tooMany = clone(value) as V2SessionSetBody;
  const slots = tooMany.optionalPracticeSlots as unknown as Array<
    Record<string, unknown>
  >;
  slots.push({ ...slots[0], slotId: "episode-01.optional-02" });
  slots.push({ ...slots[0], slotId: "episode-01.optional-03" });
  expect(validateV2SessionSet(tooMany)).toMatchObject({
    ok: false,
    issues: expect.arrayContaining(["optional_practice_slot_count"]),
  });
});

test("rejects duplicate optional slot identities and capability bindings", () => {
  const duplicateSlot = clone(buildValidSessionSet()) as V2SessionSetBody;
  const duplicateSlotEntries =
    duplicateSlot.optionalPracticeSlots as unknown as Array<{
      slotId: string;
      capabilityId: string;
    }>;
  duplicateSlotEntries.push({
    ...(duplicateSlotEntries[0] as unknown as Record<string, unknown>),
    capabilityId: "echo-rhythm.v1",
  } as unknown as { slotId: string; capabilityId: string });
  expect(validateV2SessionSet(duplicateSlot)).toEqual({
    ok: false,
    issues: ["session_set_duplicate_optional_slot_id"],
  });

  const duplicateCapability = clone(buildValidSessionSet()) as V2SessionSetBody;
  const duplicateCapabilityEntries =
    duplicateCapability.optionalPracticeSlots as unknown as Array<{
      slotId: string;
      capabilityId: string;
    }>;
  duplicateCapabilityEntries.push({
    ...(duplicateCapabilityEntries[0] as unknown as Record<string, unknown>),
    slotId: "episode-01.optional-02",
  } as unknown as { slotId: string; capabilityId: string });
  expect(validateV2SessionSet(duplicateCapability)).toEqual({
    ok: false,
    issues: ["session_set_duplicate_optional_capability_id"],
  });
});

test("keeps the child body exact and free of self hashes or lifecycle backrefs", () => {
  for (const forbiddenKey of [
    "contentHash",
    "gateReceipt",
    "reviewReceipt",
    "approvalReceipt",
  ] as const) {
    const value = { ...buildValidSessionSet(), [forbiddenKey]: "forbidden" };
    expect(validateV2SessionSet(value)).toMatchObject({
      ok: false,
      issues: expect.arrayContaining(["session_set_field_unknown"]),
    });
  }
});

test("rejects non-canonical or hostile session-set input without throwing", () => {
  const hiddenBackref = clone(buildValidSessionSet()) as unknown as Record<
    string,
    unknown
  >;
  Object.defineProperty(hiddenBackref, "contentHash", {
    enumerable: false,
    value: "0".repeat(64),
  });

  const accessor = clone(buildValidSessionSet()) as unknown as Record<
    string,
    unknown
  >;
  const getter = jest.fn(() => {
    throw new Error("getter must not execute");
  });
  Object.defineProperty(accessor, "episodeId", {
    enumerable: true,
    get: getter,
  });

  const symbolKey = clone(buildValidSessionSet()) as unknown as Record<
    PropertyKey,
    unknown
  >;
  symbolKey[Symbol("forbidden-backref")] = "forbidden";

  const cyclic = clone(buildValidSessionSet()) as unknown as Record<
    string,
    unknown
  >;
  cyclic.cycle = cyclic;

  const throwingProxy = new Proxy(buildValidSessionSet(), {
    ownKeys: () => {
      throw new Error("proxy trap failure");
    },
  });

  for (const value of [
    hiddenBackref,
    accessor,
    symbolKey,
    cyclic,
    throwingProxy,
  ]) {
    expectSessionSetInputRejectedWithoutThrowing(value);
  }
  expect(getter).not.toHaveBeenCalled();
});

test("preserves v1 validation and requires an exact session-set ref for v2", () => {
  expect(validateV2EpisodeContract(readLegacyE1()).ok).toBe(true);
  expect(
    validateV2EpisodeContract({ ...buildV2E1(), sessionSetRef: undefined }),
  ).toMatchObject({
    ok: false,
    issues: expect.arrayContaining([
      expect.objectContaining({ code: "episode_session_set_ref_required" }),
    ]),
  });
});
