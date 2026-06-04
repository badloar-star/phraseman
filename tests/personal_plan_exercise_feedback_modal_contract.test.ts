import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan exercise feedback modal contract', () => {
  const source = fs.readFileSync(path.join(ROOT, 'app', 'personal_plan_exercise.tsx'), 'utf8');

  it('uses readable Russian copy for result and completion modals', () => {
    expect(source).toContain("lastResult === 'correct' ? 'Дальше' : 'Попробовать ещё раз'");
    expect(source).toContain('title="Задание закрыто"');
    expect(source).toContain('actionLabel="К плану"');
    expect(source).not.toMatch(/[ÐÑÂ]/);
  });

  it('keeps the modal product-grade: centered, liquid-glass, and large touch targets', () => {
    expect(source).toContain("justifyContent: 'center'");
    expect(source).toContain("backgroundColor: 'rgba(0,0,0,0.68)'");
    expect(source).toContain("alignSelf: 'center'");
    expect(source).toContain('maxWidth: 520');
    expect(source).toContain('elevation: 12');
    expect(source).toContain('minHeight: 72');
    expect(source).toContain('borderRadius: 30');
  });
});
