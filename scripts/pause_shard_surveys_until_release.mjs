#!/usr/bin/env node
/**
 * Опросы осколков: снять ВСЕ включённые опросы до дня выхода 2.0 и вернуть их потом (вопрос владельцу 18, вариант А).
 *
 * зачем (координатор 13.10, EN-проход Авторизации 3d27dc084): на боевом сервере ещё нет фильтра «без текста на языке человека
 * опрос не предлагается» (e4f45f8e3 выкладывается только в день выхода, вместе с 2.0). Испанский интерфейс есть в 1.6.x с мая,
 * а испанских текстов у опросов нет — испанцы видят опрос по-русски. Снять только сегодняшний опрос ротации НЕЛЬЗЯ: боевой сервер
 * тогда уходит в старый режим `where('enabled','==',true)` и выдаёт любой другой включённый опрос. Поэтому выключаются все.
 * Цена: до выхода опрос с наградой не видит НИКТО (и ru/uk тоже).
 *
 * Запускает ТОЛЬКО владелец (читает service-account.json, пишет в прод). Сессии ИИ этот скрипт не запускают.
 *   Просмотр (ничего не пишет):  node scripts/pause_shard_surveys_until_release.mjs
 *   Снять:                       node scripts/pause_shard_surveys_until_release.mjs --write --confirm PAUSE_SHARD_SURVEYS_UNTIL_RELEASE
 *   Вернуть (день выхода):       node scripts/pause_shard_surveys_until_release.mjs --restore --confirm RESTORE_SHARD_SURVEYS_AFTER_RELEASE
 *
 * Правила безопасности:
 * - пишется только поле enabled (и служебная пометка pausedForRelease); тексты, ротация, updatedAtMs не трогаются;
 * - список снятых опросов сохраняется в файл (docs/phraseman-2.0/evidence/shard_survey_pause_list.json) ДО записи;
 * - возврат включает ровно опросы из этого файла и только если у них стоит пометка pausedForRelease.
 * Журнал: [SURVEY-PAUSE].
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const PROJECT_ID = 'phraseman-ea0b3';
const COLLECTION = 'shard_surveys';
const LIST_URL = new URL('../docs/phraseman-2.0/evidence/shard_survey_pause_list.json', import.meta.url);
const CONFIRM_PAUSE = 'PAUSE_SHARD_SURVEYS_UNTIL_RELEASE';
const CONFIRM_RESTORE = 'RESTORE_SHARD_SURVEYS_AFTER_RELEASE';
const LOG = '[SURVEY-PAUSE]';

const args = process.argv.slice(2);
const write = args.includes('--write');
const restore = args.includes('--restore');
const confirmAt = args.indexOf('--confirm');
const confirmValue = confirmAt >= 0 ? args[confirmAt + 1] : null;
if (write && restore) {
  console.error(`${LOG} отказ: --write и --restore вместе нельзя`);
  process.exit(2);
}
if (write && confirmValue !== CONFIRM_PAUSE) {
  console.error(`${LOG} отказ: для снятия нужен --confirm ${CONFIRM_PAUSE}`);
  process.exit(2);
}
if (restore && confirmValue !== CONFIRM_RESTORE) {
  console.error(`${LOG} отказ: для возврата нужен --confirm ${CONFIRM_RESTORE}`);
  process.exit(2);
}

function hasLang(localized, lang) {
  return Boolean(localized && typeof localized === 'object' && typeof localized[lang] === 'string' && localized[lang].trim());
}

async function main() {
  const require = createRequire(import.meta.url);
  const admin = require('../functions/node_modules/firebase-admin');
  const serviceAccount = JSON.parse(readFileSync(new URL('../service-account.json', import.meta.url), 'utf8'));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: PROJECT_ID });
  const db = admin.firestore();

  if (restore) {
    if (!existsSync(LIST_URL)) {
      console.error(`${LOG} отказ: нет файла списка ${LIST_URL.pathname} — возвращать нечего`);
      process.exit(2);
    }
    const list = JSON.parse(readFileSync(LIST_URL, 'utf8'));
    let restored = 0;
    for (const id of list.ids ?? []) {
      const ref = db.collection(COLLECTION).doc(id);
      const snap = await ref.get();
      if (!snap.exists) { console.log(`${LOG} ${id}: документа нет — пропуск`); continue; }
      if (!snap.data()?.pausedForRelease) { console.log(`${LOG} ${id}: нет пометки pausedForRelease — не трогаю`); continue; }
      await ref.set({ enabled: true, pausedForRelease: admin.firestore.FieldValue.delete() }, { merge: true });
      restored += 1;
      console.log(`${LOG} ${id}: включён обратно`);
    }
    console.log(`${LOG} возврат: включено ${restored} из ${(list.ids ?? []).length}`);
    return;
  }

  const snap = await db.collection(COLLECTION).where('enabled', '==', true).get();
  const docs = snap.docs.filter((d) => d.id.startsWith('survey_preset_'));
  const withoutEs = docs.filter((d) => !hasLang(d.data()?.title, 'es'));
  const withoutEn = docs.filter((d) => !hasLang(d.data()?.title, 'en'));
  let esUsers = 'не посчитано';
  try {
    const agg = await db.collection('users').where('pushTokenLang', '==', 'es').count().get();
    esUsers = String(agg.data().count);
  } catch (error) {
    esUsers = `не посчитано (${error instanceof Error ? error.message.slice(0, 80) : String(error)})`;
  }
  console.log(`${LOG} включённых опросов: ${docs.length}; без испанского текста: ${withoutEs.length}; без английского: ${withoutEn.length}`);
  console.log(`${LOG} людей с испанским языком пушей (верхняя оценка тех, кто мог видеть опрос по-русски): ${esUsers}`);
  for (const d of docs) console.log(`${LOG} ${d.id}: «${String(d.data()?.title?.ru ?? '').slice(0, 60)}» es=${hasLang(d.data()?.title, 'es') ? 'да' : 'нет'}`);
  if (!write) {
    console.log(`${LOG} просмотр: ничего не записано. Для снятия: --write --confirm ${CONFIRM_PAUSE}`);
    return;
  }
  mkdirSync(new URL('.', LIST_URL), { recursive: true });
  writeFileSync(LIST_URL, JSON.stringify({ pausedAt: new Date().toISOString(), ids: docs.map((d) => d.id) }, null, 2));
  console.log(`${LOG} список ${docs.length} опросов сохранён до записи: ${LIST_URL.pathname}`);
  for (const d of docs) {
    await d.ref.set({ enabled: false, pausedForRelease: { at: Date.now(), by: 'owner_question_18_option_a' } }, { merge: true });
    console.log(`${LOG} ${d.id}: снят`);
  }
  console.log(`${LOG} снято ${docs.length}. Вернуть в день выхода: --restore --confirm ${CONFIRM_RESTORE}`);
}

main().catch((error) => {
  console.error(`${LOG} сбой`, error instanceof Error ? error.message : String(error));
  process.exit(1);
});
