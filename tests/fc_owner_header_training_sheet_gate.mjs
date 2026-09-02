import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const header = read('app/flashcards/CollectionHeader.tsx');
assert.doesNotMatch(header, /fc-listen-deck|fc-train-deck|EnergyCostBadge|showModeButtons/);
assert.match(header, /const VIEW_TOGGLE_SIZE = 40;/);
assert.match(header, /const VIEW_TOGGLE_ICON_SIZE = 18;/);
// зачем: заголовок шапки НЕ сжимаем шрифтом — adjustsFontSizeToFit запрещён
// владельцем (на iOS ужимает короткие варианты), см. AGENTS.md → Layout stability
// и храповик tests/layout_stability_contract.test.ts. Длинное название переносим
// на вторую строку. Здесь фиксируем именно это, чтобы запрет не вернулся.
assert.doesNotMatch(header.replace(/\/\*[\s\S]*?\*\//g, ''), /adjustsFontSizeToFit|minimumFontScale/);
assert.match(header, /numberOfLines=\{2\}/);
assert.match(header, /maxWidth: screenW < 360 \? 44 : 86/);

const entry = read('app/flashcards/training_entry.ts');
assert.match(entry, /'truefalse' \| 'listening'/);
assert.match(entry, /pathname: '\/flashcards_listening_session'/);
assert.match(entry, /params: \{ deck, size: 'all' \}/);

const sheet = read('app/flashcards/FlashcardsTrainingModeSheet.tsx');
assert.doesNotMatch(sheet, /Как тренируемся\?/);
assert.doesNotMatch(sheet, /Выберите режим, затем отметьте нужные наборы\./);
assert.match(sheet, /mode: 'listening'/);
assert.match(sheet, /За 60 секунд находи верные переводы и вспоминай быстрее\./);
assert.match(sheet, /Повторяй фразы вслух и говори увереннее без пауз\./);
assert.match(sheet, /Сверяй фразу с переводом и сразу проверяй память\./);
assert.match(sheet, /Слушай фразы подряд и понимай их без подсказки\./);
assert.match(sheet, /content: \{ paddingHorizontal: 0/);
assert.match(sheet, /row: \{ minHeight: 88/);
assert.match(sheet, /<ScrollView/);
assert.match(sheet, /accessibilityLabel=\{`\$\{row\.title\}\. \$\{row\.description\}`\}/);
assert.match(sheet, /onAppEvent\('remote_config_changed'/);
assert.match(sheet, /\[lang, speakingEnabled\]/);
assert.match(sheet, /AccessibilityInfo\.setAccessibilityFocus/);

const setup = read('app/flashcards_training_setup.tsx');
assert.match(setup, /if \(mode === 'listening'\) return 'listening';/);
assert.match(setup, /if \(mode === 'listening'\) return \{/);
assert.match(setup, /Наборы для слушания/);
assert.match(setup, /Начать слушать/);
assert.match(setup, /canStart \? <EnergyCostBadge testID="fc-training-setup-energy-cost"/);
const setupStart = setup.slice(setup.indexOf('const startTraining'), setup.indexOf('const retryLabel'));
assert.doesNotMatch(setupStart, /await setLastPreset/);
assert.match(setupStart, /router\.push/);
assert.match(setup, /const \{ theme: t, f, statusBarLight \} = useTheme\(\);/);
assert.match(setup, /type LoadErrorKind = 'invalid' \| 'unavailable' \| 'load' \| null;/);
assert.match(setup, /loadErrorKind === 'load'/);
assert.match(setup, /accessibilityLiveRegion="polite"/);
assert.match(setup, /accessibilityLabel=\{`\$\{deck\.title\}\. \$\{cardsCountLabel\(lang, deck\.count\)\}`\}/);

const hub = read('app/flashcards/FlashcardsHubScreen.tsx');
assert.match(hub, /primeFlashcardsCollectionCache\(studyTarget\)/);
assert.match(hub, /catalogLoadState/);
assert.match(hub, /loading=\{catalogLoadState === 'loading'\}/);
assert.match(hub, /onRetry=\{reloadCatalog\}/);
assert.match(hub, /width: 48, height: 48/);
assert.match(hub, /trainButtonRef/);
assert.match(hub, /AccessibilityInfo\.setAccessibilityFocus/);

const topPacks = read('app/flashcards/SavedTopCommunityPacks.tsx');
assert.match(topPacks, /loading\?: boolean/);
assert.match(topPacks, /onRetry\?: \(\) => void/);
assert.match(topPacks, /onReflowNeeded=\{onLabelReflow\}/);
assert.match(topPacks, /minHeight: 48/);

const listening = read('app/flashcards_listening_session.tsx');
assert.match(listening, /if \(raw === 'all'\) return 'all';/);
assert.match(listening, /sessionSize === 'all'/);

console.log('flashcards owner header/training sheet gate: PASS');
