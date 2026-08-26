import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const sha256 = (value: string | Buffer): string =>
  createHash("sha256").update(value, "utf8").digest("hex");

const modeMockups = [
  "02-phrase-builder.html",
  "03-listen-choose.html",
  "05-listen-build.html",
  "06-context-gap.html",
  "07-speed-match.html",
  "14-repeat-compare.html",
] as const;

for (const filename of modeMockups) {
  const html = read(`docs/v2/mockups/${filename}`);
  assert.ok(
    html.includes('data-session-attempts-hud="true"'),
    `${filename} must show the shared attempts HUD`,
  );
  assert.equal(
    (html.match(/data-attempt-heart=/g) ?? []).length,
    3,
    `${filename} must render exactly three visual hearts`,
  );
  assert.ok(
    html.includes('aria-label="3 попытки из 3"'),
    `${filename} must call the resource attempts in accessibility copy`,
  );
  assert.ok(
    !html.includes("Попытка потеряна"),
    `${filename} must not add a lost-attempt toast`,
  );
  assert.match(sha256(html), /^[0-9a-f]{64}$/u);
}

const modals = read("docs/v2/mockups/23-modals-states.html");
for (const state of [
  "attempts-empty-no-gift",
  "attempts-empty-with-gift",
  "attempts-empty-insufficient-runes",
  "attempts-empty-busy",
]) {
  assert.ok(
    modals.includes(`data-attempts-modal-state="${state}"`),
    `modal catalog must include ${state}`,
  );
}
assert.ok(modals.includes("Попытки закончились"));
assert.ok(modals.includes("Восстановить все 3 попытки"));
assert.ok(modals.includes("25 рун"));
assert.ok(modals.includes("Второй шанс"));
assert.ok(modals.includes("Завершить сессию"));
assert.ok(!modals.includes("Попытка потеряна"));

const index = read("docs/v2/mockups/index.html");
assert.ok(
  index.includes("Попытки и восстановление"),
  "mockup index must expose the attempts flow",
);

type GoldenCapture = {
  png: string;
  pngSha256: string;
  html: string;
  htmlSha256: string;
  theme: string;
  state: string;
};
type GoldenManifest = {
  ownerPhoneViewport: { width: number; height: number };
  captures: GoldenCapture[];
  motionReceipt: { file: string; sha256: string };
};

const fixtureRoot = "tests/fixtures/learning-v2/session-attempts";
const manifest = JSON.parse(
  read(`${fixtureRoot}/manifest.json`),
) as GoldenManifest;
assert.deepEqual(manifest.ownerPhoneViewport, { width: 390, height: 800 });

const requiredCaptures = [
  ...modeMockups.map((filename) => filename.replace(".html", ".png")),
  "modal-without-gift.png",
  "modal-with-gift.png",
] as const;
for (const png of requiredCaptures) {
  assert.ok(
    manifest.captures.some((capture) => capture.png === png),
    `golden manifest is missing ${png}`,
  );
}

for (const capture of manifest.captures) {
  const pngBytes = readFileSync(resolve(root, fixtureRoot, capture.png));
  assert.equal(
    sha256(pngBytes),
    capture.pngSha256,
    `${capture.png} golden hash drifted`,
  );
  const html = read(capture.html);
  assert.equal(
    sha256(html),
    capture.htmlSha256,
    `${capture.png} is stale against ${capture.html}`,
  );
  assert.ok(capture.theme.length > 0 && capture.state.length > 0);
}

const receiptBytes = readFileSync(
  resolve(root, fixtureRoot, manifest.motionReceipt.file),
);
assert.equal(sha256(receiptBytes), manifest.motionReceipt.sha256);

console.log("LEARNING V2 SESSION ATTEMPTS MOCKUP GATE: PASS");
