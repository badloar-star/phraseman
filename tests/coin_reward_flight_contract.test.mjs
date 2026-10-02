// зачем (D75, PM-052): один полёт монет на всё приложение — монетное имя обязано вести
// на утверждённую реализацию (кривая/тайминги/звук), а летящий ассет — быть монетой, не руной.
// Требования координатора 02.10: UI-поток, ≤8 частиц, «уменьшить движение» — без полёта.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const coin = readFileSync('components/rewards/CoinRewardFlight.tsx', 'utf8');
const impl = readFileSync('components/LearningV2RuneFlight.tsx', 'utf8');
const asset = readFileSync('components/home/homeRuneAsset.ts', 'utf8');

test('CoinRewardFlight — тот же полёт под монетным именем, API прежний', () => {
  assert.match(coin, /export const CoinRewardFlight = memo\(function CoinRewardFlight\(props: CoinRewardFlightProps\)/);
  assert.match(coin, /<LearningV2RuneFlight from=\{props\.from\} to=\{props\.to\} count=\{count\} onDone=\{props\.onDone\} \/>/);
  assert.match(coin, /from: CoinRewardFlightPoint;\s*to: CoinRewardFlightPoint;\s*count: CoinRewardFlightCount;\s*onDone: \(\) => void;/);
  assert.match(coin, /export type CoinRewardFlightCount = 1 \| 2 \| 3 \| 4 \| 6;/);
});

test('утверждённая кривая и тайминги не менялись, анимация в UI-потоке', () => {
  assert.match(impl, /const FLIGHT_MS = 620;/);
  assert.match(impl, /const STAGGER_MS = 90;/);
  assert.match(impl, /Easing\.bezier\(0\.33, 0\.52, 0\.25, 0\.99\)/);
  assert.match(impl, /useAnimatedStyle\(/);
  assert.doesNotMatch(impl, /withRepeat\(/);
});

test('«уменьшить движение» — без полёта и сразу onDone; потолок частиц 8', () => {
  assert.match(coin, /useReducedMotion\(\)/);
  assert.match(coin, /if \(!reducedMotion\) return;[\s\S]{0,120}onDoneRef\.current\(\);/);
  assert.match(coin, /if \(reducedMotion\) return null;/);
  assert.match(coin, /COIN_REWARD_FLIGHT_MAX_PARTICLES = 8;/);
});

test('летит монета, а не руна', () => {
  assert.match(asset, /coins\/coin_rank_00\.webp/);
  assert.match(impl, /source=\{HOME_RUNE_ICON_SOURCE\}/);
});
