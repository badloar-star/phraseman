/**
 * Сторож: клиентское зеркало блок-листа НЕ отстаёт от firestore.rules.
 *
 * зачем (владелец 2026-09-02): прогресс владельца перестал уходить в облако с
 * 01.09 — set в users/{stableId} отклонялся с permission-denied, в облаке
 * user_total_xp=78 против живого баланса. Причина: правило update проверяет
 * шесть условий на ОДИН документ, и любой запрещённый ключ внутри progress
 * роняет весь set ЦЕЛИКОМ — вместе с XP, стриком, аватаром и last_active_at.
 *
 * Блок-лист живёт в двух местах (firestore.rules и app/cloud_sync.ts) и
 * ведётся руками. Сверка 02.09 нашла 13 ключей, которые правила режут, а
 * клиент не фильтровал: referral_spin_credits, level_reward_spin_balance,
 * referral_spins_total, referral_spin_ledger_version,
 * referral_spin_ledger_migrated_at_ms, collectibles_owned_v1,
 * collectibles_state_v1, lesson1_pass_live,
 * lesson_progress_v2::fr::lesson1_pass_live, referral_vip_last_source,
 * promo_vip_last_code, premium_rc_active_lineage, premium_rc_reconcile_needed.
 *
 * Обычные тесты синхронизации этот класс НЕ ловят: они гоняют клиент на моках,
 * где правил нет вообще, и остаются зелёными при любом расхождении.
 *
 * Сторож читает НАСТОЯЩИЙ firestore.rules, а не копию: копия рассинхронилась бы
 * ровно так же, как рассинхронился клиент.
 *
 * Сработал — дописать ключ в клиентский фильтр, а не ослаблять проверку.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import { findRulesBlockedKeys } from '../app/cloud_sync';

const RULES_PATH = join(__dirname, '..', 'firestore.rules');

/** Убирает комментарии: апострофы внутри них ловятся как ложные ключи. */
function stripLineComments(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n');
}

/** Ключи в кавычках внутри тела названной функции правил. */
function readKeysFromRulesFunction(rules: string, functionName: string): string[] {
  const start = rules.indexOf(`function ${functionName}()`);
  if (start < 0) throw new Error(`В firestore.rules нет функции ${functionName}()`);
  const end = rules.indexOf('\n    }', start);
  if (end < 0) throw new Error(`Не найден конец функции ${functionName}()`);
  const body = stripLineComments(rules.slice(start, end));
  return [...body.matchAll(/'([A-Za-z0-9_:]+)'/g)].map((m) => m[1]);
}

describe('cloud_sync: клиентское зеркало блок-листа firestore.rules', () => {
  const rules = readFileSync(RULES_PATH, 'utf8');

  // Все ключи progress, запись которых правила запрещают клиенту. Два
  // источника: явный премиум-блоклист и серверные ключи прогресса внутри
  // progressHasNoPremiumWrites (XP, стрик, уроки, экзамены).
  const blockedByRules = [
    ...new Set([
      ...readKeysFromRulesFunction(rules, 'blockedPremiumProgressKeys'),
      ...readKeysFromRulesFunction(rules, 'progressHasNoPremiumWrites'),
    ]),
  ]
    // 'progress' — имя самого поля в hasAny(['progress']), не ключ внутри него.
    .filter((key) => key !== 'progress');

  it('правила действительно содержат блок-лист (парсер не молчит впустую)', () => {
    // Защита от «зелёного пустого теста»: если разметка правил изменится и
    // парсер перестанет что-либо находить, сторож обязан упасть, а не пройти.
    expect(blockedByRules.length).toBeGreaterThan(700);
    expect(blockedByRules).toContain('user_total_xp');
    expect(blockedByRules).toContain('premium_plan');
  });

  it('каждый запрещённый правилами ключ отсеивается клиентом до записи', () => {
    const missed = blockedByRules.filter((key) => findRulesBlockedKeys([key]).length === 0);
    expect(missed).toEqual([]);
  });

  it('ключи из инцидента 2026-09-02 перечислены поимённо', () => {
    // Явный список инцидента: общая проверка выше поймала бы их и так, но при
    // будущем рефакторинге парсера именно эти ключи должны остаться закрытыми.
    const incidentKeys = [
      'user_total_xp',
      'streak_count',
      'unlocked_lessons',
      'referral_spin_credits',
      'level_reward_spin_balance',
      'referral_spins_total',
      'collectibles_owned_v1',
      'collectibles_state_v1',
      'lesson1_pass_live',
      'lesson_progress_v2::fr::lesson1_pass_live',
      'referral_vip_last_source',
      'promo_vip_last_code',
      'premium_rc_active_lineage',
      'premium_rc_reconcile_needed',
      'lesson1_best_score',
      'lesson_progress_v2::fr::unlocked_lessons',
    ];
    const missed = incidentKeys.filter((key) => findRulesBlockedKeys([key]).length === 0);
    expect(missed).toEqual([]);
  });

  it('обычные клиентские ключи прогресса не отсекаются заодно', () => {
    // Обратная сторона: слишком широкий фильтр молча перестал бы синхронизировать
    // легальные поля, и потеря выглядела бы точно так же, как этот баг.
    const clientOwned = ['app_lang', 'user_avatar', 'sound_enabled', 'user_frame'];
    expect(findRulesBlockedKeys(clientOwned)).toEqual([]);
  });
});
