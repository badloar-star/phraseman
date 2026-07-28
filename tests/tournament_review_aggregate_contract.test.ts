import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');

describe('aggregate tournament review contract', () => {
  it('types and renders time-attack parts with correct, wrong, and skipped states', () => {
    const client = read('app/tournament_client.ts');
    const screen = read('app/tournament_review.tsx');

    expect(client).toContain('aggregateItems?: AggregateReviewItem[];');
    expect(screen).toContain("time_attack: 'Серия на время'");
    expect(screen).toContain('AggregateReviewRows');
    expect(screen).toContain("label={part.selectedIndex === null ? 'Пропущено' : part.correct ? 'Верно' : 'Ошибка'}");
    expect(screen).toContain('item.aggregateItems ? (');
    expect(screen).toContain('Детали серии не сохранены для этого турнира.');
  });
});
