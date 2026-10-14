// зачем (координатор 14.10): тестовый вход /dev_state ведёт на next через router.replace. Попытка dismissTo (чтобы не было второй копии
// вкладок [(tabs),*(tabs)]) сломала переключение вкладки кастомного перелистывателя — next=/(tabs)/settings оставлял прежнюю вкладку,
// DEV_LINKS Сверки снимали не те экраны (регресс 14.10 21:28). Сторож держит: переход — replace, вкладка переключается; журнал пишет
// canDismiss для разбора дубля вкладок, который чинится отдельно и только по логам.
import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'dev_state.tsx'), 'utf8');

describe('dev_state navigates to next with replace (tab switching must work)', () => {
  it('uses replace, not dismissTo', () => {
    expect(source).toMatch(/router\.replace\(applied\.next as never\);/);
    expect(source).not.toMatch(/router\.dismissTo\(applied\.next/);
  });

  it('logs canDismiss for the duplicate-tabs investigation', () => {
    expect(source).toContain('const canDismissNow = typeof router.canDismiss === \'function\' ? router.canDismiss() : false;');
    expect(source).toContain('[DEV-STATE] route: replace вызван');
  });
});
