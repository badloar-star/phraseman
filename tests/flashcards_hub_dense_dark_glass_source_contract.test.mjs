import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('app/flashcards/FlashcardsHubScreen.tsx', 'utf8');

assert.match(source, /function HeaderGlassSheen\(\{ edge, tint, wash \}/, 'header keeps its existing bounded glass helper');
assert.match(source, /backgroundColor: `\$\{wash\}A6`/, 'header glass retains its readable tint without flattening the material');
assert.match(source, /Platform\.OS === 'android' \? 12 : 16/, 'header glass keeps its bounded native diffusion');
assert.match(source, /function LibraryRowSheen/, 'library material has a row-local passive sheen');
assert.match(source, /backgroundColor: g\.opaqueCard/, 'library rows use the approved opaque theme surface');
assert.match(source, /rgba\(239,241,255,0\.09\)/, 'library sheen uses the exact cool-white mock tint');
assert.match(source, /libraryRow: \{ minHeight: 58,/, 'library rows return to the original 2.0 geometry');
assert.match(source, /libraryIcon: \{ width: 38, height: 38,/, 'row icons return to the original 2.0 geometry');
assert.match(source, /libraryTitle: \{ fontSize: 14, lineHeight: 19,/, 'row typography must remain dense');
assert.match(source, /librarySubtitle: \{ fontSize: 11, lineHeight: 15,/, 'row supporting copy must remain dense');
assert.match(source, /trainDock: \{ paddingHorizontal: 20, paddingTop: 9 \}/, 'fixed CTA dock returns to the original spacing');
assert.match(source, /trainButton: \{ minHeight: 52,/, 'fixed CTA returns to the original 2.0 geometry');
assert.match(source, /trainText: \{ flexShrink: 1, fontSize: 14, lineHeight: 19,/, 'CTA typography must be compact');
assert.match(source, /savedArt=\{true\}/, 'saved library entry needs the approved card illustration');
assert.match(source, /require\('\.\.\/\.\.\/assets\/images\/v2\/cards_hub_saved\.webp'\)/, 'saved entry uses neutral card-and-plant art rather than a legacy theme path');
assert.match(source, /savedArt: \{ width: 36, height: 36 \}/, 'saved illustration fills the restored icon tile without clipping');

for (const route of [
  "'/flashcards_collection'",
  "'/flashcards_my_packs'",
  "'/flashcards_packs'",
  "'/flashcards_video_packs'",
]) {
  assert.match(source, new RegExp(route), `live library route missing: ${route}`);
}
assert.match(source, /count=\{savedCount\}/, 'saved count must remain live');
assert.match(source, /count=\{myPackCount\}/, 'my packs count must remain live');
assert.match(source, /count=\{communityPackCount\}/, 'community count must remain live');
assert.match(source, /count=\{null\}/, 'unavailable video count must stay honest');
assert.doesNotMatch(source, /borderWidth:/, 'full outlines must not return to Cards Hub chrome');
