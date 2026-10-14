// зачем (координатор 14.10; зонд [PAYWALL-CLOSE-FREEZE] показал стек [(tabs),*(tabs)]): тестовый вход /dev_state делал router.replace(next)
// поверх уже открытых вкладок — в стеке появлялась вторая копия группы вкладок, нижняя оставалась замороженной, и прогоны Сверки ловили
// ложные «зависания». Сторож держит: переход сначала пробует dismissTo (без копии), replace — только когда свернуть нечего, и журнал
// пишет, какой путь выбран.
import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'dev_state.tsx'), 'utf8');

describe('dev_state does not stack a second (tabs)', () => {
  it('navigates with dismissTo when the stack can be dismissed', () => {
    expect(source).toMatch(/const canDismissNow = typeof router\.canDismiss === 'function' \? router\.canDismiss\(\) : false;/);
    expect(source).toMatch(/if \(canDismissNow && typeof router\.dismissTo === 'function'\) \{\s*router\.dismissTo\(applied\.next as never\);/);
  });

  it('falls back to replace only when there is nothing to dismiss', () => {
    expect(source).toMatch(/\} else \{\s*router\.replace\(applied\.next as never\);/);
  });

  it('logs which way it went', () => {
    expect(source).toContain('[DEV-STATE] route: dismissTo вызван');
    expect(source).toContain('[DEV-STATE] route: replace вызван');
  });
});
