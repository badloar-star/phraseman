import { validateV2EpisodeContract } from "../../../modules/learning-v2/contracts/validation";

describe("immutable Episode contract validator", () => {
  it("rejects an arbitrary hash-matching body before it can be pinned", () => {
    const result = validateV2EpisodeContract({
      schemaVersion: "v2-episode-contract.v1",
      evil: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0]?.code).toBe("field_unknown");
  });

  it("rejects a body with missing canonical collections", () => {
    const result = validateV2EpisodeContract({
      schemaVersion: "v2-episode-contract.v1",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0]?.path).toBe("$.episode.episodeId");
  });
});
