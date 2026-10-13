import fs from 'fs';
import path from 'path';

/**
 * зачем (аудит Optimistic UI 13.10): результат 'cancelled' гейта первого вопроса — сбой (хранилище энергии не прочиталось,
 * журнал не записался, сменился аккаунт), а 5 экранов молча уходили назад. Сторож: перед onCancelled — тост с причиной.
 */
describe('useFirstQuestionEnergyGate — отказ списания не молчит', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'hooks', 'useFirstQuestionEnergyGate.ts'), 'utf8');

  it('ветка cancelled показывает action_toast перед onCancelled', () => {
    const branch = src.slice(src.indexOf("if (result === 'insufficient') onInsufficientRef.current?.();"));
    const toastAt = branch.indexOf("emitAppEvent('action_toast'");
    const cancelAt = branch.indexOf('onCancelledRef.current?.()');
    expect(toastAt).toBeGreaterThan(0);
    expect(cancelAt).toBeGreaterThan(toastAt);
  });

  it('тост есть на всех 9 языках интерфейса', () => {
    for (const key of ['ru:', 'uk:', 'en:', 'es:', "'pt-BR':", 'vi:', 'id:', 'tr:', 'pl:']) {
      expect({ key, present: src.includes(key) }).toEqual({ key, present: true });
    }
  });
});
