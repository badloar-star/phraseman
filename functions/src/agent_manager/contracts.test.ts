import { HttpsError } from 'firebase-functions/v2/https';
import {
  assertManagerTaskTransition,
  parseManagerTaskDraft,
  parseManagerTaskResult,
  parseManagerAgent,
} from './contracts';

describe('Agent Manager contracts', () => {
  const draft = () => ({
    taskId: 'task-001',
    title: 'Разобрать рост ошибок',
    brief: 'Проверить динамику ошибок после релиза и подготовить безопасный план.',
    priority: 'high',
    deadlineAtMs: null,
    allowedScope: 'analysis_only',
    sourceLinks: [{ sourceType: 'report', sourceRef: `report:sha256:${'a'.repeat(64)}` }],
  });

  it('accepts a safe owner task draft', () => {
    expect(parseManagerTaskDraft(draft())).toMatchObject({ taskId: 'task-001', priority: 'high', status: 'draft' });
  });

  it('rejects unknown or unsafe manager task fields', () => {
    expect(() => parseManagerTaskDraft({ ...draft(), command: 'rm -rf /' })).toThrow(HttpsError);
    expect(() => parseManagerTaskDraft({ ...draft(), brief: 'x' })).toThrow(HttpsError);
    expect(() => parseManagerTaskDraft({ ...draft(), brief: `Не вставлять ${'sk-'}${'1'.repeat(20)} в задачу.` })).toThrow(HttpsError);
  });

  it('allows only the defined lifecycle', () => {
    expect(() => assertManagerTaskTransition('draft', 'planned')).not.toThrow();
    expect(() => assertManagerTaskTransition('planned', 'awaiting_approval')).not.toThrow();
    expect(() => assertManagerTaskTransition('draft', 'completed')).toThrow(HttpsError);
  });

  it('accepts a bounded redacted result but rejects a raw email address', () => {
    expect(parseManagerTaskResult({ summary: 'Найден рост ошибок на Android; подготовлен список проверок.', outcome: 'needs_review' })).toMatchObject({ outcome: 'needs_review' });
    expect(() => parseManagerTaskResult({ summary: 'Написать user@example.com', outcome: 'completed' })).toThrow(HttpsError);
  });

  it('parses a registered agent policy record', () => {
    expect(parseManagerAgent({
      schemaVersion: 1, agentId: 'qa', role: 'qa', label: 'Контроль качества', enabled: true,
      allowedScopes: ['analysis_only'], lastCheckInAtMs: 1,
    })).toMatchObject({ agentId: 'qa', role: 'qa' });
  });
});
