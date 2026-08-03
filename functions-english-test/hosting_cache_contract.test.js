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

test("level-test assets use one release stamp and bank URLs use each bankVersion", () => {
  const clientDir = path.join(__dirname, "..", "knowly-www", "english-level-test");
  const html = fs.readFileSync(path.join(clientDir, "index.html"), "utf8");
  const i18n = fs.readFileSync(path.join(clientDir, "i18n.js"), "utf8");
  const releaseStamp = "20260803-1";
  for (const asset of ["styles.css", "engine.js", "i18n.locales.js", "i18n.js", "certificate.js", "app.js"]) {
    assert.match(html, new RegExp(`\\./${asset.replaceAll('.', '\\.') }\\?v=${releaseStamp}`));
  }
  assert.match(html, /\/assets\/site-background\.css\?v=20260729-1/);
  for (const language of ["en", "de", "fr", "it", "es"]) {
    const bank = JSON.parse(fs.readFileSync(path.join(clientDir, "data", `questions.${language}.json`), "utf8"));
    assert.match(i18n, new RegExp(`questions\\.${language}\\.json\\?v=${bank.bankVersion.replaceAll('.', '\\.')}['\"]`));
  }
});
