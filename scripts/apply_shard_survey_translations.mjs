#!/usr/bin/env node
/**
 * Опросы осколков: вписать переводы uk/en из черновика в живые документы shard_surveys/survey_preset_NNN.
 *
 * зачем (координатор 12.10, Сверка: на украинском интерфейсе в «Сегодня» русская строка опроса «Зовёшь друга заниматься…»):
 * у живых опросов есть только ru. Сервер после выкладки (missingSurveyLocaleKeys) не предлагает опрос без перевода; чтобы
 * опросы вернулись на uk/en, переводы нужно вписать в документы. Вставлять 54 опроса × 2 языка руками в админке нереально —
 * этот скрипт делает то же самое за один проход.
 *
 * Запускает ТОЛЬКО владелец (запись в прод). Сессии ИИ этот скрипт не запускают: он читает service-account.json.
 *   План (ничего не пишет):  node scripts/apply_shard_survey_translations.mjs
 *   Запись:                  node scripts/apply_shard_survey_translations.mjs --write --confirm APPLY_SURVEY_TRANSLATIONS_UK_EN
 *
 * Правила безопасности:
 * - пишет только языки, которых в документе НЕТ (уже вписанный перевод не перезаписывается);
 * - документ пропускается, если число вариантов или кнопок действий не совпадает с черновиком (опрос правили в админке);
 * - ru и всё остальное в документе не трогается; каждый документ — отдельная запись с merge.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const PROJECT_ID = 'phraseman-ea0b3';
const COLLECTION = 'shard_surveys';
const LANGS = ['uk', 'en'];
const CONFIRM = 'APPLY_SURVEY_TRANSLATIONS_UK_EN';

const args = process.argv.slice(2);
const write = args.includes('--write');
const confirmAt = args.indexOf('--confirm');
const confirmed = confirmAt >= 0 && args[confirmAt + 1] === CONFIRM;
if (write && !confirmed) {
  console.error(`[SURVEY-TR] отказ: для записи нужен --confirm ${CONFIRM}`);
  process.exit(2);
}

const draft = JSON.parse(readFileSync(new URL('../docs/phraseman-2.0/shard_survey_translations_uk_en_draft.json', import.meta.url), 'utf8'));

function withLang(localized, lang, value) {
  if (!localized || typeof localized !== 'object' || !value) return { localized, changed: false };
  if (typeof localized[lang] === 'string' && localized[lang].trim()) return { localized, changed: false };
  return { localized: { ...localized, [lang]: value }, changed: true };
}

function planDoc(id, data) {
  const presetId = Number(data.presetId);
  const tr = draft.presets[String(presetId)];
  if (!tr) return { id, skip: `нет в черновике (presetId=${presetId}) — перевести вручную` };
  const question = Array.isArray(data.questions) ? data.questions[0] : null;
  if (!question || !Array.isArray(question.options)) return { id, skip: 'нет вопроса q1' };
  const next = { title: data.title, subtitle: data.subtitle, questions: data.questions, finalScreen: data.finalScreen };
  let changes = 0;
  for (const lang of LANGS) {
    const t = tr[lang];
    if (!t) continue;
    if (t.o.length !== question.options.length) return { id, skip: `${lang}: вариантов ${question.options.length} в документе, ${t.o.length} в черновике — опрос правили, пропуск` };
    const ctaDoc = question.options.map((o, i) => (o.action ? String(i + 1) : null)).filter(Boolean).sort().join(',');
    const ctaDraft = Object.keys(t.cta).sort().join(',');
    if (ctaDoc !== ctaDraft) return { id, skip: `${lang}: кнопки действий [${ctaDoc}] ≠ черновик [${ctaDraft}] — пропуск` };
    let r = withLang(next.title, lang, t.q); next.title = r.localized; changes += r.changed ? 1 : 0;
    r = withLang(next.subtitle, lang, t.d); next.subtitle = r.localized; changes += r.changed ? 1 : 0;
    const q = next.questions[0];
    r = withLang(q.text, lang, t.q);
    const options = q.options.map((o, i) => {
      const label = withLang(o.label, lang, t.o[i]);
      changes += label.changed ? 1 : 0;
      if (!o.action) return { ...o, label: label.localized };
      const cta = withLang(o.action.cta, lang, t.cta[String(i + 1)]);
      changes += cta.changed ? 1 : 0;
      return { ...o, label: label.localized, action: { ...o.action, cta: cta.localized } };
    });
    changes += r.changed ? 1 : 0;
    next.questions = [{ ...q, text: r.localized, options }, ...next.questions.slice(1)];
    const fs = draft.finalScreen[lang];
    if (fs && next.finalScreen) {
      const ft = withLang(next.finalScreen.title, lang, fs.title);
      const fsub = withLang(next.finalScreen.subtitle, lang, fs.subtitle);
      changes += (ft.changed ? 1 : 0) + (fsub.changed ? 1 : 0);
      next.finalScreen = { ...next.finalScreen, title: ft.localized, subtitle: fsub.localized };
    }
  }
  return { id, presetId, titleRu: data.title?.ru ?? '', changes, next };
}

async function main() {
  const require = createRequire(import.meta.url);
  const admin = require('../functions/node_modules/firebase-admin');
  const serviceAccount = JSON.parse(readFileSync(new URL('../service-account.json', import.meta.url), 'utf8'));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: PROJECT_ID });
  const db = admin.firestore();
  const snap = await db.collection(COLLECTION).get();
  const plans = snap.docs.filter((d) => d.id.startsWith('survey_preset_')).map((d) => planDoc(d.id, d.data()));
  const ready = plans.filter((p) => !p.skip && p.changes > 0);
  for (const p of plans) {
    if (p.skip) console.log(`[SURVEY-TR] ${p.id}: ПРОПУСК — ${p.skip}`);
    else console.log(`[SURVEY-TR] ${p.id}: ${p.changes ? `+${p.changes} строк` : 'уже переведено'} — «${String(p.titleRu).slice(0, 60)}»`);
  }
  console.log(`[SURVEY-TR] итог: документов ${plans.length}, к записи ${ready.length}, пропусков ${plans.filter((p) => p.skip).length}, режим ${write ? 'ЗАПИСЬ' : 'план'}`);
  if (!write) return;
  for (const p of ready) {
    await db.collection(COLLECTION).doc(p.id).set({ ...p.next, updatedAtMs: Date.now(), updatedBy: 'survey_translations_uk_en_2026_10_12' }, { merge: true });
    console.log(`[SURVEY-TR] записан ${p.id}`);
  }
}

main().catch((error) => {
  console.error('[SURVEY-TR] сбой', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
