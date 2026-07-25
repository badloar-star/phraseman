import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { browserLocalPersistence, getAuth, getRedirectResult, GoogleAuthProvider, onAuthStateChanged, setPersistence, signInWithPopup, signInWithRedirect, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
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

export function observeAdminAuthState({ auth, subscribe, onAuth }) {
  let observerGeneration = 0;
  return subscribe(auth, async (user) => {
    const generation = ++observerGeneration;
    if (!user) {
      onAuth({ authorized: false, email: '', role: '', uid: '' });
      return;
    }
    const isCurrentUser = () => {
      try {
        return generation === observerGeneration && auth.currentUser?.uid === user.uid;
      } catch {
        return false;
      }
    };
    try {
      const token = await user.getIdTokenResult(true);
      if (!isCurrentUser()) return;
      const role = typeof token.claims.adminRole === 'string' ? token.claims.adminRole : '';
      onAuth({ authorized: token.claims.admin === true && Boolean(role), email: user.email ?? '', role, uid: user.uid });
    } catch {
      if (!isCurrentUser()) return;
      onAuth({ authorized: false, email: user.email ?? '', role: '', uid: user.uid });
    }
  });
}

export async function createFirebaseAdminActions({ onAuth }) {
  const app = initializeApp(await resolveFirebaseConfig());
  const auth = getAuth(app);
  await setPersistence(auth, browserLocalPersistence);
  // Завершаем вход через редирект (телефон), если он был начат на прошлой загрузке.
  try {
    await getRedirectResult(auth);
  } catch {
    // Редирект-вход не начинался или не завершился — итоговое состояние разберёт observer.
  }
  const functionsUs = getFunctions(app, 'us-central1');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  const createFactoryJobCallable = httpsCallable(functionsUs, 'adminCreateContentGenerationJob');
  const listFactoryJobsCallable = httpsCallable(functionsUs, 'adminListContentFactoryJobs');
  const getFactoryJobDetailCallable = httpsCallable(functionsUs, 'adminGetContentFactoryJobDetail');
  const getFactoryUnitPreviewCallable = httpsCallable(functionsUs, 'adminGetContentFactoryUnitPreview');
  const getFactoryWorkspaceCallable = httpsCallable(functionsUs, 'adminGetContentFactoryWorkspace');
  const getFactoryRolloutMetricsCallable = httpsCallable(functionsUs, 'adminGetContentFactoryRolloutMetrics');
  const runFactoryUnitCallable = httpsCallable(functionsUs, 'adminRunContentGenerationUnit');
  const reviewFactoryJobCallable = httpsCallable(functionsUs, 'adminReviewCourseGeneration');
  const sealFactoryReleaseCallable = httpsCallable(functionsUs, 'adminSealCourseRelease');
  const activateFactoryReleaseCallable = httpsCallable(functionsUs, 'adminActivateCourseRelease');
  const rollbackFactoryReleaseCallable = httpsCallable(functionsUs, 'adminRollbackCourseRelease');
  const createContentStageCallable = httpsCallable(functionsUs, 'adminCreateContentStage');
  const controlContentStageCallable = httpsCallable(functionsUs, 'adminControlContentStage');
  const listContentStagesCallable = httpsCallable(functionsUs, 'adminListContentStages');
  const listContentStageDependenciesCallable = httpsCallable(functionsUs, 'adminListContentStageDependencies');
  const createContentStageBulkPlanCallable = httpsCallable(functionsUs, 'adminCreateContentStageBulkPlan');
  const editContentStageArtifactCallable = httpsCallable(functionsUs, 'adminEditContentStageArtifact');
  const getContentStageCapabilitiesCallable = httpsCallable(functionsUs, 'adminGetContentStageCapabilities');
  const runContentStageCallable = httpsCallable(functionsUs, 'adminRunContentStage');
  const previewContentStageCallable = httpsCallable(functionsUs, 'adminPreviewContentStage');
  const reviewContentStageCallable = httpsCallable(functionsUs, 'adminReviewContentStage');
  const listArenaQuestionPoolCallable = httpsCallable(functionsUs, 'adminListArenaQuestionPool');
  const publishArenaQuestionBatchCallable = httpsCallable(functionsUs, 'adminPublishArenaQuestionBatch');
  const removeArenaPoolQuestionCallable = httpsCallable(functionsUs, 'adminRemoveArenaPoolQuestion');
  const restoreArenaPoolQuestionCallable = httpsCallable(functionsUs, 'adminRestoreArenaPoolQuestion');
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
  const listAssetJobsCallable = httpsCallable(functionsUs, 'adminListAssetJobs');
  const createAssetJobCallable = httpsCallable(functionsUs, 'adminCreateAssetJob');
  const runAssetJobCallable = httpsCallable(functionsUs, 'adminRunAssetJob');
  const analyticsCallable = httpsCallable(functionsUs, 'adminGetAnalyticsSnapshot');
  const analyticsTrendsCallable = httpsCallable(functionsUs, 'adminGetAnalyticsTrends');
  const productAnalyticsCallable = httpsCallable(functionsUs, 'adminProductAnalytics');
  const subscriptionAnalyticsCallable = httpsCallable(functionsUs, 'adminSubscriptionAnalytics');
  const monthlyDecisionPackCallable = httpsCallable(functionsUs, 'adminMonthlyDecisionPack');
  const searchUsersCallable = httpsCallable(functionsUs, 'adminSearchUsers');
  const getUserProfileCallable = httpsCallable(functionsUs, 'adminGetUserProfile');
  const sendPersonalAppMessageCallable = httpsCallable(functionsUs, 'adminSendPersonalAppMessage');
  const openAiBudgetCallable = httpsCallable(functionsUs, 'openAiBudgetDashboard');
  const getRemoteConfigWorkspaceCallable = httpsCallable(functionsUs, 'adminGetRemoteConfigWorkspace');
  const publishRemoteConfigCallable = httpsCallable(functionsUs, 'adminPublishRemoteConfig');
  const getReferralHealthCallable = httpsCallable(functionsUs, 'adminReferralHealth');
  const setReferralRouletteEnabledCallable = httpsCallable(functionsUs, 'adminSetReferralRouletteEnabled');
  const setReferralRouletteEmergencyStopCallable = httpsCallable(functionsUs, 'adminSetReferralRouletteEmergencyStop');
  const getPaywallAbWorkspaceCallable = httpsCallable(functionsUs, 'adminGetPaywallAbWorkspace');
  const publishPaywallAbCallable = httpsCallable(functionsUs, 'adminPublishPaywallAb');
  const getPaywallVariantStatsCallable = httpsCallable(functionsUs, 'adminGetPaywallVariantStats');
  const listPromoCodesCallable = httpsCallable(functionsUs, 'adminListPromoCodes');
  const listAppMessagesCallable = httpsCallable(functionsUs, 'adminListAppMessages');
  const createAppMessageCallable = httpsCallable(functionsUs, 'adminCreateAppMessage');
  const setAppMessageActiveCallable = httpsCallable(functionsUs, 'adminSetAppMessageActive');
  const listGlobalBroadcastsCallable = httpsCallable(functionsUs, 'adminListGlobalBroadcasts');
  const publishGlobalBroadcastCallable = httpsCallable(functionsUs, 'adminPublishGlobalBroadcast');
  const deactivateGlobalBroadcastsCallable = httpsCallable(functionsUs, 'adminDeactivateGlobalBroadcasts');
  const grantAccessCallable = httpsCallable(functionsUs, 'adminGrantAccess');
  const setUserBanCallable = httpsCallable(functionsUs, 'adminSetUserBan');
  const promoCodeUpsertCallable = httpsCallable(functionsUs, 'promoCodeUpsert');
  const promoCodeBatchUpsertCallable = httpsCallable(functionsUs, 'promoCodeBatchUpsert');
  const getDailyBriefingCallable = httpsCallable(functionsUs, 'adminGetDailyBriefing');
  const generateDailyBriefingCallable = httpsCallable(functionsUs, 'adminGenerateDailyDigest');
  const directorDigestCallable = httpsCallable(functionsUs, 'adminGetDirectorDigest');
  const directorDigestAudioCallable = httpsCallable(functionsUs, 'adminGenerateDirectorDigestAudio');
  const listReportQueueCallable = httpsCallable(functionsUs, 'adminListReportQueue');
  const exportReportDocumentsCallable = httpsCallable(functionsUs, 'adminExportReportDocuments');
  const exportUnresolvedReportsCallable = httpsCallable(functionsUs, 'adminExportUnresolvedReports');
  const updateReportStatusCallable = httpsCallable(functionsUs, 'adminUpdateReportStatus');
  const draftReportReplyCallable = httpsCallable(functionsUs, 'adminDraftReportReply');
  const sendReportReplyCallable = httpsCallable(functionsUs, 'adminReplyToReport');
  const listUserIdeasCallable = httpsCallable(functionsUs, 'adminListUserIdeas');
  const decideUserIdeaCallable = httpsCallable(functionsUs, 'adminDecideUserIdea');
  const draftIdeaDecisionCallable = httpsCallable(functionsUs, 'adminDraftIdeaDecision');
  const listAuditLogCallable = httpsCallable(functionsUs, 'adminListAuditLog');
  const listOpsLogCallable = httpsCallable(functionsUs, 'adminListOpsLog');
  const createPlanCallable = httpsCallable(functionsUs, 'adminCreatePlan');
  const getPlanCallable = httpsCallable(functionsUs, 'adminGetPlan');
  const listPlansCallable = httpsCallable(functionsUs, 'adminListPlans');
  const getCoinExchangeCenterCallable = httpsCallable(functionsUs, 'adminGetCoinExchangeCenter');
  const setCoinExchangeRateCallable = httpsCallable(functionsUs, 'adminSetCoinExchangeRate');
  const agentOfficeListCasesCallable = httpsCallable(functionsUs, 'agentOfficeListCases');
  const agentOfficeGetCaseCallable = httpsCallable(functionsUs, 'agentOfficeGetCase');
  const agentOfficeGetAggregateHealthCallable = httpsCallable(functionsUs, 'agentOfficeGetAggregateHealth');
  const agentOfficeListRecommendationsCallable = httpsCallable(functionsUs, 'agentOfficeListRecommendations');
  const agentOfficeDecideRecommendationCallable = httpsCallable(functionsUs, 'agentOfficeDecideRecommendation');
  const agentOfficeListAuditEventsCallable = httpsCallable(functionsUs, 'agentOfficeListAuditEvents');
  const agentManagerCreateTaskCallable = httpsCallable(functionsUs, 'agentManagerCreateTask');
  const agentManagerCreateInboxTaskCallable = httpsCallable(functionsUs, 'agentManagerCreateInboxTask');
  const agentManagerListTasksCallable = httpsCallable(functionsUs, 'agentManagerListTasks');
  const agentManagerListAgentsCallable = httpsCallable(functionsUs, 'agentManagerListAgents');
  const agentManagerListRunbooksCallable = httpsCallable(functionsUs, 'agentManagerListRunbooks');
  const agentManagerTransitionTaskCallable = httpsCallable(functionsUs, 'agentManagerTransitionTask');
  const agentManagerInitializeRosterCallable = httpsCallable(functionsUs, 'agentManagerInitializeRoster');
  const agentManagerLocalRunnerCreatePairingCallable = httpsCallable(functionsUs, 'agentManagerLocalRunnerCreatePairing');

  async function loadOpenAiBudgetDashboard() {
    const result = await openAiBudgetCallable({ rangeDays: 30 });
    return renderOpenAiBudgetContract(unwrap(result));
  }

  observeAdminAuthState({ auth, subscribe: onAuthStateChanged, onAuth });

  return Object.freeze({
    signIn: () => {
      // На телефоне popup-вход зависает или блокируется — там сразу редирект.
      // На десктопе пробуем popup, а при блокировке popup уходим в редирект.
      const userAgent = String(globalThis.navigator?.userAgent || '');
      if (/Android|iPhone|iPad|iPod|Mobile/i.test(userAgent)) return signInWithRedirect(auth, provider);
      return signInWithPopup(auth, provider).catch((error) => {
        const code = String(error?.code || '');
        if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment' || code === 'auth/web-storage-unsupported') {
          return signInWithRedirect(auth, provider);
        }
        throw error;
      });
    },
    signOut: () => signOut(auth),
    createFactoryJob: async (input) => unwrap(await createFactoryJobCallable(input)),
    listFactoryJobs: async (input) => unwrap(await listFactoryJobsCallable(input)),
    getFactoryJobDetail: async (input) => unwrap(await getFactoryJobDetailCallable(input)),
    previewFactoryUnit: async (input) => unwrap(await getFactoryUnitPreviewCallable(input)),
    getFactoryWorkspace: async (input) => unwrap(await getFactoryWorkspaceCallable(input)),
    getFactoryRolloutMetrics: async () => unwrap(await getFactoryRolloutMetricsCallable({})),
    runFactoryUnit: async (input) => unwrap(await runFactoryUnitCallable(input)),
    reviewFactoryJob: async (input) => unwrap(await reviewFactoryJobCallable(input)),
    sealFactoryRelease: async (input) => unwrap(await sealFactoryReleaseCallable(input)),
    activateFactoryRelease: async (input) => unwrap(await activateFactoryReleaseCallable(input)),
    rollbackFactoryRelease: async (input) => unwrap(await rollbackFactoryReleaseCallable(input)),
    createContentStage: async (input) => unwrap(await createContentStageCallable(input)),
    controlContentStage: async (input) => unwrap(await controlContentStageCallable(input)),
    listContentStages: async (input) => unwrap(await listContentStagesCallable(input)),
    listContentStageDependencies: async (input) => unwrap(await listContentStageDependenciesCallable(input)),
    createContentStageBulkPlan: async (input) => unwrap(await createContentStageBulkPlanCallable(input)),
    editContentStageArtifact: async (input) => unwrap(await editContentStageArtifactCallable(input)),
    getContentStageCapabilities: async () => unwrap(await getContentStageCapabilitiesCallable({})),
    runContentStage: async (input) => unwrap(await runContentStageCallable(input)),
    previewContentStage: async (input) => unwrap(await previewContentStageCallable(input)),
    reviewContentStage: async (input) => unwrap(await reviewContentStageCallable(input)),
    adminListArenaQuestionPool: async (input) => unwrap(await listArenaQuestionPoolCallable(input)),
    adminPublishArenaQuestionBatch: async (input) => unwrap(await publishArenaQuestionBatchCallable(input)),
    adminRemoveArenaPoolQuestion: async (input) => unwrap(await removeArenaPoolQuestionCallable(input)),
    adminRestoreArenaPoolQuestion: async (input) => unwrap(await restoreArenaPoolQuestionCallable(input)),
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
    listAssetJobs: async (input) => unwrap(await listAssetJobsCallable(input)),
    createAssetJob: async (input) => unwrap(await createAssetJobCallable(input)),
    runAssetJob: async (input) => unwrap(await runAssetJobCallable(input)),
    loadAnalytics: async (input) => unwrap(await analyticsCallable(input)),
    loadAnalyticsTrends: async (input) => unwrap(await analyticsTrendsCallable(input)),
    loadProductAnalytics: async (input) => unwrap(await productAnalyticsCallable(input)),
    loadSubscriptionAnalytics: async (input) => unwrap(await subscriptionAnalyticsCallable(input)),
    generateMonthlyDecisionPack: async (input) => unwrap(await monthlyDecisionPackCallable(input)),
    searchUsers: async (input) => unwrap(await searchUsersCallable(input)),
    getUserProfile: async (input) => unwrap(await getUserProfileCallable(input)),
    sendPersonalAppMessage: async (input) => unwrap(await sendPersonalAppMessageCallable(input)),
    loadOpenAiBudgetDashboard,
    getRemoteConfigWorkspace: async () => unwrap(await getRemoteConfigWorkspaceCallable({})),
    publishRemoteConfig: async (input) => unwrap(await publishRemoteConfigCallable(input)),
    getReferralHealth: async () => unwrap(await getReferralHealthCallable({})),
    setReferralRouletteEnabled: async (input) => unwrap(await setReferralRouletteEnabledCallable(input)),
    setReferralRouletteEmergencyStop: async (input) => unwrap(await setReferralRouletteEmergencyStopCallable(input)),
    getPaywallAbWorkspace: async () => unwrap(await getPaywallAbWorkspaceCallable({})),
    publishPaywallAb: async (input) => unwrap(await publishPaywallAbCallable(input)),
    getPaywallVariantStats: async (input) => unwrap(await getPaywallVariantStatsCallable(input)),
    listPromoCodes: async (input) => unwrap(await listPromoCodesCallable(input)),
    listAppMessages: async (input) => unwrap(await listAppMessagesCallable(input)),
    createAppMessage: async (input) => unwrap(await createAppMessageCallable(input)),
        setAppMessageActive: async (input) => unwrap(await setAppMessageActiveCallable(input)),
        listGlobalBroadcasts: async (input) => unwrap(await listGlobalBroadcastsCallable(input)),
        publishGlobalBroadcast: async (input) => unwrap(await publishGlobalBroadcastCallable(input)),
        deactivateGlobalBroadcasts: async (input) => unwrap(await deactivateGlobalBroadcastsCallable(input)),
    grantAccess: async (input) => unwrap(await grantAccessCallable(input)),
    setUserBan: async (input) => unwrap(await setUserBanCallable(input)),
    promoCodeUpsert: async (input) => unwrap(await promoCodeUpsertCallable(input)),
    promoCodeBatchUpsert: async (input) => unwrap(await promoCodeBatchUpsertCallable(input)),
    getDailyBriefing: async () => unwrap(await getDailyBriefingCallable({})),
    generateDailyBriefing: async () => unwrap(await generateDailyBriefingCallable({})),
    getDirectorDigest: async (input) => unwrap(await directorDigestCallable(input)),
    generateDirectorDigestAudio: async (input) => unwrap(await directorDigestAudioCallable(input)),
    listReportQueue: async (input) => unwrap(await listReportQueueCallable(input)),
    exportReportDocuments: async (input) => unwrap(await exportReportDocumentsCallable(input)),
    exportUnresolvedReports: async (input) => unwrap(await exportUnresolvedReportsCallable(input)),
    updateReportStatus: async (input) => unwrap(await updateReportStatusCallable(input)),
    draftReportReply: async (input) => unwrap(await draftReportReplyCallable(input)),
    sendReportReply: async (input) => unwrap(await sendReportReplyCallable(input)),
    listUserIdeas: async (input) => unwrap(await listUserIdeasCallable(input)),
    decideUserIdea: async (input) => unwrap(await decideUserIdeaCallable(input)),
    draftIdeaDecision: async (input) => unwrap(await draftIdeaDecisionCallable(input)),
    listAuditLog: async (input) => unwrap(await listAuditLogCallable(input)),
    listOpsLog: async (input) => unwrap(await listOpsLogCallable(input)),
    createPlan: async (input) => unwrap(await createPlanCallable(input)),
    getPlan: async (input) => unwrap(await getPlanCallable(input)),
    listPlans: async (input) => unwrap(await listPlansCallable(input)),
    getCoinExchangeCenter: async (input) => unwrap(await getCoinExchangeCenterCallable(input)),
    setCoinExchangeRate: async (input) => unwrap(await setCoinExchangeRateCallable(input)),
    listAgentOfficeCases: async (input) => unwrap(await agentOfficeListCasesCallable(input)),
    getAgentOfficeCase: async (input) => unwrap(await agentOfficeGetCaseCallable(input)),
    getAgentOfficeAggregateHealth: async () => unwrap(await agentOfficeGetAggregateHealthCallable({})),
    listAgentOfficeRecommendations: async (input) => unwrap(await agentOfficeListRecommendationsCallable(input)),
    decideAgentOfficeRecommendation: async (input) => unwrap(await agentOfficeDecideRecommendationCallable(input)),
    listAgentOfficeAuditEvents: async (input) => unwrap(await agentOfficeListAuditEventsCallable(input)),
    createAgentManagerTask: async (input) => unwrap(await agentManagerCreateTaskCallable(input)),
    createAgentManagerInboxTask: async (input) => unwrap(await agentManagerCreateInboxTaskCallable(input)),
    listAgentManagerTasks: async (input) => unwrap(await agentManagerListTasksCallable(input)),
    listAgentManagerAgents: async (input) => unwrap(await agentManagerListAgentsCallable(input)),
    listAgentManagerRunbooks: async () => unwrap(await agentManagerListRunbooksCallable({})),
    transitionAgentManagerTask: async (input) => unwrap(await agentManagerTransitionTaskCallable(input)),
    initializeAgentManagerRoster: async () => unwrap(await agentManagerInitializeRosterCallable({})),
    createAgentManagerLocalRunnerPairing: async () => unwrap(await agentManagerLocalRunnerCreatePairingCallable({})),
  });
}
