"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const progress_event_projection_1 = require("./progress_event_projection");
const projection = (0, progress_event_projection_1.deriveProgressProjection)({ starSlotId: "slot-1", previousBestStars: 1, candidateStars: 3, activityId: "activity-1", progressCompatibilityKey: "compat-1" });
describe("V2 progress projection", () => {
    it("derives earned and access deltas without purchased access", () => {
        expect(projection).toMatchObject({ performanceStars: 3, performanceStarsDelta: 2, accessStarsEarnedDelta: 2, accessStarsPurchasedDelta: 0 });
    });
    it("applies only a strictly better best-score projection", () => {
        expect((0, progress_event_projection_1.shouldApplyProgressProjection)(undefined, projection)).toBe(true);
        expect((0, progress_event_projection_1.shouldApplyProgressProjection)(2, projection)).toBe(true);
        expect((0, progress_event_projection_1.shouldApplyProgressProjection)(3, projection)).toBe(false);
        expect(() => (0, progress_event_projection_1.shouldApplyProgressProjection)(4, projection)).toThrow("v2_progress_projection_state_invalid");
    });
});
//# sourceMappingURL=progress_event_projection.test.js.map