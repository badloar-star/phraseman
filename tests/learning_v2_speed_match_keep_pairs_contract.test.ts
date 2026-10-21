import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// зачем (баг «Сверки» 21.10): после «Время вышло» кнопка «Продолжить без таймера» сбрасывала все уже собранные пары.
// «Ещё раунд» — новый раунд (пары сбрасываются), «Продолжить без таймера» — только снимает таймер, найденные пары остаются.
// Журнал [V2-PAIRS] показывает, какая ветка сработала и что было до/после.
async function main(): Promise<void> {
  const source = readFileSync("modules/learning-v2/modes/speed_match_mode_v1.tsx", "utf8");

  // две кнопки — две разные ветки
  assert.match(source, /onPress=\{\(\) => restartRound\(true, false\)\}/, "«Ещё раунд» — новый раунд, пары сбрасываются");
  assert.match(source, /onPress=\{\(\) => restartRound\(false, true\)\}/, "«Продолжить без таймера» — пары сохраняются");

  // сброс собранных пар — только в ветке нового раунда
  const body = source.slice(source.indexOf("const restartRound = useCallback("), source.indexOf("const announcedRef"));
  assert.match(body, /if \(keepMatched\) \{[\s\S]*?\} else \{[\s\S]*?setMatchedPairIds\(new Set\(\)\);[\s\S]*?\}/, "setMatchedPairIds(new Set()) только когда keepMatched=false");
  assert.equal((body.match(/setMatchedPairIds\(new Set\(\)\)/g) ?? []).length, 1, "ровно одно место сброса собранных пар в restartRound");

  // журнал причины
  for (const mark of ["[V2-PAIRS] restart: вход", "[V2-PAIRS] restart: пары СОХРАНЕНЫ", "[V2-PAIRS] restart: пары СБРОШЕНЫ", "[V2-PAIRS] timer: время вышло"]) {
    assert.ok(source.includes(mark), `нет записи журнала: ${mark}`);
  }

  console.log("LEARNING V2 SPEED MATCH KEEP PAIRS CONTRACT: PASS");
}

if (typeof test === "function") {
  test("learning_v2_speed_match_keep_pairs_contract", main);
} else {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
