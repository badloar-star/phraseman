import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relative: string): string => fs.readFileSync(path.join(root, relative), 'utf8');

describe('practice stores use PhoneState as portable journal without deleting compatibility storage', () => {
  // снято 10.10: личный план удалён в 2.0 (personal_plan_progress/state больше нет)

  // снято 10.10: личный план удалён в 2.0 (personal_plan_progress/state больше нет)

  test('resumable mistake session remains explicitly device-only', () => {
    const source = read('app/mistake_practice_session_store.ts');
    expect(source).toContain('PHONE_STATE_DEVICE_ONLY_MISTAKE_SESSION');
    expect(source).not.toContain('commitPhoneStatePractice');
  });
});
