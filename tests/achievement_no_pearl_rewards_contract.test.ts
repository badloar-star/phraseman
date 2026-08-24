import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const achievementSource = fs.readFileSync(path.join(root, 'app', 'achievements.ts'), 'utf8');
const screenSource = fs.readFileSync(path.join(root, 'app', 'achievements_screen.tsx'), 'utf8');

test('achievements no longer create, advertise, or grant pearl rewards', () => {
  const unlockStart = achievementSource.indexOf('const unlockOne');
  const unlockEnd = achievementSource.indexOf('const pad2', unlockStart);
  const unlockSource = achievementSource.slice(unlockStart, unlockEnd);

  expect(unlockSource).toContain('existing.shardClaimed = true;');
  expect(unlockSource).toContain('shardClaimed: true');
  expect(unlockSource).not.toContain('shardClaimed = false');
  expect(unlockSource).not.toContain('shardClaimed: false');

  expect(achievementSource).not.toContain('commitShardCreditOperation');
  expect(achievementSource).not.toContain('achievement_shard_payout_pending_v1:');
  expect(achievementSource).toContain('export const claimAchievementShardReward = async');
  expect(achievementSource).toContain('export const hasPendingShardReward = (');

  expect(screenSource).not.toContain('claimAchievementShardReward');
  expect(screenSource).not.toContain('hasPendingShardReward');
  expect(screenSource).not.toContain('onShardClaimed');
  expect(screenSource).not.toContain('+1 жемчужина');
});

test('legacy shardClaimed storage remains readable but cannot become a pending reward', () => {
  expect(achievementSource).toContain('shardClaimed?: boolean;');
  expect(achievementSource).toContain('shardClaimed: s.shardClaimed ?? true');
  expect(achievementSource).toContain('export const hasPendingShardReward = (');
  expect(achievementSource).toContain('): boolean => false;');
});
