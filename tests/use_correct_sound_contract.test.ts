import fs from 'fs';
import path from 'path';

describe('useCorrectSound', () => {
  /**
   * зачем (решение владельца, подтверждено 2026-09-15): вердикт ответа
   * выражается ТОЛЬКО вибрацией. Раньше этот тест требовал ОБРАТНОГО — чтобы
   * хук просил звук верного ответа, — и охранял правило, уже отменённое
   * контрактом tests/learning_verdict_sounds_removed_contract.mjs. Два сторожа
   * требовали противоположного, и звук вернулся в обход решения.
   *
   * Хук намеренно сохраняет интерфейс (у него одиннадцать точек вызова на трёх
   * экранах) и остаётся пустым: переписывать вызывающих значило бы трогать
   * логику ответов и начисление опыта ради удаления звука.
   */
  test('стоит тихо: вердикт ответа больше не озвучивается', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'hooks', 'use-correct-sound.ts'), 'utf8');

    expect(source).not.toContain('soundDirector');
    expect(source).not.toContain('pm.learn.correct');
    // Интерфейс сохранён — вызывающие экраны не тронуты.
    expect(source).toContain('export function useCorrectSound()');
    expect(source).toContain('playCorrect');
  });
});
