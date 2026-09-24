// Сторож зеркала формулы ботов Шпиля (PM-277). Сервер (итог недели) и клиент
// (экран) обязаны считать ботов одинаково — иначе место на экране разойдётся
// с итогом. Общий модуль невозможен (functions/tsconfig ограничен src), поэтому
// сверяем текст общей части. Сработал — синхронизируй копии, а не сторожа.
import { readFileSync } from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const START = '/** T2/§4.5: комната Шпиля';

function section(file: string, endMarker: string): string {
  const text = readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n');
  const from = text.indexOf(START);
  const to = text.indexOf(endMarker);
  expect(from).toBeGreaterThanOrEqual(0);
  expect(to).toBeGreaterThan(from);
  return text
    .slice(from, to)
    .replace(/^export const SPIRE_ROOM_SIZE = .*$/m, 'export const SPIRE_ROOM_SIZE = <size>;')
    .replace(/^export const SPIRE_RESIDENT_UID_PREFIX = .*$/m, 'export const SPIRE_RESIDENT_UID_PREFIX = <prefix>;');
}

describe('spire residents mirror', () => {
  it('формула ботов на клиенте совпадает с серверной', () => {
    const server = section('functions/src/spire_residents.ts', '// ── Личности ботов (roster)');
    const client = section('modules/spire/residents.ts', '// ── Клиентское');
    expect(client).toBe(server);
  });

  it('размер комнаты и префикс совпадают', () => {
    const client = readFileSync(path.join(ROOT, 'modules/spire/residents.ts'), 'utf8');
    expect(client).toMatch(/export const SPIRE_ROOM_SIZE = 30;/);
    expect(client).toMatch(/export const SPIRE_RESIDENT_UID_PREFIX = 'res_';/);
    const leagueResidents = readFileSync(path.join(ROOT, 'functions/src/league_residents.ts'), 'utf8');
    expect(leagueResidents).toMatch(/export const LEAGUE_GROUP_SIZE = 30;/);
    expect(leagueResidents).toMatch(/export const RESIDENT_UID_PREFIX = 'res_';/);
  });
});
