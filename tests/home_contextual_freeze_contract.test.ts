import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'home.tsx'), 'utf8');

// зачем (01.10, удаление Главной V1): щит заморозки жил в V1-модуле renderHomeHeroStatus
// (testID home-streak-freeze-shield). Главная V2 его не рисует, V1-разметка удалена.
// Сторож теперь не даёт вернуть мёртвый герой-блок молча: если владелец решит вернуть
// щит заморозки на V2, нужно новое решение в 03_DECISIONS.md и новый сторож.
describe('Home contextual streak freeze (V1 hero removed)', () => {
  it('has no V1 hero status block and no V1 freeze shield markup', () => {
    expect(source).not.toContain('renderHomeHeroStatus');
    expect(source).not.toContain('home-streak-freeze-shield');
    expect(source).not.toContain('HOME_V2_LAYOUT');
  });
});
