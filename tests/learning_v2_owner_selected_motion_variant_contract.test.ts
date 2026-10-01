import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// зачем (координатор §47, 2026-10-01): файл был сценарием из голых assert без единого
// test() — jest помечал его «must contain at least one test» и НИ ОДНА проверка не
// исполнялась. Тело обёрнуто в один test; вне jest (npx tsx) оно запускается напрямую.
async function main(): Promise<void> {
const map = readFileSync("components/learning-v2/LearningV2PulseCourse.tsx", "utf8");
const modal = readFileSync("components/LearningV2SessionOutcomeSheet.tsx", "utf8");

// зачем (координатор §47, 2026-10-01): строка вхождения переименована
// (LearningV2PulseMapEntryAnimated, мемо — аудит 20.09); прорисовка пути (stroke 900,
// 580 мс) ушла с редизайном карты 30.09; вступление 420 мс играет ОДИН раз за жизнь
// экрана (владелец 20.09: «экран при входе моргает»). Выбранная владельцем каскадная
// пружина строк (сдвиг 18, масштаб 0.76→1, задержка по расстоянию) — в силе.
assert.match(map, /function LearningV2PulseMapEntryAnimated/);
assert.match(map, /Math\.abs\(index - currentRowIndex\)/);
assert.match(map, /translateY: \(1 - localProgress\) \* 18/);
assert.match(map, /scale: 0\.76 \+ localProgress \* 0\.24/);
assert.match(map, /if \(entryPlayed\.current\) return;/);
assert.match(map, /mapEntry\.value = withTiming\(1, \{ duration: 420/);
assert.doesNotMatch(map, /onScroll=\{/,
  "the map entrance must stay on the UI thread and must not add JS scroll work");

assert.match(modal, /duration: 320/);
assert.match(modal, /translateY: \(1 - cardProgress\.value\) \* 18/);
assert.match(modal, /scale: 0\.96 \+ cardProgress\.value \* 0\.04/);
assert.match(modal, /sceneProgress\.value = withDelay\(90/);
assert.match(modal, /cardProgress\.value = withTiming\(0/,
  "the whole session modal must animate out before it unmounts");

console.log("LEARNING V2 OWNER-SELECTED MOTION VARIANT CONTRACT: PASS");
}

if (typeof test === "function") {
  test("learning_v2_owner_selected_motion_variant_contract", main);
} else {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
