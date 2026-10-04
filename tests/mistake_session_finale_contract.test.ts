import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const finale = read('components/mistake-practice/MistakeSessionFinale.tsx');
const screen = read('app/mistake_practice_session.tsx');

// зачем (владелец 2026-09-14, макет финала А): вместо галочки и «+15 XP ★ 0» —
// кольцо результата, три награды крупно, исправленные фразы со штампом,
// серия, цель недели и звание.
describe('mistake session finale contract', () => {
  test('shows the ring, the three counts, coins and the fixed phrases', () => {
    // 04.10 (макет «Панель», «Итог отработки»): кольцо «верно», три числа, строка монет, список исправленных с тремя полосками.
    expect(finale).toContain('PanelRing');
    expect(finale).toContain('AnimatedCountUpText');
    expect(finale).toContain('copy.fixedFully');
    expect(finale).toContain('fixed.map');
  });

  test('the old bare finale is gone from the session screen', () => {
    expect(screen).toContain('<MistakeSessionFinale');
    expect(screen).not.toContain('styles.completeIcon');
    expect(screen).not.toContain('styles.rewardRow');
    expect(screen).not.toContain("copy.sessionComplete}</Text>");
  });

  test('coins for corrections are flushed after the journal is written, and no streak or title is computed', () => {
    // Иначе награда за сегодняшнее исправление не догнала бы запись журнала.
    expect(screen).toContain('flushPendingMistakeCorrectionRewards({ accountScope, studyTarget })');
    // Владелец 04.10: звания и серию «убрать совсем» — ни расчёта, ни показа; цель недели удалена ещё 2026-09-15.
    expect(screen).not.toMatch(/buildMistakeRewardsSnapshot|titleFor\(|setNewTitle|rewardsSnapshot/);
    expect(finale).not.toMatch(/streakDays|newTitle|weekGoal|MISTAKE_WEEK_GOAL/);
    expect(screen).not.toMatch(/grantMistakeWeekGoalReward|weekGoalReached/);
  });

  test('no outlines, no font shrinking, no full-screen spinner', () => {
    expect(finale).not.toMatch(/borderWidth|borderColor/);
    expect(finale).not.toMatch(/adjustsFontSizeToFit/);
    expect(finale).not.toMatch(/ActivityIndicator/);
  });
});
