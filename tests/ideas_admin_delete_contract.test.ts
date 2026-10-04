import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

describe('community ideas admin delete contract', () => {
  test('uses only the live admin surface and the callable soft-delete path', () => {
    const html = read('admin/v2/legacy.html');
    const functions = read('functions/src/user_ideas.ts');
    expect(html).toContain("'adminDeleteUserIdea'");
    expect(html).toContain('data-idea-delete');
    // зачем (04.10): блок «Удалённые из публичного списка» снят в 2.0 — проверка удалена; мягкое удаление через callable осталось.
    expect(functions).toContain('export const adminDeleteUserIdea');
    expect(functions).toContain('export const adminSetUserIdeaStatus');
    expect(functions).toContain("'in_progress'");
    expect(functions).toContain("'implemented'");
    expect(functions).toContain("status: 'deleted'");
    expect(functions).toContain('deleteReason');
    expect(html).toContain("setUserIdeaLifecycleStatus('${id}','in_progress',this)");
    expect(html).toContain('function hydrateAdminIdeaState');
    expect(html).toContain('const USER_IDEAS_MAX = 5000');
  });

  test('does not add a second admin surface', () => {
    const html = read('admin/v2/legacy.html');
    expect(html).toContain('Идеи пользователей');
    // зачем (04.10): старая admin/legacy.html удалена снимком 2.0 (efe19ae9d) — вторая поверхность не должна вернуться.
    expect(fs.existsSync(path.join(__dirname, '..', 'admin/legacy.html'))).toBe(false);
  });
});
