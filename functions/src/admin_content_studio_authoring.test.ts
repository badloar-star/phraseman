import { HttpsError } from "firebase-functions/v2/https";
import {
  handleAdminSaveV2Draft,
  parseV2AuthoringRequest,
  requireContentDraftWriter,
} from "./admin_content_studio_authoring";

describe("V2 Content Studio callable boundary", () => {
  it("rejects malformed/stale mutation envelopes before repository access", () => {
    expect(() =>
      parseV2AuthoringRequest({
        draftId: "",
        expectedRevision: 0,
        expectedFingerprint: "",
        draft: {},
      }),
    ).toThrow(HttpsError);
    expect(
      parseV2AuthoringRequest({
        draftId: "draft-1",
        expectedRevision: 1,
        expectedFingerprint: "fingerprint",
        draft: { body: {}, record: {} },
      }),
    ).toMatchObject({ draftId: "draft-1", expectedRevision: 1 });
  });

  it("requires admin content draft permission", () => {
    expect(() => requireContentDraftWriter(undefined)).toThrow(HttpsError);
    expect(() =>
      requireContentDraftWriter({
        uid: "u-1",
        token: { admin: true, adminRole: "support" },
      }),
    ).toThrow(HttpsError);
    expect(
      requireContentDraftWriter({
        uid: "u-1",
        token: { admin: true, adminRole: "content_editor" },
      }),
    ).toMatchObject({ uid: "u-1", role: "content_editor" });
  });

  it("authorizes before invoking the repository dependency", async () => {
    const save = jest.fn(async (writer, request) => ({
      uid: writer.uid,
      draftId: request.draftId,
    }));
    await expect(
      handleAdminSaveV2Draft(
        {
          auth: {
            uid: "u-1",
            token: { admin: true, adminRole: "content_editor" },
          },
          data: {
            draftId: "draft-1",
            expectedRevision: 1,
            expectedFingerprint: "f",
            draft: { body: {}, record: {} },
          },
        },
        { save },
      ),
    ).resolves.toEqual({ uid: "u-1", draftId: "draft-1" });
    expect(save).toHaveBeenCalledTimes(1);
    await expect(
      handleAdminSaveV2Draft(
        {
          auth: { uid: "u-1", token: { admin: true, adminRole: "support" } },
          data: {},
        },
        { save },
      ),
    ).rejects.toThrow(HttpsError);
    expect(save).toHaveBeenCalledTimes(1);
  });
});
