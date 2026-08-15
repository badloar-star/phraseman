import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Learning V2 released completion inbox rules", () => {
  test("the server-only inbox has an explicit client deny rule", () => {
    const rules = readFileSync(
      resolve(process.cwd(), "firestore.rules"),
      "utf8",
    );

    expect(rules).toMatch(
      /match \/users\/\{uid\}\/v2_activity_released_completion_inbox\/\{docId\} \{\s*allow read, write: if false;\s*\}/u,
    );
    expect(rules).toMatch(
      /match \/users\/\{uid\}\/v2_activity_released_submission_inbox\/\{docId\} \{\s*allow read, write: if false;\s*\}/u,
    );
    expect(rules).toMatch(
      /match \/users\/\{uid\}\/v2_activity_released_settlement_decisions\/\{docId\} \{\s*allow read, write: if false;\s*\}/u,
    );
  });

  test("the server evaluator release pointer is excluded from browser-admin access", () => {
    const rules = readFileSync(
      resolve(process.cwd(), "firestore.rules"),
      "utf8",
    );

    expect(rules).toContain("activity_server_evaluator_release");
    expect(rules).toMatch(
      /match \/content_v2_activity_server_evaluator_release_pointers\/\{docId\} \{\s*allow read, write: if false;\s*\}/u,
    );
  });
});
