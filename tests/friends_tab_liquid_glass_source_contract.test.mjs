import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// зачем (владелец 2026-09-29): вкладка «Друзья» переносится 1 в 1 по макету community.html (COM-04, Liquid Glass).
// Контракт фиксирует: токены темы вместо «фирменных» цветов, тонкая обводка, шапка без дубля «Сообщества»,
// сохранённые обработчики и testID (логика друзей/поиска/приглашений не менялась).
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const friends = read('app/(tabs)/friends.tsx');
const kit = read('components/friends/FriendsGlassKit.tsx');
const request = read('components/friends/FriendsRequestCard.tsx');
const found = read('components/friends/FriendsFoundCard.tsx');
const empty = read('components/friends/FriendsEmptyState.tsx');
const row = read('components/friends_together/FriendListRow.tsx');
const dialog = read('components/centered_dialog_shell.tsx');
const glassFiles = { kit, request, found, empty, row, dialog };

test('all friends blocks take colors from the 13-theme Liquid Glass registry', () => {
  assert.ok(kit.includes("liquidGlassTokens(liquidGlassThemeId)"), 'kit resolves the active theme');
  for (const [name, source] of Object.entries(glassFiles)) {
    assert.ok(/useFriendsGlass\(\)|liquidGlassTokens/.test(source), `${name} uses glass tokens`);
    assert.equal(/#[0-9a-fA-F]{6}\b/.test(source.replace(/\/\/.*$/gm, '')), false, `${name} has no hard-coded hex colors`);
    assert.equal(/correctText|t\.accent\b/.test(source.replace(/\/\/.*$/gm, '')), false, `${name} CTA is not green/brand`);
    // t.correct/t.wrong — только семантика строки результата в kit (FriendsFeedbackRow), не CTA.
    if (name !== 'kit') assert.equal(/t\.correct\b/.test(source), false, `${name} has no green accents`);
  }
  assert.ok(friends.includes('useFriendsGlass()'), 'screen header uses glass tokens');
  assert.ok(friends.includes('FriendsRequestCard') && friends.includes('FriendsEmptyState') && friends.includes('FriendsFoundCard'), 'screen composes request, empty and found-user blocks');
});

test('no thick borders and no font-shrinking anywhere in the friends tab', () => {
  for (const [name, source] of Object.entries({ ...glassFiles, friends })) {
    for (const match of source.matchAll(/borderWidth:\s*(\d+)/g)) {
      assert.ok(Number(match[1]) <= 1, `${name}: borderWidth ${match[1]} is thicker than 1 px`);
    }
    assert.equal(source.includes('adjustsFontSizeToFit'), false, `${name} does not shrink fonts`);
  }
  // зачем (владелец 12.10, стиль «Тень»): обводок нет совсем — плашки отделяют тон и тень (plateBoxShadow/nestedBoxShadow).
  assert.ok(!kit.includes('glass.glassEdge'), 'no outlines in the friends kit');
  assert.ok(kit.includes('plateBoxShadow(glass)') && kit.includes('nestedBoxShadow(glass)'), 'shadow instead of border');
});

test('embedded tab has no duplicate title, back button or second safe-area inset', () => {
  assert.equal(friends.includes('chevron-back'), false, 'no back button inside the Community tab');
  assert.equal(friends.includes('goHome'), false, 'friends no longer navigates home itself');
  assert.equal(friends.includes('insets.top'), false, 'safe area top is owned by the tab shell');
  assert.equal(/fontSize:\s*f\.h2/.test(friends), false, 'no second large title');
  assert.ok(friends.includes('testID="friends-screen-title"'), 'section title anchor stays');
});

test('touch targets are at least 44 dp and controls are accessible', () => {
  assert.ok(kit.includes('const height = compact ? 44 : 48;'));
  assert.ok(kit.includes('size = 44'), 'round buttons default to 44');
  assert.ok(kit.includes("accessibilityRole=\"button\""));
  assert.ok(row.includes('minHeight: 44'));
  assert.ok(dialog.includes('size={44}'), 'dialog close is 44 dp');
});

test('friend handlers, request actions and testIDs are preserved', () => {
  for (const marker of [
    'testID="friends-open-add"', 'testID="friends-search"', 'testID="friends-code-input"', 'testID="friends-list"',
    'testID="friends-add-sheet"', 'handleAcceptRequest(req)', 'handleDeclineRequest(req)', 'onSearch={handleSearch}',
    'onAddFound={handleAddFound}', 'onSubmitEditing={onSearch}', "setDeleteTarget(null)", 'ReportErrorButton',
  ]) assert.ok(friends.includes(marker), marker);
  assert.ok(request.includes('friend-request-accept-${profile.uid}') && request.includes('friend-request-decline-${profile.uid}'));
  assert.ok(found.includes('testID="friends-found-user-card"') && found.includes('testID="friends-add-found"'));
  assert.ok(empty.includes('"friends-list-empty"') && empty.includes('"friends-empty-add"'));
  // 18.10: COM-04-OFFLINE («Связь пропала · Повторить» на всю вкладку) убран правилом владельца «экранов-ошибок нигде» — тихий повтор в friends.tsx.
  assert.ok(!empty.includes('friends-list-offline') && !empty.includes('friends-offline-retry') && !empty.includes('cloud-offline-outline'));
  assert.ok(row.includes('friend-row-avatar-${friendUid}') && row.includes('friend-row-body-${friendUid}'));
});

test('no invented ranks: coin only from public coinRank, otherwise a neutral initial circle', () => {
  assert.ok(kit.includes('isValidCoinRank(coinRank)') && kit.includes('friends-initial'));
  assert.ok(friends.includes('coinRank={profile.coinRank ?? null}'));
  assert.equal(row.includes('AvatarView'), false);
});

test('new UI strings go through the nine-language translator', () => {
  for (const source of [request, found, empty]) assert.ok(source.includes('triLang(lang'));
  assert.ok(request.includes("pl: 'Chce dodać cię do znajomych'"));
  assert.ok(found.includes("pl: 'Wysyłanie zaproszenia…'"));
  assert.ok(friends.includes("'Twoi znajomi'"));
});

// зачем (координатор 01.10, замер эмулятора): на экранах ниже 700 dp окно «Добавить друга»
// стоит в верхней трети, иначе клавиатура закрывает поле. Окно по-прежнему не двигается за
// клавиатурой (решение владельца 26.07): ни KeyboardAvoidingView, ни подписки на клавиатуру.
test('add-friend dialog sits in the upper third on short screens and never follows the keyboard', () => {
  assert.ok(dialog.includes('export const SHORT_SCREEN_DP = 700;'));
  assert.ok(dialog.includes('const shortScreen = viewportHeight < SHORT_SCREEN_DP;'));
  assert.ok(dialog.includes("shortScreen ? { justifyContent: 'flex-start'"));
  assert.ok(!dialog.includes('<KeyboardAvoidingView'), 'no KeyboardAvoidingView');
  assert.ok(!/Keyboard\.addListener|keyboardDidShow/.test(dialog), 'no keyboard subscription');
});

// зачем (координатор 05.10, макет community.html find 04.10): «Добавить друга» — нижняя шторка. Причину решения 26.07
// (шит рос паддингом под клавиатурой) закрываем: шторка фиксированной высоты ЦЕЛИКОМ поднимается над клавиатурой,
// подъём учитывает, насколько окно уже сузила система (не поднять дважды), всё пишется в [FRIEND-ADD-SHEET].
test('add-friend sheet lifts above the keyboard as a whole and logs every decision', () => {
  const sheet = read('components/friends/FriendsAddSheetShell.tsx');
  const screen = read('app/(tabs)/friends.tsx');
  assert.ok(screen.includes('<FriendsAddSheetShell'), 'add-friend uses the bottom sheet');
  assert.ok(!sheet.includes('<KeyboardAvoidingView'), 'no KeyboardAvoidingView — no padding growth');
  assert.ok(/translateY: slide\.value \* viewportHeight - lift\.value/.test(sheet), 'the whole sheet is translated by the lift');
  assert.ok(sheet.includes('Math.max(0, keyboardHeight - shrunkBy'), 'lift subtracts what the window already shrank');
  assert.ok(/console\.log\(LOG, 'keyboard show'/.test(sheet) && /console\.log\(LOG, 'lift'/.test(sheet), '[FRIEND-ADD-SHEET] logs');
  assert.ok(sheet.includes("const LOG = '[FRIEND-ADD-SHEET]'"));
  assert.ok(sheet.includes('borderTopLeftRadius: 28') && sheet.includes('width: 44, height: 5'), 'kit .sheet radius 28 and .grab 44x5');
});
