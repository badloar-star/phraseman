import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

// зачем (владелец 2026-09-30): живые V2-экраны «Диалогов» переносятся «1 в 1» по макету
// dialogs.html (Liquid Glass). Контракт стережёт ВИД (токены 13 тем, раскладку макета,
// безопасные зоны) и то, что логика/данные V2 не подменены выдуманными полями.

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const lines = (source) => source.split('\n').length;

const kit = read('components/dialogs/glass/DialogueGlassKit.tsx');
const chat = read('components/dialogs/glass/DialogueGlassChat.tsx');
const menu = read('components/dialogs/glass/DialogueGlassMenuSheet.tsx');
const session = read('components/dialogs/DialogueV2SessionScreen.tsx');
const sessionRoute = read('app/dialogue_v2_session.tsx');
const briefing = read('components/dialogs/DialogueV2BriefingScreen.tsx');
const briefingRoute = read('app/dialogue_v2_briefing.tsx');
const freeform = read('components/dialogs/DialogueV2FreeformScreen.tsx');
const freeformRoute = read('app/dialogue_v2_freeform.tsx');
const catalogue = read('components/dialogs/DialogueV2CatalogueSection.tsx');
const catalogueContainer = read('components/dialogs/DialogueV2CatalogueContainer.tsx');

test('glass kit: presentational parts live in components/dialogs/glass and take theme tokens', () => {
  for (const path of ['DialogueGlassKit.tsx', 'DialogueGlassChat.tsx', 'DialogueGlassMenuSheet.tsx']) {
    assert.ok(existsSync(new URL(`../components/dialogs/glass/${path}`, import.meta.url)), path);
  }
  for (const source of [kit, chat, menu]) {
    assert.ok(lines(source) <= 400, 'glass part stays ≤ 400 lines');
    assert.doesNotMatch(source, /adjustsFontSizeToFit/);
    assert.doesNotMatch(source, /catch\s*(\([^)]*\))?\s*\{\s*\}/, 'no silent catch');
  }
  assert.match(kit, /liquidGlassTokens\(liquidGlassThemeId\)/);
  assert.match(kit, /export function useDialogueGlass\(/);
  // Кнопка «назад» и CTA — не меньше 44 dp (область нажатия).
  assert.match(kit, /width: 44, height: 44, borderRadius: 22/);
  assert.match(menu, /material="liquid-glass-opaque"/);
});

test('session C*: header .dh with «⋯» menu, no divider line, bubbles/typing/composer from the glass chat', () => {
  assert.match(session, /useDialogueGlass\(\)/);
  assert.match(session, /testID="dialogue-v2-session-header"/);
  assert.doesNotMatch(session, /borderBottomWidth/);
  assert.match(session, /name="ellipsis-horizontal"/);
  assert.match(session, /<DialogueGlassMenuSheet/);
  assert.match(menu, /onComplete/);
  // Мик слева, поле, круглая «↑» справа (макет .ibar).
  const mic = session.indexOf('testID="dialogue-v2-voice-input"');
  const field = session.indexOf('<TextInput');
  const sendBtn = session.indexOf("name=\"arrow-up\"");
  assert.ok(mic > 0 && field > mic && sendBtn > field, 'mic → field → send order');
  assert.match(session, /<DialogueGlassTyping/);
  assert.match(chat, /useNativeDriver: true/);
  assert.match(session, /<DialogueGlassBubble/);
  // Пузырь «Вы» — светлый нейтральный (lightTint), чужой — плашка стиля «Тень»: заливка плашки и тень, без кромки (владелец 12.10).
  assert.match(chat, /glass\.lightTint/);
  assert.match(chat, /boxShadow: plateBoxShadow\(glass\)/);
  assert.doesNotMatch(chat, /borderWidth|glassEdge/);
  // D111/D112 (владелец 2026-09-30): настроение и месячный остаток теперь приходят с сервера и
  // рисуются; энергии в V2-диалогах решения нет — её по-прежнему не рисуем.
  // 30.09 (владелец: энергия как урок; макет B6): пилюля энергии в шапке, только по флагу showEnergy.
  assert.ok(session.includes('{showEnergy ? <EnergyBar glass solidBolt /> : null}'), 'пилюля энергии по флагу');
  assert.match(session, /headerMood/);
  assert.match(session, /quotaPill/);
});

test('session C6/C23: «Задания» sheet lists briefing goals without statuses; exit asks for confirmation', () => {
  // C6: пункт «Задания» в шторке «⋯» открывает DialogGoalsSheet; статусов «выполнено» сервер V2 не даёт.
  assert.match(menu, /testID="dialogue-v2-session-menu-tasks"/);
  assert.match(menu, /pendingRef\.current = 'tasks'/);
  assert.match(session, /<DialogGoalsSheet/);
  assert.match(session, /showStatus=\{false\}/);
  assert.match(sessionRoute, /objectives=\{model\.objectives\}/);
  assert.doesNotMatch(session, /objectivesMet=\{new Set|done.*objective/i);
  // C23 (макет dialogs.html exitSheet, сверка dialogs-036): выход из начатого разговора — шторка снизу DialogueGlassExitSheet (ручка, ✕, заголовок слева,
  // «Остаться» главной, «Выйти» ниже), а не ThemedConfirmModal по центру; кнопка и аппаратный «назад» прежние.
  assert.match(session, /<DialogueGlassExitSheet/);
  assert.match(session, /onPress=\{requestBack\}/);
  assert.match(session, /hardwareBackPress/);
  assert.match(session, /if \(hasConversation && bottom !== 'summary'\) setExitOpen\(true\);\s*else onBack\(\);/);
  for (const key of ['tasks', 'exitTitle', 'exitMessage', 'exitStay', 'exitLeave']) {
    assert.ok(sessionRoute.includes(`${key}: triLang(lang, { ru:`), key);
  }
  // Честный текст: переписка в V2 не сохраняется — обещания «сохранится» из макета не даём.
  assert.doesNotMatch(sessionRoute, /Разговор сохранится/);
});

test('session route: network error is an inline system plate with retry, unavailable is a gate', () => {
  assert.match(sessionRoute, /turnError=\{turnFailure !== null\}/);
  // C19/C33: причины отказа — сервис, частота, пауза раздела; пауза — гейт, а не плашка.
  assert.match(sessionRoute, /testID="dialogue-v2-session-paused"/);
  assert.match(session, /<DialogueGlassSysError/);
  assert.match(sessionRoute, /<DialogueGlassGate/);
  assert.match(sessionRoute, /testID="dialogue-v2-session-unavailable"/);
  assert.match(sessionRoute, /testID="dialogue-v2-session-loading"/);
});

test('briefing B1/B2: medallion, CEFR badge, «Задания» card, pinned CTA with arrow or rank lock', () => {
  assert.match(briefing, /useDialogueGlass\(\)/);
  assert.match(briefing, /width: 88, height: 88, borderRadius: 28/);
  assert.doesNotMatch(briefing, /medal-outline/);
  assert.match(briefing, /testID="dialogue-v2-briefing-tasks"/);
  assert.match(briefing, /<DialogueGlassCta/);
  assert.match(briefing, /trailingArrow/);
  assert.ok(briefing.includes("icon={unlocked ? undefined : 'lock-closed'}"), 'rank lock CTA shows a lock');
  assert.match(briefing, /currentRank != null/);
  assert.match(briefingRoute, /currentRank=\{localCoinRank\}/);
  assert.match(briefingRoute, /ru: 'Задания'/);
  assert.match(briefingRoute, /ru: 'Начать диалог'/);
});

test('catalogue A4/A7: rows with tile, rank line under the title and animated expand', () => {
  assert.match(catalogue, /animateNextLayoutTransition\(\)/);
  assert.match(catalogue, /lockedAtRank\(item\.rankRequired\)/);
  assert.match(catalogueContainer, /lockedAtRank: \(rank: number\) => triLang/);
  assert.match(catalogue, /coinRankRowForDisplay\(item\.rankRequired\)\.source/);
});

test('free conversation F1/F2: only «Свободный разговор», empty tip card, assistant bubble without avatar', () => {
  assert.match(freeformRoute, /ru: 'Свободный разговор'/);
  assert.doesNotMatch(freeformRoute, /Свободный диалог/);
  assert.match(freeform, /testID="dialogue-v2-freeform-empty"/);
  assert.match(freeform, /<DialogueGlassBubble/);
  assert.match(freeform, /useDialogueGlass\(\)/);
});

test('XP and pearls never render on dialogue V2 screens', () => {
  for (const source of [session, briefing, freeform, catalogue, kit, chat, menu]) {
    assert.doesNotMatch(source, /\bXP\b|жемчуг|pearl/i);
  }
});
