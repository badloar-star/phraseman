import fs from "node:fs";
import path from "node:path";

const readSource = (...segments: readonly string[]): string =>
  fs.readFileSync(path.join(process.cwd(), ...segments), "utf8");

describe("Admin V2 lesson-stage foundation transfer", () => {
  it("keeps the first lesson-stage path callable-only, review-governed, and additive", () => {
    const adminCore = readSource("admin", "v2", "scripts", "admin-core.js");
    const adminFirebase = readSource(
      "admin",
      "v2",
      "scripts",
      "admin-firebase.js",
    );
    const generator = readSource(
      "admin",
      "v2",
      "scripts",
      "pages",
      "content-generator.js",
    );
    const controller = readSource(
      "admin",
      "v2",
      "scripts",
      "content-factory",
      "controller.js",
    );
    const state = readSource(
      "admin",
      "v2",
      "scripts",
      "content-factory",
      "state.js",
    );
    const stageRenderers = readSource(
      "admin",
      "v2",
      "scripts",
      "content-factory",
      "stage-renderers.js",
    );
    const stages = readSource("functions", "src", "admin_content_stages.ts");
    const worker = readSource("functions", "src", "content_stage_worker.ts");

    expect(adminCore).toContain("content-generator");
    expect(generator).toContain("createContentStage");
    expect(generator).toContain("runContentStage");
    expect(generator).toContain("previewContentStage");
    expect(generator).toContain("reviewContentStage");
    expect(generator).not.toMatch(/\b(?:setDoc|addDoc|updateDoc|deleteDoc)\s*\(/);
    expect(adminFirebase).toContain("adminGetContentStageCapabilities");
    expect(adminFirebase).toContain("adminCreateContentStage");
    expect(adminFirebase).toContain("adminListContentStages");
    expect(controller).toContain("getContentStageCapabilities");
    expect(state).toContain("nextCursor");
    expect(stageRenderers).toContain("preview");
    expect(stages).toContain("content.review");
    expect(stages).toContain("reviewFingerprint");
    expect(stages).toContain("reason");
    expect(stages).toContain("audit");
    expect(stages).toContain("contentHash");
    expect(worker).toContain("writeImmutableObject");
    expect(worker).toContain("retry");
  });
});
