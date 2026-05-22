import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { usePremium } from '../components/PremiumContext';
import { CLOUD_SYNC_ENABLED, ENABLE_DEV_TOOLS, IS_EXPO_GO } from './config';
import { getVerifiedPremiumStatus, getVerifiedRealPremiumStatus, getVerifiedVipStatus, invalidatePremiumCache } from './premium_guard';
import { emitAppEvent } from './events';
import { ensureStableAuthLinkForStableId, resetAnonAuthCacheForSignOut } from './cloud_sync';
import { getStableId, setStableId as setStoredStableId } from './stable_id';

type ProgressShape = {
  vip_active?: string;
  vip_plan?: string;
  vip_from?: string;
  vip_until?: string;
  vip_admin_override?: string;
  vip_admin_grant_at?: string;
};

type Phase = 'booting' | 'ready' | 'resetting' | 'granting' | 'auth-matrix' | 'waiting' | 'passed' | 'failed';

function getFirestoreDb(): any | null {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default();
  } catch {
    return null;
  }
}

async function ensureFirebaseAuthUidForE2E(): Promise<string> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) throw new Error('Firebase auth is unavailable');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const auth = require('@react-native-firebase/auth').default();
  try {
    const current = auth?.currentUser?.uid;
    if (typeof current === 'string' && current.length > 0) return current;
    const credential = await auth.signInAnonymously();
    const uid = credential?.user?.uid ?? auth?.currentUser?.uid;
    if (typeof uid === 'string' && uid.length > 0) return uid;
    throw new Error('signInAnonymously returned no uid');
  } catch (err) {
    const anonMessage = err instanceof Error ? err.message : String(err);
    const saved = await AsyncStorage.multiGet(['admin_vip_e2e_email', 'admin_vip_e2e_password']);
    const savedEmail = String(saved.find(p => p[0] === 'admin_vip_e2e_email')?.[1] ?? '').trim();
    const savedPassword = String(saved.find(p => p[0] === 'admin_vip_e2e_password')?.[1] ?? '').trim();
    const email = savedEmail || `admin-vip-e2e-${Date.now()}@phraseman.test`;
    const password = savedPassword || `VipE2E-${Date.now()}-local`;
    try {
      let credential: { user?: { uid?: string } } | null = null;
      if (savedEmail && savedPassword && typeof auth.signInWithEmailAndPassword === 'function') {
        credential = await auth.signInWithEmailAndPassword(savedEmail, savedPassword);
      } else if (typeof auth.createUserWithEmailAndPassword === 'function') {
        credential = await auth.createUserWithEmailAndPassword(email, password);
        await AsyncStorage.multiSet([
          ['admin_vip_e2e_email', email],
          ['admin_vip_e2e_password', password],
        ]);
      }
      const uid = credential?.user?.uid ?? auth?.currentUser?.uid;
      if (typeof uid === 'string' && uid.length > 0) return uid;
      throw new Error('email/password auth returned no uid');
    } catch (emailErr) {
      const emailMessage = emailErr instanceof Error ? emailErr.message : String(emailErr);
      throw new Error(`Firebase auth failed: anonymous=${anonMessage}; email=${emailMessage}`);
    }
  }
}

function progressFromData(data: Record<string, unknown> | undefined): ProgressShape {
  const raw = (data?.progress ?? {}) as Record<string, unknown>;
  return {
    vip_active: String(raw.vip_active ?? ''),
    vip_plan: String(raw.vip_plan ?? ''),
    vip_from: String(raw.vip_from ?? '0'),
    vip_until: String(raw.vip_until ?? '0'),
    vip_admin_override: String(raw.vip_admin_override ?? ''),
    vip_admin_grant_at: String(raw.vip_admin_grant_at ?? ''),
  };
}

function isActiveVipProgress(progress: ProgressShape | null, now = Date.now()): boolean {
  if (!progress) return false;
  const active = String(progress.vip_active ?? '').trim();
  const override = String(progress.vip_admin_override ?? '').trim();
  const until = Number(progress.vip_until ?? 0) || 0;
  return active === 'true' && override === 'true' && (until <= 0 || until > now);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const FREE_E2E_STORAGE_PAIRS: [string, string][] = [
  ['premium_active', 'false'],
  ['premium_plan', ''],
  ['admin_premium_override', 'false'],
  ['premium_expiry', '0'],
  ['premium_admin_grant_at', '0'],
  ['vip_active', 'false'],
  ['vip_plan', ''],
  ['vip_from', '0'],
  ['vip_until', '0'],
  ['vip_admin_override', 'false'],
  ['vip_admin_grant_at', '0'],
  ['tester_no_premium', 'true'],
  ['onboarding_done', '1'],
];

async function writeLocalFreeE2EState(): Promise<void> {
  await AsyncStorage.multiSet(FREE_E2E_STORAGE_PAIRS);
  invalidatePremiumCache();
}

async function recoverE2EIdentityAfterPermissionDenied(err: unknown): Promise<boolean> {
  const message = err instanceof Error ? err.message : String(err);
  if (!message.includes('permission-denied')) return false;
  try {
    const auth = require('@react-native-firebase/auth').default();
    await auth.signOut().catch(() => {});
  } catch {
    // ignore: this is a dev-only recovery path for partially failed E2E runs
  }
  resetAnonAuthCacheForSignOut();
  await setStoredStableId(makeFreshE2EStableId()).catch(() => {});
  await writeLocalFreeE2EState();
  await sleep(750);
  return true;
}

function makeFreshE2EStableId(): string {
  return `admin-vip-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function switchToFreshE2EIdentity(): Promise<void> {
  try {
    const auth = require('@react-native-firebase/auth').default();
    await auth.signOut().catch(() => {});
  } catch {
    // ignore: Firebase native module may be mid-restart in dev-client
  }
  resetAnonAuthCacheForSignOut();
  const nextStableId = makeFreshE2EStableId();
  await setStoredStableId(nextStableId);
  await writeLocalFreeE2EState();
  const nextAuthUid = await ensureFirebaseAuthUidForE2E();
  const linked = await ensureStableAuthLinkForStableId(nextStableId);
  if (!linked) throw new Error(`Fresh E2E stable auth link failed for ${nextStableId}`);
  const db = getFirestoreDb();
  if (!db) throw new Error('Firestore is unavailable after account switch');
  await db.collection('users').doc(nextStableId).set({
    firebaseAuthUid: nextAuthUid,
    e2eAccountSwitch: true,
    updatedAt: Date.now(),
  }, { merge: true });
}

export default function AdminPremiumDeliveryTest() {
  const router = useRouter();
  const { isPremium, isVip, hasPremiumAccess, reload } = usePremium();
  const [phase, setPhase] = useState<Phase>('booting');
  const [stableId, setStableId] = useState('');
  const [authUid, setAuthUid] = useState('');
  const [cloudProgress, setCloudProgress] = useState<ProgressShape | null>(null);
  const [localProgress, setLocalProgress] = useState<ProgressShape | null>(null);
  const [verifiedAccess, setVerifiedAccess] = useState(false);
  const [verifiedVip, setVerifiedVip] = useState(false);
  const [verifiedRealPremium, setVerifiedRealPremium] = useState(false);
  const [lastError, setLastError] = useState('');
  const [lastAction, setLastAction] = useState('');
  const [scenarioReport, setScenarioReport] = useState('');
  const [identityRevision, setIdentityRevision] = useState(0);
  const activeCloudUnsubscribeRef = useRef<(() => void) | null>(null);
  const ignoreCloudPermissionErrorsRef = useRef(false);

  const detachCloudListener = useCallback(() => {
    activeCloudUnsubscribeRef.current?.();
    activeCloudUnsubscribeRef.current = null;
    setCloudProgress(null);
  }, []);

  const ensureIdentity = useCallback(async () => {
    if (!ENABLE_DEV_TOOLS) throw new Error('Dev tools are disabled');
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore is unavailable in this runtime');
    let liveAuthUid = await ensureFirebaseAuthUidForE2E();
    const uid = await getStableId();
    if (!uid) throw new Error('No stable uid');
    await ensureStableAuthLinkForStableId(uid);
    if (!liveAuthUid) throw new Error('No Firebase auth uid');
    const ref = db.collection('users').doc(uid);
    await ref.set({
      ...(liveAuthUid ? { firebaseAuthUid: liveAuthUid } : {}),
      updatedAt: Date.now(),
    }, { merge: true });
    setStableId(uid);
    setAuthUid(liveAuthUid);
    return { ref, uid, liveAuthUid };
  }, []);

  const refreshLocal = useCallback(async () => {
    const pairs = await AsyncStorage.multiGet([
      'premium_plan',
      'admin_premium_override',
      'premium_expiry',
      'premium_admin_grant_at',
      'premium_active',
      'vip_active',
      'vip_plan',
      'vip_from',
      'vip_until',
      'vip_admin_override',
      'vip_admin_grant_at',
      'tester_no_premium',
    ]);
    const get = (key: string) => String(pairs.find(p => p[0] === key)?.[1] ?? '');
    setLocalProgress({
      vip_active: get('vip_active'),
      vip_plan: get('vip_plan'),
      vip_from: get('vip_from') || '0',
      vip_until: get('vip_until') || '0',
      vip_admin_override: get('vip_admin_override'),
      vip_admin_grant_at: get('vip_admin_grant_at'),
    });
    invalidatePremiumCache();
    const [access, vip, real] = await Promise.all([
      getVerifiedPremiumStatus(),
      getVerifiedVipStatus(),
      getVerifiedRealPremiumStatus(),
    ]);
    setVerifiedAccess(access);
    setVerifiedVip(vip);
    setVerifiedRealPremium(real);
  }, []);

  useEffect(() => {
    if (!ENABLE_DEV_TOOLS) {
      setPhase('failed');
      setLastError('Dev tools are disabled');
      return;
    }
    let alive = true;
    let unsubscribe: (() => void) | null = null;
    void (async () => {
      try {
        const { ref } = await ensureIdentity();
        if (!alive) return;
        unsubscribe = ref.onSnapshot(
          (snap: { exists?: boolean; data?: () => Record<string, unknown> | undefined }) => {
            if (!alive) return;
            setCloudProgress(snap.exists ? progressFromData(snap.data?.()) : null);
          },
          (err: unknown) => {
            if (!alive) return;
            const message = err instanceof Error ? err.message : String(err);
            if (ignoreCloudPermissionErrorsRef.current && message.includes('permission-denied')) return;
            setLastError(message);
            setPhase('failed');
          },
        );
        activeCloudUnsubscribeRef.current = unsubscribe;
        await refreshLocal();
        if (alive) setPhase('ready');
      } catch (err) {
        if (!alive) return;
        setLastError(err instanceof Error ? err.message : String(err));
        setPhase('failed');
      }
    })();
    return () => {
      alive = false;
      if (unsubscribe) {
        unsubscribe();
        if (activeCloudUnsubscribeRef.current === unsubscribe) activeCloudUnsubscribeRef.current = null;
      }
    };
  }, [ensureIdentity, refreshLocal, identityRevision]);

  useEffect(() => {
    const timer = setInterval(() => {
      void refreshLocal();
    }, 750);
    return () => clearInterval(timer);
  }, [refreshLocal]);

  const resetToFree = useCallback(async () => {
    setPhase('resetting');
    setLastError('');
    try {
      await writeLocalFreeE2EState();
      let identity: Awaited<ReturnType<typeof ensureIdentity>>;
      try {
        identity = await ensureIdentity();
      } catch (identityErr) {
        const recovered = await recoverE2EIdentityAfterPermissionDenied(identityErr);
        if (!recovered) throw identityErr;
        setIdentityRevision(v => v + 1);
        identity = await ensureIdentity();
      }
      const { ref, liveAuthUid } = identity;
      const now = Date.now();
      await ref.set({
        ...(liveAuthUid ? { firebaseAuthUid: liveAuthUid } : {}),
        progress: {
          vip_active: 'false',
          vip_plan: '',
          vip_from: '0',
          vip_until: '0',
          vip_admin_override: 'false',
          vip_admin_grant_at: String(now),
        },
        updatedAt: now,
      }, { merge: true });
      await reload();
      await refreshLocal();
      setLastAction('reset-free');
      setPhase('ready');
      setIdentityRevision(v => v + 1);
    } catch (err) {
      setLastError(err instanceof Error ? err.message : String(err));
      setPhase('failed');
    }
  }, [ensureIdentity, refreshLocal, reload]);

  const writeAdminVipGrant = useCallback(async (label: string): Promise<string> => {
    const { ref, liveAuthUid } = await ensureIdentity();
    const grantAt = String(Date.now());
    const expiryDate = new Date(Number(grantAt));
    expiryDate.setMonth(expiryDate.getMonth() + 1);
    const expiry = String(expiryDate.getTime());
    await ref.set({
      ...(liveAuthUid ? { firebaseAuthUid: liveAuthUid } : {}),
      updatedAt: Date.now(),
    }, { merge: true });
    await ref.update({
      'progress.vip_active': 'true',
      'progress.vip_plan': 'admin_vip',
      'progress.vip_from': grantAt,
      'progress.vip_until': expiry,
      'progress.vip_admin_override': 'true',
      'progress.vip_admin_grant_at': grantAt,
      updatedAt: Date.now(),
    });
    setLastAction(`${label} grantAt=${grantAt}`);
    return grantAt;
  }, [ensureIdentity]);

  const waitForVipDelivery = useCallback(async (grantAt: string, label: string): Promise<void> => {
    const startedAt = Date.now();
    let lastState = '';
    while (Date.now() - startedAt < 45_000) {
      await refreshLocal();
      invalidatePremiumCache();
      const [access, vip, real] = await Promise.all([
        getVerifiedPremiumStatus().catch(() => false),
        getVerifiedVipStatus().catch(() => false),
        getVerifiedRealPremiumStatus().catch(() => true),
      ]);
      const localPairs = await AsyncStorage.multiGet(['vip_active', 'vip_admin_override', 'vip_admin_grant_at']);
      const get = (key: string) => String(localPairs.find(p => p[0] === key)?.[1] ?? '');
      const localOk = get('vip_active') === 'true'
        && get('vip_admin_override') === 'true'
        && get('vip_admin_grant_at') === grantAt;
      lastState = `${label}: access=${access} vip=${vip} real=${real} local=${localOk} grant=${get('vip_admin_grant_at')}`;
      setScenarioReport(lastState);
      if (access && vip && !real && localOk) return;
      await sleep(750);
    }
    throw new Error(`VIP delivery timeout: ${lastState}`);
  }, [refreshLocal]);

  const waitForVipRevoked = useCallback(async (label: string): Promise<void> => {
    const startedAt = Date.now();
    let lastState = '';
    while (Date.now() - startedAt < 25_000) {
      await refreshLocal();
      invalidatePremiumCache();
      const [access, vip, real] = await Promise.all([
        getVerifiedPremiumStatus().catch(() => true),
        getVerifiedVipStatus().catch(() => true),
        getVerifiedRealPremiumStatus().catch(() => true),
      ]);
      const localPairs = await AsyncStorage.multiGet(['vip_active', 'vip_admin_override']);
      const get = (key: string) => String(localPairs.find(p => p[0] === key)?.[1] ?? '');
      const localRevoked = get('vip_active') === 'false' && get('vip_admin_override') === 'false';
      lastState = `${label}: access=${access} vip=${vip} real=${real} localRevoked=${localRevoked}`;
      setScenarioReport(lastState);
      if (!access && !vip && !real && localRevoked) return;
      await sleep(750);
    }
    throw new Error(`VIP revoke timeout: ${lastState}`);
  }, [refreshLocal]);

  const runAuthMatrix = useCallback(async () => {
    setPhase('auth-matrix');
    setLastError('');
    setScenarioReport('starting');
    try {
      await resetToFree();
      await sleep(1000);

      const noProviderGrant = await writeAdminVipGrant('no-provider');
      await waitForVipDelivery(noProviderGrant, 'no-provider');

      const linked = await ensureIdentity();
      const now = Date.now();
      await linked.ref.set({
        firebaseAuthUid: linked.liveAuthUid,
        linkedAuth: {
          provider: 'google',
          providerUid: `admin-vip-e2e-${now}`,
          email: null,
          displayName: 'Admin VIP E2E',
          linkedAt: now,
          lastSignInAt: now,
          devicePlatform: 'ios',
        },
        updatedAt: now,
      }, { merge: true });
      emitAppEvent('auth_provider_linked');
      await sleep(1500);
      const linkedGrant = await writeAdminVipGrant('after-auth-link');
      await waitForVipDelivery(linkedGrant, 'after-auth-link');

      // Dev-only account switch check: keep the E2E route mounted, but still
      // sign out Firebase, move to a fresh stable_id, and verify VIP does not leak.
      ignoreCloudPermissionErrorsRef.current = true;
      setScenarioReport('account-switch: detach old VIP listener');
      detachCloudListener();
      await switchToFreshE2EIdentity();
      setIdentityRevision(v => v + 1);
      await sleep(1500);
      ignoreCloudPermissionErrorsRef.current = false;
      await resetToFree();
      await waitForVipRevoked('after-signout-new-account-free');
      const afterLogoutGrant = await writeAdminVipGrant('after-signout-new-account');
      await waitForVipDelivery(afterLogoutGrant, 'after-signout-new-account');

      const { ref } = await ensureIdentity();
      const revokedAt = String(Date.now());
      await ref.update({
        'progress.vip_active': 'false',
        'progress.vip_admin_override': 'false',
        'progress.vip_until': revokedAt,
        'progress.vip_revoked_at': revokedAt,
        updatedAt: Date.now(),
      });
      await waitForVipRevoked('revoke');

      const finalGrant = await writeAdminVipGrant('final');
      await waitForVipDelivery(finalGrant, 'final');
      await reload();
      await refreshLocal();
      setScenarioReport('PASS auth matrix: no provider, after auth link, account switch no leak, new account grant, revoke, final grant');
      setPhase('passed');
    } catch (err) {
      ignoreCloudPermissionErrorsRef.current = false;
      setLastError(err instanceof Error ? err.message : String(err));
      setPhase('failed');
    }
  }, [detachCloudListener, ensureIdentity, refreshLocal, reload, resetToFree, waitForVipDelivery, waitForVipRevoked, writeAdminVipGrant]);

  const grantViaAdminIndexContract = useCallback(async () => {
    setPhase('granting');
    setLastError('');
    try {
      const { ref, liveAuthUid } = await ensureIdentity();
      const grantAt = String(Date.now());
      const expiryDate = new Date(Number(grantAt));
      expiryDate.setMonth(expiryDate.getMonth() + 1);
      const expiry = String(expiryDate.getTime());
      await ref.set({
        ...(liveAuthUid ? { firebaseAuthUid: liveAuthUid } : {}),
        updatedAt: Date.now(),
      }, { merge: true });
      await ref.update({
        'progress.vip_active': 'true',
        'progress.vip_plan': 'admin_vip',
        'progress.vip_from': grantAt,
        'progress.vip_until': expiry,
        'progress.vip_admin_override': 'true',
        'progress.vip_admin_grant_at': grantAt,
        updatedAt: Date.now(),
      });
      setLastAction(`admin-index-contract grantAt=${grantAt}`);
      setPhase('waiting');
      await refreshLocal();
    } catch (err) {
      setLastError(err instanceof Error ? err.message : String(err));
      setPhase('failed');
    }
  }, [ensureIdentity, refreshLocal]);

  const delivered = useMemo(() => {
    const cloudActive = isActiveVipProgress(cloudProgress);
    const localActive = isActiveVipProgress(localProgress);
    const sameGrant = !!cloudProgress?.vip_admin_grant_at
      && cloudProgress.vip_admin_grant_at === localProgress?.vip_admin_grant_at;
    return cloudActive && localActive && sameGrant && !isPremium && isVip && hasPremiumAccess && verifiedAccess && verifiedVip && !verifiedRealPremium;
  }, [cloudProgress, hasPremiumAccess, isPremium, isVip, localProgress, verifiedAccess, verifiedRealPremium, verifiedVip]);

  useEffect(() => {
    if (phase === 'waiting' && delivered) setPhase('passed');
  }, [delivered, phase]);

  if (!ENABLE_DEV_TOOLS) {
    return (
      <View style={styles.center} testID="screen-admin-premium-delivery-e2e">
        <Text style={styles.title}>Admin Premium E2E disabled</Text>
        <Pressable style={styles.button} onPress={() => router.replace('/(tabs)/home' as any)}>
          <Text style={styles.buttonText}>Home</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView testID="screen-admin-premium-delivery-e2e" contentContainerStyle={styles.root}>
      <Text style={styles.title}>Admin VIP Firestore E2E</Text>
      <Text style={styles.sub}>Dev-only Maestro harness: simulates the exact admin/index.html VIP payload, then verifies app delivery.</Text>

      <View style={styles.panel}>
        <Text testID="admin-premium-e2e-phase" style={styles.line}>Phase: {phase}</Text>
        <Text testID="admin-premium-e2e-context" style={styles.line}>Context premium: {String(isPremium)} / vip: {String(isVip)} / access: {String(hasPremiumAccess)}</Text>
        <Text testID="admin-premium-e2e-verified" style={styles.line}>Verified access/vip/real: {String(verifiedAccess)} / {String(verifiedVip)} / {String(verifiedRealPremium)}</Text>
        <Text testID="admin-premium-e2e-cloud" style={styles.line}>
          Cloud: {cloudProgress?.vip_plan || '-'} / {cloudProgress?.vip_admin_override || '-'} / {cloudProgress?.vip_until || '0'}
        </Text>
        <Text testID="admin-premium-e2e-local" style={styles.line}>
          Local: {localProgress?.vip_plan || '-'} / {localProgress?.vip_admin_override || '-'} / {localProgress?.vip_until || '0'}
        </Text>
        <Text testID="admin-premium-e2e-uid" style={styles.small}>stable_id: {stableId || '-'}</Text>
        <Text style={styles.small}>auth_uid: {authUid || '-'}</Text>
        {!!lastAction && <Text style={styles.small}>last: {lastAction}</Text>}
        {!!scenarioReport && <Text testID="admin-premium-e2e-scenarios" style={styles.small}>scenarios: {scenarioReport}</Text>}
        {!!lastError && <Text testID="admin-premium-e2e-error" style={styles.error}>error: {lastError}</Text>}
        {phase === 'ready' && <Text testID="admin-premium-e2e-ready" style={styles.small}>READY</Text>}
      </View>

      {delivered && (
        <Text testID="admin-premium-e2e-pass" style={styles.pass}>
          PASS admin VIP delivered without real Premium
        </Text>
      )}

      {scenarioReport.includes('PASS auth matrix') && (
        <Text testID="admin-premium-e2e-auth-matrix-pass" style={styles.pass}>
          PASS auth matrix
        </Text>
      )}

      <Pressable
        testID="admin-premium-e2e-reset"
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={resetToFree}
      >
        <Text style={styles.buttonText}>Reset to free</Text>
      </Pressable>

      <Pressable
        testID="admin-premium-e2e-grant"
        style={({ pressed }) => [styles.button, styles.goldButton, pressed && styles.buttonPressed]}
        onPress={grantViaAdminIndexContract}
      >
        <Text style={styles.buttonText}>Simulate admin/index Firestore write</Text>
      </Pressable>

      <Pressable
        testID="admin-premium-e2e-auth-matrix"
        style={({ pressed }) => [styles.button, styles.greenButton, pressed && styles.buttonPressed]}
        onPress={runAuthMatrix}
      >
        <Text style={styles.buttonText}>Run auth matrix</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 72,
    backgroundColor: '#101214',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#101214',
    padding: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  sub: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 8,
    marginBottom: 16,
  },
  panel: {
    borderWidth: 1,
    borderColor: '#2F3845',
    backgroundColor: '#171B21',
    borderRadius: 8,
    padding: 14,
    gap: 8,
    marginBottom: 16,
  },
  line: {
    color: '#E5E7EB',
    fontSize: 14,
    fontWeight: '700',
  },
  small: {
    color: '#9CA3AF',
    fontSize: 11,
  },
  error: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '700',
  },
  pass: {
    color: '#34D399',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 16,
  },
  button: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  goldButton: {
    backgroundColor: '#8A5A11',
  },
  greenButton: {
    backgroundColor: '#047857',
  },
  buttonPressed: {
    opacity: 0.75,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
