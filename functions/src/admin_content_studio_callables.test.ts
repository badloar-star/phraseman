import { readFileSync } from "node:fs";
import path from "node:path";
import { EventEmitter } from "node:events";
import {
  adminSaveV2EpisodeDraft,
  adminSaveV2SeasonDraft,
  adminArchiveV2ModeTemplate,
  adminValidateV2EpisodeRevision,
  adminReviewV2EpisodeRevision,
  adminIssueV2ContentGate,
  adminIssueV2EpisodeValidationReceipt,
  adminIssueV2EpisodeLocalizationReceipt,
  adminIssueV2EpisodeVoiceReceipt,
} from "./admin_content_studio_callables";

describe("V2 Content Studio callable exports", () => {
  it("exports both server-only mutation endpoints", () => {
    expect(adminSaveV2EpisodeDraft).toBeDefined();
    expect(adminSaveV2SeasonDraft).toBeDefined();
    expect(adminArchiveV2ModeTemplate).toBeDefined();
    expect(adminValidateV2EpisodeRevision).toBeDefined();
    expect(adminReviewV2EpisodeRevision).toBeDefined();
    expect(adminIssueV2ContentGate).toBeDefined();
    expect(adminIssueV2EpisodeValidationReceipt).toBeDefined();
    expect(adminIssueV2EpisodeLocalizationReceipt).toBeDefined();
    expect(adminIssueV2EpisodeVoiceReceipt).toBeDefined();
  });

  it("fails closed on App Check unless an explicit local override is set", () => {
    const source = readFileSync(
      path.resolve(__dirname, "admin_content_studio_callables.ts"),
      "utf8",
    );
    expect(source).toContain(
      'process.env.ENFORCE_APP_CHECK_CONTENT_STUDIO !== "false"',
    );
  });

  it("uses the real callable HTTP wrapper and rejects a request with no tokens", async () => {
    const request = {
      method: "POST",
      body: { data: {} },
      headers: { "content-type": "application/json" },
      header(name: string) {
        return this.headers[name.toLowerCase() as "content-type"];
      },
    };
    const response = new EventEmitter() as EventEmitter & {
      statusCode?: number;
      payload?: unknown;
      headersSent?: boolean;
      status(code: number): typeof response;
      send(body: unknown): typeof response;
      setHeader(): void;
      getHeader(): undefined;
      removeHeader(): void;
      end(): void;
      write(): boolean;
    };
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

    await adminSaveV2EpisodeDraft(request as never, response as never);
    expect(response.statusCode).toBe(401);
    expect(response.payload).toMatchObject({
      error: { status: "UNAUTHENTICATED" },
    });
  });
});
