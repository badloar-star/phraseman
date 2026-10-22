// зачем (владелец 21.10, реестр №9): жалоба в каждом задании нового курса — для всех; в жалобе урок, эпизод и тип задания,
// повтор той же жалобы не пишется, при открытии задания ничего не читается.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const player = read('app/learning_v2_direct_session_player_v1.tsx');
const reportModule = read('app/learning_v2_task_report_v1.ts');
const button = read('components/ReportErrorButton.tsx');

describe('Learning V2 task report (registry #9)', () => {
  it('the player flag uses its own transport, so the tester-only gate does not hide it in store builds', () => {
    expect(button).toContain('if (!REPORT_ERROR_ENABLED && !props.submitOverride) {');
    const at = player.indexOf('<ReportErrorButton');
    expect(at).toBeGreaterThan(-1);
    const block = player.slice(at, player.indexOf('/>', player.indexOf('submitOverride=', at)) + 2);
    expect(block).toContain('submitOverride={({ comment }) => submitLearningV2TaskReportV1({');
    for (const field of ['lessonOrdinal: runSummary.lessonOrdinal', 'sessionOrdinal: runSummary.sessionOrdinal', 'family: practice.family', 'interactionId: practice.interactionId']) {
      expect(block).toContain(field);
    }
  });

  it('the flag is mounted for every task: after the single practice guard, not inside a mode branch', () => {
    const guardAt = player.indexOf('if (!practice || !auxiliary) return null;');
    const flagAt = player.indexOf('<ReportErrorButton');
    expect(guardAt).toBeGreaterThan(-1);
    expect(flagAt).toBeGreaterThan(guardAt);
  });

  it('report carries lesson, episode and task type, dedupes per task and writes only on send', () => {
    expect(reportModule).toContain('`lv2:l${input.lessonOrdinal}:s${input.sessionOrdinal}:${input.family}:${input.interactionId}`');
    expect(reportModule).toContain('`lv2-task:${input.courseSessionId}:${input.interactionId}`');
    expect(reportModule).toContain('{ idempotencyKey },');
    expect(reportModule).toContain('if (reportedInThisProcess.has(idempotencyKey)) {');
    expect(reportModule).toContain("screen: 'learning_v2_session',");
    expect(reportModule).not.toMatch(/getDoc|getDocs|onSnapshot/);
  });
});
