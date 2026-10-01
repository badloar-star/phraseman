import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('reward sound surfaces', () => {
  test('visual reward surfaces request their dedicated events', () => {
    // D140 (владелец 2026-10-01): CollectibleDropModal удалён вместе с коллекциями.
    expect(fs.existsSync(path.join(root, 'components/CollectibleDropModal.tsx'))).toBe(false);
    // зачем (PM-206-A2): pm.reward.level_up убран из каталога — показ повышения переехал на Главную и звук не просил.
  });

  test('exam result and restored streak use exact semantic events', () => {
    expect(read('app/level_exam.tsx')).toContain("passed ? 'pm.complete.exam_pass' : 'pm.complete.exam_retry'");
    // зачем (01.10): кнопка заморозки серии была только в старой Главной V1 (удалена, 4169840e9);
    // звук pm.streak.saved остаётся в каталоге — заморозка для Plus сохраняется по D107.
  });

  test('toast payload can override the generic tone for exact events', () => {
    const events = read('app/events.ts');
    const toast = read('components/ActionToast.tsx');
    expect(events).toContain('soundEventId?: SoundEventId');
    expect(toast).toContain('payload.soundEventId ?? TOAST_SOUND_EVENTS[payload.type]');
    // зачем (PM-206, 01.10): пополнение энергии за осколки удалено вместе со звуком pm.energy.refilled.
  });
});
