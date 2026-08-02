import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('reward sound surfaces', () => {
  test('visual reward surfaces request their dedicated events', () => {
    expect(read('components/AchievementToast.tsx')).toContain("soundDirector.request('pm.reward.achievement'");
    expect(read('components/CollectibleDropModal.tsx')).toContain("soundDirector.request('pm.reward.collectible'");
    expect(read('components/BoonChestModal.tsx')).toContain("soundDirector.request('pm.reward.chest_open'");
    expect(read('components/DailyTaskRewardToast.tsx')).toContain("soundDirector.request('pm.social.quest_complete'");
    expect(read('app/_layout.tsx')).toContain("soundDirector.request('pm.reward.level_up'");
  });

  test('exam result and restored streak use exact semantic events', () => {
    expect(read('app/level_exam.tsx')).toContain("passed ? 'pm.complete.exam_pass' : 'pm.complete.exam_retry'");
    expect(read('app/(tabs)/home.tsx')).toContain("soundDirector.request('pm.streak.saved'");
  });

  test('toast payload can override the generic tone for exact events', () => {
    const events = read('app/events.ts');
    const toast = read('components/ActionToast.tsx');
    expect(events).toContain('soundEventId?: SoundEventId');
    expect(toast).toContain('payload.soundEventId ?? TOAST_SOUND_EVENTS[payload.type]');
    expect(read('components/GlobalFriendGiftHost.tsx')).toContain("soundEventId: 'pm.social.gift_received'");
    expect(read('app/energy_shard_refill.ts')).toContain("soundEventId: 'pm.energy.refilled'");
  });
});
