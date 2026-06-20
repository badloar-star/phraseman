import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan exercise feedback modal contract', () => {
  const source = fs.readFileSync(path.join(ROOT, 'app', 'personal_plan_exercise.tsx'), 'utf8');

  it('renders the answer breakdown INLINE (plashka), not in a popup modal', () => {
    // Верный ответ → только кнопка «Дальше» под фразой (плашку «Так звучит естественно»
    // убрали: PlanExerciseFeedbackInline получает hideBody). Неверный → ИИ-разбор
    // (AiMistakeCard) + «Объяснить проще». Никаких всплывающих модалов для разбора.
    expect(source).toContain('nonOptionInlineFeedback');
    expect(source).toContain('<PlanExerciseFeedbackInline');
    // «Дальше» теперь локализуется через triLang (а не хардкод-литерал).
    expect(source).toMatch(/ru:\s*'Дальше'/);
    // Плашку «Так звучит естественно» при верном ответе скрываем (hideBody), кнопка остаётся.
    expect(source).toContain('hideBody');
    expect(source).toContain('<AiMistakeCard');
    expect(source).not.toContain("ru: 'Почему так'");
    expect(source).not.toMatch(/[ÐÑÂ]/);
  });

  it('после задания нет модала «Задание закрыто» — сразу следующее задание', () => {
    // Завершение ОБЫЧНОГО задания не показывает «Задание закрыто»/«К плану»: вычисляем
    // следующее незавершённое задание и открываем его через replace. Модал остаётся
    // только финалом ДНЯ («День пройден»), когда заданий дня больше нет.
    expect(source).not.toContain('title="Задание закрыто"');
    expect(source).not.toContain('actionLabel="К плану"');
    expect(source).toContain('finishTaskAndAdvance');
    expect(source).toContain('resolveNextPlanTask');
    expect(source).toContain('openPersonalPlanTask');
    // Финал дня — локализованный заголовок «День пройден».
    expect(source).toMatch(/ru:\s*'День пройден'/);
  });

  it('сохраняет прогресс внутри задания для resume посреди прохождения', () => {
    // Пошаговое сохранение позиции (index + correctIds) и восстановление при входе,
    // плюс очистка по завершении задания.
    expect(source).toContain('savePlanTaskProgress');
    expect(source).toContain('readPlanTaskProgress');
    expect(source).toContain('clearPlanTaskProgress');
  });

  it('keeps the day-finish modal product-grade: centered, large touch targets', () => {
    // Стиль самого модала (теперь финал дня) — остаётся продуктовым.
    expect(source).toContain("justifyContent: 'center'");
    expect(source).toContain("alignSelf: 'center'");
    expect(source).toContain('maxWidth: 520');
    expect(source).toContain('minHeight: 72');
    expect(source).toContain('borderRadius: 30');
  });
});
