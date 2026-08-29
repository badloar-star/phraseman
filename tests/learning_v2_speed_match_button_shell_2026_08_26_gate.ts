import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");
const source = readFileSync(
  resolve(root, "modules/learning-v2/modes/speed_match_mode_v1.tsx"),
  "utf8",
);

const cardStyle = source.match(/card:\s*\{([\s\S]*?)\n\s*\},\n\s*cardText:/u)?.[1];

assert.ok(cardStyle, "Speed Match must keep a dedicated word-button style");
assert.match(
  cardStyle,
  /alignSelf:\s*"center"/u,
  "word buttons must shrink to their own content instead of stretching an outer shell across the column",
);
assert.match(
  cardStyle,
  /backgroundColor:\s*"transparent"/u,
  "the Speed Match wrapper must not paint a gray container around the word button",
);
assert.match(
  cardStyle,
  /paddingBottom:\s*0/u,
  "the Speed Match wrapper must not leave a separate shelf outside the word button",
);

process.stdout.write("LEARNING V2 SPEED MATCH BUTTON SHELL GATE: PASS\n");
