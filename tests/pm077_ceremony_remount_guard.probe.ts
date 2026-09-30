import { readFileSync } from 'node:fs';

const ceremony = readFileSync('components/level_up/LevelUpMintCeremony.tsx', 'utf8');
const adapter = readFileSync('components/level_up/CoinRankUpgradeCeremony.tsx', 'utf8');
const screen = readFileSync('app/coin_rank.tsx', 'utf8');

for (const marker of ['useRef(false)', 'doneRef.current', 'if (doneRef.current)', 'visible={ceremony !== null}']) {
  const source = marker.includes('visible=') ? adapter : ceremony;
  if (!source.includes(marker)) throw new Error(`PM-077 missing guard marker: ${marker}`);
}
if (!screen.includes('visibleCeremony') || !screen.includes('dismissCeremony')) {
  throw new Error('PM-077 parent does not dismiss the ceremony state after completion');
}

console.log('PM-077 REMOUNT GUARD: PASS');
