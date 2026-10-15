// Сухой прогон выкладки 17.10 (координатор 15.10): правила Firestore, добавленные после прошлой выкладки (06d520e25), в эмуляторе.
// auth_recovery_hint_rate_limits и onboarding_level_counted — только сервер; onboarding_level_daily — читает админ (claim admin), пишет сервер.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const PROJECT_ID = 'demo-phraseman-deploy-2026-10-17-rules';
const RULES_PATH = path.resolve(__dirname, '../../firestore.rules');
jest.setTimeout(30_000);

describe('правила выкладки 17.10 (emulator)', () => {
  let environment: RulesTestEnvironment;

  beforeAll(async () => {
    environment = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { rules: readFileSync(RULES_PATH, 'utf8') },
    });
  });

  afterAll(async () => environment?.cleanup());
  beforeEach(async () => {
    await environment.clearFirestore();
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'auth_recovery_hint_rate_limits', 'k1'), { count: 1 });
      await setDoc(doc(db, 'onboarding_level_daily', '2026-10-17'), { total: 3 });
      await setDoc(doc(db, 'onboarding_level_counted', 'stable-1'), { day: '2026-10-17' });
    });
  });

  it('счётчики подсказки восстановления закрыты всем клиентам, включая админа', async () => {
    for (const db of [
      environment.unauthenticatedContext().firestore(),
      environment.authenticatedContext('user-1').firestore(),
      environment.authenticatedContext('admin-1', { admin: true }).firestore(),
    ]) {
      await assertFails(getDoc(doc(db, 'auth_recovery_hint_rate_limits', 'k1')));
      await assertFails(setDoc(doc(db, 'auth_recovery_hint_rate_limits', 'k2'), { count: 1 }));
    }
  });

  it('дневные счётчики уровня онбординга: читает только админ, не пишет никто', async () => {
    const admin = environment.authenticatedContext('admin-1', { admin: true }).firestore();
    const user = environment.authenticatedContext('user-1').firestore();
    const anon = environment.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(admin, 'onboarding_level_daily', '2026-10-17')));
    await assertFails(getDoc(doc(user, 'onboarding_level_daily', '2026-10-17')));
    await assertFails(getDoc(doc(anon, 'onboarding_level_daily', '2026-10-17')));
    await assertFails(setDoc(doc(admin, 'onboarding_level_daily', '2026-10-18'), { total: 1 }));
    await assertFails(setDoc(doc(user, 'onboarding_level_daily', '2026-10-18'), { total: 1 }));
  });

  it('метки «человек посчитан» — только сервер', async () => {
    const admin = environment.authenticatedContext('admin-1', { admin: true }).firestore();
    const self = environment.authenticatedContext('stable-1').firestore();
    await assertFails(getDoc(doc(admin, 'onboarding_level_counted', 'stable-1')));
    await assertFails(getDoc(doc(self, 'onboarding_level_counted', 'stable-1')));
    await assertFails(setDoc(doc(self, 'onboarding_level_counted', 'stable-1'), { day: '2026-10-18' }));
  });
});
