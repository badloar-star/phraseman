import {
  adminSaveV2EpisodeDraft,
  adminSaveV2SeasonDraft,
} from "./admin_content_studio_callables";

describe("V2 Content Studio callable exports", () => {
  it("exports both server-only mutation endpoints", () => {
    expect(adminSaveV2EpisodeDraft).toBeDefined();
    expect(adminSaveV2SeasonDraft).toBeDefined();
  });
});
