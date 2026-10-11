// зачем (координатор 12.10, DEV_LINKS_R1): документ с готовыми ссылками для Сверки не должен врать — каждая ссылка `dev_state?…` обязана разбираться
// parseDevStateParams без отказов, каждое `_dev_state=` — существовать в DEV_PAYWALL_STATES; новая фикстура `intros` разбирается.
import fs from 'node:fs';
import path from 'node:path';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined), removeItem: jest.fn(async () => undefined), multiSet: jest.fn(async () => undefined), multiGet: jest.fn(async () => []), multiRemove: jest.fn(async () => undefined) },
}));

import { parseDevStateParams } from '../app/dev_state_fixtures';
import { DEV_PAYWALL_STATES } from '../app/dev_paywall_state';

const doc = fs.readFileSync(path.join(__dirname, '..', 'docs/phraseman-2.0/DEV_LINKS_R1.md'), 'utf8');

function toParams(query: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of query.split('&')) {
    if (!pair) continue;
    const at = pair.indexOf('=');
    const key = decodeURIComponent(at < 0 ? pair : pair.slice(0, at));
    out[key] = decodeURIComponent(at < 0 ? '' : pair.slice(at + 1));
  }
  return out;
}

describe('DEV_LINKS_R1', () => {
  const links = [...doc.matchAll(/`phraseman:\/\/dev_state\?([^`]+)`/g)].map((m) => m[1]);

  it('the document has many dev_state links and every one is accepted by the parser with no rejections', () => {
    expect(links.length).toBeGreaterThan(150);
    const bad: string[] = [];
    for (const link of links) {
      const { rejected } = parseDevStateParams(toParams(link));
      if (Object.keys(rejected).length > 0) bad.push(`${link} → ${JSON.stringify(rejected)}`);
    }
    expect(bad).toEqual([]);
  });

  it('every _dev_state value of the paywall links exists', () => {
    // только колонка «ссылка / путь» (в колонке «shot list» выдержки из старых списков обрезаны многоточием)
    const linkCells = doc.split(String.fromCharCode(10)).filter((line) => /^\| [a-z0-9-]+-\d{3} \|/.test(line)).map((line) => line.split('|')[3] ?? '');
    const names = new Set(linkCells.flatMap((cell) => [...cell.matchAll(/_dev_state(?:=|%3D)([a-z_]+)/g)].map((m) => m[1])));
    expect(names.size).toBeGreaterThan(5);
    for (const name of names) expect(DEV_PAYWALL_STATES as readonly string[]).toContain(name);
  });

  it('cards=empty is parsed (clears saved/own cards and packs so «Пусто» frames do not inherit the previous frame)', () => {
    expect(parseDevStateParams({ cards: 'empty' }).request.cards).toBe('empty');
    expect(parseDevStateParams({ cards: 'nope' }).rejected.cards).toBeTruthy();
  });

  it('intros=seen|reset is parsed; anything else is rejected', () => {
    expect(parseDevStateParams({ intros: 'seen' }).request.intros).toBe('seen');
    expect(parseDevStateParams({ intros: 'reset' }).request.intros).toBe('reset');
    expect(parseDevStateParams({ intros: 'nope' }).rejected.intros).toBeTruthy();
  });

  it('«уникальна: да» rows have a ready link; their «тапы» use only the known step grammar; the table keeps 7 columns', () => {
    const rows = doc.split(String.fromCharCode(10)).filter((line) => /^\| [a-z0-9-]+-\d{3} \|/.test(line));
    const badColumns = rows.filter((line) => line.split('|').length !== 9).map((line) => line.slice(0, 60));
    expect(badColumns).toEqual([]); // «|» в тексте сдвигал колонки, а робот читает «тапы»/«уникальна» по номеру
    const stepRx = /^(tap|long|swipe-left|swipe-right|see):\S.*$|^(back)$|^(type|key|scroll|wait|xy):\S[ -~]*$/;
    const problems: string[] = [];
    let unique = 0;
    for (const line of rows) {
      const cells = line.split('|');
      const id = cells[1].trim();
      if (cells[7].trim() !== 'да') continue;
      unique += 1;
      if (!/`(phraseman:\/\/|premium_modal\?|dev_state\?)/.test(cells[3])) problems.push(`${id}: уникальна, но нет ссылки`);
      for (const step of cells[6].replace(/`/g, '').split(';').map((s) => s.trim()).filter(Boolean)) {
        if (!stepRx.test(step)) problems.push(`${id}: шаг «${step}» не по грамматике`);
      }
    }
    expect(problems).toEqual([]);
    expect(unique).toBeGreaterThan(20);
  });

  it('no row says a fixture is still needed for a state that already has one', () => {
    expect(doc).toMatch(/«Нужна фикстура»: 0/);
  });
});
