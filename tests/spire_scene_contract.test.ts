import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  SPIRE_SCENE_EVE_MS, SPIRE_SCENE_V2_ENABLED, buildSpireSceneCopy, pickSpireSceneState, spireSceneLeft, spireSceneRoom, type SpireSceneInput,
} from "../components/spire/scene/spire_scene_model";
import { SPIRE_SCENE_PREVIEW_ROOM, SPIRE_SCENE_PREVIEW_STATES, isSpireScenePreviewState, spireScenePreviewSetup } from "../components/spire/scene/spire_scene_preview_fixtures";
import { SPIRE_SCENE_STRINGS, spireScenePromoText } from "../components/spire/scene/spire_scene_strings";

// зачем (владелец 22.10 выбрал Пик V2 «Пьедестал перед башней», эталон docs/design/v2-app/peak-scene-v2.html под замком 3ea39f80c):
// сторож «Сцены» Пика — приоритет входа по таблице эталона (ищем комнату → неделя кончается → нет энергии → обычный день, «Нет сети» —
// строкой поверх), место и «до повышения» той же сортировкой и зонами, что «Все участники», тексты дословно как в эталоне, 9 языков,
// моки dev-входа через настоящую функцию, dev-вход в релизе уводит на Главную и вырезан из стор-бандла, башня и кнопка — в режиме «Сцены».
const read = (rel: string): string => readFileSync(rel, "utf8").replace(/\r\n/g, "\n");
const H = 3_600_000;
const D = 24 * H;
const nb = " ";
const base: SpireSceneInput = { roomSearching: false, msLeft: 2 * D, placesToPromo: 2, plus: false, energy: 3, offline: false };
const pick = (o: Partial<SpireSceneInput>) => pickSpireSceneState({ ...base, ...o });

async function main(): Promise<void> {
  // ── приоритет входа ──
  assert.equal(pick({}).state, "day");
  assert.equal(pick({ roomSearching: true, msLeft: 1000, energy: 0 }).state, "search", "подбор комнаты важнее всего");
  assert.equal(pick({ msLeft: SPIRE_SCENE_EVE_MS - 1 }).state, "eve");
  assert.equal(pick({ msLeft: SPIRE_SCENE_EVE_MS }).state, "day", "ровно 6 ч — ещё не вечер");
  assert.equal(pick({ msLeft: 1000, placesToPromo: 0 }).state, "day", "уже в зоне повышения — не «неделя кончается»");
  assert.equal(pick({ msLeft: 1000, placesToPromo: null }).state, "day", "своё место неизвестно — не «неделя кончается»");
  assert.equal(pick({ msLeft: 1000, energy: 0 }).state, "eve", "вечер важнее «нет энергии» (кнопка всё равно «Играть через N»)");
  assert.equal(pick({ energy: 0 }).state, "zero");
  assert.equal(pick({ energy: 0, plus: true }).state, "day", "у Plus «нет энергии» не бывает");
  assert.equal(pick({ energy: null }).state, "day", "энергия неизвестна — не «нет энергии»");
  const off = pick({ offline: true });
  assert.equal(off.state, "day");
  assert.equal(off.offlineLine, true, "«Нет сети» — строкой поверх состояния");
  assert.match(pick({ energy: 0 }).reason, /energy=0/, "причина решения — значения");

  // ── комната: место и «до повышения» ──
  const room = spireSceneRoom(SPIRE_SCENE_PREVIEW_ROOM, "coins");
  assert.equal(room.count, 30);
  assert.equal(room.myPlace, 7, "Денис — 7-е место по монетам недели");
  assert.equal(room.placesToPromo, 2, "до зоны повышения (5 лучших) — 2 места");
  assert.deepEqual(room.top.map((m) => m.name), ["Аня", "Марк", "Тимур"]);
  assert.deepEqual({ ...spireSceneRoom(null) }, { top: [], myPlace: null, placesToPromo: null, count: 0 });

  // ── тексты дословно как в эталоне (раздел V2) ──
  const facts = { tierName: "Гранит", msLeft: 2 * D + 14 * H, floor: 4, stepDone: 7, stepTotal: 8, perStep: 10, floorCoins: 40, placesToPromo: 2 };
  const day = buildSpireSceneCopy("ru", "day", facts);
  assert.equal(day.kicker, "Гранит");
  assert.equal(day.kicker2, `до конца недели 2${nb}д${nb}14${nb}ч`);
  assert.equal(day.title, "Этаж 4");
  assert.equal(day.line, "ступень 7 из 8");
  assert.equal(day.bar, 7 / 8);
  assert.deepEqual([...day.rewards], ["+10 за ступень", "+40 за этаж"]);
  const search = buildSpireSceneCopy("ru", "search", { ...facts, floor: 1, stepDone: 0, stepTotal: 5, floorCoins: 10 });
  assert.equal(search.kicker, "Новая неделя · Гранит");
  assert.equal(search.title, "Этаж 1");
  assert.equal(search.line, "ступень 0 из 5");
  assert.deepEqual([...search.rewards], ["+10 за ступень", "+10 за этаж"]);
  const eve = buildSpireSceneCopy("ru", "eve", { ...facts, msLeft: 2 * H + 20 * 60_000 });
  assert.equal(eve.kicker, "Гранит · до конца недели");
  assert.equal(eve.title, `2${nb}ч 20${nb}мин`, "между часами и минутами — обычный пробел: заголовок переносится, как в эталоне");
  assert.equal(eve.warm, "Ещё 2 места до повышения");
  assert.deepEqual([...eve.rewards], [], "вечером наград нет — как в эталоне");
  const zero = buildSpireSceneCopy("ru", "zero", facts);
  assert.equal(zero.kicker, "Энергия через");
  assert.equal(zero.liveEnergyTitle, true, "заголовок — живой отсчёт энергии");
  assert.equal(zero.line, "этаж 4 · ступень 7 из 8");
  assert.equal(buildSpireSceneCopy("uk", "day", facts).title, "Поверх 4");
  assert.deepEqual({ ...spireSceneLeft(2 * D + 14 * H + 5 * 60_000) }, { days: 2, hours: 14, minutes: 5 });

  // ── формы слова и 9 языков ──
  assert.equal(spireScenePromoText("ru", 1, false), "1 место до повышения");
  assert.equal(spireScenePromoText("ru", 2, false), "2 места до повышения");
  assert.equal(spireScenePromoText("ru", 5, false), "5 мест до повышения");
  assert.equal(spireScenePromoText("ru", 21, true), "Ещё 21 место до повышения");
  assert.equal(spireScenePromoText("uk", 2, true), "Ще 2 місця до підвищення");
  const placeholders = (s: string) => [...s.matchAll(/\{[a-z]+\}/g)].map((m) => m[0]).sort().join(",");
  for (const [key, nine] of Object.entries(SPIRE_SCENE_STRINGS)) {
    assert.equal(nine.length, 9, `${key}: 9 языков`);
    for (const text of nine) {
      assert.ok(text.trim().length > 0, `${key}: пусто`);
      assert.equal(placeholders(text), placeholders(nine[0]), `${key}: подстановки одинаковы`);
    }
  }

  // ── моки dev-входа: через настоящую функцию ──
  assert.ok(isSpireScenePreviewState("eve"));
  assert.ok(!isSpireScenePreviewState("plus"));
  for (const state of SPIRE_SCENE_PREVIEW_STATES) {
    const d = pickSpireSceneState(spireScenePreviewSetup(state, false).input);
    assert.equal(d.state, state === "off" ? "day" : state, `${state}: решено ${d.state} (${d.reason})`);
    assert.equal(d.offlineLine, state === "off");
    const plus = pickSpireSceneState(spireScenePreviewSetup(state, true).input).state;
    assert.equal(plus, state === "zero" || state === "off" ? "day" : state, `Plus/${state}: решено ${plus}`);
  }
  assert.equal(spireScenePreviewSetup("search", false).members, null, "подбор комнаты: комнаты ещё нет — пьедестал-скелет");
  assert.equal(typeof SPIRE_SCENE_V2_ENABLED, "boolean");

  // ── dev-вход, стор-бандл, башня и кнопка в режиме «Сцены» ──
  const route = read("app/dev_spire_scene_preview.tsx");
  assert.match(route, /if \(!ENABLE_DEV_TOOLS \|\| IS_STORE_RELEASE\) return <Redirect href="\/" \/>;/);
  assert.match(route, /import \{ ENABLE_DEV_TOOLS, IS_STORE_RELEASE \} from '\.\/config';/);
  assert.ok(!/fetch\(|httpsCallable|getDoc|firestore|AsyncStorage/i.test(route), "у превью нет сети и хранилища");
  assert.match(route, /pickSpireSceneState\(setup\.input\)/, "состояние — решение настоящей функции");
  assert.match(route, /setDevThemeChoice\(before\)/);
  assert.match(route, /setDevAppearance\(before\)/);
  const storeBranch = read("router.ctx.js").split(": require.context(")[0] ?? "";
  assert.ok(storeBranch.includes("dev_spire_scene_preview"), "стор-ветка router.ctx.js вырезает dev-вход");
  const tower = read("components/spire/SpireTower.tsx");
  assert.ok(tower.includes("variant = 'window'"), "башня по умолчанию — прежнее окно");
  assert.ok(tower.includes("windowScene: { borderRadius: 0, backgroundColor: 'transparent' }"), "на «Сцене» — без плиты");
  const scene = read("components/spire/scene/SpireScene.tsx");
  assert.ok(scene.includes("homeSceneTokensForTheme("), "цвета сцены — те же, что у Главной (всегда «Максимум»)");
  assert.ok(scene.includes('variant="scene"'));
  const dock = read("components/spire/SpireClimbDock.tsx");
  assert.ok(dock.includes("scene ? spireSceneText(lang, 'playIn'"), "«Играть через 6:40» на «Сцене»");
  assert.ok(dock.includes('testID="spire-dock-searching"'), "«Ищем комнату…» на «Сцене»");

  // ── шаг 3b: экран Пика и шапка «Сообщества» на цвете сцены ──
  const screen = read("components/spire/SpireHomeScreen.tsx");
  assert.ok(screen.includes("const scene = useSpireSceneTop("), "экран берёт данные сцены одной строкой");
  assert.ok(screen.includes("headerTint={runtimeOwnerId === 'spire'}"), "шапку красит только видимый «Пик»");
  assert.ok(screen.includes("scene={scene !== null} searching={scene?.decision.state === 'search'}"), "кнопка в режиме «Сцены»");
  assert.ok(screen.split("\n").length <= 400, "экран Пика ≤ 400 строк");
  assert.ok(scene.includes("setSpireSceneHeaderTint(tokens.sceneTop)") && scene.includes("return () => setSpireSceneHeaderTint(null);"), "сцена кладёт и убирает цвет шапки");
  const community = read("app/(tabs)/community.tsx");
  assert.ok(community.includes("const peakScene = section === 'spire' && sceneTint !== null;"), "«Сообщество» красит шапку только на «Пике» со «Сценой»");
  assert.ok(community.includes("peakScene ? <HomeSceneEnergy /> : null"), "справа — белая энергия");
  const layout = read("app/(tabs)/_layout.tsx");
  assert.ok(layout.includes("<SpireSceneStatusStrip height={insets.top} visible={visualIdx === communityLogicalIdx} />"), "полоса под часами — только на «Сообществе»");
  assert.ok(!route.includes("headerTint"), "dev-вход не красит настоящую шапку");
}

if (typeof test === "function") {
  test("spire_scene_contract", main);
} else {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
