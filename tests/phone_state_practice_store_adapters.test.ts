import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relative: string): string => fs.readFileSync(path.join(root, relative), 'utf8');

describe('practice stores use PhoneState as portable journal without deleting compatibility storage', () => {
  test('completed tasks, mistake facts and attempts commit immutable PhoneState facts', () => {
    expect(read('app/personal_plan_progress.ts')).toContain(
      "commitPhoneStatePracticeFact('completed_task'",
    );
    expect(read('app/mistake_practice_store.ts')).toContain(
      "commitPhoneStatePracticeFact('mistake'",
    );
    expect(read('app/personal_plan_attempt_events.ts')).toContain(
      "commitPhoneStatePracticeFact('attempt'",
    );
  });

  test('mutable plan and day runtime state use PhoneState registers', () => {
    expect(read('app/personal_plan_state.ts')).toContain(
      "commitPhoneStatePracticeRegister('personal_plan_state'",
    );
    expect(read('app/personal_plan_day_runtime_storage_adapter.ts')).toContain(
      "commitPhoneStatePracticeRegister(`day_runtime:${key}`",
    );
  });

  test('resumable mistake session remains explicitly device-only', () => {
    const source = read('app/mistake_practice_session_store.ts');
    expect(source).toContain('PHONE_STATE_DEVICE_ONLY_MISTAKE_SESSION');
    expect(source).not.toContain('commitPhoneStatePractice');
  });
});
