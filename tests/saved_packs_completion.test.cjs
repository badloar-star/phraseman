// Behavioral regressions: execute production TS with only device boundaries replaced.
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
const { test } = require('node:test');
function run(source, deps = {}, bindings = {}) {
  const module = { exports: {} };
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 } }).outputText;
  vm.runInNewContext(js, { module, exports: module.exports, require: id => {
    if (!(id in deps)) throw Error(`Unmocked dependency: ${id}`);
    return deps[id];
  }, ...bindings });
  return module.exports;
}
function file(path, deps) { return run(fs.readFileSync(path, 'utf8'), deps); }
function extract(path, name, bindings = {}) {
  const tree = ts.createSourceFile(path, fs.readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found;
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node.getText(tree).replace(/^export\s+/, '');
    if (ts.isVariableDeclaration(node) && node.name.getText(tree) === name) {
      const init = node.initializer;
      const value = ts.isCallExpression(init) && init.expression.getText(tree) === 'useCallback' ? init.arguments[0] : init;
      found = `const ${name} = ${value.getText(tree)};`;
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  if (!found) throw Error(`Missing ${name}`);
  return run(`${found}\nmodule.exports = ${name};`, {}, bindings);
}
const languages = file('app/flashcards/pack_languages.ts');
function device() {
  const storage = new Map();
  let fail = false;
  const token = { stableId: 'test-account' };
  const api = file('hooks/use-flashcards.ts', {
    '@react-native-async-storage/async-storage': { default: {
      getItem: async key => storage.get(key) ?? null,
      setItem: async (key, value) => { if (fail) throw Error('disk full'); storage.set(key, value); },
      removeItem: async key => storage.delete(key),
    } },
    '../app/premium_guard': { getVerifiedPremiumStatus: async () => true },
    '../app/feature_gates': { isFeatureFreeForEveryone: () => true },
    '../app/target_storage_keys': { flashcardsSavedKey: t => t === 'fr' ? 'fr' : 'en', storageStudyTarget: t => t === 'fr' ? 'fr' : 'en' },
    '../app/account_generation': { captureAccountGeneration: () => token, isCurrentAccountGeneration: t => t === token, withAccountTransitionLock: fn => fn() },
    '../app/account_scope_key': { accountScopeKey: () => 'test-account' },
    '../app/flashcards/pack_languages': languages,
  });
  return { api, storage, failWrites: () => { fail = true; } };
}
const card = { id: 'a', en: 'Taxi', ru: 'Такси', uk: 'Таксі', source: 'lesson', sourceId: '12', addedAt: 1 };
test('all saved contours include legacy French storage with explicit language', async () => {
  const { api, storage } = device();
  storage.set('en', JSON.stringify([card]));
  storage.set('fr', JSON.stringify([{ ...card, id: 'b', en: 'Bonjour' }]));
  const cards = await api.loadAllSavedFlashcards();
  assert.equal(languages.filterCardsByPackLanguage(cards, 'fr')[0].en, 'Bonjour');
  assert.equal(languages.filterCardsByPackLanguage(cards, 'en').length, 1);
});
test('equal text in EN and ES is not a duplicate; repeat ES is', async () => {
  const { api } = device();
  assert.equal(await api.addFlashcard({ ...card, packLanguage: 'en' }, 'en'), 'added');
  assert.equal(await api.addFlashcard({ ...card, packLanguage: 'es' }, 'es'), 'added');
  assert.equal(await api.addFlashcard({ ...card, packLanguage: 'es' }, 'es'), 'duplicate');
  assert.equal((await api.loadFlashcards('en')).length, 2);
});
test('failed delete is rejected and disk/cache retain card', async () => {
  const { api, storage, failWrites } = device();
  storage.set('fr', JSON.stringify([card]));
  failWrites();
  await assert.rejects(() => api.removeFlashcardWithSnapshot('a', 'fr'));
  assert.equal((await api.loadFlashcards('fr')).length, 1);
});
test('undo restores into original French storage', async () => {
  const { api, storage } = device();
  storage.set('fr', JSON.stringify([card]));
  const snapshot = await api.removeFlashcardWithSnapshot('a', 'fr');
  await api.restoreFlashcard(snapshot.card, snapshot.index);
  assert.equal((await api.loadFlashcards('fr')).length, 1);
  assert.equal((await api.loadFlashcards('en')).length, 0);
});
test('collection equality observes metadata changes', () => {
  const equal = extract('app/flashcards/useCollectionData.ts', 'sameCardList');
  assert.equal(equal([card], [{ ...card, packLanguage: 'fr' }]), false);
});
test('batch undo restores the original physical order', async () => {
  const { api, storage } = device();
  storage.set('fr', JSON.stringify(['a', 'b', 'c', 'd'].map(id => ({ ...card, id }))));
  const items = [];
  for (const id of ['a', 'b', 'd']) items.push(await api.removeFlashcardWithSnapshot(id, 'fr'));
  for (const snapshot of [...items].reverse()) await api.restoreFlashcard(snapshot.card, snapshot.index);
  assert.deepEqual(JSON.parse(JSON.stringify((await api.loadFlashcards('fr')).map(item => item.id))), ['a', 'b', 'c', 'd']);
});
test('drafts follow the requested pack language without losing another language', async () => {
  const disk = new Map();
  const drafts = file('app/community_packs/communityPackDraftStorage.ts', {
    '@react-native-async-storage/async-storage': { default: { getItem: async k => disk.get(k) ?? null, setItem: async (k,v) => disk.set(k,v), removeItem: async k => disk.delete(k) } },
    './schema': { COMMUNITY_PACK_CARD_COUNT_MAX: 50 }, './ugcCardThemePresets': { UGC_CARD_THEME_IDS: ['a'] }, '../flashcards/cardBackCatalog': { UGC_CARD_BACK_IDS: ['a'] },
    '../target_storage_keys': { communityPackCreateDraftKey: (target,locale) => `${target}:${locale}` },
    '../debug-logger': { DebugLogger: { error: () => {} } }, '../flashcards/pack_languages': languages,
    '../account_generation': { captureAccountGeneration: () => ({}), isCurrentAccountGeneration: () => true, withAccountTransitionLock: fn => fn() },
  });
  const draft = { title: 'English', description: 'Trip', themeIdx: 0, cardBackIdx: 0, packLanguage: 'en', rows: [], addCardFormOpen: false, draftEn: '', draftRu: '', draftEs: '', draftNote: '', draftPlannedTranslation: '' };
  await drafts.saveCommunityPackCreateDraft(draft, 'en', 'ru');
  assert.equal(await drafts.loadCommunityPackCreateDraft('en', 'ru', 'fr'), null);
  await drafts.saveCommunityPackCreateDraft({ ...draft, title: 'French', packLanguage: 'fr' }, 'en', 'ru');
  assert.equal((await drafts.loadCommunityPackCreateDraft('en', 'ru', 'en')).title, 'English');
  assert.equal((await drafts.loadCommunityPackCreateDraft('en', 'ru', 'fr')).title, 'French');
  await drafts.clearCommunityPackCreateDraft('en', 'ru', 'fr');
  assert.equal(await drafts.loadCommunityPackCreateDraft('en', 'ru', 'fr'), null);
  assert.equal((await drafts.loadCommunityPackCreateDraft('en', 'ru', 'en')).title, 'English');
});
test('Saved adapter preserves additional translations', () => {
  const adapt = extract('app/flashcards/useCollectionData.ts', 'savedToCard', languages);
  assert.equal(adapt({ ...card, sourceLocales: { pl: 'Taksówka' } }).sourceLocales.pl, 'Taksówka');
});
test('nine cards cannot be saved as a set', () => {
  const validate = extract('app/community_pack_create.tsx', 'localSaveError');
  assert.notEqual(validate({ title: 'Travel', description: 'Trip', cards: Array(9).fill(card) }), null);
  assert.equal(validate({ title: 'Travel', description: 'Trip', cards: Array(10).fill(card) }), null);
});
test('same-title cloud pack cannot hide another language or private local pack', () => {
  const merge = extract('app/community_packs/localAuthorPacks.ts', 'mergeLocalAuthorPacks', { ...languages, localAuthorPackToMarketPack: p => p });
  const cloud = [{ id: 'remote', isCommunityUgc: true, authorStableId: 'u', titleRu: 'Travel', packLanguage: 'en' }];
  assert.equal(merge(cloud, [{ id: 'local', authorStableId: 'u', title: 'Travel', packLanguage: 'fr' }]).length, 1);
  assert.equal(merge(cloud, [{ id: 'local', authorStableId: 'u', title: 'Travel', packLanguage: 'en', isPublic: false }]).length, 1);
});
test('saved video origin and Ukrainian translation survive editor and pack adapter', () => {
  const labels = file('app/flashcards/source_labels.ts', { '../../constants/i18n': { triLang: (lang, copy) => copy[lang] ?? copy.ru } });
  const rowFromCard = extract('app/community_pack_create.tsx', 'rowFromStagedSavedCard', { ...languages, ...labels });
  const adapt = extract('app/community_packs/communityFirestore.ts', 'communityPackCardsToCardItems', languages);
  const row = rowFromCard({ ...card, source: 'video_phrase', sourceTitle: 'A video' }, 'fr', 'uk');
  const result = adapt('pack', [row], 'fr')[0];
  assert.equal(result.uk, card.uk);
  assert.equal(result.origin.source, 'video_phrase');
  assert.equal(result.origin.sourceTitle, 'A video');
  assert.equal(result.packLanguage, 'fr');
  assert.equal(result.sourceId, 'DEV:pack'); // pack navigation remains intact
});
test('author removal cancels a pending first publication', async () => {
  let state = { authorStableId: 'u', status: 'pending' };
  const ref = collection => ({ collection, id: 'pack' });
  const db = {
    collection: collection => ({ doc: () => ref(collection) }),
    runTransaction: async fn => fn({
      get: async r => ({ exists: r.collection === 'community_pack_submissions', data: () => state }),
      update: (_r, data) => { state = { ...state, ...data }; },
    }),
  };
  const remove = extract('functions/src/community_packs.ts', 'communityAuthorRemovePack', {
    onCall: (_opts, fn) => fn, ENFORCE_APP_CHECK: false,
    HttpsError: class extends Error {}, admin: { firestore: () => db },
    resolveStableUidForAuth: async () => 'u', COMMUNITY_PACKS: 'community_packs', COMMUNITY_SUBMISSIONS: 'community_pack_submissions',
  });
  await remove({ auth: { uid: 'u' }, data: { authorStableId: 'u', packId: 'pack' } });
  assert.equal(state.status, 'cancelled');
});
for (const action of ['approve', 'reject', 'request_changes']) {
  test(`${action} cannot resurrect an author-withdrawn pack`, async () => {
    let submission = { status: 'pending', authorStableId: 'u', editTargetPackId: 'pack' };
    const pack = { listingStatus: 'admin_removed', removedByAuthor: true };
    const db = {
      collection: collection => ({ doc: id => ({ collection, id }) }),
      runTransaction: async fn => fn({
        get: async ref => ({ exists: true, data: () => ref.collection === 'community_packs' ? pack : submission }),
        update: (ref, changes) => {
          assert.equal(ref.collection, 'community_pack_submissions');
          submission = { ...submission, ...changes };
        },
      }),
    };
    const moderate = extract('functions/src/community_packs.ts', 'communityModerateSubmission', {
      onCall: (_opts, fn) => fn, ENFORCE_APP_CHECK: false,
      HttpsError: class extends Error {}, admin: { firestore: () => db },
      trimModeratorMessage: text => text ?? '', moderatorMessageOrNull: text => text || null,
      COMMUNITY_PACKS: 'community_packs', COMMUNITY_SUBMISSIONS: 'community_pack_submissions', LISTING_ADMIN_REMOVED: 'admin_removed',
    });
    const result = await moderate({ auth: { token: { admin: true } }, data: { submissionId: 'review', action } });
    assert.equal(submission.status, 'cancelled');
    assert.equal(result.publishedPackId, null);
    assert.equal(pack.listingStatus, 'admin_removed');
  });
}
test('local saves serialize, preserve other contours and persist publication identity', async () => {
  const disk = new Map();
  const token = { stableId: 'u' };
  const local = file('app/community_packs/localAuthorPacks.ts', {
    '@react-native-async-storage/async-storage': { default: { getItem: async k => disk.get(k) ?? null, setItem: async (k,v) => { disk.set(k,v); } } },
    '../target_storage_keys': { flashcardsLocalAuthorPacksKey: t => t === 'fr' ? 'fr' : 'en', storageStudyTarget: t => t === 'fr' ? 'fr' : 'en' },
    '../flashcards/marketplace': { derivePackCodeName: id => id }, './communityFirestore': { communityPackCardsToCardItems: () => [] },
    '../flashcards/pack_languages': languages,
    '../account_generation': { captureAccountGeneration: () => token, isCurrentAccountGeneration: t => t === token, withAccountTransitionLock: fn => fn() },
  });
  const payload = { title: 'Travel', description: 'Trip', cards: Array(10).fill(card), packLanguage: 'fr', publishToCommunity: true };
  await Promise.all([
    local.saveLocalAuthorPack(payload, { packId: 'local_pack_fr', studyTarget: 'fr' }),
    local.saveLocalAuthorPack({ ...payload, packLanguage: 'es' }, { packId: 'local_pack_es', studyTarget: 'en' }),
  ]);
  const before = await local.loadLocalAuthorPacks('en');
  assert.equal(before.length, 2);
  const identity = before.find(p => p.id === 'local_pack_fr').publicationKey;
  await local.saveLocalAuthorPack({ ...payload, title: 'Voyage' }, { packId: 'local_pack_fr', studyTarget: 'en' });
  const after = await local.loadLocalAuthorPacks();
  assert.equal(after.find(p => p.id === 'local_pack_fr').publicationKey, identity);
  assert.equal(JSON.parse(disk.get('fr'))[0].title, 'Voyage');
  assert.equal(JSON.parse(disk.get('en')).length, 1);
  const newIds = await Promise.all([local.saveLocalAuthorPack(payload), local.saveLocalAuthorPack(payload)]);
  assert.notEqual(newIds[0], newIds[1]);
});
test('front speech uses the explicit French/German language', () => {
  const infer = extract('hooks/use-audio.ts', 'inferExpoSpeechLanguage', {
    UK_MARKERS: /[іїєґ]/i, CYRILLIC_RE: /[а-яіїєґ]/i, LATIN_LETTER_RE: /[a-zÀ-ž]/i,
  });
  assert.equal(infer('Bonjour', 'fr'), 'fr-FR');
  assert.equal(infer('Guten Tag', 'de'), 'de-DE');
  assert.equal(infer('Hola', 'es'), 'es-ES');
});

test('explicit pack languages are independent from the active course at server access checks', () => {
  const requireTarget = extract('functions/src/community_packs.ts', 'requireMatchingPackStudyTarget', {
    normalizeCommunityPackStudyTarget: value => value === 'fr' ? 'fr' : 'en',
    HttpsError: class extends Error {},
  });
  assert.equal(requireTarget('en', { studyTarget: 'fr', packLanguage: 'fr' }), 'fr');
  assert.throws(() => requireTarget('en', { studyTarget: 'fr' }));
});
