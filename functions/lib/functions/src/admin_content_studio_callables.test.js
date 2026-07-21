"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const node_events_1 = require("node:events");
const admin_content_studio_callables_1 = require("./admin_content_studio_callables");
describe("V2 Content Studio callable exports", () => {
    it("exports both server-only mutation endpoints", () => {
        expect(admin_content_studio_callables_1.adminSaveV2EpisodeDraft).toBeDefined();
        expect(admin_content_studio_callables_1.adminSaveV2SeasonDraft).toBeDefined();
        expect(admin_content_studio_callables_1.adminArchiveV2ModeTemplate).toBeDefined();
        expect(admin_content_studio_callables_1.adminValidateV2EpisodeRevision).toBeDefined();
        expect(admin_content_studio_callables_1.adminReviewV2EpisodeRevision).toBeDefined();
        expect(admin_content_studio_callables_1.adminIssueV2ContentGate).toBeDefined();
        expect(admin_content_studio_callables_1.adminIssueV2EpisodeValidationReceipt).toBeDefined();
        expect(admin_content_studio_callables_1.adminIssueV2EpisodeLocalizationReceipt).toBeDefined();
        expect(admin_content_studio_callables_1.adminIssueV2EpisodeVoiceReceipt).toBeDefined();
    });
    it("fails closed on App Check unless an explicit local override is set", () => {
        const source = (0, node_fs_1.readFileSync)(node_path_1.default.resolve(__dirname, "admin_content_studio_callables.ts"), "utf8");
        expect(source).toContain('process.env.ENFORCE_APP_CHECK_CONTENT_STUDIO !== "false"');
    });
    it("uses the real callable HTTP wrapper and rejects a request with no tokens", async () => {
        const request = {
            method: "POST",
            body: { data: {} },
            headers: { "content-type": "application/json" },
            header(name) {
                return this.headers[name.toLowerCase()];
            },
        };
        const response = new node_events_1.EventEmitter();
        response.status = (code) => {
            response.statusCode = code;
            return response;
        };
        response.send = (body) => {
            response.payload = body;
            response.headersSent = true;
            response.emit("finish");
            return response;
        };
        response.setHeader = () => undefined;
        response.getHeader = () => undefined;
        response.removeHeader = () => undefined;
        response.end = () => response.emit("finish");
        response.write = () => true;
        await (0, admin_content_studio_callables_1.adminSaveV2EpisodeDraft)(request, response);
        expect(response.statusCode).toBe(401);
        expect(response.payload).toMatchObject({
            error: { status: "UNAUTHENTICATED" },
        });
    });
});
//# sourceMappingURL=admin_content_studio_callables.test.js.map