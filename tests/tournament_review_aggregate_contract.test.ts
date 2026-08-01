import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');

describe('aggregate tournament review contract', () => {
  it('keeps the server review sequence in play order', () => {
    const screen = read('app/tournament_review.tsx');

    expect(screen).toContain('const ordered = useMemo(() => items ?? [], [items]);');
    expect(screen).not.toContain('const wrong = items.filter');
  });

  it('labels a server-timed-out review item as not answered in time', () => {
    const client = read('app/tournament_client.ts');
    const screen = read('app/tournament_review.tsx');

    expect(client).toContain('timedOut?: true;');
    expect(screen).toContain("item.correct ? 'верно' : item.timedOut ? 'Не успел' : 'мимо'");
  });

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

  it('keeps the approved mode labels and renders explicit speed-match pairs', () => {
    const client = read('app/tournament_client.ts');
    const screen = read('app/tournament_review.tsx');

    expect(client).toContain('export type SpeedMatchReviewPair');
    expect(client).toContain('speedMatchPairs?: SpeedMatchReviewPair[];');
    for (const mode of ['listen_choose', 'sound_contrast', 'listen_build', 'speed_match']) {
      expect(screen).toContain(`${mode}: '`);
    }
    expect(screen).toContain('SpeedMatchReviewPairs');
    expect(screen).toContain('english || `Пара ${index + 1}`');
    expect(screen).toContain("label={pair.selectedRussian === null ? 'Пропущено' : pair.correct ? 'Ваш ответ' : 'Ваш ответ — ошибка'}");
    expect(screen).toContain('label="Правильная пара"');
  });
});
