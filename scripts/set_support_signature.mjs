#!/usr/bin/env node
/**
 * Ставит подпись писем поддержки, выбранную владельцем (2026-08-17).
 *
 * ЧТО БЫЛО СЛОМАНО: в базе лежал английский шаблон со ссылкой
 * knowlyapps.com/help — страницы, которой на сайте НЕТ. Каждое письмо
 * поддержки вело клиента на 404, включая ответ, отправленный сегодня.
 * В коде была подмена для русских писем — с той же битой ссылкой.
 *
 * зачем менять и в базе, и в коде: подпись читается из базы (её правят в
 * админке), но localizedSupportSignature перезаписывает её для русских и
 * испанских писем. Поправить одно место означало бы оставить вторую копию
 * жить — известный класс бага в этом проекте.
 *
 * зачем поднимать signatureRevision: подготовленные ответы «прикреплены» к
 * ревизии подписи. Без её роста уже подготовленные письма ушли бы со старой
 * подписью, а с ростом — пересоберутся с новой.
 *
 *   node scripts/set_support_signature.mjs          # показать, что изменится
 *   node scripts/set_support_signature.mjs --apply  # записать
 */
import admin from 'firebase-admin';
import { existsSync, readFileSync } from 'fs';

const APPLY = process.argv.includes('--apply');
const SIGNATURE = 'С уважением,\nПоддержка Phraseman';

if (admin.apps.length === 0) {
  let projectId;
  try { projectId = JSON.parse(readFileSync('.firebaserc', 'utf8'))?.projects?.default; } catch {}
  const credential = existsSync('./service-account.json')
    ? admin.credential.cert(JSON.parse(readFileSync('./service-account.json', 'utf8')))
    : admin.credential.applicationDefault();
  admin.initializeApp(projectId ? { credential, projectId } : { credential });
}
const db = admin.firestore();

async function main() {
  const ref = db.collection('admin_config').doc('support_inbox');
  const data = (await ref.get()).data() || {};
  const current = String(data.signature || '');
  const revision = Number(data.signatureRevision ?? 0);

  console.log('=== СЕЙЧАС В БАЗЕ ===');
  console.log(current || '(пусто)');
  console.log('\nревизия:', revision);
  const hasDeadLink = /knowlyapps\.com\/help/i.test(current);
  console.log('битая ссылка на /help:', hasDeadLink ? 'ДА — уходит клиентам' : 'нет');

  console.log('\n=== БУДЕТ ===');
  console.log(SIGNATURE);
  console.log('\nновая ревизия:', revision + 1);

  if (current === SIGNATURE) {
    console.log('\nПодпись уже такая — менять нечего.');
    return;
  }
  if (!APPLY) {
    console.log('\nПробный прогон. Запустите с --apply, чтобы записать.');
    return;
  }

  await ref.set({
    signature: SIGNATURE,
    signatureRevision: revision + 1,
    signatureUpdatedAt: new Date().toISOString(),
    signatureUpdatedBy: 'set_support_signature',
  }, { merge: true });

  const after = (await ref.get()).data() || {};
  console.log('\n=== ЗАПИСАНО, ПРОВЕРКА ===');
  console.log(String(after.signature || '(пусто)'));
  console.log('ревизия:', after.signatureRevision);
  console.log('битая ссылка:', /knowlyapps\.com\/help/i.test(String(after.signature || '')) ? 'ОСТАЛАСЬ' : 'убрана');
}

main().then(() => process.exit(0)).catch((error) => {
  console.error('Не получилось:', error?.message || error);
  process.exit(1);
});
