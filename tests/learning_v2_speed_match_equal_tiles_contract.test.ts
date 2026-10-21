import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// зачем (координатор §47, 2026-10-01): файл был сценарием из голых assert без единого
// test() — jest помечал его «must contain at least one test» и НИ ОДНА проверка не
// исполнялась. Тело обёрнуто в один test; вне jest (npx tsx) оно запускается напрямую.
// зачем (владелец 21.10, эталон speed-match-long-pairs.html, вариант 2): раскладка — ряды «слово 36 % + перевод на остаток»;
// плитки одного ряда одной высоты, длинный перевод переносится и не разводит колонки.
async function main(): Promise<void> {
const source = readFileSync("modules/learning-v2/modes/speed_match_mode_v1.tsx", "utf8");

assert.match(source, /tileFrame:\s*\{[\s\S]*?width:\s*"100%"/);
assert.match(source, /card:\s*\{[\s\S]*?width:\s*"100%"/);
// плитка пары от 64 dp (эталон `.grid3 .op { min-height: 64px }`) и растёт вместе с рядом
assert.match(source, /card:\s*\{[\s\S]*?flexGrow:\s*1[\s\S]*?minHeight:\s*64/);
assert.match(source, /compact\s*&&\s*styles\.cardCompact/);
// узкая колонка слов ровно 36 %, перевод — на остаток; ряд тянет обе плитки до одной высоты
assert.match(source, /frameLeft:\s*\{\s*width:\s*"36%"\s*\}/);
assert.match(source, /frameRight:\s*\{\s*flex:\s*1/);
assert.match(source, /row:\s*\{[^}]*flexDirection:\s*"row"[^}]*alignItems:\s*"stretch"/);
// перевод выровнен влево, слово — жирное по центру
assert.match(source, /cardRight:\s*\{[^}]*alignItems:\s*"flex-start"/);
assert.match(source, /cardTextRight:\s*\{\s*textAlign:\s*"left"/);
assert.match(source, /cardTextLeft:\s*\{\s*fontWeight:\s*"700"/);
// две независимые колонки возвращать нельзя: именно они разъезжались по высоте
assert.doesNotMatch(source, /column:\s*\{\s*flex:\s*1/);
// текст не сжимаем, только переносим
assert.doesNotMatch(source, /adjustsFontSizeToFit/);

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
