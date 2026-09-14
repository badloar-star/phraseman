import fs from 'fs';
import path from 'path';

const read = (relativePath: string): string => fs.readFileSync(
  path.join(__dirname, '..', relativePath),
  'utf8',
);

describe('automatic Second chance presentation', () => {
  const events = read('app/events.ts');
  const hud = read('components/session_attempts/SessionAttemptsHud.tsx');
  const overlay = read('components/session_attempts/SessionAttemptGiftRescueOverlay.tsx');
  const hook = read('hooks/useSessionAttempts.ts');
  const learningV2Player = read('app/learning_v2_direct_session_player_v1.tsx');

  test('every mounted attempts HUD reacts to the durable rescue event', () => {
    expect(events).toContain('session_attempt_gift_rescued: undefined;');
    expect(hud).toContain("onAppEvent('session_attempt_gift_rescued'");
    expect(hud).toContain('setLocalGiftRescueSequence((current) => current + 1)');
    const adopted = hook.indexOf('adoptState(result.attemptsState);');
    const emitted = hook.indexOf("emitAppEvent('session_attempt_gift_rescued')", adopted);
    expect(adopted).toBeGreaterThan(0);
    expect(emitted).toBeGreaterThan(adopted);
  });

  test('shows the actual accumulated gift while hearts refill', () => {
    expect(overlay).toContain('<LevelSpinRewardArt');
    expect(overlay).toContain('rewardId="attempt_restore_all"');
    expect(overlay).toMatch(/transform:\s*\[[\s\S]*\{ scale: giftScale \}/);
    expect(overlay).toContain('useReduceMotion');
  });

  test('Learning V2 binds its HUD to the current session event and ignores historical global rescues on entry', () => {
    expect(learningV2Player).toContain('const attemptsReset = useSessionAttemptAutoReset({');
    expect(learningV2Player.match(/giftRescueSequence=\{attemptsReset\.giftRescueSequence\}/g)).toHaveLength(2);
    expect(learningV2Player.match(/giftRecoveryError=\{attemptsReset\.giftRecoveryError\}/g)).toHaveLength(2);
  });
});
