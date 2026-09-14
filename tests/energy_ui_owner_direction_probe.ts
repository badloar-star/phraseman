import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (file: string): string => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

const bar = read('components/EnergyBar.tsx');
const popover = read('components/energy/EnergyInfoPopover.tsx');
const price = read('components/EnergyCostBadge.tsx');
const home = read('app/(tabs)/home.tsx');

for (const marker of [
  'const ENERGY_PILL_WIDTH = 60',
  'const ENERGY_PILL_HEIGHT = 28',
  'const ENERGY_PILL_TOUCH_HEIGHT = 44',
  'valueCompact: { width: 36, height: 21, fontSize: 15',
  'const { hasPremiumAccess } = usePremium()',
  'if (hasPremiumAccess) return null',
  'measureInWindow',
  'anchor={popoverAnchor}',
]) assert.ok(bar.includes(marker), `EnergyBar contract missing: ${marker}`);
assert.ok(!bar.includes('showWhenPremium'), 'premium energy indicator bypass returned');
assert.ok(!bar.includes('borderWidth: 1'), 'energy pill outline returned');

const animatedNumber = read('components/energy/AnimatedEnergyNumber.tsx');
assert.ok(animatedNumber.includes('maxFontSizeMultiplier={1.15}'), 'three-digit energy is not protected from font-scale clipping');

for (const marker of [
  'const POPOVER_WIDTH = 220',
  "backgroundColor: '#1C1C1E'",
  'energyArrowLeft',
  '1 энергия каждые',
  "ru: 'Через'",
  'При просмотре видео энергия восстанавливается в 10 раз быстрее',
]) assert.ok(popover.includes(marker), `EnergyInfoPopover contract missing: ${marker}`);

assert.ok(!popover.includes("ru: 'Следующая единица'"), 'new large-card copy returned');
assert.ok(!popover.includes("ru: 'Полный заряд'"), 'new large-card copy returned');
assert.ok(price.includes('const { hasPremiumAccess } = usePremium()'), 'energy price badge ignores verified Premium access');
assert.ok(
  price.includes('if (hasPremiumAccess || !energyReady || isUnlimited || cost === 0) return null'),
  'paid users still see energy prices',
);
assert.ok(!popover.includes('100 энергии в час'), 'technical video rate copy returned');

const currencyStart = home.indexOf('testID="home-quickstart-currency-row"');
const tilesStart = home.indexOf('visibleQuickItems.map', currencyStart);
assert.ok(currencyStart >= 0 && tilesStart > currencyStart, 'quick-start currency row is missing');
const currencyBlock = home.slice(currencyStart, tilesStart);
assert.ok(currencyBlock.includes('<EnergyBar'), 'energy is not fixed in the quick-start balance row');
assert.ok(currencyBlock.indexOf('<EnergyBar') < currencyBlock.indexOf('testID="home-quickstart-shards"'), 'energy must be the first compact balance');
assert.ok(currencyBlock.includes('compactFromThousands'), 'large rune balances are not compacted in the home row');
assert.ok(currencyBlock.includes('formatCompactNumber(rewardCollect.displayShards(shardsBalance))'), 'large pearl balances are not compacted');
const headerStart = home.indexOf('testID="home-header-secondary-actions"');
const profileStart = home.indexOf('renderHomeProfileButton()', headerStart);
assert.ok(headerStart >= 0 && profileStart > headerStart, 'home header boundaries are missing');
assert.ok(!home.slice(headerStart, profileStart).includes('<EnergyBar'), 'energy still occupies the home header');

console.log('ENERGY UI OWNER DIRECTION PROBE: PASS');
