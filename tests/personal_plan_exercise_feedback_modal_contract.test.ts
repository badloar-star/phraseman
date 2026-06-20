import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan exercise feedback modal contract', () => {
  const source = fs.readFileSync(path.join(ROOT, 'app', 'personal_plan_exercise.tsx'), 'utf8');

  it('renders the answer breakdown INLINE (plashka), not in a popup modal', () => {
    // Верный ответ → короткая ИНЛАЙН-плашка с кнопкой «Дальше» под фразой. Неверный →
    // ИИ-разбор (AiMistakeCard) + «Объяснить проще». Никаких всплывающих модалов для
    // разбора: единственный модал — «Задание закрыто». Старый авто-текст «Почему так» убран.
    expect(source).toContain('nonOptionInlineFeedback');
    expect(source).toContain('<PlanExerciseFeedbackInline');
    // «Дальше» теперь локализуется через triLang (а не хардкод-литерал).
    expect(source).toMatch(/ru:\s*'Дальше'/);
    expect(source).toContain('<AiMistakeCard');
    expect(source).toContain('<MistakeEli5Modal');
    expect(source).not.toContain("ru: 'Почему так'");
    expect(source).toContain('title="Задание закрыто"');
    expect(source).toContain('actionLabel="К плану"');
    expect(source).not.toMatch(/[ÐÑÂ]/);
  });

  it('keeps the remaining "Задание закрыто" modal product-grade: centered, large touch targets', () => {
    // Стиль самого модала (только «Задание закрыто») — остаётся продуктовым.
    expect(source).toContain("justifyContent: 'center'");
    expect(source).toContain("alignSelf: 'center'");
    expect(source).toContain('maxWidth: 520');
    expect(source).toContain('minHeight: 72');
    expect(source).toContain('borderRadius: 30');
  });
});
