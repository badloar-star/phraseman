import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  horizonsCopy,
  horizonsReceiptCopy,
  horizonsCreditCopy,
} from "../components/learning-v2/horizons/copy";
import {
  HORIZON_ROUTES,
  horizonPalette,
  horizonChapter,
  horizonRoutePath,
} from "../components/learning-v2/horizons/model";
import {
  horizonLandscapeXml,
  horizonPortalXml,
} from "../components/learning-v2/horizons/art";

assert.equal(HORIZON_ROUTES.length, 7);
assert.equal(
  new Set(HORIZON_ROUTES.map((route) => JSON.stringify(route))).size,
  7,
);
for (let chapter = 1; chapter <= 7; chapter++) {
  const route = HORIZON_ROUTES[chapter - 1];
  assert.equal(route.length, 8);
  for (const [x, y] of route) {
    assert.ok(x >= 55 && x <= 330);
    assert.ok(y >= 55 && y <= 630);
  }
  assert.match(horizonRoutePath(chapter, 8), /^M/);
  assert.equal(horizonRoutePath(chapter, 0), "");
  const palette = horizonPalette(chapter);
  for (const xml of [
    horizonLandscapeXml(chapter, true),
    horizonPortalXml(chapter),
  ]) {
    assert.ok(xml.includes("<svg"));
    assert.ok(!xml.includes("var("));
    assert.ok(!xml.includes("undefined"));
    assert.ok(xml.includes(palette.accent));
  }
}
assert.equal(horizonChapter(1), 1);
assert.equal(horizonChapter(8), 1);
assert.equal(horizonChapter(9), 2);
assert.equal(horizonChapter(56), 7);
assert.deepEqual(horizonPalette(32), horizonPalette(4));
console.log(
  "HORIZONS PRESENTATION: PASS (7 routes, 14 SVGs, chapter boundaries)",
);

for (const lang of [
  "ru",
  "en",
  "uk",
  "es",
  "pt-BR",
  "vi",
  "id",
  "tr",
  "pl",
] as const) {
  for (const value of Object.values({
    ...horizonsCopy(lang),
    ...horizonsReceiptCopy(lang),
    ...horizonsCreditCopy(lang),
  }))
    assert.ok(typeof value === "string" && value.trim().length > 0);
}

const player = readFileSync("app/learning_v2_direct_session_player_v1.tsx", "utf8");
assert.match(player, /runes:\s*runeCommit\.appliedReceipt\.amountSubunits\s*\/\s*WALLET_SUBUNITS_PER_STAR/);
assert.match(player, /credit:\s*runeCommit\.status === "applied" \? "credited" : "existing"/);
assert.match(player, /entry\.disposition === "completed" && entry\.learnerAttempts <= 1/);
console.log("HORIZONS RECEIPT BINDING: PASS (canonical amount, fresh/replay distinction, 9 locales)");
