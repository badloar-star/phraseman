import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

describe('Spin sound event contract', () => {
  const eventSource = readFileSync(join(process.cwd(), 'modules', 'audio', 'sound_events.ts'), 'utf8');
  const spinScreen = readFileSync(join(process.cwd(), 'app', 'level_reward_spin.tsx'), 'utf8');
  const finishLine = readFileSync(join(process.cwd(), 'components', 'LevelSpinFinishLine.tsx'), 'utf8');
  const rewardModal = readFileSync(join(process.cwd(), 'components', 'LevelSpinRewardModal.tsx'), 'utf8');

  test('ships dedicated assets for every Spin beat', () => {
    const names = [
      'pm_spin_button_press_v1.wav',
      'pm_spin_reel_start_v1.wav',
      'pm_spin_reel_loop_v1.wav',
      'pm_spin_reel_stop_rollback_v1.wav',
      'pm_spin_reward_lock_v1.wav',
      'pm_spin_reward_win_v1.wav',
      'pm_spin_reward_rare_v1.wav',
      'pm_spin_reward_premium_v1.wav',
    ];
    names.forEach((name) => {
      expect(existsSync(join(process.cwd(), 'assets', 'audio', 'sfx', 'v1', 'spin', name))).toBe(true);
    });
  });

  test('maps all motion and reward beats to dedicated events', () => {
    [
      'pm.spin.button_press',
      'pm.spin.reel_start',
      'pm.spin.reel_loop',
      'pm.spin.reel_stop_rollback',
      'pm.spin.reward_lock',
      'pm.spin.reward_win',
      'pm.spin.reward_rare',
      'pm.spin.reward_premium',
    ].forEach((eventId) => expect(eventSource).toContain(`'${eventId}'`));
    expect(finishLine).toContain("soundDirector.request('pm.spin.button_press'");
    expect(spinScreen).toContain("soundDirector.request('pm.spin.reel_start'");
    expect(finishLine).toContain("soundDirector.request('pm.spin.reel_loop'");
    expect(finishLine).toContain("soundDirector.request('pm.spin.reel_stop_rollback'");
    expect(rewardModal).toContain("soundDirector.request('pm.spin.reward_lock'");
    expect(rewardModal).toContain("'pm.spin.reward_win'");
  });

  test('keeps the rollback cue within the physical braking window', () => {
    expect(eventSource).toContain("'pm.spin.reel_stop_rollback': event(require('../../assets/audio/sfx/v1/spin/pm_spin_reel_stop_rollback_v1.wav'), 0.52, 90, 0, 1200, 'reward')");
  });
});
