import fs from 'node:fs';
import path from 'node:path';

// зачем: PM-080 «Ограничить источники монет полезной практикой» (владелец: «как будто человек
// на охоту идёт» — монеты только за дело, без фарм-циклов). Утверждённый список источников
// (D-решения и ответ координатора Q9, 01.10) живёт в docs/phraseman-2.0/docs/ECONOMY.md.
// Проба ломается, когда в коде появляется ЛЮБОЙ новый источник монет без записи в этом списке:
//  1) новая положительная причина в журнале монет (STAR_OP_CLASS: earn/grant);
//  2) новый префикс ключа в серверном белом списке кошелька (coin_wallet_policy);
//  3) новый вызов постановки начисления в очередь (enqueueLevelSpinStarGrant) из клиента;
//  4) награда за видео / «привет другу» (A3: без отдельного решения монет нет);
//  5) возврат отменённых механик (g2c*, спины, «Супер-воскресенье»).
// Сработала проба — НЕ дописывай причину сюда сам: спроси владельца/координатора и запиши D-решение.
const read = (p: string) => fs.readFileSync(p, 'utf8');
// зачем: упоминание в комментарии — не зависимость и не источник.
const code = (p: string) => read(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
const problems: string[] = [];
const need = (ok: boolean, msg: string) => { if (!ok) problems.push(msg); };

type Status = 'active' | 'retired_history';
// причина журнала → [статус, решение]
const APPROVED_REASONS: Readonly<Record<string, readonly [Status, string]>> = {
  practice_session: ['active', 'practiceRuneGrant: 7 учебных активностей (D03/D34, Q9)'],
  learning_v2_session: ['active', 'сессия курса Learning V2 (Q9, practice)'],
  coin_exchange: ['active', 'кошелёк награды Learning V2 / работы над ошибками (coin_exchange_wallet_reward)'],
  spire_step: ['active', 'Шпиль, ступень/этаж (D54/D74/D83, PM-280)'],
  spire_week_reward: ['active', 'Шпиль, итог недели (PM-280)'],
  referral_spin: ['active', 'D52/D100/D105: призы рулетки монетами для вечного Pro'],
  global_broadcast: ['active', 'D104: награда рассылки монетами'],
  admin_grant: ['active', 'D86: ручная выдача из админки'],
  community_pack_sale: ['active', 'D85: выплата автору набора монетами'],
  level_spin_grant: ['active', 'серверный кошелёк (Q13): жалоба D109 и «Сегодня» D49 по префиксу ключа'],
  // зачем: 8T (750728284, координатор 03.10) — перенос баланса проигравшего победителю при слиянии/чистке дублей;
  // парный дебет account_merge_out, сумма по системе 0 — не новый источник монет.
  account_merge_in: ['active', '8T: перенос баланса при слиянии аккаунтов (не источник, пара с account_merge_out)'],
  // зачем: D195 (владелец 15.10) — старые бонусы (опыт, жемчуг, вращения) → монеты один раз на человека, только серверные поля
  legacy_bonus: ['active', 'D195: конвертация старых бонусов (functions/src/legacy_bonus_convert.ts), один раз, потолок 6000'],
  // историческое: писателей в коде нет, причина остаётся в типе для чтения старых журналов
  arena_match: ['retired_history', 'Арена удалена (D54/D74/D83)'],
  arena_mastery: ['retired_history', 'Арена удалена'],
  arena_today: ['retired_history', 'Арена удалена'],
  arena_today_mastery: ['retired_history', 'Арена удалена'],
  arena_partner: ['retired_history', 'Арена удалена'],
  arena_tier: ['retired_history', 'Арена удалена'],
  friends_together_level: ['retired_history', 'сундук/веха «Вместе» выключены (PM-056, Q6)'],
  friends_together_chest: ['retired_history', 'сундук «Вместе» выключен (PM-056)'],
  welcome_gift: ['retired_history', 'писателя в коде нет'],
  video_watch: ['retired_history', 'PM-080-A3/Q9: видео монет не даёт; серверный claim снимается после релиза'],
};
// зачем: 8T — account_merge_out списывает перенесённый баланс у скрытого проигравшего.
const SPEND = new Set(['spend_shop', 'admin_revoke', 'learning_v2_unlock', 'dialog_extra_replies', 'dialog_unlock', 'account_merge_out']);

// 1) положительные причины журнала
const classRows = [...code('functions/src/stars_ledger.ts').matchAll(/^\s*([a-z0-9_]+):\s*'(earn|grant|spend)'/gm)]
  .map((m) => [m[1], m[2]] as const);
need(classRows.length >= 20, `разобрано подозрительно мало причин: ${classRows.length}`);
let positive = 0;
for (const [reason, kind] of classRows) {
  if (kind === 'spend') {
    need(SPEND.has(reason), `новая трата ${reason}: внесите в SPEND пробы после решения владельца`);
    continue;
  }
  positive += 1;
  need(reason in APPROVED_REASONS, `НОВЫЙ источник монет в журнале: ${reason} (${kind}) — нет в утверждённом списке PM-080`);
}
for (const reason of Object.keys(APPROVED_REASONS)) {
  need(classRows.some(([r]) => r === reason), `причина ${reason} есть в списке пробы, но исчезла из STAR_OP_CLASS — обновите список и ECONOMY.md`);
}

// 2) белый список кошелька по префиксу ключа
const policy = code('functions/src/coin_wallet_policy.ts');
const prefixes = [...policy.matchAll(/\[\/\^([a-z0-9]+?)_/g)].map((m) => m[1]).sort();
need(JSON.stringify(prefixes) === JSON.stringify(['dailyjourney', 'report']),
  `белый список кошелька изменён: ${prefixes.join(',')} (ожидается report_reward, dailyjourney; g2c* снят по D148)`);
need(!/g2c1_\[|g2cdj_\[/.test(policy), 'в политике кошелька вернулись g2c*');
need(!/\^quest_/.test(policy), 'в политике кошелька появились quest_*');

// 3) клиентские вызовы постановки начисления
const APPROVED_ENQUEUE_CALLERS = new Set([
  'app/level_spin_star_grants.ts', // определение
  'app/report_reward_bundle.ts', // D109
  'modules/today-tasks/today_tasks_store.ts', // D49 «Сегодня»
]);
const walk = (dir: string, out: string[] = []): string[] => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'generated'].includes(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(full.split(path.sep).join('/'));
  }
  return out;
};
let scanned = 0;
for (const dir of ['app', 'modules', 'hooks', 'components', 'services']) {
  if (!fs.existsSync(dir)) continue;
  for (const f of walk(dir)) {
    scanned += 1;
    const src = code(f);
    if (/\benqueueLevelSpinStarGrant\b/.test(src)) {
      need(APPROVED_ENQUEUE_CALLERS.has(f), `новый вызов enqueueLevelSpinStarGrant из ${f} — источник монет без записи в списке`);
    }
    // 5) награда за видео не возвращается в клиент (определение в level_spin_star_grants.ts — осиротевший экспорт)
    need(!/\bvideoWatchRunesClaim\b|\breportPlaybackSample\b|\buseVideoWatchEnergyBoost\b/.test(src), `${f}: награда за просмотр видео вернулась (PM-080-A3)`);
  }
}

// 4) видео и «привет другу» не знают про монеты
const NO_COINS = /\b(runes?|coins?|stars?)\b|Grant|enqueueLevelSpin|reward/i;
for (const f of ['components/youtube/YoutubeInlinePlayer.tsx', 'app/friends_together/nudge_client.ts']) {
  const hit = NO_COINS.exec(code(f));
  need(!hit, `${f}: упоминание «${hit?.[0]}» — видео/привет другу не дают монет без решения владельца (PM-080-A3)`);
}
need(!/prepareStarOperations|commitStarOperations|operationReason/.test(code('functions/src/friends_together.ts')),
  'friends_together.ts: сервер «Вместе» пишет в журнал монет');

// 5) отменённые механики
need(!/gifts_to_coins_enabled/.test(read('app/remote_flags.ts')) && !fs.readdirSync('app').some((n) => n.startsWith('gifts_to_coins_')),
  'вернулась миграция «подарки → монеты» (D148, Q109: удалена целиком)');
need(fs.existsSync('tests/super_sunday_retired_d147.test.ts'), 'пропал сторож D147 «Супер-воскресенье»');
need(!fs.existsSync('app/video_watch_runes_client.ts') && !fs.existsSync('hooks/use_video_watch_energy_boost.ts'),
  'вернулись клиенты награды за видео');

console.log(`[PM-080] positiveReasons=${positive} approved=${Object.keys(APPROVED_REASONS).length} walletPrefixes=${prefixes.join('+')} clientFilesScanned=${scanned}`);
if (problems.length) {
  for (const p of problems) console.log(`  - ${p}`);
  throw new Error(`PM-080: ${problems.length} проблем`);
}
console.log('PM-080 COIN SOURCES ALLOWLIST: PASS');
