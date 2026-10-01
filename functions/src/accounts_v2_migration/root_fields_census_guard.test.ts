import { join } from 'path';
import { classifyRootField } from './inventory';

/*
 * Account V2, Пакет 8A — сторож реального состава корня users/{id}.
 *
 * зачем: E2E 2026-10-01 (сценарий A) — перенос OD21 встал в HOLD unknown_field из-за
 * служебных полей корня (accountGeneration, updatedAt, last_active_at, created_at),
 * которых не было в таблице инвентаря. Сид 6G нёс только progress и canonicalStableId,
 * поэтому тесты были зелёными. Здесь список корневых полей строится ИЗ КОДА (все
 * писатели users/{uid} и users/{stableId}: клиент, функции, триггеры, админка) —
 * scripts/accounts_v2_root_fields_code_census.cjs — и каждое поле обязано иметь правило.
 * Новый писатель с новым полем без правила = красный тест, а не HOLD у людей.
 * Поля, которые пишет только прод-скрипт вне репозитория или старая версия приложения,
 * этот сторож не видит — для них прод-сверка scripts/accounts_v2_root_fields_census.mjs.
 */

type Census = Readonly<{
  fields: Readonly<Record<string, readonly string[]>>;
  unresolved: readonly string[];
  staleHints: readonly string[];
  scannedFiles: number;
}>;
type CensusModule = Readonly<{
  buildRootFieldCensus: (options?: Readonly<{ sources?: readonly Readonly<{ rel: string; text: string }>[]; hints?: Readonly<Record<string, readonly string[]>> }>) => Census;
}>;

const REPO = join(__dirname, '..', '..', '..');
// eslint-disable-next-line @typescript-eslint/no-require-imports -- общий CJS-модуль переписи (им же пользуется прод-сверка).
const { buildRootFieldCensus } = require(join(REPO, 'scripts', 'accounts_v2_root_fields_code_census.cjs')) as CensusModule;

/**
 * Утверждённые HOLD корня. Пусто: решение координатора 8A (2026-10-01) перевело прежние HOLD
 * Пакета 5 (progressServer*, progressMigratedAt, mistakePracticeMergePending) в keep_in_place OD20 —
 * progressServerState пишется при каждом уроке и держал бы перенос почти у всех.
 * Любой новый HOLD корня — красный, пока не записано решение.
 */
const DECIDED_ROOT_HOLDS: readonly string[] = Object.freeze([]);

/** Поля без правила или в HOLD (кроме решённых выше). progress — карта, её ключи классифицирует classifyProgressKey. */
function uncoveredRootFields(census: Census): string[] {
  return Object.keys(census.fields)
    .filter((name) => name !== 'progress')
    .filter((name) => {
      const found = classifyRootField(name);
      return found.ruleId === null || (found.disposition === 'hold' && !DECIDED_ROOT_HOLDS.includes(name));
    })
    .map((name) => `${name} ← ${census.fields[name].slice(0, 3).join(', ')}`);
}

describe('accounts_v2_migration — сторож корневых полей users/{id} по коду', () => {
  let census: Census;
  beforeAll(() => {
    census = buildRootFieldCensus();
  }, 120_000);

  it('сторож не слепой: видит известных писателей клиента, функций и Learning V2', () => {
    expect(census.scannedFiles).toBeGreaterThan(1000);
    expect(census.fields.accountGeneration).toEqual(expect.arrayContaining([expect.stringMatching(/^functions\/src\/learning_v2\/progress_event_callable\.ts:\d+$/)]));
    expect(census.fields.created_at).toEqual(expect.arrayContaining([expect.stringMatching(/^app\/cloud_sync\.ts:\d+$/)]));
    expect(census.fields.stars).toEqual(expect.arrayContaining([expect.stringMatching(/^functions\/src\/stars_ledger\.ts:\d+$/)]));
    expect(census.fields.expoPushToken).toEqual(expect.arrayContaining([expect.stringMatching(/^app\/push_token_registration\.ts:\d+$/)]));
    expect(census.fields.identityMergedAt).toEqual(expect.arrayContaining([expect.stringMatching(/^functions\/src\/auth_merge\.ts:\d+$/)]));
    expect(Object.keys(census.fields).length).toBeGreaterThanOrEqual(60);
  });

  it('каждая запись в корень разобрана до имён полей (нет неразобранных писателей)', () => {
    expect(census.unresolved).toEqual([]);
  });

  it('подсказки сторожа не протухли (каждая всё ещё встречается в своём файле)', () => {
    expect(census.staleHints).toEqual([]);
  });

  it('каждое поле, которое пишет код, есть в инвентаре и не блокирует перенос', () => {
    expect(uncoveredRootFields(census)).toEqual([]);
  });

  it('решённые HOLD корня — ровно записанный список (новый HOLD только по решению)', () => {
    const holds = Object.keys(census.fields)
      .filter((name) => name !== 'progress')
      .filter((name) => classifyRootField(name).disposition === 'hold')
      .sort();
    expect(holds).toEqual([...DECIDED_ROOT_HOLDS].sort());
  });
});

describe('accounts_v2_migration — сторож корневых полей ловит новых писателей (мутации)', () => {
  const run = (rel: string, text: string): Census => buildRootFieldCensus({ sources: [{ rel, text }], hints: {} });

  it.each([
    ['функции: tx.set(userRef, …)', 'functions/src/x.ts',
      "const userRef = db.collection('users').doc(uid);\nawait db.runTransaction(async (tx) => { tx.set(userRef, { brandNewRootField: 1 }, { merge: true }); });"],
    ['клиент: setDoc(doc(db, \'users\', uid), …)', 'app/x.ts', "await setDoc(doc(db, 'users', uid), { brandNewRootField: 1 }, { merge: true });"],
    ['константа коллекции и вычисляемый ключ', 'functions/src/y.ts',
      "const USERS = 'users';\nconst FIELD = 'brandNewRootField';\nawait db.collection(USERS).doc(uid).update({ [FIELD]: 1 });"],
    ['сквозная функция: ключи пришли параметром', 'functions/src/z.ts',
      "function writeRoot(ref, patch) { return ref.set({ ...patch }, { merge: true }); }\nwriteRoot(db.collection('users').doc(uid), { brandNewRootField: 1 });"],
    ['документы запроса по users', 'functions/src/q.ts',
      "const page = await db.collection('users').where('a', '==', 1).get();\nfor (const doc of page.docs) { await doc.ref.update({ brandNewRootField: 1 }); }"],
  ])('%s → новое поле найдено и не покрыто инвентарём', (_name, rel, text) => {
    const census = run(rel, text);
    expect(census.fields.brandNewRootField).toEqual([expect.stringMatching(new RegExp(`^${rel.replace(/[.]/g, '\\.')}:\\d+$`))]);
    expect(uncoveredRootFields(census)).toEqual([expect.stringMatching(/^brandNewRootField ← /)]);
  });

  it('запись в чужую коллекцию и в подколлекцию пользователя корень не трогает', () => {
    const census = run('functions/src/o.ts', [
      "await db.collection('leaderboard').doc(uid).set({ notRoot: 1 });",
      "await db.collection('users').doc(uid).collection('friends').doc(f).set({ notRootEither: 1 });",
    ].join('\n'));
    expect(census.fields).toEqual({});
  });

  it('неразобранная запись в корень попадает в unresolved, а не теряется молча', () => {
    const census = run('functions/src/u.ts', "await db.collection('users').doc(uid).set(buildSomething(), { merge: true });");
    expect(census.unresolved).toEqual([expect.stringMatching(/^functions\/src\/u\.ts:1 set buildSomething\(\)$/)]);
  });

  it('протухшая подсказка видна', () => {
    const census = buildRootFieldCensus({ sources: [{ rel: 'functions/src/auth_merge.ts', text: 'const a = 1;' }], hints: { 'functions/src/auth_merge.ts': ['winner.ref'] } });
    expect(census.staleHints).toEqual(['functions/src/auth_merge.ts: winner.ref']);
  });
});
