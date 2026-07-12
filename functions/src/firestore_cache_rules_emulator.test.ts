import fs from 'node:fs';
import path from 'node:path';
import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, limit, query, setDoc, updateDoc } from 'firebase/firestore';

const hostSetting = process.env.FIRESTORE_EMULATOR_HOST || '';
const describeEmulator = hostSetting ? describe : describe.skip;
const sources = ['choice_explanations', 'phrase_explanations', 'mistake_explanations', 'quiz_explanations', 'compass_briefings'];
const knownHash = 'a'.repeat(40);

describeEmulator('Firestore cache rules emulator contract', () => {
  let env: RulesTestEnvironment;
  let warnSpy: jest.SpyInstance;

  beforeAll(async () => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const [host, portText] = hostSetting.split(':');
    env = await initializeTestEnvironment({
      projectId: 'phraseman-cache-rules-test',
      firestore: {
        host: host || '127.0.0.1',
        port: Number(portText || 8080),
        rules: fs.readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf8'),
      },
    });
  });

  afterAll(async () => { await env?.cleanup(); warnSpy?.mockRestore(); });

  beforeEach(async () => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (context) => {
      await Promise.all(sources.map((source) => setDoc(doc(context.firestore(), source, knownHash), { status: 'ready', lang: 'ru' })));
    });
  });

  test.each(sources)('%s permits known-hash get but denies list and every client/admin mutation', async (source) => {
    const anonymous = env.unauthenticatedContext().firestore();
    const owner = env.authenticatedContext('owner-uid', { admin: true, adminRole: 'owner' }).firestore();
    await assertSucceeds(getDoc(doc(anonymous, source, knownHash)));
    await assertFails(getDocs(query(collection(anonymous, source), limit(1))));
    await assertFails(getDocs(query(collection(owner, source), limit(1))));
    await assertFails(setDoc(doc(anonymous, source, 'b'.repeat(40)), { status: 'ready' }));
    await assertFails(setDoc(doc(owner, source, 'b'.repeat(40)), { status: 'ready' }));
    await assertFails(updateDoc(doc(owner, source, knownHash), { status: 'rejected' }));
    await assertFails(deleteDoc(doc(owner, source, knownHash)));
  });
});
