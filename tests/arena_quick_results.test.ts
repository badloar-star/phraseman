import fs from 'fs';
import path from 'path';
import {
  arenaQuickXpPresentation,
} from '../modules/arena/quick_result';

const ROOT = path.resolve(__dirname, '..');

describe('quick result is authoritative XP-only', () => {
  it('uses the exact server breakdown without recomputing XP', () => {
    expect(arenaQuickXpPresentation({
      starsEarned: 0,
      xpEarned: 30,
      xpBreakdown: {
        schemaVersion: 'arena-xp-breakdown.v1',
        baseXp: 10,
        correctBonusXp: 20,
        outcomeBonusXp: 0,
        totalXp: 30,
      },
    })).toEqual({
      baseXp: 10,
      modifiers: [{ kind: 'correct', xpDelta: 20 }],
      totalXp: 30,
    });
  });

  it('fails closed to the authoritative total when breakdown is missing or inconsistent', () => {
    expect(arenaQuickXpPresentation({ starsEarned: 0, xpEarned: 10 })).toEqual({
      baseXp: 10, modifiers: [], totalXp: 10,
    });
    expect(arenaQuickXpPresentation({
      starsEarned: 0,
      xpEarned: 30,
      xpBreakdown: {
        schemaVersion: 'arena-xp-breakdown.v1',
        baseXp: 10,
        correctBonusXp: 20,
        outcomeBonusXp: 0,
        totalXp: 31,
      },
    })).toEqual({ baseXp: 30, modifiers: [], totalXp: 30 });
  });

  it('mounts the shared sequence without season stars or client credit and preserves all Arena actions', () => {
    const results = fs.readFileSync(path.join(ROOT, 'app/arena_results.tsx'), 'utf8');
    const sequence = fs.readFileSync(path.join(ROOT, 'components/feedback/ResultsSequence.tsx'), 'utf8');
    expect(results).toContain("surfaceKind === 'quick_ready'");
    expect(results).toContain('<ResultsSequence');
    expect(results).toContain('showStars={false}');
    expect(results).toContain('onCtaPrimary');
    expect(results).toContain('onCtaSecondary');
    expect(results).toContain('onCtaTertiary');
    expect(results).not.toMatch(/registerXP|xp_manager|addXP|awardXP/);
    expect(sequence).toContain('showStars?: boolean');
    expect(sequence).toContain('onCtaTertiary?: () => void');
    expect(sequence).toContain('ctaTertiaryLabel?: string');
    expect(results).toContain("match?.mode !== 'quick' ? <ArenaRewards");
    expect(results).toContain("match?.mode !== 'quick' && reward?.spinAwarded");
  });

  it('does not stack Arena outcome sounds/confetti over the quick ResultsSequence', () => {
    const results = fs.readFileSync(path.join(ROOT, 'app/arena_results.tsx'), 'utf8');
    expect(results.match(/if \(match\.mode === 'quick'\) return;/g)).toHaveLength(2);
  });

  it('latches one private-first reward so a late breakdown cannot replay the sequence', () => {
    const results = fs.readFileSync(path.join(ROOT, 'app/arena_results.tsx'), 'utf8');
    expect(results).toContain('arenaQuickResultInitialState');
    expect(results).toContain('arenaQuickResultReduce(previous, {');
    expect(results).toContain("type: 'sync'");
    expect(results).toContain('match: response.match');
    expect(results).toContain("type: 'live'");
    expect(results).toContain('const quickPresentation =');
    expect(results).toContain('arenaQuickXpPresentation(quickReward)');
  });

  it('keeps quick results on an honest pending surface until a coherent terminal pair exists', () => {
    const results = fs.readFileSync(path.join(ROOT, 'app/arena_results.tsx'), 'utf8');
    expect(results).toContain("surfaceKind === 'neutral_pending'");
    expect(results).toContain("surfaceKind === 'quick_pending'");
    expect(results).toContain('arenaResultSurfaceKind({');
    expect(results).toContain("arenaText(lang, reportPending ? 'reportQueued' : 'awaitingRival')");
    expect(results).toContain('const match = quickPresentation?.match ?? live.value;');
    expect(results).toContain('const effectiveViewerSeat = quickPresentation?.viewerSeat ?? viewerSeat;');
  });
});
