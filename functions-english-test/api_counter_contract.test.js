const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");

test("GET public counter returns only ok/completed and disables caching", () => {
  assert.match(source, /req\.method === 'GET'/);
  assert.match(source, /Cache-Control['"],\s*['"]no-store/);
  assert.match(source, /readCompletedCount\(db\)/);
  assert.match(source, /json\(\{\s*ok:\s*true,\s*completed\s*\}\)/);
});

test("count_complete is handled independently before analytics token and clientHash validation", () => {
  const branch = source.indexOf("action === 'count_complete'");
  const analyticsToken = source.indexOf("const token =");
  const analyticsClient = source.indexOf("const clientHash =");
  assert.ok(branch >= 0, "count_complete branch is missing");
  assert.ok(
    branch < analyticsToken,
    "count_complete must not depend on attempt analytics token validation",
  );
  assert.ok(
    branch < analyticsClient,
    "count_complete must not depend on clientHash",
  );
  assert.match(source, /ipAddress:\s*getTrustedExternalClientIp\(req\)/);
});

test("POST body limit is enforced from rawBody bytes rather than trusting Content-Length", () => {
  assert.match(source, /requestBodyByteLength\(req\)/);
  assert.doesNotMatch(source, /parseInt\(req\.headers\['content-length'\]/);
});
