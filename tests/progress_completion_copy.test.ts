import { readFileSync } from 'fs';

describe('completion copy retirement gate', () => {
  test('does not restore retired competitive-mode copy', () => {
    const source = readFileSync(require.resolve('../app/completion/progress_completion_copy'), 'utf8');
    expect(source.toLowerCase()).not.toContain(['ar', 'ena'].join(''));
  });
});
