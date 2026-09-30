import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const screenPath = 'app/coin_rank.tsx';
const screen = fs.existsSync(screenPath) ? fs.readFileSync(screenPath, 'utf8') : '';
const home = fs.readFileSync('app/(tabs)/home.tsx', 'utf8');
const layout = fs.readFileSync('app/_layout.tsx', 'utf8');

test('rank section uses the approved table, guarded upgrade hook and native mint ceremony', () => {
  assert.notEqual(screen, '', 'app/coin_rank.tsx must exist');
  assert.match(screen, /useCoinRankUpgrade/);
  assert.match(screen, /coinRankRowForDisplay\(rank\)/);
  assert.match(screen, /<CoinRankUpgradeCeremony\s+ceremony=\{visibleCeremony\}\s+onDone=\{dismissCeremony\}/s);
  assert.doesNotMatch(screen, /const\s+LEVELS\s*=|Оракул|Ловец идиом|Душа компании/);
});

test('rank section subscribes to the established local wallet projection without inventing unknown values', () => {
  assert.match(screen, /peekRunes\(\)/);
  assert.match(screen, /getRunesBalanceRead\(\)/);
  assert.match(screen, /subscribeAppSnapshot/);
  assert.match(screen, /subscribeAccountGeneration/);
  assert.match(screen, /useState<number \| null>/);
  assert.match(screen, /rank === null \? null : coinRankRowForDisplay\(rank\)/);
});

test('rank section respects both safe areas and active Liquid Glass tint', () => {
  assert.match(screen, /useStableSafeAreaInsets\(\)/);
  assert.match(screen, /paddingTop:\s*insets\.top/);
  assert.match(screen, /paddingBottom:\s*insets\.bottom/);
  assert.match(screen, /liquidGlassTokens\(liquidGlassThemeId\)/);
  assert.match(screen, /V2GlassSheen/);
});

test('Home coins stat opens the active rank section and the route is registered', () => {
  const coinsBlock = home.slice(home.indexOf("testID: 'home-v2-coins'"), home.indexOf("testID: 'home-v2-coins'") + 1200);
  assert.match(coinsBlock, /onPress:\s*\(\)\s*=>\s*\{\s*nav\.push\('\/coin_rank'\);\s*\}/);
  assert.match(layout, /<Stack\.Screen name="coin_rank"\s*\/>/);
});

