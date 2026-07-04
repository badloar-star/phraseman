/**
 * scripts/audit_arena_question_duplicates.mjs — аудит (и опц. чистка) content-дублей
 * в коллекции `arena_questions` в FIRESTORE (prod).
 *
 * Контекст: банк содержит документы с РАЗНЫМИ id, но одинаковым содержанием
 * (question + correct). Из-за этого один матч Арены мог вытянуть 4–7 копий одного
 * вопроса по смыслу («в разборе вопросов 3–7 одинаковые»). Код выбора вопросов уже
 * дедупит по content-ключу (matchmaking.ts / arena_rooms.ts / use-arena-mock.ts),
 * но чистка самого банка убирает мёртвый груз и возвращает разнообразие пула.
 *
 * Ключ дедупа = question + sorted(options) + correct (всё trim/lowercase). ВАЖНО:
 * вопросы с одним текстом, но разными вариантами/правильным (это РАЗНЫЕ задания,
 * напр. «Which sentence is incorrect?» с разными наборами предложений) НЕ схлопываются.
 * Удаляются только полные визуальные дубли (текст + варианты + правильный совпадают).
 *
 * По умолчанию — DRY RUN (только отчёт, ничего не удаляет).
 * Чтобы реально удалить дубли (оставляя по одному документу на ключ — с
 * лексикографически наименьшим id): node scripts/audit_arena_question_duplicates.mjs --apply
 *
 * Креды: ./service-account.json если есть, иначе Application Default Credentials.
 */
import { existsSync, readFileSync } from 'fs';
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const SA_PATH = './service-account.json';
const credential = existsSync(SA_PATH)
  ? cert(JSON.parse(readFileSync(SA_PATH, 'utf8')))
  : applicationDefault();

initializeApp({ credential });
const db = getFirestore();

const APPLY = process.argv.includes('--apply');

function contentKey(data) {
  const q = typeof data.question === 'string' ? data.question.trim().toLowerCase() : '';
  const c = typeof data.correct === 'string' ? data.correct.trim().toLowerCase() : '';
  const opts = Array.isArray(data.options)
    ? data.options.map((x) => String(x).trim().toLowerCase()).sort().join('¦')
    : '';
  return q === '' ? '' : `${q}||${opts}||${c}`;
}

async function main() {
  console.log(`arena_questions duplicate audit — mode: ${APPLY ? 'APPLY (deletes extras)' : 'DRY RUN (report only)'}`);

  const snap = await db.collection('arena_questions').get();
  console.log(`fetched ${snap.size} documents`);

  // key -> array of { id, level }
  const groups = new Map();
  for (const doc of snap.docs) {
    const data = doc.data();
    const key = contentKey(data);
    if (key === '') continue; // пустой контент не схлопываем (уникален по id)
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ id: doc.id, level: String(data.level ?? '?') });
  }

  const dupGroups = [...groups.entries()].filter(([, arr]) => arr.length > 1);
  const dupDocCount = dupGroups.reduce((sum, [, arr]) => sum + (arr.length - 1), 0);

  // Per-level breakdown of extras that would be removed.
  const byLevel = {};
  const toDelete = [];
  for (const [, arr] of dupGroups) {
    // Keep the lexicographically smallest id; delete the rest.
    const sorted = [...arr].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const extras = sorted.slice(1);
    for (const e of extras) {
      byLevel[e.level] = (byLevel[e.level] ?? 0) + 1;
      toDelete.push(e.id);
    }
  }

  console.log(`\ncontent-duplicate groups: ${dupGroups.length}`);
  console.log(`extra documents (deletable): ${dupDocCount}`);
  console.log('by level:', JSON.stringify(byLevel));

  // Show a few example groups.
  console.log('\nsample duplicate groups (up to 10):');
  dupGroups
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10)
    .forEach(([key, arr]) => {
      console.log(`  x${arr.length}  [${arr.map((a) => a.id).join(', ')}]  ${key.slice(0, 70)}`);
    });

  if (!APPLY) {
    console.log('\nDRY RUN — nothing deleted. Re-run with --apply to delete the extras above.');
    process.exit(0);
  }

  console.log(`\nAPPLY — deleting ${toDelete.length} duplicate documents...`);
  const BATCH = 400;
  let done = 0;
  for (let i = 0; i < toDelete.length; i += BATCH) {
    const chunk = toDelete.slice(i, i + BATCH);
    const batch = db.batch();
    for (const id of chunk) batch.delete(db.collection('arena_questions').doc(id));
    await batch.commit();
    done += chunk.length;
    console.log(`  ${done}/${toDelete.length} deleted`);
  }
  console.log('Done!');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
