"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_events_1 = require("node:events");
process.env.FIREBASE_DEBUG_MODE = "true";
process.env.FIREBASE_DEBUG_FEATURES = JSON.stringify({
    skipTokenVerification: true,
});
process.env.ENFORCE_APP_CHECK_CONTENT_STUDIO = "true";
// This file intentionally loads the exported callable only after the Firebase
// debug-token harness is configured. It is emulator/debug transport evidence,
// never production token validation evidence.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { adminSaveV2EpisodeDraft } = require("../../admin_content_studio_callables");
const token = (payload) => `eyJhbGciOiJub25lIn0.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.debug`;
const request = (headers) => ({
    method: "POST",
    body: { data: {} },
    headers: Object.fromEntries(Object.entries({ "content-type": "application/json", ...headers }).map(([key, value]) => [key.toLowerCase(), value])),
    header(name) {
        return this.headers[name.toLowerCase()];
    },
});
const response = () => {
    const output = new node_events_1.EventEmitter();
    output.status = (code) => {
        output.statusCode = code;
        return output;
    };
    output.send = (body) => {
        output.payload = body;
        output.headersSent = true;
        output.emit("finish");
        return output;
    };
    output.setHeader = () => undefined;
    output.getHeader = () => undefined;
    output.removeHeader = () => undefined;
    output.end = () => output.emit("finish");
    output.write = () => true;
    return output;
};
describe("V2 authoring callable HTTP App Check debug harness", () => {
    afterAll(() => {
        delete process.env.FIREBASE_DEBUG_MODE;
        delete process.env.FIREBASE_DEBUG_FEATURES;
        delete process.env.ENFORCE_APP_CHECK_CONTENT_STUDIO;
    });
    it("rejects an authenticated request when App Check is missing", async () => {
        const res = response();
        await adminSaveV2EpisodeDraft(request({
            Authorization: `Bearer ${token({ sub: "debug-admin", admin: true, adminRole: "content_editor" })}`,
        }), res);
        expect(res.statusCode).toBe(401);
        expect(res.payload).toMatchObject({ error: { status: "UNAUTHENTICATED" } });
    });
    it("reaches the handler with debug-valid Auth and App Check tokens", async () => {
        const res = response();
        await adminSaveV2EpisodeDraft(request({
            Authorization: `Bearer ${token({ sub: "debug-admin", admin: true, adminRole: "content_editor" })}`,
            "X-Firebase-AppCheck": token({ sub: "debug-app" }),
        }), res);
        // Empty authoring data is rejected by the handler; a 400 proves the
        // request passed Auth + App Check transport verification first.
        expect(res.statusCode).toBe(400);
        expect(res.payload).toMatchObject({ error: { status: "INVALID_ARGUMENT" } });
    });
});
//# sourceMappingURL=v2_authoring_http_appcheck.emulator.test.js.map