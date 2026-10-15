// Отказ старта занятия на энергии ('cancelled') → тост «Не получилось начать» (координатор 15.10, аудит Optimistic UI п.3).
// зачем: экзамен, экзамен уровня и диагностика молча возвращались на вступление — тап выглядел мёртвым. Сработал — чини логику.
import fs from 'node:fs';
import path from 'node:path';

const mockEmit = jest.fn();
jest.mock('../app/events', () => ({
  emitAppEvent: (...a: unknown[]) => mockEmit(...a),
  actionToastTri: (type: string, m: Record<string, string>) => ({ type, messageRu: m.ru, messageUk: m.uk, messageEn: m.en }),
}));

import { notifyActivityStartFailed } from '../app/activity_start_failed_toast';

describe('notifyActivityStartFailed', () => {
  beforeEach(() => {
    mockEmit.mockClear();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('экран открыт → один error-тост с одобренным текстом', () => {
    notifyActivityStartFailed('exam', { current: true });
    expect(mockEmit).toHaveBeenCalledTimes(1);
    expect(mockEmit).toHaveBeenCalledWith('action_toast', {
      type: 'error', messageRu: 'Не получилось начать. Попробуй ещё раз', messageUk: 'Не вдалося почати. Спробуй ще раз', messageEn: 'Could not start. Please try again',
    });
  });

  it('экран уже закрыт → тоста нет (не всплывает поверх чужого экрана)', () => {
    notifyActivityStartFailed('exam', { current: false });
    expect(mockEmit).not.toHaveBeenCalled();
  });
});

describe('проводка: каждый отказ старта на энергии в этих экранах зовёт тост', () => {
  const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
  it.each([
    ['app/exam.tsx', 1],
    ['app/level_exam.tsx', 1],
    ['app/diagnostic_test.tsx', 2],
  ])('%s', (file, count) => {
    const src = read(file);
    expect(src).toContain('const screenOpenRef = useScreenOpenRef();');
    expect(src.match(/if \(energyResult === 'cancelled'\) \{[^}]*notifyActivityStartFailed\(/g)?.length).toBe(count);
    expect(src).not.toMatch(/if \(energyResult === 'cancelled'\) return;/);
  });
});
