import {
  OWNER_REPOSITORY_RADIX_MAX_VALUE_BYTES,
  auditOwnerRepositoryRadixPage,
  deriveOwnerRepositoryRadixKeyDigest,
  isOwnerRepositoryRadixAuditCursor,
  lookupOwnerRepositoryRadix,
  planOwnerRepositoryRadixBatch,
  type OwnerRepositoryIndexKind,
  type OwnerRepositoryIndexKeyKind,
  type OwnerRepositoryLegacyEmptyIndexManifestV1,
  type OwnerRepositoryRadixBlob,
  type OwnerRepositoryRadixDigest,
  type OwnerRepositoryRadixManifestV2,
  type OwnerRepositoryRadixMutation,
  type OwnerRepositoryRadixNodeRefV1,
} from "../modules/learning-v2/progress/owner_repository_radix";
import {
  canonicalJsonV1,
  sha256Utf8,
} from "../modules/learning-v2/policies/decision_registry";

const accountScopeHash = "aaaaaaaaaaaaaaaa";
const fingerprint = (character: string): string => character.repeat(64);
const legacyManifest = (
  indexKind: OwnerRepositoryIndexKind,
): OwnerRepositoryLegacyEmptyIndexManifestV1 => ({
  schemaVersion: "learning-v2-owner-repository-index-manifest.v1",
  indexKind,
  shardBits: 8,
  shards: [],
});

const mutation = (
  keyKind: OwnerRepositoryIndexKeyKind,
  logicalKey: string,
  value: unknown = { binding: fingerprint("b") },
): OwnerRepositoryRadixMutation => ({ keyKind, logicalKey, value });
const courseValue = (courseIdentityFingerprint: string, label: string) => {
  const blobFingerprint = sha256Utf8(label);
  return {
    schemaVersion: "learning-v2-owner-repository-course-entry.v1" as const,
    courseIdentityFingerprint,
    stateRef: {
      schemaVersion: "learning-v2-owner-repository-blob-ref.v1" as const,
      kind: "course_unlock_state" as const,
      blobKey: `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${blobFingerprint}`,
      blobFingerprint,
    },
  };
};

const blobMap = (
  blobs: readonly OwnerRepositoryRadixBlob[],
): Map<string, string> =>
  new Map(blobs.map((blob) => [blob.ref.blobKey, blob.encoded]));
const resolver =
  (values: Map<string, string>) => (ref: OwnerRepositoryRadixNodeRefV1) =>
    values.get(ref.blobKey) ?? null;

const rewriteBlob = (
  raw: string,
  mutate: (payload: Record<string, unknown>) => void,
): OwnerRepositoryRadixBlob => {
  const envelope = JSON.parse(raw) as {
    schemaVersion: string;
    accountScopeHash: string;
    kind: string;
    payload: Record<string, unknown>;
  };
  mutate(envelope.payload);
  const encoded = canonicalJsonV1(envelope);
  const blobFingerprint = sha256Utf8(encoded);
  return {
    encoded,
    ref: {
      schemaVersion: "learning-v2-owner-repository-blob-ref.v1",
      kind: "index_radix_node",
      blobKey: `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${blobFingerprint}`,
      blobFingerprint,
    },
  };
};

describe("Learning V2 adaptive owner repository radix", () => {
  it("migrates an empty v1 manifest to v2 and detaches immutable indexed values", async () => {
    const original = { binding: fingerprint("1"), nested: { durable: true } };
    const plan = await planOwnerRepositoryRadixBatch({
      accountScopeHash,
      indexKind: "operation",
      manifest: legacyManifest("operation"),
      mutations: [mutation("operation_id", "operation-1", original)],
      resolveNode: () => null,
    });
    original.nested.durable = false;
    expect(plan).toMatchObject({
      changed: true,
      manifest: {
        schemaVersion: "learning-v2-owner-repository-index-manifest.v2",
        entryCount: 1,
      },
    });
    expect(Object.isFrozen(plan.manifest)).toBe(true);
    expect(plan.immutableBlobs.length).toBe(1);
    const found = await lookupOwnerRepositoryRadix({
      accountScopeHash,
      indexKind: "operation",
      manifest: plan.manifest,
      keyKind: "operation_id",
      logicalKey: "operation-1",
      resolveNode: resolver(blobMap(plan.immutableBlobs)),
    });
    expect(found?.value).toEqual({
      binding: fingerprint("1"),
      nested: { durable: true },
    });
    expect(Object.isFrozen(found)).toBe(true);
  });

  it("binds every key kind to the exact account and index kind", async () => {
    const cases: Array<{
      indexKind: OwnerRepositoryIndexKind;
      mutations: OwnerRepositoryRadixMutation[];
    }> = [
      {
        indexKind: "operation",
        mutations: [
          mutation("operation_id", "operation-2"),
          mutation("operation_fingerprint", fingerprint("2")),
        ],
      },
      {
        indexKind: "subject",
        mutations: [mutation("semantic_subject", fingerprint("3"))],
      },
      {
        indexKind: "receipt",
        mutations: [mutation("applied_receipt", fingerprint("4"))],
      },
      {
        indexKind: "course_state",
        mutations: [
          mutation(
            "course_identity",
            fingerprint("5"),
            courseValue(fingerprint("5"), "course-five"),
          ),
        ],
      },
    ];
    for (const item of cases) {
      const plan = await planOwnerRepositoryRadixBatch({
        accountScopeHash,
        indexKind: item.indexKind,
        manifest: legacyManifest(item.indexKind),
        mutations: item.mutations,
        resolveNode: () => null,
      });
      const values = blobMap(plan.immutableBlobs);
      for (const expected of item.mutations) {
        await expect(
          lookupOwnerRepositoryRadix({
            accountScopeHash,
            indexKind: item.indexKind,
            manifest: plan.manifest,
            keyKind: expected.keyKind,
            logicalKey: expected.logicalKey,
            resolveNode: resolver(values),
          }),
        ).resolves.toMatchObject({
          keyKind: expected.keyKind,
          logicalKey: expected.logicalKey,
        });
      }
      await expect(
        lookupOwnerRepositoryRadix({
          accountScopeHash: "bbbbbbbbbbbbbbbb",
          indexKind: item.indexKind,
          manifest: plan.manifest,
          keyKind: item.mutations[0].keyKind,
          logicalKey: item.mutations[0].logicalKey,
          resolveNode: resolver(values),
        }),
      ).rejects.toThrow("owner_index_manifest_invalid");
    }
    await expect(
      planOwnerRepositoryRadixBatch({
        accountScopeHash,
        indexKind: "subject",
        manifest: legacyManifest("subject"),
        mutations: [mutation("operation_id", "wrong-family")],
        resolveNode: () => null,
      }),
    ).rejects.toThrow("owner_index_key_invalid");
  });

  it("treats an exact duplicate as a no-op and a changed value as a conflict", async () => {
    const first = await planOwnerRepositoryRadixBatch({
      accountScopeHash,
      indexKind: "operation",
      manifest: legacyManifest("operation"),
      mutations: [
        mutation("operation_id", "operation-3", { receipt: fingerprint("3") }),
      ],
      resolveNode: () => null,
    });
    const values = blobMap(first.immutableBlobs);
    const duplicate = await planOwnerRepositoryRadixBatch({
      accountScopeHash,
      indexKind: "operation",
      manifest: first.manifest,
      mutations: [
        mutation("operation_id", "operation-3", { receipt: fingerprint("3") }),
      ],
      resolveNode: resolver(values),
    });
    expect(duplicate.changed).toBe(false);
    expect(duplicate.immutableBlobs).toEqual([]);
    expect(duplicate.manifest).toEqual(first.manifest);
    await expect(
      planOwnerRepositoryRadixBatch({
        accountScopeHash,
        indexKind: "operation",
        manifest: first.manifest,
        mutations: [
          mutation("operation_id", "operation-3", {
            receipt: fingerprint("4"),
          }),
        ],
        resolveNode: resolver(values),
      }),
    ).rejects.toThrow("owner_index_key_conflict");
  });

  it("supports exact conditional insert and replacement only for the selected stable key", async () => {
    const logicalKey = fingerprint("6");
    const first = await planOwnerRepositoryRadixBatch({
      accountScopeHash,
      indexKind: "course_state",
      manifest: legacyManifest("course_state"),
      mutations: [
        {
          keyKind: "course_identity",
          logicalKey,
          value: courseValue(logicalKey, "course-state-seven"),
          expectedValueFingerprint: null,
        },
      ],
      resolveNode: () => null,
    });
    const values = blobMap(first.immutableBlobs);
    const before = await lookupOwnerRepositoryRadix({
      accountScopeHash,
      indexKind: "course_state",
      manifest: first.manifest,
      keyKind: "course_identity",
      logicalKey,
      resolveNode: resolver(values),
    });
    expect(before).toBeDefined();

    const sameValue = await planOwnerRepositoryRadixBatch({
      accountScopeHash,
      indexKind: "course_state",
      manifest: first.manifest,
      mutations: [
        {
          keyKind: "course_identity",
          logicalKey,
          value: courseValue(logicalKey, "course-state-seven"),
          expectedValueFingerprint: before!.valueFingerprint,
        },
      ],
      resolveNode: resolver(values),
    });
    expect(sameValue).toMatchObject({ changed: false, immutableBlobs: [] });
    expect(sameValue.manifest).toEqual(first.manifest);
    await expect(
      planOwnerRepositoryRadixBatch({
        accountScopeHash,
        indexKind: "course_state",
        manifest: first.manifest,
        mutations: [
          {
            keyKind: "course_identity",
            logicalKey,
            value: courseValue(logicalKey, "course-state-without-expectation"),
          },
        ],
        resolveNode: resolver(values),
      }),
    ).rejects.toThrow("owner_index_key_conflict");
    await expect(
      planOwnerRepositoryRadixBatch({
        accountScopeHash,
        indexKind: "course_state",
        manifest: legacyManifest("course_state"),
        mutations: [
          {
            keyKind: "course_identity",
            logicalKey,
            value: courseValue(logicalKey, "course-state-absent"),
            expectedValueFingerprint: before!.valueFingerprint,
          },
        ],
        resolveNode: () => null,
      }),
    ).rejects.toThrow("owner_index_expected_conflict");

    const replaced = await planOwnerRepositoryRadixBatch({
      accountScopeHash,
      indexKind: "course_state",
      manifest: first.manifest,
      mutations: [
        {
          keyKind: "course_identity",
          logicalKey,
          value: courseValue(logicalKey, "course-state-eight"),
          expectedValueFingerprint: before!.valueFingerprint,
        },
      ],
      resolveNode: resolver(values),
    });
    for (const blob of replaced.immutableBlobs)
      values.set(blob.ref.blobKey, blob.encoded);
    await expect(
      lookupOwnerRepositoryRadix({
        accountScopeHash,
        indexKind: "course_state",
        manifest: replaced.manifest,
        keyKind: "course_identity",
        logicalKey,
        resolveNode: resolver(values),
      }),
    ).resolves.toMatchObject({
      value: courseValue(logicalKey, "course-state-eight"),
    });
    expect(replaced.manifest.entryCount).toBe(1);

    await expect(
      planOwnerRepositoryRadixBatch({
        accountScopeHash,
        indexKind: "course_state",
        manifest: first.manifest,
        mutations: [
          {
            keyKind: "course_identity",
            logicalKey,
            value: courseValue(logicalKey, "course-state-nine"),
            expectedValueFingerprint: fingerprint("0"),
          },
        ],
        resolveNode: resolver(values),
      }),
    ).rejects.toThrow("owner_index_expected_conflict");
    await expect(
      planOwnerRepositoryRadixBatch({
        accountScopeHash,
        indexKind: "course_state",
        manifest: first.manifest,
        mutations: [
          {
            keyKind: "course_identity",
            logicalKey,
            value: courseValue(logicalKey, "course-state-seven"),
            expectedValueFingerprint: null,
          },
        ],
        resolveNode: resolver(values),
      }),
    ).rejects.toThrow("owner_index_expected_conflict");
    await expect(
      planOwnerRepositoryRadixBatch({
        accountScopeHash,
        indexKind: "operation",
        manifest: legacyManifest("operation"),
        mutations: [
          {
            keyKind: "operation_id",
            logicalKey: "forbidden-lifetime-replace",
            value: { receipt: fingerprint("a") },
            expectedValueFingerprint: null,
          },
        ],
        resolveNode: () => null,
      }),
    ).rejects.toThrow("owner_index_key_invalid");
  });

  it("replaces a course entry below a split path without changing siblings or final-map determinism", async () => {
    const identities = Array.from({ length: 40 }, (_, index) =>
      sha256Utf8(`course-identity-${index}`),
    );
    const initialMutations = identities.map((identity, index) => ({
      keyKind: "course_identity" as const,
      logicalKey: identity,
      value: courseValue(identity, `course-state-${index}:before`),
      expectedValueFingerprint: null,
    }));
    const initial = await planOwnerRepositoryRadixBatch({
      accountScopeHash,
      indexKind: "course_state",
      manifest: legacyManifest("course_state"),
      mutations: initialMutations,
      resolveNode: () => null,
    });
    const values = blobMap(initial.immutableBlobs);
    const targetIdentity = identities[17];
    const targetBefore = await lookupOwnerRepositoryRadix({
      accountScopeHash,
      indexKind: "course_state",
      manifest: initial.manifest,
      keyKind: "course_identity",
      logicalKey: targetIdentity,
      resolveNode: resolver(values),
    });
    const replacementValue = courseValue(
      targetIdentity,
      "course-state-17:after",
    );
    const replaced = await planOwnerRepositoryRadixBatch({
      accountScopeHash,
      indexKind: "course_state",
      manifest: initial.manifest,
      mutations: [
        {
          keyKind: "course_identity",
          logicalKey: targetIdentity,
          value: replacementValue,
          expectedValueFingerprint: targetBefore!.valueFingerprint,
        },
      ],
      resolveNode: resolver(values),
    });
    for (const blob of replaced.immutableBlobs)
      values.set(blob.ref.blobKey, blob.encoded);
    expect(replaced.manifest.entryCount).toBe(40);
    for (const identity of identities) {
      await expect(
        lookupOwnerRepositoryRadix({
          accountScopeHash,
          indexKind: "course_state",
          manifest: replaced.manifest,
          keyKind: "course_identity",
          logicalKey: identity,
          resolveNode: resolver(values),
        }),
      ).resolves.toBeDefined();
    }
    const finalMutations = initialMutations.map((entry) =>
      entry.logicalKey === targetIdentity
        ? { ...entry, value: replacementValue }
        : entry,
    );
    const oneShotFinal = await planOwnerRepositoryRadixBatch({
      accountScopeHash,
      indexKind: "course_state",
      manifest: legacyManifest("course_state"),
      mutations: finalMutations,
      resolveNode: () => null,
    });
    expect(replaced.manifest).toEqual(oneShotFinal.manifest);
  });

  it("fails closed on conflicting conditional batches and hostile precondition descriptors", async () => {
    const identity = sha256Utf8("conditional-batch-course");
    const value = courseValue(identity, "conditional-batch-state");
    await expect(
      planOwnerRepositoryRadixBatch({
        accountScopeHash,
        indexKind: "course_state",
        manifest: legacyManifest("course_state"),
        mutations: [
          {
            keyKind: "course_identity",
            logicalKey: identity,
            value,
            expectedValueFingerprint: null,
          },
          { keyKind: "course_identity", logicalKey: identity, value },
        ],
        resolveNode: () => null,
      }),
    ).rejects.toThrow("owner_index_key_conflict");

    let getterRuns = 0;
    const poisoned = {
      keyKind: "course_identity",
      logicalKey: identity,
      value,
    } as Record<string, unknown>;
    Object.defineProperty(poisoned, "expectedValueFingerprint", {
      enumerable: true,
      get: () => {
        getterRuns += 1;
        return null;
      },
    });
    await expect(
      planOwnerRepositoryRadixBatch({
        accountScopeHash,
        indexKind: "course_state",
        manifest: legacyManifest("course_state"),
        mutations: [poisoned as unknown as OwnerRepositoryRadixMutation],
        resolveNode: () => null,
      }),
    ).rejects.toThrow("owner_index_key_invalid");
    expect(getterRuns).toBe(0);
  });

  it("strictly binds course values and keeps every lifetime family non-replaceable", async () => {
    const identity = sha256Utf8("strict-course-value");
    const valid = courseValue(identity, "strict-course-state");
    const malformed: unknown[] = [
      { ...valid, courseIdentityFingerprint: sha256Utf8("other-course") },
      { ...valid, unexpected: true },
      { ...valid, stateRef: { ...valid.stateRef, kind: "wallet_state" } },
      {
        ...valid,
        stateRef: { ...valid.stateRef, blobFingerprint: "not-a-hash" },
      },
      {
        ...valid,
        stateRef: {
          ...valid.stateRef,
          blobKey: `${valid.stateRef.blobKey}:wrong`,
        },
      },
      {
        ...valid,
        stateRef: {
          ...valid.stateRef,
          blobKey: valid.stateRef.blobKey.replace(
            accountScopeHash,
            "bbbbbbbbbbbbbbbb",
          ),
        },
      },
    ];
    let getterRuns = 0;
    const accessorRef = { ...valid.stateRef } as Record<string, unknown>;
    Object.defineProperty(accessorRef, "blobFingerprint", {
      enumerable: true,
      get: () => {
        getterRuns += 1;
        return valid.stateRef.blobFingerprint;
      },
    });
    malformed.push({ ...valid, stateRef: accessorRef });
    for (const value of malformed) {
      await expect(
        planOwnerRepositoryRadixBatch({
          accountScopeHash,
          indexKind: "course_state",
          manifest: legacyManifest("course_state"),
          mutations: [
            {
              keyKind: "course_identity",
              logicalKey: identity,
              value,
              expectedValueFingerprint: null,
            },
          ],
          resolveNode: () => null,
        }),
      ).rejects.toThrow(/owner_index_(?:key|value)_invalid/);
    }
    expect(getterRuns).toBe(0);

    for (const item of [
      {
        indexKind: "operation" as const,
        keyKind: "operation_fingerprint" as const,
        logicalKey: fingerprint("a"),
      },
      {
        indexKind: "subject" as const,
        keyKind: "semantic_subject" as const,
        logicalKey: fingerprint("b"),
      },
      {
        indexKind: "receipt" as const,
        keyKind: "applied_receipt" as const,
        logicalKey: fingerprint("c"),
      },
    ]) {
      await expect(
        planOwnerRepositoryRadixBatch({
          accountScopeHash,
          indexKind: item.indexKind,
          manifest: legacyManifest(item.indexKind),
          mutations: [
            {
              keyKind: item.keyKind,
              logicalKey: item.logicalKey,
              value: { binding: fingerprint("d") },
              expectedValueFingerprint: fingerprint("e"),
            },
          ],
          resolveNode: () => null,
        }),
      ).rejects.toThrow("owner_index_key_invalid");
    }
  });

  it("splits the thirty-third entry into a sparse branch without losing lookups", async () => {
    const mutations = Array.from({ length: 33 }, (_, index) =>
      mutation("operation_id", `split-operation-${index}`, { index }),
    );
    const plan = await planOwnerRepositoryRadixBatch({
      accountScopeHash,
      indexKind: "operation",
      manifest: legacyManifest("operation"),
      mutations,
      resolveNode: () => null,
    });
    expect(plan.manifest.entryCount).toBe(33);
    const values = blobMap(plan.immutableBlobs);
    const root = JSON.parse(
      values.get(plan.manifest.rootNodeRef!.blobKey)!,
    ) as { payload: { schemaVersion: string; children: unknown[] } };
    expect(root.payload.schemaVersion).toBe(
      "learning-v2-owner-repository-radix-branch.v1",
    );
    expect(root.payload.children.length).toBeGreaterThan(1);
    for (const expected of mutations) {
      await expect(
        lookupOwnerRepositoryRadix({
          accountScopeHash,
          indexKind: "operation",
          manifest: plan.manifest,
          keyKind: expected.keyKind,
          logicalKey: expected.logicalKey,
          resolveNode: resolver(values),
        }),
      ).resolves.toBeDefined();
    }
  });

  it("recursively splits a long common byte prefix and remains addressable", async () => {
    const commonPrefixDigest: OwnerRepositoryRadixDigest = (body) =>
      `${"aa".repeat(4)}${sha256Utf8(body.logicalKey).slice(8)}`;
    const mutations = Array.from({ length: 33 }, (_, index) =>
      mutation("operation_id", `deep-operation-${index}`, { index }),
    );
    const plan = await planOwnerRepositoryRadixBatch({
      accountScopeHash,
      indexKind: "operation",
      manifest: legacyManifest("operation"),
      mutations,
      resolveNode: () => null,
      digest: commonPrefixDigest,
    });
    const values = blobMap(plan.immutableBlobs);
    let ref = plan.manifest.rootNodeRef!;
    let unaryDepth = 0;
    for (;;) {
      const envelope = JSON.parse(values.get(ref.blobKey)!) as {
        payload: {
          schemaVersion: string;
          children?: Array<{ nodeRef: OwnerRepositoryRadixNodeRefV1 }>;
        };
      };
      if (
        envelope.payload.schemaVersion !==
          "learning-v2-owner-repository-radix-branch.v1" ||
        envelope.payload.children?.length !== 1
      )
        break;
      unaryDepth += 1;
      ref = envelope.payload.children[0].nodeRef;
    }
    expect(unaryDepth).toBeGreaterThanOrEqual(4);
    await expect(
      lookupOwnerRepositoryRadix({
        accountScopeHash,
        indexKind: "operation",
        manifest: plan.manifest,
        keyKind: "operation_id",
        logicalKey: "deep-operation-32",
        resolveNode: resolver(values),
        digest: commonPrefixDigest,
      }),
    ).resolves.toMatchObject({ value: { index: 32 } });
  });

  it("produces byte-identical roots and reachable blobs for every batch permutation", async () => {
    const mutations = Array.from({ length: 48 }, (_, index) =>
      mutation("operation_id", `deterministic-operation-${index}`, { index }),
    );
    const plan = (items: readonly OwnerRepositoryRadixMutation[]) =>
      planOwnerRepositoryRadixBatch({
        accountScopeHash,
        indexKind: "operation",
        manifest: legacyManifest("operation"),
        mutations: items,
        resolveNode: () => null,
      });
    const forward = await plan(mutations);
    const reverse = await plan([...mutations].reverse());
    const interleaved = await plan([
      ...mutations.filter((_, index) => index % 2),
      ...mutations.filter((_, index) => index % 2 === 0),
    ]);
    expect(reverse.manifest).toEqual(forward.manifest);
    expect(interleaved.manifest).toEqual(forward.manifest);
    expect(reverse.immutableBlobs).toEqual(forward.immutableBlobs);
    expect(interleaved.immutableBlobs).toEqual(forward.immutableBlobs);
  });

  it("produces the same COW root across one-shot, partitioned and reverse incremental writes", async () => {
    const applyBatches = async (
      batches: readonly (readonly OwnerRepositoryRadixMutation[])[],
    ) => {
      let manifest:
        | OwnerRepositoryLegacyEmptyIndexManifestV1
        | OwnerRepositoryRadixManifestV2 = legacyManifest("operation");
      const values = new Map<string, string>();
      for (const batch of batches) {
        const plan = await planOwnerRepositoryRadixBatch({
          accountScopeHash,
          indexKind: "operation",
          manifest,
          mutations: batch,
          resolveNode: resolver(values),
        });
        for (const blob of plan.immutableBlobs)
          values.set(blob.ref.blobKey, blob.encoded);
        manifest = plan.manifest;
      }
      return { manifest, values };
    };
    const cases = [
      Array.from({ length: 40 }, (_, index) =>
        mutation("operation_id", `partition-count-operation-${index}`, {
          index,
          payload: "x".repeat(1_000),
        }),
      ),
      Array.from({ length: 9 }, (_, index) =>
        mutation("operation_id", `partition-byte-operation-${index}`, {
          index,
          payload: "x".repeat(60_000),
        }),
      ),
      Array.from({ length: 17 }, (_, index) =>
        mutation(
          "operation_id",
          `partition-node-operation-${index}`,
          Array.from({ length: 2_000 }, () => index),
        ),
      ),
    ];
    for (const mutations of cases) {
      const firstCut = Math.max(1, Math.floor(mutations.length / 3));
      const secondCut = Math.max(
        firstCut + 1,
        Math.floor((mutations.length * 2) / 3),
      );
      const oneShot = await applyBatches([mutations]);
      const partitioned = await applyBatches([
        mutations.slice(0, firstCut),
        mutations.slice(firstCut, secondCut),
        mutations.slice(secondCut),
      ]);
      const reverseIncremental = await applyBatches(
        [...mutations].reverse().map((entry) => [entry]),
      );
      expect(partitioned.manifest).toEqual(oneShot.manifest);
      expect(reverseIncremental.manifest).toEqual(oneShot.manifest);
      for (const expected of mutations) {
        await expect(
          lookupOwnerRepositoryRadix({
            accountScopeHash,
            indexKind: "operation",
            manifest: reverseIncremental.manifest,
            keyKind: expected.keyKind,
            logicalKey: expected.logicalKey,
            resolveNode: resolver(reverseIncremental.values),
          }),
        ).resolves.toBeDefined();
      }
    }
  });

  it("keeps online lookup and COW path-only while selected-path corruption fails closed", async () => {
    const mutations = Array.from({ length: 40 }, (_, index) =>
      mutation("operation_id", `path-operation-${index}`, { index }),
    );
    const initial = await planOwnerRepositoryRadixBatch({
      accountScopeHash,
      indexKind: "operation",
      manifest: legacyManifest("operation"),
      mutations,
      resolveNode: () => null,
    });
    const values = blobMap(initial.immutableBlobs);
    const rootEnvelope = JSON.parse(
      values.get(initial.manifest.rootNodeRef!.blobKey)!,
    ) as {
      payload: {
        children: Array<{
          edge: string;
          nodeRef: OwnerRepositoryRadixNodeRefV1;
        }>;
      };
    };
    const selectedKey = mutations[0].logicalKey;
    const selectedEdge = deriveOwnerRepositoryRadixKeyDigest({
      indexKind: "operation",
      keyKind: "operation_id",
      logicalKey: selectedKey,
    }).slice(0, 2);
    const missingSibling = rootEnvelope.payload.children.find(
      (child) => child.edge !== selectedEdge,
    )!;
    const selectedChild = rootEnvelope.payload.children.find(
      (child) => child.edge === selectedEdge,
    )!;
    values.delete(missingSibling.nodeRef.blobKey);
    const calls: string[] = [];
    const pathResolver = (ref: OwnerRepositoryRadixNodeRefV1) => {
      calls.push(ref.blobKey);
      return values.get(ref.blobKey) ?? null;
    };
    await expect(
      lookupOwnerRepositoryRadix({
        accountScopeHash,
        indexKind: "operation",
        manifest: initial.manifest,
        keyKind: "operation_id",
        logicalKey: selectedKey,
        resolveNode: pathResolver,
      }),
    ).resolves.toBeDefined();
    expect(calls).not.toContain(missingSibling.nodeRef.blobKey);

    let suffix = 0;
    let nextKey = "";
    do {
      nextKey = `path-new-operation-${suffix}`;
      suffix += 1;
    } while (
      deriveOwnerRepositoryRadixKeyDigest({
        indexKind: "operation",
        keyKind: "operation_id",
        logicalKey: nextKey,
      }).slice(0, 2) !== selectedEdge
    );
    await expect(
      planOwnerRepositoryRadixBatch({
        accountScopeHash,
        indexKind: "operation",
        manifest: initial.manifest,
        mutations: [mutation("operation_id", nextKey, { inserted: true })],
        resolveNode: pathResolver,
      }),
    ).resolves.toMatchObject({ changed: true, manifest: { entryCount: 41 } });
    expect(calls).not.toContain(missingSibling.nodeRef.blobKey);

    values.delete(selectedChild.nodeRef.blobKey);
    await expect(
      lookupOwnerRepositoryRadix({
        accountScopeHash,
        indexKind: "operation",
        manifest: initial.manifest,
        keyKind: "operation_id",
        logicalKey: selectedKey,
        resolveNode: resolver(values),
      }),
    ).rejects.toThrow("owner_index_indeterminate");
  });

  it("fails closed on missing, hash-corrupt, wrong-prefix and wrong-count nodes", async () => {
    const mutations = Array.from({ length: 33 }, (_, index) =>
      mutation("operation_id", `corrupt-operation-${index}`, { index }),
    );
    const plan = await planOwnerRepositoryRadixBatch({
      accountScopeHash,
      indexKind: "operation",
      manifest: legacyManifest("operation"),
      mutations,
      resolveNode: () => null,
    });
    const lookup = (
      manifest: OwnerRepositoryRadixManifestV2,
      values: Map<string, string>,
    ) =>
      lookupOwnerRepositoryRadix({
        accountScopeHash,
        indexKind: "operation",
        manifest,
        keyKind: "operation_id",
        logicalKey: "corrupt-operation-0",
        resolveNode: resolver(values),
      });
    await expect(lookup(plan.manifest, new Map())).rejects.toThrow(
      "owner_index_indeterminate",
    );

    const hashCorrupt = blobMap(plan.immutableBlobs);
    hashCorrupt.set(
      plan.manifest.rootNodeRef!.blobKey,
      `${hashCorrupt.get(plan.manifest.rootNodeRef!.blobKey)!} `,
    );
    await expect(lookup(plan.manifest, hashCorrupt)).rejects.toThrow(
      "owner_index_indeterminate",
    );

    for (const mutate of [
      (payload: Record<string, unknown>) => {
        payload.pathPrefix = "ff";
      },
      (payload: Record<string, unknown>) => {
        payload.entryCount = Number(payload.entryCount) + 1;
      },
    ]) {
      const values = blobMap(plan.immutableBlobs);
      const rewritten = rewriteBlob(
        values.get(plan.manifest.rootNodeRef!.blobKey)!,
        mutate,
      );
      values.set(rewritten.ref.blobKey, rewritten.encoded);
      const manifest = { ...plan.manifest, rootNodeRef: rewritten.ref };
      await expect(lookup(manifest, values)).rejects.toThrow(
        "owner_index_indeterminate",
      );
    }
  });

  it("rejects an injected full digest collision instead of creating an ambiguous route", async () => {
    const collisionDigest: OwnerRepositoryRadixDigest = () => fingerprint("0");
    await expect(
      planOwnerRepositoryRadixBatch({
        accountScopeHash,
        indexKind: "operation",
        manifest: legacyManifest("operation"),
        mutations: [
          mutation("operation_id", "collision-operation-1", { value: 1 }),
          mutation("operation_id", "collision-operation-2", { value: 2 }),
        ],
        resolveNode: () => null,
        digest: collisionDigest,
      }),
    ).rejects.toThrow("owner_index_digest_collision");
  });

  it("splits byte-heavy leaves below the entry cap and rejects a single oversized value", async () => {
    const mutations = Array.from({ length: 9 }, (_, index) =>
      mutation("operation_id", `byte-split-operation-${index}`, {
        payload: "x".repeat(60_000),
        index,
      }),
    );
    const plan = await planOwnerRepositoryRadixBatch({
      accountScopeHash,
      indexKind: "operation",
      manifest: legacyManifest("operation"),
      mutations,
      resolveNode: () => null,
    });
    const values = blobMap(plan.immutableBlobs);
    const root = JSON.parse(
      values.get(plan.manifest.rootNodeRef!.blobKey)!,
    ) as { payload: { schemaVersion: string } };
    expect(root.payload.schemaVersion).toBe(
      "learning-v2-owner-repository-radix-branch.v1",
    );
    await expect(
      lookupOwnerRepositoryRadix({
        accountScopeHash,
        indexKind: "operation",
        manifest: plan.manifest,
        keyKind: "operation_id",
        logicalKey: "byte-split-operation-8",
        resolveNode: resolver(values),
      }),
    ).resolves.toMatchObject({ value: { index: 8 } });

    await expect(
      planOwnerRepositoryRadixBatch({
        accountScopeHash,
        indexKind: "operation",
        manifest: legacyManifest("operation"),
        mutations: [
          mutation(
            "operation_id",
            "too-large",
            "x".repeat(OWNER_REPOSITORY_RADIX_MAX_VALUE_BYTES),
          ),
        ],
        resolveNode: () => null,
      }),
    ).rejects.toThrow("owner_index_value_invalid");
  });

  it("never builds a leaf that exceeds its own aggregate node parser budget", async () => {
    const mutations = Array.from({ length: 17 }, (_, index) =>
      mutation(
        "operation_id",
        `node-heavy-operation-${index}`,
        Array.from({ length: 2_000 }, () => 0),
      ),
    );
    const plan = await planOwnerRepositoryRadixBatch({
      accountScopeHash,
      indexKind: "operation",
      manifest: legacyManifest("operation"),
      mutations,
      resolveNode: () => null,
    });
    const values = blobMap(plan.immutableBlobs);
    for (const expected of mutations) {
      await expect(
        lookupOwnerRepositoryRadix({
          accountScopeHash,
          indexKind: "operation",
          manifest: plan.manifest,
          keyKind: expected.keyKind,
          logicalKey: expected.logicalKey,
          resolveNode: resolver(values),
        }),
      ).resolves.toBeDefined();
    }
  });

  it("never executes getters and rejects sparse, symbol and non-enumerable input state", async () => {
    let getterRuns = 0;
    const poisonedRequest: Record<string, unknown> = {
      accountScopeHash,
      indexKind: "operation",
      manifest: legacyManifest("operation"),
      resolveNode: () => null,
    };
    Object.defineProperty(poisonedRequest, "mutations", {
      enumerable: true,
      get: () => {
        getterRuns += 1;
        return [];
      },
    });
    await expect(
      planOwnerRepositoryRadixBatch(poisonedRequest as never),
    ).rejects.toThrow("owner_index_batch_invalid");

    const sparse = new Array<OwnerRepositoryRadixMutation>(2);
    sparse[0] = mutation("operation_id", "sparse-operation");
    await expect(
      planOwnerRepositoryRadixBatch({
        accountScopeHash,
        indexKind: "operation",
        manifest: legacyManifest("operation"),
        mutations: sparse,
        resolveNode: () => null,
      }),
    ).rejects.toThrow("owner_index_batch_invalid");

    for (const poisonedValue of [
      (() => {
        const value: Record<string | symbol, unknown> = { okay: true };
        Object.defineProperty(value, "poison", {
          enumerable: true,
          get: () => {
            getterRuns += 1;
            return true;
          },
        });
        return value;
      })(),
      (() => {
        const value: Record<string | symbol, unknown> = { okay: true };
        value[Symbol("poison")] = true;
        return value;
      })(),
      (() => {
        const value: Record<string, unknown> = { okay: true };
        Object.defineProperty(value, "hidden", {
          enumerable: false,
          value: true,
        });
        return value;
      })(),
      JSON.parse(
        `{"__proto__":[${Array.from({ length: 5_000 }, () => "0").join(",")}]}`,
      ) as unknown,
    ]) {
      await expect(
        planOwnerRepositoryRadixBatch({
          accountScopeHash,
          indexKind: "operation",
          manifest: legacyManifest("operation"),
          mutations: [
            mutation("operation_id", "poisoned-operation", poisonedValue),
          ],
          resolveNode: () => null,
        }),
      ).rejects.toThrow("owner_index_value_invalid");
    }
    expect(getterRuns).toBe(0);
  });

  it("bounds aggregate batch values and external reads", async () => {
    const heavy = Array.from({ length: 65 }, (_, index) =>
      mutation("operation_id", `aggregate-operation-${index}`, {
        payload: "x".repeat(65_000),
      }),
    );
    await expect(
      planOwnerRepositoryRadixBatch({
        accountScopeHash,
        indexKind: "operation",
        manifest: legacyManifest("operation"),
        mutations: heavy,
        resolveNode: () => null,
      }),
    ).rejects.toThrow("owner_index_batch_value_overflow");

    const plan = await planOwnerRepositoryRadixBatch({
      accountScopeHash,
      indexKind: "operation",
      manifest: legacyManifest("operation"),
      mutations: [mutation("operation_id", "budget-operation")],
      resolveNode: () => null,
    });
    await expect(
      lookupOwnerRepositoryRadix({
        accountScopeHash,
        indexKind: "operation",
        manifest: plan.manifest,
        keyKind: "operation_id",
        logicalKey: "budget-operation",
        resolveNode: resolver(blobMap(plan.immutableBlobs)),
        readBudget: { maxExternalReads: 0, maxExternalBytes: 0 },
      }),
    ).rejects.toThrow("owner_index_read_budget_exceeded");
    await expect(
      lookupOwnerRepositoryRadix({
        accountScopeHash,
        indexKind: "operation",
        manifest: plan.manifest,
        keyKind: "operation_id",
        logicalKey: "budget-operation",
        resolveNode: () => ({}),
      }),
    ).rejects.toThrow("owner_index_indeterminate");
  });

  it("normalizes corrupt stored entries and duplicate sibling refs to indeterminate", async () => {
    const leafPlan = await planOwnerRepositoryRadixBatch({
      accountScopeHash,
      indexKind: "operation",
      manifest: legacyManifest("operation"),
      mutations: [mutation("operation_id", "corrupt-entry")],
      resolveNode: () => null,
    });
    const leafValues = blobMap(leafPlan.immutableBlobs);
    const corruptLeaf = rewriteBlob(
      leafValues.get(leafPlan.manifest.rootNodeRef!.blobKey)!,
      (payload) => {
        const entries = payload.entries as Array<Record<string, unknown>>;
        entries[0].valueFingerprint = fingerprint("f");
      },
    );
    leafValues.set(corruptLeaf.ref.blobKey, corruptLeaf.encoded);
    await expect(
      lookupOwnerRepositoryRadix({
        accountScopeHash,
        indexKind: "operation",
        manifest: { ...leafPlan.manifest, rootNodeRef: corruptLeaf.ref },
        keyKind: "operation_id",
        logicalKey: "corrupt-entry",
        resolveNode: resolver(leafValues),
      }),
    ).rejects.toThrow("owner_index_indeterminate");

    const branchPlan = await planOwnerRepositoryRadixBatch({
      accountScopeHash,
      indexKind: "operation",
      manifest: legacyManifest("operation"),
      mutations: Array.from({ length: 33 }, (_, index) =>
        mutation("operation_id", `duplicate-ref-${index}`, { index }),
      ),
      resolveNode: () => null,
    });
    const branchValues = blobMap(branchPlan.immutableBlobs);
    const corruptBranch = rewriteBlob(
      branchValues.get(branchPlan.manifest.rootNodeRef!.blobKey)!,
      (payload) => {
        const children = payload.children as Array<Record<string, unknown>>;
        children[1].nodeRef = children[0].nodeRef;
      },
    );
    branchValues.set(corruptBranch.ref.blobKey, corruptBranch.encoded);
    await expect(
      lookupOwnerRepositoryRadix({
        accountScopeHash,
        indexKind: "operation",
        manifest: { ...branchPlan.manifest, rootNodeRef: corruptBranch.ref },
        keyKind: "operation_id",
        logicalKey: "duplicate-ref-0",
        resolveNode: resolver(branchValues),
      }),
    ).rejects.toThrow("owner_index_indeterminate");
  });

  it("audits the complete radix graph through bounded opaque pages", async () => {
    const plan = await planOwnerRepositoryRadixBatch({
      accountScopeHash,
      indexKind: "operation",
      manifest: legacyManifest("operation"),
      mutations: Array.from({ length: 80 }, (_, index) =>
        mutation("operation_id", `audit-operation-${index}`, { index }),
      ),
      resolveNode: () => null,
    });
    const values = blobMap(plan.immutableBlobs);
    let page = await auditOwnerRepositoryRadixPage({
      accountScopeHash,
      indexKind: "operation",
      manifest: plan.manifest,
      cursor: null,
      maxNodes: 1,
      resolveNode: resolver(values),
    });
    expect(page).toMatchObject({
      done: false,
      visitedNodesThisPage: 1,
      visitedEntriesThisPage: 0,
    });
    expect(isOwnerRepositoryRadixAuditCursor(page.cursor)).toBe(true);
    await expect(
      auditOwnerRepositoryRadixPage({
        accountScopeHash,
        indexKind: "operation",
        manifest: plan.manifest,
        cursor: { ...page.cursor! },
        maxNodes: 2,
        resolveNode: resolver(values),
      }),
    ).rejects.toThrow("owner_index_audit_invalid");

    const logicalKeys: string[] = [];
    while (!page.done) {
      page = await auditOwnerRepositoryRadixPage({
        accountScopeHash,
        indexKind: "operation",
        manifest: plan.manifest,
        cursor: page.cursor,
        maxNodes: 2,
        resolveNode: resolver(values),
      });
      logicalKeys.push(...page.entries.map((entry) => entry.logicalKey));
    }
    expect(page.cursor).toBeNull();
    expect(page.visitedEntryCount).toBe(80);
    expect(new Set(logicalKeys).size).toBe(80);
    expect(page.accumulatorFingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  it("fails a paged audit on a missing later child or invalid explicit budget", async () => {
    const plan = await planOwnerRepositoryRadixBatch({
      accountScopeHash,
      indexKind: "operation",
      manifest: legacyManifest("operation"),
      mutations: Array.from({ length: 40 }, (_, index) =>
        mutation("operation_id", `audit-missing-${index}`, { index }),
      ),
      resolveNode: () => null,
    });
    const values = blobMap(plan.immutableBlobs);
    const first = await auditOwnerRepositoryRadixPage({
      accountScopeHash,
      indexKind: "operation",
      manifest: plan.manifest,
      cursor: null,
      maxNodes: 1,
      resolveNode: resolver(values),
    });
    for (const key of [...values.keys()]) {
      if (key !== plan.manifest.rootNodeRef!.blobKey) values.delete(key);
    }
    await expect(
      auditOwnerRepositoryRadixPage({
        accountScopeHash,
        indexKind: "operation",
        manifest: plan.manifest,
        cursor: first.cursor,
        maxNodes: 2,
        resolveNode: resolver(values),
      }),
    ).rejects.toThrow("owner_index_indeterminate");
    await expect(
      auditOwnerRepositoryRadixPage({
        accountScopeHash,
        indexKind: "operation",
        manifest: plan.manifest,
        cursor: null,
        maxNodes: 1,
        resolveNode: resolver(blobMap(plan.immutableBlobs)),
        readBudget: undefined,
      }),
    ).rejects.toThrow("owner_index_read_budget_invalid");
  });
});
