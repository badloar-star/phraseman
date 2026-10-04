// зачем (владелец 04.10): прежний сторож плотной раскладки хаба заменён сторожем утверждённого хаба А — см. tests/flashcards_liquid_hub_source_contract.test.mjs (последний тест).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const hub = readFileSync('app/flashcards/FlashcardsHubScreen.tsx', 'utf8');
const view = readFileSync('app/flashcards/CardsHubV2.tsx', 'utf8');
assert.doesNotMatch(hub + view, /borderWidth: (?!StyleSheet\.hairlineWidth)/, 'thick outlines must not return to the Cards hub (1px hairline edges are allowed)');
assert.match(hub, /pathname: '\/flashcards_collection'/);
assert.match(hub, /router\.push\('\/flashcards_my_packs' as never\)/);
assert.match(hub, /router\.push\('\/flashcards_packs' as never\)/);
assert.match(hub, /router\.push\('\/flashcards_video_packs' as never\)/);
console.log('flashcards hub contract: PASS');
