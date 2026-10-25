// зачем (Сверка, Android: «Назад» при открытом окне эпизода уводило в classic lessons_list; Ядро/координатор 25.10, OTA 2.0.2): окно эпизода/экзамена
// имеет СВОЮ подписку на аппаратный «Назад» — живёт, пока окно открыто (после подписки Сезона, поэтому вызывается первой), закрывает окно и возвращает true.
import fs from 'node:fs';
import path from 'node:path';

const course = fs.readFileSync(path.join(__dirname, '..', 'components/learning-v2/season/SeasonCourse.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('окно эпизода: аппаратный «Назад»', () => {
  const start = course.indexOf('if (expanded === null) return undefined;');
  const block = course.slice(start, course.indexOf('}, [expanded]);', start) + 15);

  it('подписка есть, живёт только пока окно открыто и снимается при закрытии', () => {
    expect(start).toBeGreaterThan(-1);
    expect(block).toContain('if (expanded === null) return undefined;');
    expect(block).toContain('return () => sub.remove();');
    expect(block).toContain('}, [expanded]);');
  });

  it('«Назад» закрывает окно, пишет причину и забирает событие (true) — до Сезона дело не доходит', () => {
    expect(block).toContain("reason: 'hardware_back'");
    expect(block).toContain('setExpanded(null);');
    expect(block).toMatch(/setExpanded\(null\);\s*return true;/);
  });

  it('это вторая независимая подписка: экран списков (hardwareBackPress для screen) не тронут', () => {
    expect((course.match(/addEventListener\('hardwareBackPress'/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});
