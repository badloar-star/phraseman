import { existsSync, readFileSync } from 'node:fs';

const required = [
  'components/AvatarView.tsx',
  'components/dialogs/DialogueV2CatalogueSection.tsx',
  'components/friends_together/FriendStudyInviteModal.tsx',
  'components/PlayerProfileModal.tsx',
  'app/(tabs)/home.tsx',
];
for (const file of required) {
  const source = readFileSync(file, 'utf8');
  if (!source.includes('coin_rank_table_v1')) throw new Error(`missing shared coin resolver: ${file}`);
}
const table = readFileSync('app/coin_rank_table_v1.ts', 'utf8');
if (!table.includes('coinRankRowForDisplay') || !table.includes('COIN_RANK_MAX')) {
  throw new Error('canonical coin rank table contract missing');
}
if (existsSync('app/avatar_select.tsx') || existsSync('app/avatar_dna_studio.tsx')) throw new Error('legacy avatar library still present');

console.log('COIN IDENTITY RESOLVER: PASS');
