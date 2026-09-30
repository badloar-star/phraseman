import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (file: string): string => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

const bar = read('components/EnergyBar.tsx');
const popover = read('components/energy/EnergyInfoPopover.tsx');
const popoverLayout = read('components/energy/energy_info_popover_layout.ts');
const home = read('app/(tabs)/home.tsx');
// зачем (PM-086, владелец 2026-09-24): components/EnergyCostBadge.tsx удалён
// целиком — ценники энергии убраны со всех кнопок. Проверки ниже на price
// удалены вместе с файлом; расход энергии (EnergyContext) не менялся.

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
  'backgroundColor: glass.opaqueCard',
  'borderColor: glass.glassEdge',
  'layout.arrowLeft',
  '1 энергия каждые',
  "ru: 'Через'",
  "ru: 'запас полон'",
]) assert.ok(popover.includes(marker), `EnergyInfoPopover contract missing: ${marker}`);
assert.ok(popoverLayout.includes('MAX_POPOVER_WIDTH = 220'), 'EnergyInfoPopover max-width contract missing');

assert.ok(!popover.includes('100 энергии в час'), 'technical video rate copy returned');
assert.ok(!popover.includes('10 раз быстрее'), 'retired video acceleration copy returned');
assert.ok(!popover.includes('Подарок +'), 'retired gift-capacity copy returned');
assert.ok(home.includes("from '../../components/energy/EnergyInfoPopover'"), 'Home does not reuse the shared popover host');
assert.equal((home.match(/<EnergyInfoPopover\s/g) ?? []).length, 1, 'Home must render exactly one shared energy popover');

const currencyStart = home.indexOf('testID="home-quickstart-currency-row"');
const tilesStart = home.indexOf('visibleQuickItems.map', currencyStart);
assert.ok(currencyStart >= 0 && tilesStart > currencyStart, 'quick-start currency row is missing');
const currencyBlock = home.slice(currencyStart, tilesStart);
assert.ok(currencyBlock.includes('testID="home-quickstart-energy"'), 'energy is not fixed in the quick-start balance row');
assert.ok(currencyBlock.includes('<EnergyIcon'), 'quick-start energy glyph is missing');
assert.ok(currencyBlock.includes('HomeRuneBalance'), 'rune balance is missing from the compact row');
const headerStart = home.indexOf('testID="home-header-secondary-actions"');
const profileStart = home.indexOf('renderHomeProfileButton()', headerStart);
assert.ok(headerStart >= 0 && profileStart > headerStart, 'home header boundaries are missing');
assert.ok(!home.slice(headerStart, profileStart).includes('<EnergyBar'), 'energy still occupies the home header');

console.log('ENERGY UI OWNER DIRECTION PROBE: PASS');
