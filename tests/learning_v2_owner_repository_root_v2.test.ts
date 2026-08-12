import {
  createOwnerRepository,
  type OwnerRepositoryActiveOwnerFence,
  type OwnerRepositoryCasStorage,
  type OwnerRepositoryRootV1,
} from "../modules/learning-v2/progress/owner_repository";
import {
  createEmptyOwnerRepositoryCourseManifest,
  parseOwnerRepositoryCourseManifestBlob,
  planOwnerRepositoryCourseStateMutation,
  type OwnerRepositoryCourseStateMutationPlan,
} from "../modules/learning-v2/progress/owner_repository_course_manifest";
import {
  advanceOwnerRepositoryRootV2Generation,
  createGenesisOwnerRepositoryRootV2,
  migrateVerifiedGenesisOwnerRepositoryRootV1,
  parseOwnerRepositoryRootV2,
  parseOwnerRepositoryRootV2Raw,
} from "../modules/learning-v2/progress/owner_repository_root_v2";
import { canonicalJsonV1, sha256Utf8, utf8ByteLengthV1 } from "../modules/learning-v2/policies/decision_registry";

const accountScopeHash = "aaaaaaaaaaaaaaaa";
const generation = 4;

class MemoryStorage implements OwnerRepositoryCasStorage {
  readonly values = new Map<string, string>();
  fence: OwnerRepositoryActiveOwnerFence | null = { accountScopeHash, generation };
  async getItem(key: string) { return this.values.get(key) ?? null; }
  async setItem(key: string, value: string) { this.values.set(key, value); }
  async getCurrentOwnerFence() { return this.fence; }
  async compareAndSet(
    key: string,
    expected: string | null,
    next: string,
    fence: OwnerRepositoryActiveOwnerFence,
  ): Promise<"committed" | "conflict" | "stale_generation"> {
    if (!this.fence || canonicalJsonV1(this.fence) !== canonicalJsonV1(fence)) return "stale_generation";
    if ((this.values.get(key) ?? null) !== expected) return "conflict";
    this.values.set(key, next);
    return "committed";
  }
}

const genesis = async () => {
  const storage = new MemoryStorage();
  const snapshot = await createOwnerRepository(
    storage,
    (scope) => scope.accountScopeHash === accountScopeHash && scope.generation === generation,
  ).initialize({ accountScopeHash, generation });
  if (snapshot.root.schemaVersion !== "learning-v2-owner-repository-root.v1") {
    throw new Error("expected_v1_fixture");
  }
  return { storage, root: snapshot.root };
};
const rehashV1 = (root: OwnerRepositoryRootV1): OwnerRepositoryRootV1 => {
  const body = { ...root } as Record<string, unknown>;
  delete body.rootFingerprint;
  return { ...root, rootFingerprint: sha256Utf8(canonicalJsonV1(body)) };
};
const migrate = (
  rootV1: OwnerRepositoryRootV1,
  course: OwnerRepositoryCourseStateMutationPlan,
  values: ReadonlyMap<string, string> = new Map(),
  targetGeneration = generation,
) => migrateVerifiedGenesisOwnerRepositoryRootV1({
  rootV1,
  targetGeneration,
  emptyCourseStateManifestBlob: course.manifestBlob,
  resolveCourseNode: (ref) => values.get(ref.blobKey) ?? null,
});

describe("Learning V2 owner repository root v2", () => {
  it("deterministically migrates only verified empty-genesis v1 into a bounded manifest root", async () => {
    const { root } = await genesis();
    const course = await createEmptyOwnerRepositoryCourseManifest(accountScopeHash);
    const migrated = await migrate(root, course);
    expect(migrated.root).toMatchObject({
      schemaVersion: "learning-v2-owner-repository-root.v2",
      accountScopeHash,
      currentGeneration: generation,
      repositoryRevision: root.repositoryRevision + 1,
      journalSequence: 0,
      previousRootFingerprint: root.rootFingerprint,
      journalHeadRef: null,
      courseStateManifestRef: course.manifestBlob.ref,
    });
    expect(migrated.root).not.toHaveProperty("courseStateRefs");
    expect(utf8ByteLengthV1(migrated.encoded)).toBeLessThan(64 * 1024);
    expect(parseOwnerRepositoryRootV2(JSON.parse(migrated.encoded), accountScopeHash)).toEqual(migrated);
    expect(parseOwnerRepositoryRootV2Raw(migrated.encoded, accountScopeHash)).toEqual(migrated);
    expect(() => parseOwnerRepositoryRootV2Raw(` ${migrated.encoded}`, accountScopeHash))
      .toThrow("owner_repository_root_v2_invalid");
    expect(Object.isFrozen(migrated.root.courseStateManifestRef)).toBe(true);

    const adopted = await migrate(root, course, new Map(), generation + 1);
    expect(adopted.root).toMatchObject({
      currentGeneration: generation + 1,
      repositoryRevision: 1,
      previousRootFingerprint: root.rootFingerprint,
    });
    await expect(migrate(root, course, new Map(), generation - 1))
      .rejects.toThrow("owner_repository_root_v2_invalid");

    const direct = createGenesisOwnerRepositoryRootV2({
      accountScopeHash,
      currentGeneration: generation,
      walletStateRef: root.walletStateRef,
      courseStateManifestRef: course.manifestBlob.ref,
      operationIndexManifestRef: root.operationIndexManifestRef,
      subjectIndexManifestRef: root.subjectIndexManifestRef,
      receiptIndexManifestRef: root.receiptIndexManifestRef,
    });
    expect(direct.root).toMatchObject({ repositoryRevision: 0, previousRootFingerprint: null });
    const rolled = advanceOwnerRepositoryRootV2Generation({
      root: direct.root,
      targetGeneration: generation + 1,
    });
    expect(rolled.root).toMatchObject({
      currentGeneration: generation + 1,
      repositoryRevision: 1,
      previousRootFingerprint: direct.root.rootFingerprint,
    });
    let getterRuns = 0;
    const hostileRoot = { ...direct.root } as Record<string, unknown>;
    Object.defineProperty(hostileRoot, "accountScopeHash", {
      enumerable: true,
      get: () => { getterRuns += 1; return accountScopeHash; },
    });
    expect(() => advanceOwnerRepositoryRootV2Generation({
      root: hostileRoot as unknown as typeof direct.root,
      targetGeneration: generation + 1,
    })).toThrow("owner_repository_root_v2_invalid");
    expect(getterRuns).toBe(0);
  });

  it("strictly decodes the referenced empty manifest envelope before root publication", async () => {
    const course = await createEmptyOwnerRepositoryCourseManifest(accountScopeHash);
    await expect(parseOwnerRepositoryCourseManifestBlob({
      accountScopeHash,
      ref: course.manifestBlob.ref,
      raw: course.manifestBlob.encoded,
      resolveNode: () => null,
    })).resolves.toMatchObject({ manifest: { entryCount: 0, rootNodeRef: null } });

    const tampered = JSON.parse(course.manifestBlob.encoded) as Record<string, unknown>;
    tampered.accountScopeHash = "bbbbbbbbbbbbbbbb";
    const encoded = canonicalJsonV1(tampered);
    const blobFingerprint = sha256Utf8(encoded);
    await expect(parseOwnerRepositoryCourseManifestBlob({
      accountScopeHash,
      ref: {
        ...course.manifestBlob.ref,
        blobFingerprint,
        blobKey: `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${blobFingerprint}`,
      },
      raw: encoded,
      resolveNode: () => null,
    })).rejects.toThrow("owner_course_manifest_indeterminate");

    for (const readBudget of [null, false, 0, ""]) {
      await expect(parseOwnerRepositoryCourseManifestBlob({
        accountScopeHash,
        ref: course.manifestBlob.ref,
        raw: course.manifestBlob.encoded,
        resolveNode: () => null,
        readBudget: readBudget as never,
      })).rejects.toThrow("owner_course_manifest_indeterminate");
    }
    await expect(parseOwnerRepositoryCourseManifestBlob({
      accountScopeHash,
      ref: course.manifestBlob.ref,
      raw: "\ud800",
      resolveNode: () => null,
    })).rejects.toThrow("owner_course_manifest_indeterminate");

    let getterRuns = 0;
    const accessorRef = { ...course.manifestBlob.ref } as Record<string, unknown>;
    Object.defineProperty(accessorRef, "blobFingerprint", {
      enumerable: true,
      get: () => { getterRuns += 1; return course.manifestBlob.ref.blobFingerprint; },
    });
    await expect(parseOwnerRepositoryCourseManifestBlob({
      accountScopeHash,
      ref: accessorRef as never,
      raw: course.manifestBlob.encoded,
      resolveNode: () => null,
    })).rejects.toThrow("owner_course_manifest_indeterminate");
    expect(getterRuns).toBe(0);
    await expect(parseOwnerRepositoryCourseManifestBlob({
      accountScopeHash,
      ref: Object.assign(Object.create(null), course.manifestBlob.ref),
      raw: course.manifestBlob.encoded,
      resolveNode: () => null,
    })).rejects.toThrow("owner_course_manifest_indeterminate");
  });

  it("rejects nonempty/non-genesis v1, revision overflow and cross-kind root aliases", async () => {
    const { root } = await genesis();
    const course = await createEmptyOwnerRepositoryCourseManifest(accountScopeHash);
    const fakeCourseRef = {
      schemaVersion: "learning-v2-owner-repository-course-ref.v1" as const,
      courseIdentityFingerprint: sha256Utf8("fake-course"),
      stateRef: {
        schemaVersion: "learning-v2-owner-repository-blob-ref.v1" as const,
        kind: "course_unlock_state" as const,
        blobFingerprint: sha256Utf8("fake-course-state"),
        blobKey: `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${sha256Utf8("fake-course-state")}`,
      },
    };
    await expect(migrate(rehashV1({ ...root, courseStateRefs: [fakeCourseRef] }), course))
      .rejects.toThrow("owner_repository_root_v2_invalid");
    await expect(migrate(rehashV1({ ...root, repositoryRevision: Number.MAX_SAFE_INTEGER }), course))
      .rejects.toThrow("owner_repository_root_v2_invalid");
    await expect(migrate(rehashV1({
      ...root,
      repositoryRevision: 1,
      previousRootFingerprint: root.rootFingerprint,
    }), course)).rejects.toThrow("owner_repository_root_v2_invalid");
    await expect(migrate(rehashV1({
      ...root,
      previousRootFingerprint: sha256Utf8("forged-previous-root"),
    }), course)).rejects.toThrow("owner_repository_root_v2_invalid");
    await expect(migrate(rehashV1({
      ...root,
      currentGeneration: "4" as unknown as number,
    }), course)).rejects.toThrow("owner_repository_root_v2_invalid");

    const migrated = await migrate(root, course);
    const aliased = JSON.parse(migrated.encoded) as Record<string, unknown>;
    const walletRef = aliased.walletStateRef as Record<string, unknown>;
    aliased.courseStateManifestRef = {
      ...(aliased.courseStateManifestRef as Record<string, unknown>),
      blobFingerprint: walletRef.blobFingerprint,
      blobKey: walletRef.blobKey,
    };
    const body = { ...aliased };
    delete body.rootFingerprint;
    aliased.rootFingerprint = sha256Utf8(canonicalJsonV1(body));
    expect(() => parseOwnerRepositoryRootV2(aliased, accountScopeHash))
      .toThrow("owner_repository_root_v2_invalid");
  });

  it("binds migration to the exact decoded empty course manifest", async () => {
    const { root } = await genesis();
    const empty = await createEmptyOwnerRepositoryCourseManifest(accountScopeHash);
    const stateFingerprint = sha256Utf8("nonempty-course-state");
    const nonempty = await planOwnerRepositoryCourseStateMutation({
      accountScopeHash,
      manifest: empty.manifest,
      expectedEntry: null,
      nextEntry: {
        schemaVersion: "learning-v2-owner-repository-course-entry.v1",
        courseIdentityFingerprint: sha256Utf8("nonempty-course"),
        stateRef: {
          schemaVersion: "learning-v2-owner-repository-blob-ref.v1",
          kind: "course_unlock_state",
          blobKey: `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${stateFingerprint}`,
          blobFingerprint: stateFingerprint,
        },
      },
      resolveNode: () => null,
    });
    const values = new Map(nonempty.immutableNodeBlobs.map((blob) => [blob.ref.blobKey, blob.encoded]));
    await expect(migrate(root, nonempty, values))
      .rejects.toThrow("owner_repository_root_v2_invalid");
  });

  it("rejects tampering, foreign scope and hostile accessors without executing them", async () => {
    const { root } = await genesis();
    const course = await createEmptyOwnerRepositoryCourseManifest(accountScopeHash);
    const migrated = await migrate(root, course);
    const tampered = JSON.parse(migrated.encoded) as Record<string, unknown>;
    tampered.journalSequence = 1;
    expect(() => parseOwnerRepositoryRootV2(tampered, accountScopeHash))
      .toThrow("owner_repository_root_v2_invalid");
    expect(() => parseOwnerRepositoryRootV2(migrated.root, "bbbbbbbbbbbbbbbb"))
      .toThrow("owner_repository_root_v2_invalid");

    let getterRuns = 0;
    const hostile = { ...migrated.root } as Record<string, unknown>;
    Object.defineProperty(hostile, "walletStateRef", {
      enumerable: true,
      get: () => { getterRuns += 1; return migrated.root.walletStateRef; },
    });
    expect(() => parseOwnerRepositoryRootV2(hostile, accountScopeHash))
      .toThrow("owner_repository_root_v2_invalid");
    expect(getterRuns).toBe(0);
  });
});
