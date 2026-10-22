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
// зачем: 3b1850ac8 (целостность текста) — длинное название переносится целиком, без обрезки многоточием.
assert.doesNotMatch(header, /numberOfLines=\{2\}/);
assert.match(header, /maxWidth: screenW < 360 \? 44 : 86/);

const entry = read('app/flashcards/training_entry.ts');
assert.doesNotMatch(entry, /listening|flashcards_listening_session/);

const sheet = read('app/flashcards/FlashcardsTrainingModeSheet.tsx');
assert.doesNotMatch(sheet, /Как тренируемся\?/);
assert.doesNotMatch(sheet, /Выберите режим, затем отметьте нужные наборы\./);
assert.doesNotMatch(sheet, /mode: 'listening'|Слушать|Listening/);
assert.match(sheet, /60 секунд/); // зачем (Карточки 2.0 12.10): подписи плиток по макету cards-v2
// зачем (владелец 01.10, по скрину; bb5d31820): описание «Устно» сокращено — строка про паузу убрана.
assert.match(sheet, /'Вслух'/);
assert.doesNotMatch(sheet, /Можно остановиться и попробовать ещё раз\./);
assert.match(sheet, /Да или нет/);
// зачем: D129 — языков обучения несколько, «английскую» заменили на «на изучаемом языке».
assert.match(sheet, /По памяти/);
assert.match(sheet, /mode: 'recall'/);
assert.doesNotMatch(sheet, /Слушай фразы подряд и понимай их без подсказки\./);
// зачем: bb5d31820 — окно переделано по скрину владельца; строка режима ниже (76), но выше минимума касания 44.
// 05.10 (Сверка cards-section-032): строка по макету mode() — 16 + плитка 57 + 16 = 89, промежуток 20.
assert.match(sheet, /tile: \{ flex: 1, minWidth: 0, minHeight: 112, borderRadius: 20, padding: 16,/);
assert.match(sheet, /<ScrollView/);
assert.match(sheet, /accessibilityLabel=\{`\$\{row\.title\}.*?\$\{rowDescription\}`\}/);
// зачем: efe19ae9d (снимок 30.09) — удалённый флаг «Устно» снят из приложения целиком (isSpeakingEnabled нет нигде);
// режим всегда в списке, и подписка на remote_config для него не нужна.
assert.doesNotMatch(sheet, /isSpeakingEnabled/);
assert.match(sheet, /AccessibilityInfo\.setAccessibilityFocus/);

const setup = read('app/flashcards_training_setup.tsx');
assert.doesNotMatch(setup, /mode === 'listening'|Наборы для слушания|Начать слушать/);
// зачем (PM-086, владелец 2026-09-24): ценник энергии над кнопкой старта
// убран вместе с EnergyCostBadge — расход энергии не менялся.
assert.doesNotMatch(setup, /<EnergyCostBadge/);
const setupStart = setup.slice(setup.indexOf('const startTraining'), setup.indexOf('const emptyLabel'));
assert.doesNotMatch(setupStart, /await setLastPreset/);
assert.match(setupStart, /router\.push/);
// зачем: D139 (шкала текста) — из темы берутся ещё размер и масштаб шрифта.
assert.match(setup, /const \{ theme: t, f, statusBarLight[^}]*\} = useTheme\(\);/);
assert.match(setup, /type LoadErrorKind = 'invalid' \| 'unavailable' \| 'load' \| null;/);
assert.match(setup, /loadErrorKind === 'load'/);
// зачем (владелец 04.10, cards-section): строки наборов и живые подписи рисует TrainingSetupV2 (KitCard + KitCheck, accessibilityLiveRegion у сводки)
const setupView = read('app/flashcards/TrainingSetupV2.tsx');
assert.match(setupView, /accessibilityLiveRegion="polite"/);
assert.match(setupView, /accessibilityLabel=\{`\$\{deck\.title\}, \$\{deck\.count\}`\}/);

const hub = read('app/flashcards/FlashcardsHubScreen.tsx');
assert.match(hub, /primeFlashcardsCollectionCache\(studyTarget\)/);
assert.match(hub, /catalogLoadState/);
// зачем (приказ владельца 11.10 — вернуть хаб утра): экран рисует CardsHubV2 — кнопка тренировки 52 высотой, а загрузка каталога решается без спиннера
const hubView = read('app/flashcards/CardsHubV2.tsx');
// зачем (аудит 22.10, V2Pressable): отступ 14 живёт на обёртке кнопки (ctaOuter), высота 52 — на самой кнопке
assert.match(hubView, /ctaOuter: \{ marginTop: 14 \}/);
assert.match(hubView, /cta: \{ minHeight: 52/);
assert.match(hubView, /fc-cards-hub-train/);
assert.match(hub, /trainButtonRef/);
assert.match(hub, /AccessibilityInfo\.setAccessibilityFocus/);

const topPacks = read('app/flashcards/SavedTopCommunityPacks.tsx');
assert.match(topPacks, /loading\?: boolean/);
assert.match(topPacks, /onRetry\?: \(\) => void/);
// зачем: efe19ae9d — подборка переделана, подпись переносится без отдельного reflow; зоны касания ≥ 44.
assert.match(topPacks, /seeAll: \{ minHeight: 44/);

const layout = read('app/_layout.tsx');
assert.doesNotMatch(layout, /flashcards_listening_session/);
assert.match(layout, /flashcards_recall_session/);

console.log('flashcards owner header/training sheet gate: PASS');
