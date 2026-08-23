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
    // зачем: вердикт локализован через triLang (i18n-аудит) — проверяем ветку
    // item.timedOut в тексте, а не дословный русский результат.
    expect(screen).toMatch(/item\.correct\s*\n?\s*\?[\s\S]{0,400}item\.timedOut/);
  });

  it('types and renders time-attack parts with correct, wrong, and skipped states', () => {
    const client = read('app/tournament_client.ts');
    const screen = read('app/tournament_review.tsx');

    expect(client).toContain('aggregateItems?: AggregateReviewItem[];');
    // зачем: названия режимов локализованы через modeLabelFor(mode, lang) —
    // проверяем сам ключ словаря, а не дословный русский текст.
    expect(screen).toContain('time_attack: triLang(lang,');
    expect(screen).toContain('AggregateReviewRows');
    expect(screen).toMatch(/part\.selectedIndex === null[\s\S]{0,300}part\.correct/);
    expect(screen).toContain('item.aggregateItems ? (');
    expect(screen).toContain('Деталі серії не збережені для цього турніру.');
  });

  it('keeps the approved mode labels and renders explicit speed-match pairs', () => {
    const client = read('app/tournament_client.ts');
    const screen = read('app/tournament_review.tsx');

    expect(client).toContain('export type SpeedMatchReviewPair');
    expect(client).toContain('speedMatchPairs?: SpeedMatchReviewPair[];');
    for (const mode of ['listen_choose', 'sound_contrast', 'listen_build', 'speed_match']) {
      expect(screen).toContain(`${mode}: triLang(lang,`);
    }
    expect(screen).toContain('SpeedMatchReviewPairs');
    expect(screen).toMatch(/pair\.english \|\| triLang\(lang,/);
    expect(screen).toMatch(/pair\.selectedRussian === null[\s\S]{0,300}pair\.correct/);
    expect(screen).toMatch(/label=\{triLang\(lang,\s*\{\s*ru:\s*'Правильная пара'/);
  });
});
