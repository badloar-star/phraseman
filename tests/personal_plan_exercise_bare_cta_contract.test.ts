import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'app', 'personal_plan_exercise.tsx'), 'utf8');

describe('personal plan exercise: bare "Дальше" CTA on a correct answer', () => {
  it('renders the next button as a large borderless CTA, not wrapped in a feedback plate', () => {
    // При верном ответе без тела/эха показываем ТОЛЬКО кнопку — большую,
    // как CTA на интро-скринах урока (DuoPressable), а не зелёную кнопку в тёмной плашке.
    const start = source.indexOf('const showBareCta =');
    expect(start).toBeGreaterThan(-1);
    // Срез ровно по ветке showBareCta: от объявления до основного return компонента
    // (return ( ...) после закрытия if-ветки). Так в окно попадает только CTA-ветка.
    const end = source.indexOf('\n  return (', start);
    expect(end).toBeGreaterThan(start);
    const block = source.slice(start, end);

    // Условие срабатывания: успех + скрытое тело + без загрузки и без эха ответа.
    expect(block).toContain('isSuccess && hideBody && !loading && !children');
    // Интро-CTA: DuoPressable с градиентом; общий компонент даёт мягкий press-state
    // без декоративной цветной кромки.
    expect(block).toContain('<DuoPressable');
    expect(block).toContain('gradientColors={[accent, accent');
    // Без обёртки-плашки inlineFeedback в этой ветке.
    expect(block).not.toContain('styles.inlineFeedback');
    // Стрелка-иконка как в интро CTA.
    expect(block).toContain("name=\"arrow-forward\"");
  });

  it('defines bare CTA styles with no container border/background', () => {
    const start = source.indexOf('bareCtaSurface: {');
    expect(start).toBeGreaterThan(-1);
    const block = source.slice(start, start + 260);
    // Большая, скруглённая, с заметными паддингами — но без borderWidth/тёмного фона.
    expect(block).toContain('minHeight: 64');
    expect(block).toContain('borderRadius: 20');
    expect(block).not.toContain('borderWidth');
    expect(block).not.toContain('backgroundColor');
  });
});
