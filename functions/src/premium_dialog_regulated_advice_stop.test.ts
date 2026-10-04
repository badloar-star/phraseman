/**
 * 04.10: голосовой модуль MAX удалён; его тест сверял копию правила REGULATED ADVICE HARD STOP с premium_dialog.ts.
 * Копии больше нет, но само правило в живом диалоге обязано остаться — сторожим его наличие.
 */
import fs from 'fs';
import path from 'path';

test('premium dialog keeps the regulated-advice hard stop paragraph', () => {
  const source = fs.readFileSync(path.join(__dirname, 'premium_dialog.ts'), 'utf8');
  expect(source).toMatch(/REGULATED ADVICE HARD STOP:[\s\S]*?safe practice phrase\./);
});
