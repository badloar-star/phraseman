import { canonicalJsonV1 } from "../../../modules/learning-v2/policies/decision_registry";
import {
  classifyV2SessionPackageReceiptEvidenceV1,
  decideV2SessionPackageRecoveryV1,
  isV2SessionPackageReceiptEvidenceV1,
  isV2SessionPackageReceiptV1,
  materializeV2SessionPackageReceiptV1,
  nextV2SessionPackageBatchOrdinals,
  parseV2SessionPackageReceiptV1,
  type V2SessionPackageReceiptInputV1,
} from "./v2_session_package_recovery_decision_v1";

const hash = (character: string): string => character.repeat(64);

const receiptInput = (
  overrides: Partial<V2SessionPackageReceiptInputV1> = {},
): V2SessionPackageReceiptInputV1 => ({
  sessionOrdinal: 1,
  sessionId: "episode-01:session:01",
  pairFingerprint: hash("a"),
  packageRootFingerprint: hash("b"),
  objectPins: {
    source: {
      objectPath: "learning-v2/session-01/source.json",
      contentHash: hash("c"),
      objectGeneration: "generation-1",
      byteSize: 4096,
    },
    render: {
      objectPath: `learning-v2/session-01/render/${hash("d")}.json`,
      contentHash: hash("d"),
      objectGeneration: "generation-2",
      byteSize: 8192,
    },
    capsule: {
      objectPath: `learning-v2/session-01/capsule/${hash("e")}.json`,
      contentHash: hash("e"),
      objectGeneration: "generation-3",
      byteSize: 6144,
    },
    sidecar: {
      objectPath: `learning-v2/session-01/sidecar/${hash("f")}.json`,
      contentHash: hash("f"),
      objectGeneration: "generation-4",
      byteSize: 12288,
    },
  },
  ...overrides,
});

const expectedReceipt = () =>
  materializeV2SessionPackageReceiptV1(receiptInput());

const absentEvidence = () =>
  classifyV2SessionPackageReceiptEvidenceV1(expectedReceipt(), null);

const exactEvidence = () => {
  const expected = expectedReceipt();
  return classifyV2SessionPackageReceiptEvidenceV1(
    expected,
    canonicalJsonV1(expected),
  );
};

const state = (overrides: Record<string, unknown> = {}) =>
  ({
    sessionOrdinal: 1,
    nextSessionOrdinal: 1,
    source: "absent",
    render: "absent",
    capsule: "absent",
    sidecar: "absent",
    receiptEvidence: absentEvidence(),
    ...overrides,
  }) as Parameters<typeof decideV2SessionPackageRecoveryV1>[0];

describe("Learning V2 session package recovery decision v1", () => {
  it("round-trips a canonical receipt binding session, pair, root and all object pins", () => {
    const receipt = expectedReceipt();
    const raw = canonicalJsonV1(receipt);
    const parsed = parseV2SessionPackageReceiptV1(raw);

    expect(isV2SessionPackageReceiptV1(parsed)).toBe(true);
    expect(parsed).toEqual(receipt);
    expect(parsed).toMatchObject({
      schemaVersion: "v2-session-package-receipt.v1",
      sessionOrdinal: 1,
      sessionId: "episode-01:session:01",
      pairFingerprint: hash("a"),
      packageRootFingerprint: hash("b"),
      storageEvidence: "exact_immutable_object_pins",
      executionAuthority: "none",
      releaseAuthority: false,
    });
    expect(Object.keys(parsed.objectPins)).toEqual([
      "source",
      "render",
      "capsule",
      "sidecar",
    ]);
    expect(parsed.receiptFingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  it.each([
    [
      "session",
      (value: any) => {
        value.sessionId = "episode-02:session:01";
      },
    ],
    [
      "pair",
      (value: any) => {
        value.pairFingerprint = hash("1");
      },
    ],
    [
      "root",
      (value: any) => {
        value.packageRootFingerprint = hash("2");
      },
    ],
    [
      "source pin",
      (value: any) => {
        value.objectPins.source.contentHash = hash("3");
      },
    ],
    [
      "render pin",
      (value: any) => {
        value.objectPins.render.objectGeneration = "other";
      },
    ],
    [
      "capsule pin",
      (value: any) => {
        value.objectPins.capsule.byteSize += 1;
      },
    ],
    [
      "sidecar pin",
      (value: any) => {
        value.objectPins.sidecar.objectPath = `learning-v2/other/session-01/sidecar/${hash("f")}.json`;
      },
    ],
  ])(
    "classifies a valid but non-matching %s receipt as immutable conflict",
    (_label, mutate) => {
      const expected = expectedReceipt();
      const changed = JSON.parse(canonicalJsonV1(receiptInput()));
      mutate(changed);
      const observed = materializeV2SessionPackageReceiptV1(changed);
      const evidence = classifyV2SessionPackageReceiptEvidenceV1(
        expected,
        canonicalJsonV1(observed),
      );
      expect(isV2SessionPackageReceiptEvidenceV1(evidence)).toBe(true);
      expect(evidence.state).toBe("conflict");
      expect(() =>
        decideV2SessionPackageRecoveryV1(
          state({
            source: "exact",
            render: "exact",
            capsule: "exact",
            sidecar: "exact",
            receiptEvidence: evidence,
          }),
        ),
      ).toThrow("v2_session_recovery_immutable_conflict");
    },
  );

  it("rejects forged/noncanonical receipts and unbranded classifier or recovery evidence", () => {
    const receipt = expectedReceipt();
    const forged = JSON.parse(canonicalJsonV1(receipt));
    forged.receiptFingerprint = hash("0");
    expect(() =>
      parseV2SessionPackageReceiptV1(canonicalJsonV1(forged)),
    ).toThrow("v2_session_recovery_receipt_invalid");
    expect(() =>
      parseV2SessionPackageReceiptV1(JSON.stringify(receipt, null, 2)),
    ).toThrow("v2_session_recovery_receipt_invalid");
    const wrongKindPath = JSON.parse(canonicalJsonV1(receiptInput()));
    wrongKindPath.objectPins.capsule.objectPath = `learning-v2/session-01/render/${hash("e")}.json`;
    expect(() => materializeV2SessionPackageReceiptV1(wrongKindPath)).toThrow(
      "v2_session_recovery_receipt_pin_invalid",
    );
    expect(() =>
      classifyV2SessionPackageReceiptEvidenceV1(
        JSON.parse(canonicalJsonV1(receipt)),
        null,
      ),
    ).toThrow("v2_session_recovery_receipt_expectation_untrusted");
    expect(() =>
      decideV2SessionPackageRecoveryV1(
        state({
          receiptEvidence: {
            schemaVersion: "v2-session-package-receipt-evidence.v1",
            state: "absent",
            sessionOrdinal: 1,
            expectedReceiptFingerprint: receipt.receiptFingerprint,
            observedReceiptFingerprint: null,
            receipt: null,
          },
        }),
      ),
    ).toThrow("v2_session_recovery_state_invalid");
  });

  it("allows the provider only before the durable source exists", () => {
    expect(decideV2SessionPackageRecoveryV1(state())).toEqual({
      kind: "generate_source",
      sessionOrdinal: 1,
      providerAllowed: true,
    });
    expect(
      decideV2SessionPackageRecoveryV1(
        state({ source: "exact", render: "exact" }),
      ),
    ).toEqual({
      kind: "materialize_missing_children",
      sessionOrdinal: 1,
      missing: ["capsule", "sidecar"],
      providerAllowed: false,
    });
    expect(
      decideV2SessionPackageRecoveryV1(
        state({
          source: "exact",
          render: "exact",
          capsule: "exact",
          sidecar: "exact",
        }),
      ),
    ).toEqual({
      kind: "create_receipt_and_advance",
      sessionOrdinal: 1,
      nextSessionOrdinal: 2,
      providerAllowed: false,
    });
  });

  it("advances exact receipt evidence by exactly one and rejects cursor jumps", () => {
    const complete = {
      source: "exact",
      render: "exact",
      capsule: "exact",
      sidecar: "exact",
      receiptEvidence: exactEvidence(),
    };
    expect(decideV2SessionPackageRecoveryV1(state(complete))).toEqual({
      kind: "repair_cursor_from_receipt",
      sessionOrdinal: 1,
      nextSessionOrdinal: 2,
      providerAllowed: false,
    });
    expect(
      decideV2SessionPackageRecoveryV1(
        state({ ...complete, nextSessionOrdinal: 2 }),
      ),
    ).toEqual({
      kind: "exact_replay",
      sessionOrdinal: 1,
      nextSessionOrdinal: 2,
      providerAllowed: false,
    });
    expect(() =>
      decideV2SessionPackageRecoveryV1(
        state({ ...complete, nextSessionOrdinal: 3 }),
      ),
    ).toThrow("v2_session_recovery_cursor_jump");
  });

  it.each([
    [{ source: "conflict" }, "v2_session_recovery_immutable_conflict"],
    [{ render: "exact" }, "v2_session_recovery_child_without_source"],
    [
      { receiptEvidence: exactEvidence() },
      "v2_session_recovery_receipt_object_missing",
    ],
    [
      { sessionOrdinal: 2, nextSessionOrdinal: 1 },
      "v2_session_recovery_state_invalid",
    ],
    [
      { nextSessionOrdinal: 2 },
      "v2_session_recovery_receipt_missing_after_advance",
    ],
    [{ source: "unknown" }, "v2_session_recovery_state_invalid"],
  ])("rejects inconsistent immutable state %#", (overrides, code) => {
    expect(() => decideV2SessionPackageRecoveryV1(state(overrides))).toThrow(
      code,
    );
  });

  it("rejects extra state keys and bounds ordered batches to four sessions", () => {
    expect(() =>
      decideV2SessionPackageRecoveryV1(state({ unexpected: true })),
    ).toThrow("v2_session_recovery_state_invalid");
    expect(
      nextV2SessionPackageBatchOrdinals({ nextSessionOrdinal: 1 }),
    ).toEqual([1, 2, 3, 4]);
    expect(
      nextV2SessionPackageBatchOrdinals({ nextSessionOrdinal: 11 }),
    ).toEqual([11, 12]);
    expect(
      nextV2SessionPackageBatchOrdinals({ nextSessionOrdinal: 13 }),
    ).toEqual([]);
    expect(() =>
      nextV2SessionPackageBatchOrdinals({
        nextSessionOrdinal: 1,
        maxItems: 5,
      }),
    ).toThrow("v2_session_recovery_batch_invalid");
  });
});
