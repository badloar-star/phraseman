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
  // зачем (D139, 72c8cc0d2, владелец 01.10: единая шкала текста 16/13; координатор 12.10): цифра энергии — 16/22, прежние 15/21 устарели; ширину/высоту капсулы (60×28, владелец 24.09) выше не трогаем
  'valueCompact: { width: 36, height: 22, fontSize: 16',
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
  'layout.arrowLeft',
  '1 энергия каждые',
  "ru: 'Через'",
  "ru: 'запас полон'",
]) assert.ok(popover.includes(marker), `EnergyInfoPopover contract missing: ${marker}`);
assert.ok(popoverLayout.includes('MAX_POPOVER_WIDTH = 220'), 'EnergyInfoPopover max-width contract missing');
// зачем (стиль «Тень» 12.10, владелец: контейнеры без обводок): карточка поповера отделяется тоном и тенью — прежняя обводка glass.glassEdge снята, возвращать её нельзя
assert.ok(!/borderWidth|borderColor/.test(popover), 'energy popover outline returned');

assert.ok(!popover.includes('100 энергии в час'), 'technical video rate copy returned');
assert.ok(!popover.includes('10 раз быстрее'), 'retired video acceleration copy returned');
assert.ok(!popover.includes('Подарок +'), 'retired gift-capacity copy returned');
// зачем (D151, владелец 01.10, PM-043/PM-045): на Главной V2 энергию НЕ показываем — ни капсулой в шапке, ни строкой в быстром старте, ни поповером.
// Прежние проверки требовали общий поповер и строку баланса с энергией на Главной — они сторожили отменённое правило (координатор 12.10: «обнови пробу»).
assert.ok(!home.includes('EnergyInfoPopover'), 'D151: Home must not host the energy popover');
assert.ok(!home.includes('<EnergyBar'), 'D151: energy bar returned to Home');
assert.ok(!home.includes('home-quickstart-energy'), 'D151: energy row returned to Home quick start');

console.log('ENERGY UI OWNER DIRECTION PROBE: PASS');
