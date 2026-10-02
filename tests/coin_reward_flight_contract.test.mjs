// зачем (D75, PM-052): один полёт монет на всё приложение — монетное имя обязано вести
// на утверждённую реализацию (кривая/тайминги/звук), а летящий ассет — быть монетой, не руной.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const coin = readFileSync('components/rewards/CoinRewardFlight.tsx', 'utf8');
const impl = readFileSync('components/LearningV2RuneFlight.tsx', 'utf8');
const asset = readFileSync('components/home/homeRuneAsset.ts', 'utf8');

test('CoinRewardFlight — тот же полёт под монетным именем, API прежний', () => {
  assert.match(coin, /export const CoinRewardFlight: NamedExoticComponent<CoinRewardFlightProps> = LearningV2RuneFlight;/);
  assert.match(coin, /from: CoinRewardFlightPoint;\s*to: CoinRewardFlightPoint;\s*count: CoinRewardFlightCount;\s*onDone: \(\) => void;/);
  assert.match(coin, /export type CoinRewardFlightCount = 1 \| 2 \| 3 \| 4 \| 6;/);
});

test('утверждённая кривая и тайминги не менялись', () => {
  assert.match(impl, /const FLIGHT_MS = 620;/);
  assert.match(impl, /const STAGGER_MS = 90;/);
  assert.match(impl, /Easing\.bezier\(0\.33, 0\.52, 0\.25, 0\.99\)/);
  assert.doesNotMatch(impl, /withRepeat/);
});

test('летит монета, а не руна', () => {
  assert.match(asset, /coins\/coin_rank_00\.webp/);
  assert.match(impl, /source=\{HOME_RUNE_ICON_SOURCE\}/);
});
