// зачем (владелец 2026-09-30): весь Learning V2 переносится 1 в 1 по макету learning-v2.html
// (Liquid Glass). Сторож не даёт вернуть старую палитру и запретные приёмы: каждый затронутый файл
// обязан брать цвета из токенов стекла (LearningV2Glass / liquidGlassTokens), не сжимать шрифт
// (adjustsFontSizeToFit), не обрезать текст (numberOfLines) и не показывать XP / жемчуг.
// Запуск: node --test tests/learning_v2_liquid_glass_source_contract.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

/** Файлы, целиком переведённые на токены стекла. */
const GLASS_FILES = [
  "components/learning-v2/LearningV2Glass.tsx",
  "modules/learning-v2/modes/phrase_builder_mode_v1.tsx",
  "modules/learning-v2/modes/listen_choose_mode_v1.tsx",
  "modules/learning-v2/modes/listen_build_dictation_mode_v1.tsx",
  "modules/learning-v2/modes/context_gap_grammar_mode_v1.tsx",
  "modules/learning-v2/modes/speed_match_mode_v1.tsx",
  "modules/learning-v2/modes/scripted_repeat_compare_mode_v1.tsx",
  "app/learning_v2_direct_session_player_v1.tsx",
  "app/learning_v2_session_intro.tsx",
  "app/learning-v2/session/[id].tsx",
  "components/EnergyBar.tsx",
  "components/learning-v2/LearningV2WordPocketOverlayV1.tsx",
  "components/learning-v2/LearningV2LessonDictionaryOverlayV1.tsx",
  "components/learning-v2/LearningV2NewWordEncounterOverlay.tsx",
  "components/learning-v2/LearningV2ChaptersCourse.tsx",
  "components/LearningV2SessionOutcomeSheet.tsx",
  "components/learning-v2/horizons/HorizonSessionResult.tsx",
  "components/learning-v2/horizons/HorizonMistakeReview.tsx",
  "components/learning-v2/horizons/HorizonResultGlass.tsx",
];

const TOKEN_MARKER = /useLv2Glass|liquidGlassTokens|LearningV2Glass/u;

for (const file of GLASS_FILES) {
  test(`${file}: токены Liquid Glass, без сжатия шрифта, обрезки и XP`, () => {
    const source = read(file);
    assert.match(source, TOKEN_MARKER, "файл обязан брать цвета из токенов стекла");
    assert.doesNotMatch(source, /adjustsFontSizeToFit/u, "сжимать шрифт нельзя — только перенос/вёрстка");
    assert.doesNotMatch(source, /numberOfLines/u, "обрезать текст нельзя — он переносится");
    assert.doesNotMatch(source, /\bXP\b|жемчуг|pearl/iu, "XP и жемчуг удалены и не показываются");
  });
}

test("набор LearningV2Glass: цвета вердикта из макета и хаптик только на кнопке", () => {
  const kit = read("components/learning-v2/LearningV2Glass.tsx");
  assert.match(kit, /LV2_GOOD = '#6FD08C'/u);
  assert.match(kit, /LV2_BAD = '#F2766B'/u);
  assert.match(kit, /liquidGlassTokens\(liquidGlassThemeId\)/u, "цвета берутся у активной темы");
  for (const part of ["Lv2Chip", "Lv2Option", "Lv2Cta", "Lv2Explain"]) {
    assert.match(kit, new RegExp(`export const ${part}\\b`, "u"), `${part} экспортируется`);
  }
});

test("шесть режимов занятия не тянут старые арена-примитивы", () => {
  for (const file of GLASS_FILES.filter((f) => f.includes("modules/learning-v2/modes/"))) {
    const source = read(file);
    assert.doesNotMatch(source, /components\/ui\/v2_ui|useTournamentPalette/u, `${file}: арена-палитра`);
  }
});

test("тост «Урок ещё в работе» на плите стекла", () => {
  const lessons = read("app/(tabs)/lessons.tsx");
  assert.match(lessons, /backgroundColor: learnGlass\.opaqueControl,\s*borderRadius: 18/u);
});

test("не тронуты запретные зоны: загрузка сессий, мост, потолок, энергия, награды", () => {
  const player = read("app/learning_v2_direct_session_player_v1.tsx");
  // Эти вызовы обязаны остаться: правка была только про внешний вид.
  for (const marker of [
    "consumeLearningV2CourseSessionReadyHandoffV3",
    "evaluateLearningV2CourseSessionDeviceInteractionV1",
    "useEnergySessionIntent",
    "commitLearningV2SessionRuneRewardCompositeV1",
  ]) {
    assert.ok(player.includes(marker), `плеер потерял ${marker}`);
  }
});

test("итог занятия: LG-ядро HorizonResultGlass по макету «Итог занятия»", () => {
  const result = read("components/learning-v2/horizons/HorizonSessionResult.tsx");
  const core = read("components/learning-v2/horizons/HorizonResultGlass.tsx");
  // Общий ResultsSequence остаётся другим экранам; Learning V2 рисует своё LG-ядро.
  assert.match(result, /from "\.\/HorizonResultGlass"/u);
  assert.doesNotMatch(result, /feedback\/ResultsSequence/u);
  // Карточка «верно · ошибок · точность», начисление, «Что вы теперь умеете».
  assert.match(result, /labels=\{\{ correct: c\.correct, wrong: c\.wrong, accuracy: c\.accuracy \}\}/u);
  assert.match(result, /skillsTitle=\{checkpoint\.outcomeTitle\}/u);
  // Повтор не начисляет: показываем только подтверждённый кошельком факт.
  assert.match(result, /facts\.credit === "credited"/u);
  // Движение на UI-треде и с учётом reduceMotion.
  assert.match(core, /from "react-native-reanimated"/u);
  assert.match(core, /reducedMotion/u);
  assert.doesNotMatch(core, /AsyncStorage/u, "празднование не durable");
});

test("боевая карта «Главы»: раскрытие карты и прохождение узла с полётом монет", () => {
  const map = read("components/learning-v2/LearningV2ChaptersCourse.tsx");
  // Узел — общий LearningV2MapNode: посадка 1.08 → 1, выстрел следующего .7 → 1.1 → 1, гало.
  assert.match(map, /<LearningV2MapNode/u);
  assert.match(map, /onCompletedTransition=\{handleNodeCompleted\}/u);
  // Монеты летят с узла в чип баланса (три монеты, как в макете).
  assert.match(map, /<CoinRewardFlight/u);
  assert.match(map, /const NODE_FLIGHT_COINS = 3/u);
  // Раскрытие: 6 px подъём, 150 мс, каскад; только один раз за жизнь экрана и не при reduceMotion.
  assert.match(map, /function Lv2Reveal/u);
  assert.match(map, /const \[introReveal\] = useState\(\(\) => !props\.reducedMotion\)/u);
  const lessons = read("app/(tabs)/lessons.tsx");
  assert.match(lessons, /coinTargetRef=\{learningV2CoinTargetRef\}/u);
});
