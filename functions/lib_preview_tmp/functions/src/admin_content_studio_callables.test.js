"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin_content_studio_callables_1 = require("./admin_content_studio_callables");
describe("V2 Content Studio callable exports", () => {
    it("exports both server-only mutation endpoints", () => {
        expect(admin_content_studio_callables_1.adminSaveV2EpisodeDraft).toBeDefined();
        expect(admin_content_studio_callables_1.adminSaveV2SeasonDraft).toBeDefined();
    });
});
//# sourceMappingURL=admin_content_studio_callables.test.js.map