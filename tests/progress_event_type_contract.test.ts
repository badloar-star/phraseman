import { readFileSync } from 'fs';
import path from 'path';

const repoRoot = process.cwd();
function extractQuotedUnionValues(source: string, typeName: string): string[] {
  const match = source.match(new RegExp(`export type ${typeName} =[\\s\\S]*?;`));
  if (!match) throw new Error(`${typeName} union not found`);
  return Array.from(match[0].matchAll(/'([^']+)'/g)).map((item) => item[1]);
}

function extractConstArrayValues(source: string, constName: string): string[] {
  const match = source.match(new RegExp(`export const ${constName} = \\[[\\s\\S]*?\\] as const;`));
  if (!match) throw new Error(`${constName} array not found`);
  return Array.from(match[0].matchAll(/'([^']+)'/g)).map((item) => item[1]);
}

describe('progress event type contract', () => {
  it('keeps client and Cloud Function progress event types in lockstep', () => {
    const client = readFileSync(path.join(repoRoot, 'app/progress_events_client.ts'), 'utf8');
    const server = readFileSync(path.join(repoRoot, 'functions/src/progress_events.ts'), 'utf8');

    const clientTypes = extractQuotedUnionValues(client, 'ProgressEventType');
    const serverTypes = extractConstArrayValues(server, 'PROGRESS_EVENT_TYPES');

    expect(clientTypes).toEqual(serverTypes);
  });

  it('keeps every positive XP source routed to a server progress event', () => {
    const xpManager = readFileSync(path.join(repoRoot, 'app/xp_manager.ts'), 'utf8');
    const client = readFileSync(path.join(repoRoot, 'app/progress_events_client.ts'), 'utf8');
    const xpSources = extractQuotedUnionValues(xpManager, 'XPSource').filter((source) => source !== 'wager_bet');
    const eventTypes = extractQuotedUnionValues(client, 'ProgressEventType');

    expect(xpSources.sort()).toEqual(eventTypes.sort());
    for (const source of xpSources) {
      expect(xpManager).toContain(`case '${source}':`);
    }
    expect(xpManager).toContain("case 'wager_bet':");
    expect(xpManager).toMatch(/case 'wager_bet':\s*return null;/);
  });

  it('covers direct lesson completion and registerXP-backed exam completion', () => {
    const lessonComplete = readFileSync(path.join(repoRoot, 'app/lesson_complete.tsx'), 'utf8');
    const levelExam = readFileSync(path.join(repoRoot, 'app/level_exam.tsx'), 'utf8');
    const finalExam = readFileSync(path.join(repoRoot, 'app/exam.tsx'), 'utf8');

    expect(lessonComplete).toContain("type: 'lesson_complete'");
    expect(lessonComplete).toContain("xpDelta: 0");
    expect(lessonComplete).toContain('studyTarget');

    expect(levelExam).toContain("registerXP(examXp, 'exam_complete'");
    expect(levelExam).toContain('safeLevelExamEventPart(studyTarget)');
    expect(levelExam).toContain('attemptNumber');
    expect(levelExam).toContain('studyTarget');

    expect(finalExam).toContain("registerXP(xp, 'exam_complete'");
    expect(finalExam).toContain('safeExamEventPart(studyTarget)');
    expect(finalExam).toContain('studyTarget');
  });

  it('keeps client migration snapshot scoped to server-owned progress only', () => {
    const client = readFileSync(path.join(repoRoot, 'app/progress_events_client.ts'), 'utf8');

    expect(client).toContain("const TARGETS = ['en', 'fr'] as const");
    expect(client).toContain('for (let i = 1; i <= 80; i += 1)');
    expect(client).toContain("keys.add(lessonFieldKey(i, 'best_score', target));");
    expect(client).toContain("keys.add(lessonFieldKey(i, 'pass_count', target));");
    expect(client).toContain('keys.add(lessonProgressKey(i, target));');
    expect(client).toContain("keys.add(lessonFieldKey(i, 'cellIndex', target));");
    expect(client).not.toContain("'bonus_granted', target");
    for (const field of ['pct', 'best_pct', 'passed', 'pass_count', 'completed_at']) {
      expect(client).toContain(`keys.add(levelExamFieldKey(level, '${field}', target));`);
    }
  });
});
