import fs from 'node:fs';
import path from 'node:path';

// зачем (аудит R58 #11, координатор 15.10): «Пройти ещё раз» в диагностике сбрасывал счёт, но не массив ответов —
// он рос до 2×N, getResult уходил с поуровневого расчёта на грубый по баллу, и сохранялся неверный уровень.
// Сторож: и первый старт, и повтор очищают answersRef ДО перехода в фазу вопросов.
// CRLF в рабочей копии Windows — нормализуем, иначе поиск по переводу строки ломается (сторож source_guard_eol_normalized)
const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'diagnostic_test.tsx'), 'utf8').replace(/\r\n/g, '\n');

function body(name: string): string {
  const start = src.indexOf(`const ${name} = async () => {`);
  expect(start).toBeGreaterThan(-1);
  const end = src.indexOf('\n  };', start);
  return src.slice(start, end);
}

describe('diagnostic: every attempt starts with empty answers', () => {
  it.each(['tryStartDiagnosticQuiz', 'tryRestartDiagnosticQuiz'])('%s clears answersRef before the quiz phase', (name) => {
    const fn = body(name);
    const reset = fn.indexOf('answersRef.current = [];');
    const quiz = fn.indexOf("setPhase('quiz');");
    expect(reset).toBeGreaterThan(-1);
    expect(quiz).toBeGreaterThan(reset);
  });

  it('the reset is logged with the size of the discarded answers', () => {
    expect(src).toMatch(/\[DIAG-TEST\] restart: ответы сброшены/);
  });
});
