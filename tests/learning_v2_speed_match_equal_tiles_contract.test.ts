import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// зачем (координатор §47, 2026-10-01): файл был сценарием из голых assert без единого
// test() — jest помечал его «must contain at least one test» и НИ ОДНА проверка не
// исполнялась. Тело обёрнуто в один test; вне jest (npx tsx) оно запускается напрямую.
async function main(): Promise<void> {
const source = readFileSync("modules/learning-v2/modes/speed_match_mode_v1.tsx", "utf8");

assert.match(source, /tileFrame:\s*\{[\s\S]*?width:\s*"100%"/);
assert.match(source, /card:\s*\{[\s\S]*?width:\s*"100%"/);
// зачем (learning-v2.html, `.mc`): плитка пары от 72 dp (раньше 58) — обновлено при переносе на Liquid Glass.
assert.match(source, /card:\s*\{[\s\S]*?minHeight:\s*72/);
assert.match(source, /compact\s*&&\s*styles\.cardCompact/);

console.log("LEARNING V2 SPEED MATCH EQUAL TILES CONTRACT: PASS");
}

if (typeof test === "function") {
  test("learning_v2_speed_match_equal_tiles_contract", main);
} else {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
