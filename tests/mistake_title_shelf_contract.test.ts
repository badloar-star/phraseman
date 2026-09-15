import fs from 'node:fs';
import path from 'node:path';
import { MISTAKE_TITLES } from '../modules/mistake-practice/rewards_model';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const shelf = read('components/mistake-practice/MistakeTitleShelf.tsx');
const list = read('app/mistakes_list.tsx');

// зачем (владелец 2026-09-14, макет полки А): исправленные ошибки живут на
// полке со званием и лестницей — победы должны где-то храниться.
describe('mistake title shelf contract', () => {
  test('shelf shows the title, the progress to the next one and the ladder', () => {
    expect(shelf).toContain('MISTAKE_TITLES.map');
    expect(shelf).toContain('rewards.nextTitle');
    expect(shelf).toContain('rewards.streakDays');
    expect(MISTAKE_TITLES.map((title) => title.threshold)).toEqual([5, 15, 40, 100]);
  });

  test('the shelf sits on the corrected filter only', () => {
    expect(list).toContain("filter === 'corrected' ? <MistakeTitleShelf");
    expect(list).toContain('buildMistakeRewardsSnapshot(journal.events)');
  });

  test('titles are localized everywhere, never a raw id', () => {
    for (const title of MISTAKE_TITLES) {
      expect(shelf).toContain(`${title.id}:`);
    }
    expect(shelf).toContain('copy.titles[');
  });

  test('no outlines and no font shrinking', () => {
    expect(shelf).not.toMatch(/borderWidth|borderColor/);
    expect(shelf).not.toMatch(/adjustsFontSizeToFit/);
  });
});
