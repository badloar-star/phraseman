import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const PROJECT_ID = 'demo-phraseman-youtube-catalog';
const RULES_PATH = path.resolve(__dirname, '../../firestore.rules');

describe('YouTube catalog rules (emulator)', () => {
  let environment: RulesTestEnvironment;

  beforeAll(async () => {
    environment = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { rules: readFileSync(RULES_PATH, 'utf8') },
    });
  });

  afterAll(async () => environment.cleanup());
  beforeEach(async () => {
    await environment.clearFirestore();
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'youtube_catalog', 'public'), { activeVersion: 'v-active' });
      await setDoc(doc(db, 'youtube_catalog', 'config'), { enabled: true, revision: 1 });
      await setDoc(doc(db, 'youtube_catalog', 'sync_state'), { lastSuccessAtMs: 1 });
      await setDoc(doc(db, 'youtube_catalog_snapshots', 'v-active'), { status: 'ready' });
      await setDoc(doc(db, 'youtube_catalog_snapshots/v-active/channels', 'channel-en'), { title: 'English' });
      await setDoc(doc(db, 'youtube_catalog_snapshots/v-active/channels/channel-en/videos', 'aaaaaaaaaaa'), { title: 'Lesson' });
      await setDoc(doc(db, 'youtube_catalog_snapshots', 'v-old'), { status: 'ready' });
      await setDoc(doc(db, 'youtube_catalog_snapshots/v-old/channels', 'channel-en'), { title: 'Old' });
      await setDoc(doc(db, 'youtube_catalog_history', 'history-1'), { revision: 1 });
    });
  });

  it('denies signed-out reads', async () => {
    const db = environment.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'youtube_catalog', 'public')));
    await assertFails(getDoc(doc(db, 'youtube_catalog_snapshots', 'v-active')));
    await assertFails(getDoc(doc(db, 'youtube_catalog_snapshots/v-active/channels', 'channel-en')));
  });

  it('lets a signed-in app read public and the active ready snapshot only', async () => {
    const db = environment.authenticatedContext('user-1').firestore();
    await assertSucceeds(getDoc(doc(db, 'youtube_catalog', 'public')));
    await assertSucceeds(getDoc(doc(db, 'youtube_catalog_snapshots', 'v-active')));
    await assertSucceeds(getDoc(doc(db, 'youtube_catalog_snapshots/v-active/channels', 'channel-en')));
    await assertSucceeds(getDoc(doc(db, 'youtube_catalog_snapshots/v-active/channels/channel-en/videos', 'aaaaaaaaaaa')));
    await assertFails(getDoc(doc(db, 'youtube_catalog', 'config')));
    await assertFails(getDoc(doc(db, 'youtube_catalog', 'sync_state')));
    await assertFails(getDoc(doc(db, 'youtube_catalog_snapshots', 'v-old')));
    await assertFails(getDoc(doc(db, 'youtube_catalog_snapshots/v-old/channels', 'channel-en')));
    await assertFails(getDoc(doc(db, 'youtube_catalog_history', 'history-1')));
  });

  it('lets a browser admin inspect control state but never mutate server-owned data', async () => {
    const db = environment.authenticatedContext('admin-1', { admin: true }).firestore();
    await assertSucceeds(getDoc(doc(db, 'youtube_catalog', 'public')));
    await assertSucceeds(getDoc(doc(db, 'youtube_catalog', 'config')));
    await assertSucceeds(getDoc(doc(db, 'youtube_catalog', 'sync_state')));
    await assertSucceeds(getDoc(doc(db, 'youtube_catalog_snapshots', 'v-active')));
    await assertFails(getDoc(doc(db, 'youtube_catalog_history', 'history-1')));
    await assertFails(setDoc(doc(db, 'youtube_catalog', 'config'), { enabled: false }));
    await assertFails(updateDoc(doc(db, 'youtube_catalog', 'public'), { activeVersion: 'v-old' }));
    await assertFails(deleteDoc(doc(db, 'youtube_catalog_snapshots', 'v-active')));
    await assertFails(setDoc(doc(db, 'youtube_catalog_history', 'forged'), { revision: 99 }));
  });

  it('requires the active snapshot root to be ready', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'youtube_catalog', 'public'), { activeVersion: 'v-building' });
      await setDoc(doc(db, 'youtube_catalog_snapshots', 'v-building'), { status: 'building' });
      await setDoc(doc(db, 'youtube_catalog_snapshots/v-building/channels', 'channel-en'), { title: 'Partial' });
    });
    const db = environment.authenticatedContext('user-1').firestore();
    await assertFails(getDoc(doc(db, 'youtube_catalog_snapshots', 'v-building')));
    await assertFails(getDoc(doc(db, 'youtube_catalog_snapshots/v-building/channels', 'channel-en')));
  });

  it('allows Admin SDK writes because rules are bypassed', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      await assertSucceeds(setDoc(doc(context.firestore(), 'youtube_catalog', 'config'), { enabled: false }));
    });
  });
});
