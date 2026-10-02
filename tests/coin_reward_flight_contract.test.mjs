// зачем (D75, PM-052): один полёт монет на всё приложение с утверждённой кривой, таймингами
// и одним звуком отрыва; летит монета, а не руна. Требования координатора 02.10: UI-поток,
// ≤8 частиц, «уменьшить движение» — без полёта и сразу onDone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const coin = readFileSync('components/rewards/CoinRewardFlight.tsx', 'utf8');
const asset = readFileSync('components/home/homeRuneAsset.ts', 'utf8');
const sounds = readFileSync('modules/audio/sound_events.ts', 'utf8');

test('API прежний: from, to, count, onDone; старый компонент удалён', () => {
  assert.match(coin, /from: CoinRewardFlightPoint;\s*to: CoinRewardFlightPoint;\s*count: CoinRewardFlightCount;\s*onDone: \(\) => void;/);
  assert.match(coin, /export type CoinRewardFlightCount = 1 \| 2 \| 3 \| 4 \| 6;/);
  assert.equal(existsSync('components/LearningV2RuneFlight.tsx'), false);
});

test('утверждённая кривая и тайминги, анимация в UI-потоке, без бесконечных циклов', () => {
  assert.match(coin, /const FLIGHT_MS = 620;/);
  assert.match(coin, /const STAGGER_MS = 90;/);
  assert.match(coin, /Easing\.bezier\(0\.33, 0\.52, 0\.25, 0\.99\)/);
  assert.match(coin, /useAnimatedStyle\(/);
  assert.doesNotMatch(coin, /withRepeat\(/);
});

test('«уменьшить движение» — без полёта и сразу onDone; потолок частиц 8', () => {
  assert.match(coin, /useReducedMotion\(\)/);
  assert.match(coin, /if \(!reducedMotion\) return;[\s\S]{0,120}onDoneRef\.current\(\);/);
  assert.match(coin, /if \(reducedMotion\) return null;/);
  assert.match(coin, /COIN_REWARD_FLIGHT_MAX_PARTICLES = 8;/);
  assert.match(coin, /Math\.min\(count, COIN_REWARD_FLIGHT_MAX_PARTICLES\)/);
});

test('летит монета и звучит монетный звук отрыва', () => {
  assert.match(asset, /coins\/coin_rank_00\.webp/);
  assert.match(coin, /source=\{COIN_ICON_SOURCE\}/);
  assert.match(coin, /soundDirector\.request\('pm\.coin\.flight_start'/);
  assert.match(sounds, /'pm\.coin\.flight_start': event\(/);
  assert.doesNotMatch(sounds, /'pm\.reward\.rune_flight_start'/);
});
