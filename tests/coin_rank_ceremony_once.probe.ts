import { readFileSync } from 'node:fs';

const screen = readFileSync('app/coin_rank.tsx', 'utf8');
const ceremony = readFileSync('components/level_up/CoinRankUpgradeCeremony.tsx', 'utf8');
if (!screen.includes("if (result.status === 'upgraded') return;")) throw new Error('ceremony is not gated on successful upgrade result');
if (!screen.includes('isCoinRankCeremonyBindingCurrent(')) throw new Error('ceremony lacks current binding guard');
if (!screen.includes('captureAccountGeneration()')) throw new Error('ceremony lacks account-generation guard');
if (!ceremony.includes('ceremony !== null')) throw new Error('ceremony visibility is not state-bound');

console.log('COIN RANK CEREMONY ONCE: PASS');
