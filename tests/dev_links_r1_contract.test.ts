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
    expect(names.size).toBeGreaterThan(8);
    for (const name of names) expect(DEV_PAYWALL_STATES as readonly string[]).toContain(name);
  });

  it('intros=seen|reset is parsed; anything else is rejected', () => {
    expect(parseDevStateParams({ intros: 'seen' }).request.intros).toBe('seen');
    expect(parseDevStateParams({ intros: 'reset' }).request.intros).toBe('reset');
    expect(parseDevStateParams({ intros: 'nope' }).rejected.intros).toBeTruthy();
  });

  it('no row says a fixture is still needed for a state that already has one', () => {
    expect(doc).toMatch(/«Нужна фикстура»: 0/);
  });
});
