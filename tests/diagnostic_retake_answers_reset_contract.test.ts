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

  // Ревизор 15.10: одно нажатие — одно событие старта (событие после сторожа двойного тапа)
  it.each(['tryStartDiagnosticQuiz', 'tryRestartDiagnosticQuiz'])('%s sends the start event only after the double-tap guard', (name) => {
    const fn = body(name);
    const guard = fn.indexOf('if (diagnosticChargeInFlightRef.current) {');
    const event = fn.indexOf('void trackFeatureStart(');
    expect(guard).toBeGreaterThan(-1);
    expect(event).toBeGreaterThan(guard);
    expect(fn).toMatch(/двойной тап — старт уже идёт/);
  });

  it('the reset is logged with the size of the discarded answers', () => {
    expect(src).toMatch(/\[DIAG-TEST\] restart: ответы сброшены/);
  });
});
