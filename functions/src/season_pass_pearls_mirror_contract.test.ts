// ═══════════════════════════════════════════════════════════════════════════
// season_pass_pearls_mirror_contract.test.ts — PEARLS_BY_LEVEL (season_pass.ts)
// обязан совпадать с amount на pearls-узлах app/season_pass_track_config.ts.
//
// зачем 2026-08-04 (найдено при ручной проверке после «жемчужины для фри —
// первый 2, второй 4 и так далее»): PEARLS_BY_LEVEL — РУЧНОЕ зеркало
// клиентского конфига (сервер не может импортировать клиентский бандл,
// см. комментарий у PEARLS_BY_LEVEL). Клиентский номинал менялся уже дважды
// в этом проекте без обновления зеркала — first раз молча остался бы багом
// «витрина показывает 4/8/16/32/64, сервер платит 2» до первой жалобы
// игрока. Тест читает ОБА файла как текст (модуль season_pass_track_config.ts
// тянет react-native Image require — не поднимается в functions-проекте
// jest) и проверяет число-в-число.
// ═══════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { PEARLS_BY_LEVEL } from './season_pass';

const TRACK_CONFIG_SOURCE = fs.readFileSync(
  path.join(__dirname, '..', '..', 'app', 'season_pass_track_config.ts'),
  'utf8',
);

/** Извлекает { level: amount } из строк вида `N(21, P(8))` или `N(5,  undefined, P(15))`. */
function parsePearlLevelsFromClientConfig(source: string): Record<number, number> {
  const result: Record<number, number> = {};
  const nodeRe = /N\((\d+),\s*([^)]*P\(\d+\)[^)]*|undefined,\s*[^)]*P\(\d+\)[^)]*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = nodeRe.exec(source)) !== null) {
    const level = Number(match[1]);
    const pearlMatch = match[2].match(/P\((\d+)\)/);
    if (pearlMatch) result[level] = Number(pearlMatch[1]);
  }
  return result;
}

describe('PEARLS_BY_LEVEL зеркалит клиентский конфиг', () => {
  test('каждый pearls-уровень клиента совпадает с серверным зеркалом', () => {
    const clientLevels = parsePearlLevelsFromClientConfig(TRACK_CONFIG_SOURCE);
    expect(Object.keys(clientLevels).length).toBeGreaterThan(0);
    for (const [level, amount] of Object.entries(clientLevels)) {
      expect(PEARLS_BY_LEVEL[Number(level)]).toBe(amount);
    }
  });

  test('в зеркале нет уровней, которых нет на клиентской дорожке', () => {
    const clientLevels = parsePearlLevelsFromClientConfig(TRACK_CONFIG_SOURCE);
    for (const level of Object.keys(PEARLS_BY_LEVEL)) {
      expect(clientLevels[Number(level)]).toBeDefined();
    }
  });
});
