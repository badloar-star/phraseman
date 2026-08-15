// ═══════════════════════════════════════════════════════════════════════════
// КОНТРАКТ: ЖЕЛЕЗНОЕ ПРАВИЛО ВЛАДЕЛЬЦА ПРО ДЕВ-НАЧИСЛЕНИЕ ЖЕМЧУЖИН
//
// Дословно (2026-07-27): «когда я в дев режиме — начисление на ЛЮБОЙ аккаунт
// через дев ВСЕГДА админское и ВСЕГДА идёт на сервер. Сделай это железным
// правилом и зафиксируй тестами, чтобы никто не изменил — это моё решение».
//
// Почему правило появилось: дев-кнопка магазина писала баланс ТОЛЬКО в телефон.
// Серверная запись шла через shardsApplyDelta, а тот сверяет причину с
// каталогом shard_reward_catalog — каталог намеренно обнулён и причины
// 'shards_store_purchase' в нём нет. Сервер молча отклонял начисление, и турнир
// (он читает СЕРВЕРНЫЙ users/{uid}.shards) отвечал not_enough_gems, когда на
// экране красовались «+500 жемчужин».
//
// ЭТОТ ФАЙЛ — СТОП-КРАН. Если тест упал, значит кто-то откатывает решение
// владельца. Чинить надо КОД, а не тест.
// ═══════════════════════════════════════════════════════════════════════════

import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..');
const read = (relativePath: string): string => readFileSync(join(root, relativePath), 'utf8');

/**
 * Тело дев-ветки ПОКУПКИ пакета жемчужин.
 *
 * зачем именно так: `if (isDevStoreBypass)` встречается в магазине много раз
 * (прогрев офферингов, доступность кнопок и т.д.). Привязка к первому
 * вхождению ловила чужую ветку и врала. Ищем ветку внутри buyPack — ту
 * единственную, где реально начисляются жемчужины.
 */
function devPurchaseBranch(shopSource: string): string {
  const buyPack = shopSource.indexOf('const buyPack');
  expect(buyPack).toBeGreaterThan(-1);
  const branch = shopSource.indexOf('if (isDevStoreBypass)', buyPack);
  expect(branch).toBeGreaterThan(buyPack);
  return shopSource.slice(branch, branch + 4000);
}

describe('железное правило: дев-начисление всегда идёт на сервер', () => {
  const client = () => read('app/dev_shards_grant.ts');
  const shop = () => read('app/shards_shop.tsx');

  it('клиентский модуль дев-начисления существует и зовёт серверную функцию', () => {
    // Без вызова сервера правило нарушено по определению: баланс останется
    // локальным, и турнир его не увидит.
    expect(client()).toContain('devShardsGrant');
  });

  it('дев-кнопка магазина ОБЯЗАНА звать серверное начисление', () => {
    const source = shop();
    expect(source).toContain('grantShardsOnServerForDev');
    // Вызов обязан быть внутри дев-ветки покупки, а не где-то в мёртвом коде.
    expect(devPurchaseBranch(source)).toContain('grantShardsOnServerForDev(');
  });

  it('подтверждённое событие применяется клиентом без серверного баланса', () => {
    const branchBody = devPurchaseBranch(shop());
    expect(branchBody).toContain('grantShardsOnServerForDev(');
    expect(branchBody).toContain('commitConfirmedExternalShardEvent({');
    expect(branchBody).not.toContain('addShardsRaw(');
  });

  it('НЕТ требования админ-роли на клиенте — правило говорит «на ЛЮБОЙ аккаунт»', () => {
    // Прошлая (отклонённая владельцем) версия звала adminGrantReward, который
    // требует claim admin: true. Claim в проекте никто не выдаёт, поэтому для
    // обычного аккаунта начисление не проходило — это и нарушало правило.
    const source = client();
    expect(source).not.toContain('adminGrantReward');
    expect(source).not.toMatch(/\bnot_admin\b/);
    expect(source).not.toMatch(/Admin role required/);
  });

  it('отказ сервера НЕ проглатывается молча — экран обязан сказать правду', () => {
    // Иначе владелец увидит «+500» и снова упрётся в «не хватает жемчужин» в
    // турнире, разыскивая поломку не в том месте.
    const branchBody = devPurchaseBranch(shop());
    expect(branchBody).toMatch(/if\s*\(!serverGrant\.ok\)/);
    expect(branchBody).toContain('action_toast');
  });

  it('вызов идемпотентен: сетевой ретрай не удвоит начисление', () => {
    expect(client()).toContain('opId');
  });
});
