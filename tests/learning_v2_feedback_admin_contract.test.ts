import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const client = readFileSync("app/feedback_client.ts", "utf8");
const result = readFileSync(
  "components/learning-v2/horizons/HorizonSessionResult.tsx",
  "utf8",
);
const server = readFileSync("functions/src/feedback_entries.ts", "utf8");
const alerts = readFileSync(
  "functions/src/admin_alert_sources_ratings.ts",
  "utf8",
);
const admin = readFileSync("admin/v2/legacy.html", "utf8");

assert.match(client, /'learning_v2'/);
assert.match(result, /kind="learning_v2"/);
assert.match(server, /FEEDBACK_KINDS\s*=\s*\[[\s\S]{0,260}'learning_v2'/);
assert.match(alerts, /learning_v2:\s*\{\s*eventType:\s*'lessonRating',\s*category:\s*'Learning V2'/);
assert.match(admin, /data-feedback-kind="learning_v2"/);
assert.match(admin, /learning_v2:\s*'[^']*Learning V2'/);

console.log("LEARNING V2 FEEDBACK ADMIN CONTRACT: PASS");
