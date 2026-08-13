import {
  getV2FirebaseUnifiedCourseReleaseActivationPreflightSummaryV1,
  isV2FirebaseUnifiedCourseReleaseActivationPreflightHandleV1,
  resolveV2FirebaseUnifiedCourseReleaseActivationPreflightMaterialV1,
} from "./v2_firebase_unified_course_release_activation_preflight_adapter_v1";

describe("Learning V2 Firebase unified activation preflight authority boundary", () => {
  it("does not accept copies, summaries or raw structural claims as private handles", () => {
    const fake = Object.freeze({
      kind: "v2_firebase_unified_course_release_activation_preflight_handle",
    });
    const summary = Object.freeze({
      schemaVersion:
        "v2-firebase-unified-course-release-activation-preflight-summary.v1",
      releaseAuthority: false,
    });
    expect(
      isV2FirebaseUnifiedCourseReleaseActivationPreflightHandleV1(fake),
    ).toBe(false);
    expect(
      isV2FirebaseUnifiedCourseReleaseActivationPreflightHandleV1(summary),
    ).toBe(false);
    expect(() =>
      getV2FirebaseUnifiedCourseReleaseActivationPreflightSummaryV1(
        fake as never,
      ),
    ).toThrow("handle_invalid");
    expect(() =>
      resolveV2FirebaseUnifiedCourseReleaseActivationPreflightMaterialV1({
        handle: fake as never,
        root: {} as never,
      }),
    ).toThrow("handle_invalid");
  });
});
