import { deriveProgressProjection, shouldApplyProgressProjection } from "./progress_event_projection";

const projection = deriveProgressProjection({ starSlotId: "slot-1", previousBestStars: 1, candidateStars: 3, activityId: "activity-1", progressCompatibilityKey: "compat-1" });

describe("V2 progress projection", () => {
  it("derives earned and access deltas without purchased access", () => {
    expect(projection).toMatchObject({ performanceStars: 3, performanceStarsDelta: 2, accessStarsEarnedDelta: 2, accessStarsPurchasedDelta: 0 });
  });
  it("applies only a strictly better best-score projection", () => {
    expect(shouldApplyProgressProjection(undefined, projection)).toBe(true);
    expect(shouldApplyProgressProjection(2, projection)).toBe(true);
    expect(shouldApplyProgressProjection(3, projection)).toBe(false);
    expect(() => shouldApplyProgressProjection(4, projection)).toThrow("v2_progress_projection_state_invalid");
  });
});
