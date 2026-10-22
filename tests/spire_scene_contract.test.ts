import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import {
  SPIRE_SCENE_EVE_MS, SPIRE_SCENE_V2_ENABLED, buildSpireSceneCopy, pickSpireSceneState, spireSceneLeft, spireSceneRoom, type SpireSceneInput,
} from "../components/spire/scene/spire_scene_model";
import { SPIRE_SCENE_PREVIEW_ROOM, SPIRE_SCENE_PREVIEW_STATES, isSpireScenePreviewState, spireScenePreviewSetup } from "../components/spire/scene/spire_scene_preview_fixtures";
import { spireSceneHeaderTone } from "../components/spire/scene/spire_scene_header_tint";
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
  // зачем (координатор 22.10, съёмка Сверки): в эталоне ▶ слева от «Играть», стрелка справа — только у прежнего Пика
  assert.ok(dock.includes('{scene && !note ? <Ionicons name="play" size={18}'), "на «Сцене» ▶ слева от «Играть»");
  assert.ok(dock.includes('{scene ? null : <View pointerEvents="none" style={s.arrow}><Ionicons name="arrow-forward"'), "стрелка справа — только у прежнего Пика");

  // ── шаг 3b: экран Пика и шапка «Сообщества» на цвете сцены ──
  const screen = read("components/spire/SpireHomeScreen.tsx");
  assert.ok(screen.includes("const scene = useSpireSceneTop("), "экран берёт данные сцены одной строкой");
  assert.ok(screen.includes("headerTint={runtimeOwnerId === 'spire'}"), "шапку красит только видимый «Пик»");
  assert.ok(screen.includes("scene={scene !== null} searching={scene?.decision.state === 'search'}"), "кнопка в режиме «Сцены»");
  assert.ok(screen.split("\n").length <= 400, "экран Пика ≤ 400 строк");
  assert.ok(screen.includes("<SpireHomeTitle ") && screen.includes("titleStyle={budget.headerThin ? thin.title : null}"), "заголовок вынесен в SpireHomeTitle, стиль тонкой шапки — из экрана");
  assert.ok(!/\/\/ Вся сеть игровой части[^\n]*SpireLiveGate/.test(screen), "склеенные ради лимита комментарии возвращены");
  assert.ok(scene.includes("setSpireSceneHeaderTint(tokens.sceneTop)") && scene.includes("return () => setSpireSceneHeaderTint(null);"), "сцена кладёт и убирает цвет шапки");

  // ── флаг выключен → шапка «Сообщества» побайтно прежняя: тон пустой при любых данных ──
  for (const onPeak of [false, true]) {
    for (const tint of [null, "#123456"]) assert.equal(spireSceneHeaderTone({ enabled: false, onPeak, tint }), null, `флаг выключен: onPeak=${onPeak} tint=${tint}`);
  }
  assert.equal(spireSceneHeaderTone({ enabled: true, onPeak: false, tint: "#123456" }), null, "не «Пик» — прежний вид");
  assert.equal(spireSceneHeaderTone({ enabled: true, onPeak: true, tint: null }), null, "сцены на экране нет — прежний вид");
  assert.deepEqual({ ...spireSceneHeaderTone({ enabled: true, onPeak: true, tint: "#123456" }) }, { tint: "#123456", text: "#FFFFFF", muted: "rgba(255,255,255,0.78)" });
  const header = read("components/spire/scene/spire_scene_header.tsx");
  assert.ok(header.includes("spireSceneHeaderTone({ enabled: SPIRE_SCENE_V2_ENABLED, onPeak, tint })"), "тон шапки — через флаг");
  assert.ok(header.includes("if (tone === null) return null;"), "нет тона — слоя нет");
  const community = read("app/(tabs)/community.tsx");
  // строка вкладок «Сообщества» — прежний код (как до «Сцены»): при выключенном флаге шапка та же, слой поверх неё не рисуется
  assert.ok(community.includes("      <View style={[s.header, topInset > 0 ? { paddingTop: 12 + topInset } : null]}>\n"), "шапка без подложки; со «Сценой» Пика — отступ на зону часов (полноэкранная вкладка)");
  assert.ok(community.includes("borderBottomColor: on ? accentGfx.border : 'transparent'"), "черта вкладки — прежний цвет");
  assert.ok(community.includes("<Text style={[s.tabText, { color: on ? p.text : p.textSecondary }]}>{seg.label}</Text>"), "текст вкладок — прежние цвета");
  assert.ok(community.includes("{section === 'packs' ? packsSlot?.right : section === 'spire' && SPIRE_SCENE_V2_ENABLED ? <SpireEnergyPill ownerActive={tabVisible && section === 'spire'} /> : null}"), "справа — как раньше; на Пике со «Сценой» — настоящий EnergyBar (аудит F4)");
  assert.ok(community.includes("hitSlop={{ top: 8, bottom: 8, left: 11, right: 11 }}"), "вкладки: зона касания ≥ 44 и без щелей между ними");
  assert.ok(!community.includes("peakHeader") && !community.includes("SPIRE_SCENE_INK"), "строка вкладок не знает о «Сцене»");
  assert.ok(community.includes("<SpireSceneHeaderLayer onPeak={section === 'spire'} tabs={segments} active={section} styles={s} topInset={topInset} />\n      </View>"), "слой «Сцены» — последним в шапке, поверх вкладок, с тем же отступом под часы");
  assert.ok(read("components/spire/scene/spire_scene_header.tsx").includes("topInset > 0 ? { paddingTop: 12 + topInset } : null"), "рисованные вкладки — на месте настоящих (аудит F5)");

  // ── шаг 3b-3: прокрутка Пика гасит цвет шапки тем же механизмом, что маску Главной ──
  const mask = read("components/TopFadeMask.tsx");
  assert.ok(mask.includes("showThreshold = 6,") && mask.includes("duration: shouldShow ? 180 : 260,"), "у маски Главной порог 6 и 180/260 мс");
  assert.ok(header.includes("const SHOW_THRESHOLD = 6;") && header.includes("const FADE_OUT_MS = 180;") && header.includes("const FADE_IN_MS = 260;"), "у слоя шапки те же порог и время");
  assert.ok(header.includes("const scrollY = topFade?.scrollY;") && header.includes("scrollY.addListener(") && header.includes("return () => scrollY.removeListener(id);"), "слой слушает общий признак прокрутки");
  assert.ok(header.includes("duration: shown ? FADE_OUT_MS : FADE_IN_MS, useNativeDriver: true"), "гаснет на нативном драйвере, без перерисовки");
  assert.ok(header.includes("topFade?.isMaskShown() ?? false"), "слой, появившийся после прокрутки, начинает с текущего вида маски");
  assert.ok(header.includes('pointerEvents="none"') && header.includes('importantForAccessibility="no-hide-descendants"'), "касания и чтение с экрана — у настоящих вкладок");
  assert.ok(!/useState|setState/.test(header), "прокрутка не перерисовывает «Сообщество»");
  const fadeCtx = read("components/TopFadeScrollContext.tsx");
  assert.ok(fadeCtx.includes("isMaskShown: () => maskShownRef.current,"), "общий признак отдаёт текущий вид маски (только чтение)");
  const scroll = read("components/spire/scene/use_spire_scene_scroll.ts");
  assert.ok(scroll.includes("topFade?.onScrollMaskOnly(e);") && !scroll.includes("topFade?.onScroll(") && !scroll.includes("reportTabBarOffset"), "Пик кормит только маску — нижнее меню не сворачивается, как раньше");
  assert.ok(scroll.includes("topFade.onScrollMaskOnly({ nativeEvent: { contentOffset: { y: lastYRef.current } } });"), "Пик при появлении сообщает своё место заново");
  assert.ok(scroll.includes("enabled ? Object.freeze({ onScroll, scrollEventThrottle: 16 }) : NONE"), "без «Сцены» Пик ничего не сообщает");
  assert.ok(screen.includes("const sceneScroll = useSpireSceneScroll(scene !== null, runtimeOwnerId === 'spire');") && screen.includes("{...sceneScroll}"), "прокрутка Пика — только со «Сценой»");

  // ── одна полоса под часами (HomeSceneStatusStrip), без второй копии ──
  const layout = read("app/(tabs)/_layout.tsx");
  assert.ok(layout.includes('<HomeSceneStatusStrip height={insets.top} scrollY={topFadeScroll?.scrollY} visible={visualIdx === communityLogicalIdx} source="spire" />'), "полоса под часами на «Сообществе» — та же HomeSceneStatusStrip");
  assert.ok(!layout.includes("SpireSceneStatusStrip") && !existsSync("components/spire/scene/SpireSceneStatusStrip.tsx"), "второй копии полосы нет");
  const strip = read("components/home/v2/scene/HomeSceneStatusStrip.tsx");
  assert.ok(strip.includes("source === 'spire' ? (SPIRE_SCENE_V2_ENABLED ? spireTint : null) : homeTint"), "цвет Пика — только при флаге");
  // ── сетка без пересечений на 360–430 dp (координатор 22.10 после съёмки Сверки; расчёт — tests/spire_scene_layout.test.ts) ──
  assert.ok(scene.includes("const frame = useMemo(() => spireSceneFrame({ width, visibleH, fontScale, guardChars, headroom }), [width, visibleH, fontScale, guardChars, headroom]);"), "высокая сцена: башня целиком над «Играть» (видимая высота), запас короны своей лиги");
  assert.ok(scene.includes("const visibleH = spireSceneVisibleH(windowH, insets.top, p.dockClear ?? DEFAULT_DOCK_CLEAR);"), "видимая высота — экран минус шапка и зона «Играть»");
  assert.ok(scene.includes("hideFloorWords={frame.wordsHidden}"), "слова мельче 4 dp на сцене не рисуются — решает расчёт сетки");
  assert.ok(scene.includes("windowHeight={frame.windowH}") && scene.includes("sceneRowsClearBottom={frame.rowsClearBottom}"), "башня знает высоту окна и где начинаются монеты пьедестала");
  assert.ok(scene.includes("style={[s.panel, { backgroundColor: pal.card, marginTop: -SPIRE_SCENE_PANEL_OVERLAP }, off ? s.dim : null]}") && scene.includes('testID="spire-scene-all"'), "«Комната недели» — карточка под сценой, вся нажимается (аудит F3)");
  assert.ok(scene.includes("onPressMember={onPressPodium}") && scene.includes('testID="spire-scene-my-coin" onPress={onPressMyPlace}'), "призёры и своя монета открывают карточку игрока");
  assert.ok(scene.includes("onPressRival={onPressRival}") && scene.includes("onPressMe={onPressMe}") && scene.includes("<SpirePlayerCard player={player}"), "аватарки на башне и своя метка — карточка игрока");
  assert.ok(scene.includes('testID="spire-scene-offline" pointerEvents="none"'), "плашка «нет сети» не глотает касания (аудит F6)");
  assert.ok(tower.includes("sceneMode ? Math.max(0, contentH - wh)"), "на «Сцене» окно — вся башня от короны до низа, на любом этаже");
  assert.ok(tower.includes("hideWords={sceneMode && hideFloorWords}"), "флаг «без мелких слов» — только на «Сцене»");
  // зачем (владелец 22.10: «НОМЕРА ЭТАЖЕЙ УБЕРИ»): сторож — на «Сцене» номеров этажей нет ни на каком экране, вне «Сцены» — как были
  assert.ok(tower.includes("hideWords={sceneMode && hideFloorWords} hideFloorLabels={sceneMode} />"), "на «Сцене» номера этажей и подписи под ними не рисуются");
  const towerSvg = read("components/spire/SpireTowerSvg.tsx");
  assert.ok(towerSvg.includes("{bare || noLabels ? null : <SvgText x={14} y={y + h / 2 + (label ? 0 : 5)} fontSize={14}"), "номер этажа не рисуется при noLabels");
  assert.ok(towerSvg.includes("{label && !bare && !noLabels ? <SvgText x={20}"), "подпись под номером не рисуется при noLabels");
  assert.ok(towerSvg.includes("bare={textTooSmall} noLabels={hideFloorLabels} />"), "флаг доходит до каждого этажа");
  assert.ok(towerSvg.includes("hideWords = false, hideFloorLabels = false }: Props) {"), "по умолчанию номера есть: тур, моменты, истории и прежнее окно не меняются");
  assert.ok(tower.includes("hitSlop={Math.max(0, Math.ceil((RIVAL_TAP - size) / 2))}") && tower.includes("const RIVAL_TAP = 44;"), "монета соперника — кнопка с зоной касания ≥ 44");
  assert.ok(tower.includes("pointerEvents={onPressRival ? 'box-none' : 'none'}"), "без обработчиков (прежнее окно) ряды по-прежнему не ловят касания");
  assert.ok(tower.includes("sceneFit={sceneFit} hiddenBelow={sceneMode ? rowsHidden : 0}"), "ряды соперников на «Сцене» — по расчёту сетки");
  assert.ok(tower.includes("if (fl.f <= hiddenBelow) continue;"), "ряды под монетами пьедестала не рисуются");
  const podium = read("components/spire/scene/SpireScenePodium.tsx");
  assert.ok(podium.includes("const BLOCK_H = SPIRE_SCENE_PODIUM.blockH;") && podium.includes("const COIN = SPIRE_SCENE_PODIUM.coin;"), "размеры пьедестала — из того же расчёта, что окно башни");
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
