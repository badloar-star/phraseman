import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js';

function unwrap(result) {
  return result && typeof result === 'object' && 'data' in result ? result.data : result;
}

function renderOpenAiBudgetContract(data) {
  return data && typeof data === 'object' ? data : { state: 'error', message: 'Сервер вернул неверный формат бюджета.' };
}

async function resolveFirebaseConfig() {
  const injected = globalThis.PHR_MAN_FIREBASE_CONFIG;
  if (injected && typeof injected === 'object') return injected;
  const response = await fetch('/__/firebase/init.json', { cache: 'no-store', credentials: 'same-origin' });
  if (!response.ok) throw new Error('firebase_hosting_config_unavailable');
  const config = await response.json();
  if (!config || typeof config !== 'object' || !config.projectId) throw new Error('firebase_hosting_config_invalid');
  return config;
}

export async function createFirebaseAdminActions({ onAuth }) {
  const app = initializeApp(await resolveFirebaseConfig());
  const auth = getAuth(app);
  const functionsUs = getFunctions(app, 'us-central1');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  const createFactoryJobCallable = httpsCallable(functionsUs, 'adminCreateContentGenerationJob');
  const listFactoryJobsCallable = httpsCallable(functionsUs, 'adminListContentFactoryJobs');
  const getFactoryJobDetailCallable = httpsCallable(functionsUs, 'adminGetContentFactoryJobDetail');
  const getFactoryUnitPreviewCallable = httpsCallable(functionsUs, 'adminGetContentFactoryUnitPreview');
  const getFactoryWorkspaceCallable = httpsCallable(functionsUs, 'adminGetContentFactoryWorkspace');
  const runFactoryUnitCallable = httpsCallable(functionsUs, 'adminRunContentGenerationUnit');
  const reviewFactoryJobCallable = httpsCallable(functionsUs, 'adminReviewCourseGeneration');
  const sealFactoryReleaseCallable = httpsCallable(functionsUs, 'adminSealCourseRelease');
  const activateFactoryReleaseCallable = httpsCallable(functionsUs, 'adminActivateCourseRelease');
  const rollbackFactoryReleaseCallable = httpsCallable(functionsUs, 'adminRollbackCourseRelease');
  const supportListCallable = httpsCallable(functionsUs, 'adminSupportList');
  const supportPullCallable = httpsCallable(functionsUs, 'adminSupportPull');
  const supportGenerateReplyCallable = httpsCallable(functionsUs, 'adminSupportGenerateReply');
  const supportPrepareReplyCallable = httpsCallable(functionsUs, 'adminSupportPrepareReply');
  const supportDispatchReplyCallable = httpsCallable(functionsUs, 'adminSupportDispatchReply');
  const supportCancelReplyCallable = httpsCallable(functionsUs, 'adminSupportCancelReply');
  const supportPrepareReplyBatchCallable = httpsCallable(functionsUs, 'adminSupportPrepareReplyBatch');
  const supportDispatchReplyBatchCallable = httpsCallable(functionsUs, 'adminSupportDispatchReplyBatch');
  const supportCancelReplyBatchCallable = httpsCallable(functionsUs, 'adminSupportCancelReplyBatch');
  const supportResolveReplyDeliveryCallable = httpsCallable(functionsUs, 'adminSupportResolveReplyDelivery');
  const supportSaveSignatureCallable = httpsCallable(functionsUs, 'adminSupportSaveSignature');
  const supportSetStatusCallable = httpsCallable(functionsUs, 'adminSupportSetStatus');
  const analyticsCallable = httpsCallable(functionsUs, 'adminGetAnalyticsSnapshot');
  const openAiBudgetCallable = httpsCallable(functionsUs, 'openAiBudgetDashboard');
  const getRemoteConfigWorkspaceCallable = httpsCallable(functionsUs, 'adminGetRemoteConfigWorkspace');
  const publishRemoteConfigCallable = httpsCallable(functionsUs, 'adminPublishRemoteConfig');

  async function loadOpenAiBudgetDashboard() {
    const result = await openAiBudgetCallable({ rangeDays: 30 });
    return renderOpenAiBudgetContract(unwrap(result));
  }

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      onAuth({ authorized: false, email: '', role: '' });
      return;
    }
    try {
      const token = await user.getIdTokenResult(true);
      const role = typeof token.claims.adminRole === 'string' ? token.claims.adminRole : '';
      onAuth({ authorized: token.claims.admin === true && Boolean(role), email: user.email ?? '', role });
    } catch {
      onAuth({ authorized: false, email: user.email ?? '', role: '' });
    }
  });

  return Object.freeze({
    signIn: () => signInWithPopup(auth, provider),
    signOut: () => signOut(auth),
    createFactoryJob: async (input) => unwrap(await createFactoryJobCallable(input)),
    listFactoryJobs: async (input) => unwrap(await listFactoryJobsCallable(input)),
    getFactoryJobDetail: async (input) => unwrap(await getFactoryJobDetailCallable(input)),
    previewFactoryUnit: async (input) => unwrap(await getFactoryUnitPreviewCallable(input)),
    getFactoryWorkspace: async (input) => unwrap(await getFactoryWorkspaceCallable(input)),
    runFactoryUnit: async (input) => unwrap(await runFactoryUnitCallable(input)),
    reviewFactoryJob: async (input) => unwrap(await reviewFactoryJobCallable(input)),
    sealFactoryRelease: async (input) => unwrap(await sealFactoryReleaseCallable(input)),
    activateFactoryRelease: async (input) => unwrap(await activateFactoryReleaseCallable(input)),
    rollbackFactoryRelease: async (input) => unwrap(await rollbackFactoryReleaseCallable(input)),
    loadSupport: async (input) => unwrap(await supportListCallable(input)),
    pullSupport: async (input) => unwrap(await supportPullCallable(input)),
    generateSupportReply: async (input) => unwrap(await supportGenerateReplyCallable(input)),
    prepareSupportReply: async (input) => unwrap(await supportPrepareReplyCallable(input)),
    dispatchSupportReply: async (input) => unwrap(await supportDispatchReplyCallable(input)),
    cancelSupportReply: async (input) => unwrap(await supportCancelReplyCallable(input)),
    prepareSupportReplyBatch: async (input) => unwrap(await supportPrepareReplyBatchCallable(input)),
    dispatchSupportReplyBatch: async (input) => unwrap(await supportDispatchReplyBatchCallable(input)),
    cancelSupportReplyBatch: async (input) => unwrap(await supportCancelReplyBatchCallable(input)),
    resolveSupportReplyDelivery: async (input) => unwrap(await supportResolveReplyDeliveryCallable(input)),
    saveSupportSignature: async (input) => unwrap(await supportSaveSignatureCallable(input)),
    setSupportStatus: async (input) => unwrap(await supportSetStatusCallable(input)),
    loadAnalytics: async (input) => unwrap(await analyticsCallable(input)),
    loadOpenAiBudgetDashboard,
    getRemoteConfigWorkspace: async () => unwrap(await getRemoteConfigWorkspaceCallable({})),
    publishRemoteConfig: async (input) => unwrap(await publishRemoteConfigCallable(input)),
  });
}
