import {
  materializeOwnerRepositoryCourseUnlockStateBlob,
  parseOwnerRepositoryCourseUnlockStateBlob,
} from "../modules/learning-v2/progress/owner_repository_course_blob";
import {
  createCourseUnlockState,
} from "../modules/learning-v2/progress/course_unlock_reducer";

const accountScopeHash = "a".repeat(64);
const state = () =>
  createCourseUnlockState({
    accountScopeHash,
    courseId: "learning-v2-en",
    studyTarget: "en",
  });

describe("Learning V2 Owner Repository course-state blob", () => {
  test("materializes and round-trips an exact immutable course state", () => {
    const materialized = materializeOwnerRepositoryCourseUnlockStateBlob(state());
    const parsed = parseOwnerRepositoryCourseUnlockStateBlob({
      accountScopeHash,
      ref: materialized.blob.ref,
      raw: materialized.blob.encoded,
    });

    expect(parsed).toEqual(materialized);
    expect(parsed.blob.ref.kind).toBe("course_unlock_state");
    expect(parsed.state.highestUnlockedRequiredSessionOrdinal).toBe(0);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.state)).toBe(true);
  });

  test("binds the payload, account scope, key and fingerprint", () => {
    const materialized = materializeOwnerRepositoryCourseUnlockStateBlob(state());

    expect(() =>
      parseOwnerRepositoryCourseUnlockStateBlob({
        accountScopeHash: "b".repeat(64),
        ref: materialized.blob.ref,
        raw: materialized.blob.encoded,
      }),
    ).toThrow("owner_repository_course_blob_invalid");
    expect(() =>
      parseOwnerRepositoryCourseUnlockStateBlob({
        accountScopeHash,
        ref: {
          ...materialized.blob.ref,
          blobFingerprint: "b".repeat(64),
        },
        raw: materialized.blob.encoded,
      }),
    ).toThrow("owner_repository_course_blob_invalid");
    expect(() =>
      parseOwnerRepositoryCourseUnlockStateBlob({
        accountScopeHash,
        ref: materialized.blob.ref,
        raw: `${materialized.blob.encoded} `,
      }),
    ).toThrow("owner_repository_course_blob_invalid");
  });

  test("rejects accessors, extra keys and oversized raw before JSON parsing", () => {
    const materialized = materializeOwnerRepositoryCourseUnlockStateBlob(state());
    let getterCalled = false;
    const hostile = Object.defineProperty(
      { accountScopeHash, ref: materialized.blob.ref },
      "raw",
      {
        enumerable: true,
        get() {
          getterCalled = true;
          return materialized.blob.encoded;
        },
      },
    );

    expect(() => parseOwnerRepositoryCourseUnlockStateBlob(hostile)).toThrow(
      "owner_repository_course_blob_invalid",
    );
    expect(getterCalled).toBe(false);
    expect(() =>
      parseOwnerRepositoryCourseUnlockStateBlob({
        accountScopeHash,
        ref: materialized.blob.ref,
        raw: materialized.blob.encoded,
        extra: true,
      }),
    ).toThrow("owner_repository_course_blob_invalid");

    const parseSpy = jest.spyOn(JSON, "parse");
    expect(() =>
      parseOwnerRepositoryCourseUnlockStateBlob({
        accountScopeHash,
        ref: materialized.blob.ref,
        raw: "x".repeat(512 * 1024 + 1),
      }),
    ).toThrow("owner_repository_course_blob_invalid");
    expect(parseSpy).not.toHaveBeenCalled();
    parseSpy.mockRestore();
  });
});
