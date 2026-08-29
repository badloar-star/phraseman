import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  shouldRunFullAppBootstrap,
  shouldInstallNativeTextRenderPatch,
  shouldUseNativeFirebaseTelemetry,
} from "../app/native_runtime_capability";
import { learningV2AuthoringDevicePreviewRowsV1 } from "../modules/learning-v2/preview/authoring_device_preview_v1";

assert.equal(
  shouldInstallNativeTextRenderPatch("web"),
  false,
  "React Native Text.render interception must never mutate a web CSSStyleDeclaration",
);
assert.equal(shouldInstallNativeTextRenderPatch("android"), true);
assert.equal(shouldInstallNativeTextRenderPatch("ios"), true);

assert.equal(
  shouldUseNativeFirebaseTelemetry("web", false),
  false,
  "Codex web preview must not request a native Firebase default app",
);
assert.equal(shouldUseNativeFirebaseTelemetry("android", false), true);
assert.equal(shouldUseNativeFirebaseTelemetry("ios", false), true);
assert.equal(shouldUseNativeFirebaseTelemetry("android", true), false);

assert.equal(
  shouldRunFullAppBootstrap("web", true, "/learning_v2_authoring_preview"),
  false,
  "the focused Codex picker must not warm unrelated production features",
);
assert.equal(
  shouldRunFullAppBootstrap(
    "web",
    true,
    "/learning-v2/session/lesson-01:session:02",
  ),
  false,
  "the focused Codex player must not warm unrelated production features",
);
assert.equal(shouldRunFullAppBootstrap("web", true, "/home"), true);
assert.equal(
  shouldRunFullAppBootstrap("web", false, "/learning_v2_authoring_preview"),
  true,
);
assert.equal(
  shouldRunFullAppBootstrap("android", true, "/learning_v2_authoring_preview"),
  true,
);

assert.deepEqual(
  learningV2AuthoringDevicePreviewRowsV1().map((row) => [
    row.sessionOrdinal,
    row.status,
    row.openable,
  ]),
  [
    [1, "LOCKED", true],
    [2, "DRAFT", true],
  ],
  "the Codex picker must expose the approved first session and current second session",
);

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { scripts?: Record<string, string> };
const codexPreviewCommand = packageJson.scripts?.["learning-v2:codex-preview"];
assert.ok(codexPreviewCommand, "the Codex preview needs one durable start command");
assert.match(codexPreviewCommand, /expo start --web/u);
assert.match(codexPreviewCommand, /--localhost/u);
assert.match(codexPreviewCommand, /--max-workers 1/u);
assert.match(codexPreviewCommand, /--port 8085/u);
assert.doesNotMatch(
  codexPreviewCommand,
  /--dev-client|--lan/u,
  "the Codex web preview must not accept simultaneous native bundle requests",
);

process.stdout.write("LEARNING V2 CODEX WEB PREVIEW RUNTIME: PASS\n");
