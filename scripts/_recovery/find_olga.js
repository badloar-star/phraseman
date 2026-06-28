/**
 * find_olga.js — поиск аккаунта OlgaZ #1c2b в Firestore.
 *
 * Кейс: пользователь сообщил bug-report с тегом OlgaZ #1c2b | Lv42 | 356374 XP |
 * streak 8 | premium: false | days: 46 | ios 26.3.1 | iPhone | lang: ru. Просит
 * восстановить «полный доступ» — судя по тексту, потеряла привязку к старому
 * аккаунту после обновления.
 *
 * Скрипт НИЧЕГО не меняет — только читает Firestore и распечатывает
 * кандидатов, чтобы оператор однозначно опознал её настоящий аккаунт и его близнецов.
 *
 * Запуск:
 *   node scripts/_recovery/find_olga.js
 *
 * Требует: service-account.json в корне проекта.
 */

const admin = require('firebase-admin');
const path = require('path');

const SA_PATH = path.resolve(__dirname, '..', '..', 'service-account.json');
const serviceAccount = require(SA_PATH);

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// Из bug-report:
const TARGET = {
  shortId: '1c2b',     // последние 4 символа stableId (без дефисов)
  nameHint: 'OlgaZ',   // displayName из репорта
  xpExact: 356374,
  level: 42,
  streak: 8,
  days: 46,            // сколько дней пользовалась
  lang: 'ru',
  platform: 'ios',
};

function shortIdOf(stableId) {
  return String(stableId || '').replace(/-/g, '').slice(-4).toLowerCase();
}

function num(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

async function main() {
  console.log('=== Phraseman: поиск аккаунта OlgaZ #1c2b ===\n');

  // --- ВАРИАНТ 1: точный матч по shortId (последние 4 символа stableId) ---
  // Firestore не умеет фильтровать по фрагменту docId, поэтому делаем ОДИН проход
  // по коллекции users с фильтрами в памяти. Чтобы не качать всех — берём только
  // тех, у кого XP в окне [TARGET.xpExact ± 100k]. Заведомо переберём <1000 доков.
  const lo = TARGET.xpExact - 100_000;
  const hi = TARGET.xpExact + 100_000;
  console.log(`[1/3] Скан users где progress.user_total_xp в [${lo}..${hi}]…`);

  // progress.user_total_xp хранится как СТРОКА (см. auth_merge.ts:23 — flat record
  // of strings). Поэтому range-запрос по числу не сработает. Делаем по полю
  // shards/xp-зеркала если есть, иначе полный скан.
  // Безопаснее всего — полный скан с count, потом фильтрация в памяти.

  console.log('  (полный скан коллекции users — пара минут максимум)');
  const snap = await db.collection('users').get();
  console.log(`  всего users: ${snap.size}`);

  const candidates = [];
  for (const doc of snap.docs) {
    const data = doc.data() || {};
    const progress = data.progress || {};
    const xp = num(progress.user_total_xp);
    const streak = num(progress.streak_count);
    const name = String(progress.user_name || data.name || data.displayName || '').trim();
    const sid = shortIdOf(doc.id);

    // Считаем «совпадение»: каждый признак — балл.
    let score = 0;
    const matched = [];
    if (sid === TARGET.shortId) { score += 100; matched.push('shortId'); }
    if (name && name.toLowerCase().includes(TARGET.nameHint.toLowerCase())) { score += 50; matched.push('name'); }
    if (Math.abs(xp - TARGET.xpExact) < 100) { score += 80; matched.push('xpExact'); }
    if (Math.abs(xp - TARGET.xpExact) < 5000) { score += 20; matched.push('xpNear'); }
    if (streak === TARGET.streak) { score += 10; matched.push('streak'); }
    if (score === 0) continue;

    candidates.push({
      uid: doc.id,
      shortId: sid,
      name,
      xp,
      streak,
      level: num(progress.level),
      premium_plan: progress.premium_plan || null,
      vip_active: progress.vip_active || null,
      vip_plan: progress.vip_plan || null,
      vip_until: progress.vip_until || null,
      premium_expiry: progress.premium_expiry || null,
      identityHidden: data.identityHidden === true,
      canonicalStableId: data.canonicalStableId || null,
      firebaseAuthUid: data.firebaseAuthUid || null,
      linkedAuth: data.linkedAuth || null,
      lastSignInAt: data.lastSignInAt || null,
      updatedAt: progress.updatedAt || data.updatedAt || null,
      lang: progress.app_lang || progress.lang || null,
      platform: data.devicePlatform || progress.platform || null,
      score,
      matched: matched.join(','),
    });
  }

  candidates.sort((a, b) => b.score - a.score);

  console.log(`\n[2/3] Найдено кандидатов: ${candidates.length}`);
  console.log('=== TOP-10 ===\n');
  for (const c of candidates.slice(0, 10)) {
    console.log(`UID: ${c.uid}  (#${c.shortId})  score=${c.score}  [${c.matched}]`);
    console.log(`  name=${JSON.stringify(c.name)}  xp=${c.xp}  streak=${c.streak}  lvl=${c.level}`);
    console.log(`  premium_plan=${c.premium_plan}  vip_active=${c.vip_active}  vip_plan=${c.vip_plan}  vip_until=${c.vip_until}`);
    console.log(`  identityHidden=${c.identityHidden}  canonical=${c.canonicalStableId}`);
    console.log(`  firebaseAuthUid=${c.firebaseAuthUid}`);
    console.log(`  linkedAuth=${JSON.stringify(c.linkedAuth)}`);
    console.log(`  lang=${c.lang}  platform=${c.platform}  updatedAt=${c.updatedAt}  lastSignInAt=${c.lastSignInAt}`);
    console.log('');
  }

  // --- ВАРИАНТ 3: auth_links → если у OlgaZ есть Apple/Google привязка ---
  if (candidates.length > 0) {
    console.log('[3/3] Связи в auth_links для топ-3 кандидатов…\n');
    for (const c of candidates.slice(0, 3)) {
      const links = await db.collection('auth_links').where('stableId', '==', c.uid).get();
      console.log(`  ${c.uid} (#${c.shortId}) → ${links.size} запис(ей) в auth_links`);
      for (const ld of links.docs) {
        const d = ld.data();
        console.log(`     providerUid=${ld.id}  provider=${d.provider}  email=${d.email}  lastSignInAt=${d.lastSignInAt}`);
      }
    }
  }

  console.log('\n=== ГОТОВО ===');
  console.log('Если есть документ с score >= 130 — это ОНА.');
  console.log('Если их два с почти одинаковым score (один с identityHidden=false, второй с null/false и низким XP) — нужен merge.');
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
