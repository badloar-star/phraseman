import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  LEARNING_V2_TASK_TITLES, LEARNING_V2_TASK_TITLE_ICONS, LEARNING_V2_TASK_TITLE_KINDS,
} from "../components/learning-v2/learning_v2_task_titles";

// зачем (вердикт «Сверки» 21.10, одобренный макет learning-v2-tasks-review.html): общая оболочка заданий V2 — название «значок + одно жирное название»,
// HUD из трёх таблеток, подвал со «Словами» без бейджа; «Найди пары» без второго большого заголовка. Контракт ловит возврат прежней раскладки.
async function main(): Promise<void> {
  // названия: ровно шесть типов, на каждом 9 языков, русский — дословно из макета
  assert.deepEqual([...LEARNING_V2_TASK_TITLE_KINDS].sort(), ["build_phrase", "fill_gap", "listen_build", "listen_choose", "match_pairs", "speak"]);
  for (const kind of LEARNING_V2_TASK_TITLE_KINDS) {
    const nine = LEARNING_V2_TASK_TITLES[kind];
    assert.equal(nine.length, 9, `${kind}: 9 языков`);
    for (const text of nine) assert.ok(text.trim().length > 0, `${kind}: пустой текст`);
    assert.ok(LEARNING_V2_TASK_TITLE_ICONS[kind], `${kind}: нет значка`);
  }
  assert.deepEqual(
    LEARNING_V2_TASK_TITLES.listen_choose[0] + "|" + LEARNING_V2_TASK_TITLES.listen_build[0] + "|" + LEARNING_V2_TASK_TITLES.build_phrase[0] + "|" + LEARNING_V2_TASK_TITLES.fill_gap[0] + "|" + LEARNING_V2_TASK_TITLES.match_pairs[0] + "|" + LEARNING_V2_TASK_TITLES.speak[0],
    "Послушай и выбери|Послушай и собери|Собери фразу|Вставь слово|Найди пары|Скажи вслух",
  );
  assert.deepEqual(
    [LEARNING_V2_TASK_TITLE_ICONS.listen_choose, LEARNING_V2_TASK_TITLE_ICONS.listen_build, LEARNING_V2_TASK_TITLE_ICONS.build_phrase, LEARNING_V2_TASK_TITLE_ICONS.fill_gap, LEARNING_V2_TASK_TITLE_ICONS.match_pairs, LEARNING_V2_TASK_TITLE_ICONS.speak],
    ["ear-outline", "headset-outline", "extension-puzzle-outline", "create-outline", "swap-horizontal-outline", "mic"], // зачем (Сверка 22.10, №23): значки макета контурные
  );

  const chrome = readFileSync("components/learning-v2/LearningV2TaskChrome.tsx", "utf8");
  // крестик — круглая плита, не прозрачный значок; полоска — токен «заметной дорожки», не opaqueControl
  assert.match(chrome, /close:\s*\{[^}]*borderRadius:\s*T\.close\.size \/ 2/);
  assert.match(chrome, /lv2TaskTrackColor\(g\)/);
  // «Слова» — стопка без кружка-счётчика
  assert.match(chrome, /name="albums"/);
  assert.doesNotMatch(chrome, /Badge|badge/);
  // таблетки HUD: красное сердце — токен темы (bad), не белое
  assert.match(chrome, /iconTone === 'bad' \? g\.bad : g\.text/);
  // никаких обводок и сжатия шрифта
  assert.doesNotMatch(chrome, /borderWidth|borderColor|adjustsFontSizeToFit/);

  const tokens = readFileSync("components/learning-v2/learning_v2_task_layout_tokens.ts", "utf8");
  for (const name of ["LV2_TASK_LAYOUT", "lv2TaskPlateStyle", "lv2TaskTileRelief", "lv2TaskTrackColor", "lv2TaskTitleTileColor"]) {
    assert.ok(tokens.includes(`export ${name === "LV2_TASK_LAYOUT" ? "const" : "function"} ${name}`), `нет экспорта ${name}`);
  }

  // «Найди пары»: одно название со значком, прежние два заголовка убраны
  const sm = readFileSync("modules/learning-v2/modes/speed_match_mode_v1.tsx", "utf8");
  assert.match(sm, /<LearningV2TaskTitle[\s\S]*?match_pairs/);
  assert.doesNotMatch(sm, /sx\.hero/);
  assert.doesNotMatch(sm, /sx\.taskLabel/);
  assert.match(sm, /round\.timerEnabled\s*\?\s*<View/, "таймер — в строке названия, и без таймера он не рисуется");

  console.log("LEARNING V2 TASK CHROME CONTRACT: PASS");
}

if (typeof test === "function") {
  test("learning_v2_task_chrome_contract", main);
} else {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
