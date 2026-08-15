import {
  createEmptyOwnerRepositoryCourseManifest,
  lookupOwnerRepositoryCourseState,
  parseOwnerRepositoryCourseStateEntry,
  planOwnerRepositoryCourseStateMutation,
  type OwnerRepositoryCourseStateManifestV1,
} from "../modules/learning-v2/progress/owner_repository_course_manifest";
import type {
  OwnerRepositoryCourseStateIndexValueV1,
  OwnerRepositoryRadixBlob,
  OwnerRepositoryRadixNodeRefV1,
} from "../modules/learning-v2/progress/owner_repository_radix";
import { canonicalJsonV1, sha256Utf8 } from "../modules/learning-v2/policies/decision_registry";
import { utf8ByteLengthV1 } from "../modules/learning-v2/policies/decision_registry";
import { deriveCourseUnlockIdentityFingerprint } from "../modules/learning-v2/contracts/course_unlock";

const accountScopeHash = "aaaaaaaaaaaaaaaa";
const entryForIdentity = (
  courseIdentityFingerprint: string,
  stateLabel: string,
): OwnerRepositoryCourseStateIndexValueV1 => {
  const blobFingerprint = sha256Utf8(stateLabel);
  return {
    schemaVersion: "learning-v2-owner-repository-course-entry.v1",
    courseIdentityFingerprint,
    stateRef: {
      schemaVersion: "learning-v2-owner-repository-blob-ref.v1",
      kind: "course_unlock_state",
      blobKey: `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${blobFingerprint}`,
      blobFingerprint,
    },
  };
};
const entry = (label: string, stateLabel: string): OwnerRepositoryCourseStateIndexValueV1 =>
  entryForIdentity(sha256Utf8(label), stateLabel);
const resolver = (values: Map<string, string>) => (ref: OwnerRepositoryRadixNodeRefV1) =>
  values.get(ref.blobKey) ?? null;
const addBlobs = (values: Map<string, string>, blobs: readonly OwnerRepositoryRadixBlob[]) => {
  for (const blob of blobs) values.set(blob.ref.blobKey, blob.encoded);
};

describe("Learning V2 owner repository course-state manifest", () => {
  it("materializes one deterministic content-addressed empty manifest", async () => {
    const first = await createEmptyOwnerRepositoryCourseManifest(accountScopeHash);
    const second = await createEmptyOwnerRepositoryCourseManifest(accountScopeHash);
    expect(second).toEqual(first);
    expect(first).toMatchObject({
      changed: true,
      manifest: { indexKind: "course_state", entryCount: 0, rootNodeRef: null },
      manifestBlob: { ref: { kind: "course_state_manifest" } },
      immutableNodeBlobs: [],
    });
    expect(first.manifestBlob.ref.blobFingerprint).toBe(sha256Utf8(first.manifestBlob.encoded));
    expect(canonicalJsonV1(JSON.parse(first.manifestBlob.encoded))).toBe(first.manifestBlob.encoded);
    expect(Object.isFrozen(first.manifest)).toBe(true);
  });

  it("inserts an absent course and replaces only the exact expected old projection", async () => {
    const empty = await createEmptyOwnerRepositoryCourseManifest(accountScopeHash);
    const values = new Map<string, string>();
    const firstEntry = entry("english-core:en", "english-state-1");
    const first = await planOwnerRepositoryCourseStateMutation({
      accountScopeHash,
      manifest: empty.manifest,
      expectedEntry: null,
      nextEntry: firstEntry,
      resolveNode: resolver(values),
    });
    addBlobs(values, first.immutableNodeBlobs);
    await expect(lookupOwnerRepositoryCourseState({
      accountScopeHash,
      manifest: first.manifest,
      courseIdentityFingerprint: firstEntry.courseIdentityFingerprint,
      resolveNode: resolver(values),
    })).resolves.toEqual(firstEntry);

    const secondEntry = entry("english-core:en", "english-state-2");
    const second = await planOwnerRepositoryCourseStateMutation({
      accountScopeHash,
      manifest: first.manifest,
      expectedEntry: firstEntry,
      nextEntry: secondEntry,
      resolveNode: resolver(values),
    });
    addBlobs(values, second.immutableNodeBlobs);
    expect(second.manifest.entryCount).toBe(1);
    await expect(lookupOwnerRepositoryCourseState({
      accountScopeHash,
      manifest: second.manifest,
      courseIdentityFingerprint: secondEntry.courseIdentityFingerprint,
      resolveNode: resolver(values),
    })).resolves.toEqual(secondEntry);
    await expect(planOwnerRepositoryCourseStateMutation({
      accountScopeHash,
      manifest: second.manifest,
      expectedEntry: firstEntry,
      nextEntry: entry("english-core:en", "english-state-3"),
      resolveNode: resolver(values),
    })).rejects.toThrow("owner_course_manifest_expected_conflict");
    await expect(planOwnerRepositoryCourseStateMutation({
      accountScopeHash,
      manifest: first.manifest,
      expectedEntry: null,
      nextEntry: firstEntry,
      resolveNode: resolver(values),
    })).rejects.toThrow("owner_course_manifest_expected_conflict");
    await expect(planOwnerRepositoryCourseStateMutation({
      accountScopeHash,
      manifest: empty.manifest,
      expectedEntry: firstEntry,
      nextEntry: secondEntry,
      resolveNode: () => null,
    })).rejects.toThrow("owner_course_manifest_expected_conflict");
    const same = await planOwnerRepositoryCourseStateMutation({
      accountScopeHash,
      manifest: first.manifest,
      expectedEntry: firstEntry,
      nextEntry: firstEntry,
      resolveNode: resolver(values),
    });
    expect(same).toMatchObject({ changed: false, immutableNodeBlobs: [] });
    expect(same.manifestBlob.ref).toEqual(first.manifestBlob.ref);
    await expect(planOwnerRepositoryCourseStateMutation({
      accountScopeHash,
      manifest: first.manifest,
      expectedEntry: entry("other-course", "other-state"),
      nextEntry: secondEntry,
      resolveNode: resolver(values),
    })).rejects.toThrow("owner_course_manifest_invalid");
  });

  it("uses the stable account+course+study-target identity across releases and generations", () => {
    const identity = deriveCourseUnlockIdentityFingerprint({
      accountScopeHash,
      courseId: "english-core",
      studyTarget: "en",
    });
    expect(identity).toBe(deriveCourseUnlockIdentityFingerprint({
      accountScopeHash,
      courseId: "english-core",
      studyTarget: "en",
    }));
    expect(deriveCourseUnlockIdentityFingerprint({
      accountScopeHash,
      courseId: "english-core-v2",
      studyTarget: "en",
    })).not.toBe(identity);
    expect(deriveCourseUnlockIdentityFingerprint({
      accountScopeHash,
      courseId: "english-core",
      studyTarget: "es",
    })).not.toBe(identity);
    expect(deriveCourseUnlockIdentityFingerprint({
      accountScopeHash: "bbbbbbbbbbbbbbbb",
      courseId: "english-core",
      studyTarget: "en",
    })).not.toBe(identity);
  });

  it("keeps independent course identities and a constant-size root manifest", async () => {
    let manifest: OwnerRepositoryCourseStateManifestV1 =
      (await createEmptyOwnerRepositoryCourseManifest(accountScopeHash)).manifest;
    const values = new Map<string, string>();
    const entries = Array.from({ length: 128 }, (_, index) => entryForIdentity(
      deriveCourseUnlockIdentityFingerprint({
        accountScopeHash,
        courseId: `course-${Math.floor(index / 32)}`,
        studyTarget: `target-${index}`,
      }),
      `course-state-${index}`,
    ));
    for (const nextEntry of entries) {
      const plan = await planOwnerRepositoryCourseStateMutation({
        accountScopeHash,
        manifest,
        expectedEntry: null,
        nextEntry,
        resolveNode: resolver(values),
      });
      addBlobs(values, plan.immutableNodeBlobs);
      manifest = plan.manifest;
    }
    expect(manifest.entryCount).toBe(128);
    const emptyBytes = utf8ByteLengthV1(
      (await createEmptyOwnerRepositoryCourseManifest(accountScopeHash)).manifestBlob.encoded,
    );
    const fullPlan = await planOwnerRepositoryCourseStateMutation({
      accountScopeHash,
      manifest,
      expectedEntry: entries[127],
      nextEntry: entryForIdentity(entries[127].courseIdentityFingerprint, "course-state-127:next"),
      resolveNode: resolver(values),
    });
    expect(utf8ByteLengthV1(fullPlan.manifestBlob.encoded)).toBeLessThanOrEqual(emptyBytes + 300);
    for (const expected of [entries[0], entries[31], entries[64], entries[127]]) {
      await expect(lookupOwnerRepositoryCourseState({
        accountScopeHash,
        manifest,
        courseIdentityFingerprint: expected.courseIdentityFingerprint,
        resolveNode: resolver(values),
      })).resolves.toEqual(expected);
    }
  });

  it("rejects identity/account/ref substitution and hostile nested accessors", async () => {
    const empty = await createEmptyOwnerRepositoryCourseManifest(accountScopeHash);
    const valid = entry("strict-course", "strict-state");
    const invalid = {
      ...valid,
      stateRef: {
        ...valid.stateRef,
        blobKey: valid.stateRef.blobKey.replace(accountScopeHash, "bbbbbbbbbbbbbbbb"),
      },
    };
    await expect(planOwnerRepositoryCourseStateMutation({
      accountScopeHash,
      manifest: empty.manifest,
      expectedEntry: null,
      nextEntry: invalid,
      resolveNode: () => null,
    })).rejects.toThrow("owner_course_manifest_invalid");

    let getterRuns = 0;
    const accessor = { ...valid.stateRef } as Record<string, unknown>;
    Object.defineProperty(accessor, "blobFingerprint", {
      enumerable: true,
      get: () => { getterRuns += 1; return valid.stateRef.blobFingerprint; },
    });
    await expect(planOwnerRepositoryCourseStateMutation({
      accountScopeHash,
      manifest: empty.manifest,
      expectedEntry: null,
      nextEntry: { ...valid, stateRef: accessor } as unknown as OwnerRepositoryCourseStateIndexValueV1,
      resolveNode: () => null,
    })).rejects.toThrow("owner_course_manifest_invalid");
    expect(getterRuns).toBe(0);

    const topLevel = {
      accountScopeHash,
      manifest: empty.manifest,
      expectedEntry: null,
      nextEntry: valid,
      resolveNode: () => null,
    } as Record<string, unknown>;
    Object.defineProperty(topLevel, "nextEntry", {
      enumerable: true,
      get: () => { getterRuns += 1; return valid; },
    });
    await expect(planOwnerRepositoryCourseStateMutation(
      topLevel as unknown as Parameters<typeof planOwnerRepositoryCourseStateMutation>[0],
    )).rejects.toThrow("owner_course_manifest_invalid");
    expect(getterRuns).toBe(0);

    for (const readBudget of [null, false, 0, ""]) {
      await expect(planOwnerRepositoryCourseStateMutation({
        accountScopeHash,
        manifest: empty.manifest,
        expectedEntry: null,
        nextEntry: valid,
        resolveNode: () => null,
        readBudget: readBudget as never,
      })).rejects.toThrow("owner_course_manifest_indeterminate");
    }

    let coercionRuns = 0;
    const hostileAccount = {
      [Symbol.toPrimitive]: () => { coercionRuns += 1; return accountScopeHash; },
    };
    await expect(createEmptyOwnerRepositoryCourseManifest(hostileAccount as unknown as string))
      .rejects.toThrow("owner_course_manifest_invalid");
    expect(() => parseOwnerRepositoryCourseStateEntry(
      valid,
      hostileAccount as unknown as string,
    )).toThrow("owner_course_manifest_invalid");
    expect(coercionRuns).toBe(0);
  });
});
