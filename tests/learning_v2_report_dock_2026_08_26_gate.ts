import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");
const practice = readFileSync(resolve(root, "app/learning_v2_direct_session_player_v1.tsx"), "utf8");
const intro = readFileSync(resolve(root, "app/learning_v2_session_intro.tsx"), "utf8");

for (const [name, source] of [["practice", practice], ["intro", intro]] as const) {
  const dock = source.indexOf("styles.reportDock");
  const footer = source.indexOf(name === "practice" ? "styles.footer," : "styles.bottomBar,");
  assert.ok(dock > 0, `${name}: report control must have a dedicated dock`);
  assert.ok(dock < footer, `${name}: report dock must sit immediately above the footer`);
  assert.match(
    source.slice(dock, footer),
    /bottom:\s*insets\.bottom\s*\+/,
    `${name}: report dock must follow the device bottom safe area`,
  );
  const styleBlock = source.slice(source.indexOf("reportDock:"), source.indexOf("reportDock:") + 120);
  assert.match(styleBlock, /right:\s*16/u, `${name}: report control must be bottom-right`);
  assert.ok(!/left:\s*16/u.test(styleBlock), `${name}: report control must not remain on the left`);
}

const practiceHeader = practice.slice(
  practice.indexOf("<View style={[styles.header"),
  practice.indexOf("<ScrollView", practice.indexOf("<View style={[styles.header")),
);
assert.ok(!practiceHeader.includes("<ReportErrorButton"), "practice flag must not remain in the header");

const introHeader = intro.slice(
  intro.indexOf("<View style={styles.header}>"),
  intro.indexOf("<View\n          style={styles.progressRow}"),
);
assert.ok(!introHeader.includes("<ReportErrorButton"), "intro flag must not remain in the header");

process.stdout.write("LEARNING V2 REPORT DOCK 2026-08-26 GATE: PASS\n");
