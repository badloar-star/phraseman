import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (relative) => readFileSync(new URL(`../${relative}`, import.meta.url), 'utf8');
const source = read('components/energy/EnergyInfoPopover.tsx');
const bar = read('components/EnergyBar.tsx');
const home = read('app/(tabs)/home.tsx');

test('one explicit-data popover host: EnergyBar (Home 2.0 has no energy popover)', () => {
  for (const prop of [
    'current: number',
    'capacity: number',
    'recoveryIntervalMs: number',
    'formattedTime: string',
    'isUnlimited: boolean',
  ]) assert.ok(source.includes(prop), `missing explicit prop: ${prop}`);
  assert.doesNotMatch(source, /useEnergy(?:Countdown)?/);
  assert.match(bar, /const popoverEligible = !hasPremiumAccess && focused && ownerActive/);
  assert.match(bar, /const popoverVisible = infoVisible && popoverEligible/);
  assert.match(bar, /visible: popoverVisible/);
  assert.match(bar, /<EnergyInfoPopover[\s\S]{0,160}visible=\{popoverVisible\}/);
  assert.match(bar, /if \(!popoverVisible && infoVisible\) \{[\s\S]{0,100}setInfoVisible\(false\)/);
  assert.match(bar, /popoverRequestGate\.isCurrent\(requestGeneration\)/);
  assert.match(bar, /<EnergyInfoPopover[\s\S]{0,700}current=\{current\}[\s\S]{0,700}formattedTime=\{formattedTime\}/);
  // зачем (51б): на Главной 2.0 поповера энергии нет, хост один — EnergyBar; второй не должен вернуться незаметно.
  assert.equal((home.match(/<EnergyInfoPopover\s/g) ?? []).length, 0);
});

test('owner eligibility mutates request refs only after commit', () => {
  assert.doesNotMatch(bar, /if \(popoverEligibleRef\.current && !popoverEligible\) popoverRequestGate\.invalidate\(\)/);
  assert.match(bar, /useLayoutEffect\(\(\) => \{[\s\S]{0,240}popoverEligibleRef\.current = popoverEligible;[\s\S]{0,160}popoverRequestGate\.invalidate\(\)/);
});

test('energy popover uses the 13-theme opaque liquid-glass material and real icon', () => {
  assert.match(source, /liquidGlassTokens\(liquidGlassThemeId\)/);
  assert.match(source, /backgroundColor: glass\.opaqueCard/);
  assert.match(source, /colors=\{\[glass\.selected, 'transparent'\]\}/);
  // зачем (владелец 12.10, стиль «Тень»): у окна нет обводки — отделяют тон и тень обёртки cardShadow.
  assert.doesNotMatch(source, /borderColor: glass\.glassEdge/);
  assert.match(source, /styles\.cardShadow/);
  assert.match(source, /<Ionicons name="flash" size=\{18\}/);
  assert.doesNotMatch(source, /⚡|♾️|BlurView|glassFill/);
});

test('energy popover preserves full text and approved current/full/unlimited states only', () => {
  assert.match(source, /copy\.cadence/);
  assert.match(source, /copy\.stockFull/);
  assert.match(source, /copy\.unlimited/);
  assert.match(source, /FONT_SCALE\[fontSize\] \/ FONT_SCALE\.medium/);
  assert.doesNotMatch(source, /numberOfLines|adjustsFontSizeToFit/);
  assert.doesNotMatch(source, /10(?:×|x| раз) faster|10 раз быстрее|Gift \+|Подарок \+|copy\.video|copy\.gift/);
});

test('energy popover keeps backdrop dismissal separate from scrollable modal content', () => {
  assert.match(source, /<Pressable[\s\S]{0,180}styles\.backdrop/);
  assert.match(source, /<Animated\.View[\s\S]{0,3000}<ScrollView/);
  assert.match(source, /accessibilityViewIsModal/);
  assert.match(source, /onAccessibilityEscape=\{requestClose\}/);
  assert.match(source, /onRequestClose=\{requestClose\}/);
  assert.doesNotMatch(source, /pointerEvents="none"[\s\S]{0,300}<ScrollView/);
  assert.match(source, /countdownValue: \{[\s\S]{0,120}flexShrink: 1/);
});

test('energy popover owns one guarded five-second lifecycle independent of changing callbacks', () => {
  assert.match(source, /useReduceMotion\(\)/);
  assert.match(source, /setTimeout\([\s\S]{0,500}5000/);
  assert.match(source, /onCloseRef\.current = onClose/);
  assert.match(source, /lifecycleGate\.isCurrent/);
  assert.match(source, /lifecycleGate\.startClosing/);
  assert.match(source, /if \(!lifecycleGate\.canEnter\(\)\) return undefined/);
  assert.match(source, /animation\.stopAnimation\(\)/);
  assert.doesNotMatch(source, /^  onCloseRef\.current = onClose;$/m);
  assert.doesNotMatch(source, /^  reduceMotionRef\.current = reduceMotion;$/m);
  assert.match(source, /useLayoutEffect\(\(\) => \{[\s\S]{0,160}onCloseRef\.current = onClose;[\s\S]{0,100}reduceMotionRef\.current = reduceMotion/);
});

test('every geometry-affecting key remounts the invisible measurement subtree', () => {
  assert.match(source, /const \{ width, height, fontScale \} = useWindowDimensions\(\)/);
  assert.match(source, /recoveryMinutes,/);
  assert.match(source, /Boolean\(formattedTime\),/);
  assert.match(source, /<ScrollView[\s\S]{0,120}key=\{measurementKey\}/);
  assert.match(source, /onContentSizeChange=\{handleContentSizeChange\}/);
  assert.match(source, /opacity: geometryReady \? animation : 0/);
  assert.match(source, /layout\.showArrow/);
  assert.match(source, /layout\.placement === 'above'/);
});
