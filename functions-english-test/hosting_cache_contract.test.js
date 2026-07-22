const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const firebaseConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "firebase.json"), "utf8"),
);

test("knowly hosting applies a no-store API rule after the preserved global static cache rule", () => {
  const hosting = firebaseConfig.hosting.find(
    (entry) => entry.target === "knowlywww",
  );
  assert.ok(hosting, "knowlywww hosting target is missing");
  const rules = hosting.headers || [];
  const cacheValue = (rule) =>
    rule.headers?.find((header) => header.key.toLowerCase() === "cache-control")
      ?.value;
  const globalIndex = rules.findIndex(
    (rule) =>
      rule.source === "**" &&
      cacheValue(rule) === "public, max-age=0, must-revalidate",
  );
  const apiIndex = rules.findIndex(
    (rule) =>
      rule.source === "/api/english-test" && cacheValue(rule) === "no-store",
  );
  assert.ok(globalIndex >= 0, "global static cache rule must be preserved");
  assert.ok(
    apiIndex > globalIndex,
    "specific API no-store rule must follow the global rule",
  );
});
