import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');

const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('legacy UI cue adapters', () => {
  test.each([
    'hooks/use-onboarding-sounds.ts',
    'hooks/use-message-received-cue.ts',
    'hooks/use-timer-tick-cue.ts',
  ])('%s no longer owns an Expo audio player', (relativePath) => {
    const source = read(relativePath);
    expect(source).not.toContain("from 'expo-audio'");
    expect(source).toContain('soundDirector.request');
  });

  test('onboarding milestones use semantic events', () => {
    const source = read('hooks/use-onboarding-sounds.ts');
    expect(source).toContain("playDemoCorrect: () => request('pm.learn.correct'");
    expect(source).toContain("playPlanReady: () => request('pm.complete.micro'");
    expect(source).toContain("playPurchaseSuccess: () => request('pm.reward.premium_open'");
  });

  test('timer and inbound-message cues use throttled catalog events', () => {
    expect(read('hooks/use-timer-tick-cue.ts')).toContain("soundDirector.request('pm.learn.timer_warning'");
    expect(read('hooks/use-message-received-cue.ts')).toContain("soundDirector.request('pm.system.info'");
  });
});
