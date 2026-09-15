import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const finale = read('components/mistake-practice/MistakeSessionFinale.tsx');
const screen = read('app/mistake_practice_session.tsx');

// зачем (владелец 2026-09-14, макет финала А): вместо галочки и «+15 XP ★ 0» —
// кольцо результата, три награды крупно, исправленные фразы со штампом,
// серия, цель недели и звание.
describe('mistake session finale contract', () => {
  test('shows the ring, three rewards and the fixed phrases', () => {
    expect(finale).toContain('ResultRing');
    expect(finale).toContain('AnimatedCountUpText');
    expect(finale).toContain('copy.forever');
    expect(finale).toContain('fixed.map');
    expect(finale).toContain('MISTAKE_WEEK_GOAL');
  });

  test('the old bare finale is gone from the session screen', () => {
    expect(screen).toContain('<MistakeSessionFinale');
    expect(screen).not.toContain('styles.completeIcon');
    expect(screen).not.toContain('styles.rewardRow');
    expect(screen).not.toContain("copy.sessionComplete}</Text>");
  });

  test('rewards are computed after corrections are written, never before', () => {
    // Иначе сегодняшнее исправление не попало бы в свою же серию.
    expect(screen).toContain('flushPendingMistakeCorrectionRewards({ accountScope, studyTarget })');
    expect(screen).toContain('buildMistakeRewardsSnapshot(journal.events)');
    expect(screen).toContain('grantMistakeWeekGoalReward({ weekKey: snapshot.weekKey })');
    expect(screen).toContain('snapshot.weekGoalReached');
  });

  test('a new title is announced only when it really went up', () => {
    expect(screen).toContain('titleFor(Math.max(0, snapshot.corrected - fixedNowRef.current.length))');
    expect(screen).toContain("snapshot.title.id !== before?.id");
  });

  test('no outlines, no font shrinking, no full-screen spinner', () => {
    expect(finale).not.toMatch(/borderWidth|borderColor/);
    expect(finale).not.toMatch(/adjustsFontSizeToFit/);
    expect(finale).not.toMatch(/ActivityIndicator/);
  });
});
