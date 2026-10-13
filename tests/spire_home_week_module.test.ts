// зачем (Авторизация №11, координатор 13.10): экран Шпиля ≤ 400 строк — чтение локальной недели вынесено в spire_home_week.ts без изменения поведения.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));
const mod = read('components/spire/spire_home_week.ts');
const screen = read('components/spire/SpireHomeScreen.tsx');

describe('вынос чтения недели из экрана Шпиля', () => {
  it('экран короче 400 строк и берёт помощники из модуля, а не объявляет их сам', () => {
    expect(screen.split('\n').length).toBeLessThanOrEqual(400);
    expect(screen).toContain("from './spire_home_week';");
    for (const name of ['function asSpireLang', 'function peekFirstFrameWeek', 'function readCurrentLocalWeek', 'const SPIRE_LANGS', 'const SPIRE_BETA_LANGS']) {
      expect(screen).not.toContain(name);
    }
  });

  it('модуль сохраняет ветки и логи: нет uid, нет недели, устарела, ok; недели только текущей ISO-недели', () => {
    for (const piece of [
      'export function asSpireLang(', 'export function peekFirstFrameWeek(', 'export async function readCurrentLocalWeek(',
      'home: локальная неделя не читается — нет канонического uid (облако выключено)', 'home: локальной недели нет (lang=', 'home: локальная неделя устарела (local=', 'home: локальная неделя ok (tier=',
      'const expected = spireCurrentWeekKey(Date.now());', "export const SPIRE_BETA_LANGS: readonly string[] = ['es', 'de', 'fr', 'it'];",
    ]) {
      expect(mod).toContain(piece);
    }
  });
});
