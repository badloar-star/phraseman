import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("modules/learning-v2/modes/speed_match_mode_v1.tsx", "utf8");

assert.match(source, /tileFrame:\s*\{[\s\S]*?width:\s*"100%"/);
assert.match(source, /card:\s*\{[\s\S]*?width:\s*"100%"/);
// зачем (learning-v2.html, `.mc`): плитка пары от 72 dp (раньше 58) — обновлено при переносе на Liquid Glass.
assert.match(source, /card:\s*\{[\s\S]*?minHeight:\s*72/);
assert.match(source, /compact\s*&&\s*styles\.cardCompact/);

console.log("LEARNING V2 SPEED MATCH EQUAL TILES CONTRACT: PASS");
