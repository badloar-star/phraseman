#!/usr/bin/env node
/**
 * Починка инструкций владельца для поддержки.
 *
 * ЧТО СЛОМАЛОСЬ (2026-08-17): 2026-08-16 инструкции были записаны в Firestore
 * напрямую, минуя штатный писатель adminUpdateSupportInstructions. В документе
 * оказались только schemaVersion, revision и text — без promptVersion,
 * fingerprint, byteLength, allowedUrls и allowedHandles.
 *
 * ПОЧЕМУ ЭТО УБИЛО ОТВЕТЫ: parseSupportOwnerInstructions требует ровно этот
 * набор и БРОСАЕТ исключение, если чего-то нет. Исключение ловится общим
 * catch в generateSupportAutoReply, и письмо уходит в retry с причиной
 * support_instructions_unavailable. Никакого ответа человек не получает —
 * ровно тот случай «пришло письмо, а Джарвис не ответил».
 *
 * зачем считать поля тем же кодом, а не руками: fingerprint и разбор ссылок
 * должны совпасть с сервером до символа, иначе парсер снова бросит
 * support_instructions_fingerprint_mismatch. Собранный рантайм в functions/lib
 * — это буквально то, что исполняется в проде.
 *
 *   node scripts/repair_support_owner_instructions.mjs          # показать
 *   node scripts/repair_support_owner_instructions.mjs --apply  # починить
 */
import admin from 'firebase-admin';
import { existsSync, readFileSync } from 'fs';
import { createRequire } from 'module';

const APPLY = process.argv.includes('--apply');
const require = createRequire(import.meta.url);

const {
  makeSupportOwnerInstructionsSnapshot,
  parseSupportOwnerInstructions,
} = require('../functions/lib/functions/src/support_owner_instructions.js');

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
  const snap = await ref.get();
  const data = snap.data() || {};
  const current = data.supportOwnerInstructions || {};

  // Диагноз: что именно не проходит серверную проверку.
  let parseError = null;
  try {
    parseSupportOwnerInstructions(data);
    console.log('Инструкции читаются нормально — чинить нечего.');
    return;
  } catch (error) {
    parseError = error?.message || String(error);
  }
  console.log('Сейчас парсер падает с:', parseError);
  console.log('Поля в документе:', Object.keys(current).join(', ') || '(пусто)');

  const text = String(current.text || '').trim();
  if (!text) {
    console.log('Текста инструкций нет — чинить нечего, заполните их в админке.');
    return;
  }

  const revision = Number(current.revision) > 0 ? Number(current.revision) : 1;
  // Тот же вызов, что делает серверный писатель: считает fingerprint,
  // byteLength и вытаскивает разрешённые адреса из самого текста.
  const snapshot = makeSupportOwnerInstructionsSnapshot(text, revision);

  console.log('\nБудет записано:');
  console.log('  revision:', snapshot.revision, '| promptVersion:', snapshot.promptVersion);
  console.log('  байт:', snapshot.byteLength, '| fingerprint:', snapshot.fingerprint.slice(0, 16) + '…');
  console.log('  разрешённые адреса:', snapshot.allowedUrls.join(', ') || '(нет)');
  console.log('  разрешённые каналы:', snapshot.allowedHandles.join(', ') || '(нет)');

  if (!APPLY) {
    console.log('\nПробный прогон. Запустите с --apply, чтобы починить.');
    return;
  }

  await ref.set({
    supportOwnerInstructions: {
      schemaVersion: snapshot.schemaVersion,
      revision: snapshot.revision,
      promptVersion: snapshot.promptVersion,
      text: snapshot.text,
      fingerprint: snapshot.fingerprint,
      byteLength: snapshot.byteLength,
      allowedUrls: snapshot.allowedUrls,
      allowedHandles: snapshot.allowedHandles,
      updatedAt: new Date().toISOString(),
      updatedBy: 'repair_support_owner_instructions',
    },
  }, { merge: true });

  // Проверяем результат тем же парсером, что и сервер, — иначе «починил» было
  // бы утверждением без доказательства.
  const verified = parseSupportOwnerInstructions((await ref.get()).data());
  console.log('\nГотово. Парсер прочитал: revision', verified.revision,
    '| адресов:', verified.allowedUrls.length);
}

main().then(() => process.exit(0)).catch((error) => {
  console.error('Не получилось:', error?.message || error);
  process.exit(1);
});
