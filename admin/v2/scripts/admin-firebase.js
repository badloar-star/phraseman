import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { browserLocalPersistence, getAuth, GoogleAuthProvider, onAuthStateChanged, setPersistence, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getToken, initializeAppCheck, ReCaptchaEnterpriseProvider } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js';

const ADMIN_ROLES = new Set(['owner', 'admin', 'support', 'content_editor', 'moderator', 'analyst', 'developer']);
const ADMIN_FIREBASE_APP_ID = '1:1047658658799:web:8ddb5f1d0d152df313541a';
const ADMIN_APP_CHECK_SITE_KEY = '6LfteFAtAAAAAKa9jvjgCAeZjnN8je2BZZJlf2OR';

function unwrap(result) {
  return result && typeof result === 'object' && 'data' in result ? result.data : result;
}

function renderOpenAiBudgetContract(data) {
  return data && typeof data === 'object' ? data : { state: 'error', message: 'Сервер вернул неверный формат бюджета.' };
}

async function resolveFirebaseConfig() {
  const injected = globalThis.PHR_MAN_FIREBASE_CONFIG;
  if (injected && typeof injected === 'object') return { ...injected, appId: injected.appId || ADMIN_FIREBASE_APP_ID };
  const response = await fetch('/__/firebase/init.json', { cache: 'no-store', credentials: 'same-origin' });
  if (!response.ok) throw new Error('firebase_hosting_config_unavailable');
  const config = await response.json();
  if (!config || typeof config !== 'object' || !config.projectId) throw new Error('firebase_hosting_config_invalid');
  return { ...config, appId: config.appId || ADMIN_FIREBASE_APP_ID };
}

export async function createFirebaseAdminActions({ onAuth }) {
  const app = initializeApp(await resolveFirebaseConfig());
  const appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(ADMIN_APP_CHECK_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
  await getToken(appCheck, false);
  const auth = getAuth(app);
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (error) {
    console.warn('Admin auth persistence is unavailable; the session may not survive reload.', error);
  }
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
  const listEmailContactsCallable = httpsCallable(functionsUs, 'adminListEmailContacts');
  const exportEmailContactsCallable = httpsCallable(functionsUs, 'adminExportEmailContacts');
  const backfillEmailContactsCallable = httpsCallable(functionsUs, 'adminEmailContactsBackfill');
  const previewEmailCampaignCallable = httpsCallable(functionsUs, 'adminPreviewEmailCampaign');
  const requestEmailApprovalCallable = httpsCallable(functionsUs, 'adminRequestEmailCampaignApproval');
  const approveEmailCampaignCallable = httpsCallable(functionsUs, 'adminApproveEmailCampaign');
  const createEmailCampaignCallable = httpsCallable(functionsUs, 'adminCreateEmailCampaign');
  const listEmailCampaignsCallable = httpsCallable(functionsUs, 'adminListEmailCampaigns');
  const cancelEmailCampaignCallable = httpsCallable(functionsUs, 'adminCancelEmailCampaign');
  const listCacheEntriesCallable = httpsCallable(functionsUs, 'adminListCacheEntries');
  const exportCacheEntriesCallable = httpsCallable(functionsUs, 'adminExportCacheEntries');
  const previewCacheResetCallable = httpsCallable(functionsUs, 'adminPreviewCacheReset');
  const resetCacheEntryCallable = httpsCallable(functionsUs, 'adminResetCacheEntry');
  const getCompassWorkspaceCallable = httpsCallable(functionsUs, 'adminGetCompassWorkspace');
  const previewCompassChangeCallable = httpsCallable(functionsUs, 'adminPreviewCompassChange');
  const requestCompassApprovalCallable = httpsCallable(functionsUs, 'adminRequestCompassApproval');
  const approveCompassChangeCallable = httpsCallable(functionsUs, 'adminApproveCompassChange');
  const applyCompassChangeCallable = httpsCallable(functionsUs, 'adminApplyCompassChange');
  const getVipSurveyWorkspaceCallable = httpsCallable(functionsUs, 'adminGetVipSurveyWorkspace');
  const listVipSurveyResponsesCallable = httpsCallable(functionsUs, 'adminListVipSurveyResponses');
  const previewVipSurveyCampaignCallable = httpsCallable(functionsUs, 'adminPreviewVipSurveyCampaign');
  const applyVipSurveyCampaignCallable = httpsCallable(functionsUs, 'adminApplyVipSurveyCampaign');
  const getAlertsWorkspaceCallable = httpsCallable(functionsUs, 'adminGetAlertsWorkspace');
  const previewAlertsConfigCallable = httpsCallable(functionsUs, 'adminPreviewAlertsConfig');
  const applyAlertsConfigCallable = httpsCallable(functionsUs, 'adminApplyAlertsConfig');
  const previewAlertTestCallable = httpsCallable(functionsUs, 'adminPreviewAlertTest');
  const queueAlertTestCallable = httpsCallable(functionsUs, 'adminQueueAlertTest');
  const getPlusControlWorkspaceCallable = httpsCallable(functionsUs, 'adminGetPlusControlWorkspace');
  const previewLegacyPlusMigrationCallable = httpsCallable(functionsUs, 'adminPreviewLegacyPlusMigration');
  const applyLegacyPlusMigrationCallable = httpsCallable(functionsUs, 'adminApplyLegacyPlusMigration');
  const getVoiceResearchWorkspaceCallable = httpsCallable(functionsUs, 'adminGetVoiceResearchWorkspace');
  const previewVoiceResearchMutationCallable = httpsCallable(functionsUs, 'adminPreviewVoiceResearchMutation');
  const applyVoiceResearchMutationCallable = httpsCallable(functionsUs, 'adminApplyVoiceResearchMutation');
  const draftIdeaDecisionCallable = httpsCallable(functionsUs, 'adminDraftIdeaDecision');
  const getSafetyModerationWorkspaceCallable = httpsCallable(functionsUs, 'adminGetSafetyModerationWorkspace');
  const getSafetyModerationSensitiveDetailCallable = httpsCallable(functionsUs, 'adminGetSafetyModerationSensitiveDetail');
  const previewSafetyModerationMutationCallable = httpsCallable(functionsUs, 'adminPreviewSafetyModerationMutation');
  const requestSafetyModerationApprovalCallable = httpsCallable(functionsUs, 'adminRequestSafetyModerationApproval');
  const listSafetyModerationApprovalsCallable = httpsCallable(functionsUs, 'adminListSafetyModerationApprovals');
  const listSafetyModerationHistoryCallable = httpsCallable(functionsUs, 'adminListSafetyModerationHistory');
  const approveSafetyModerationMutationCallable = httpsCallable(functionsUs, 'adminApproveSafetyModerationMutation');
  const applySafetyModerationMutationCallable = httpsCallable(functionsUs, 'adminApplySafetyModerationMutation');
  const resumeSafetyModerationBulkCallable = httpsCallable(functionsUs, 'adminResumeSafetyModerationBulk');
  const websiteInboxListCallable = httpsCallable(functionsUs, 'adminWebsiteInboxList');
  const websiteInboxMarkReadCallable = httpsCallable(functionsUs, 'adminWebsiteInboxMarkRead');
  const listAssetJobsCallable = httpsCallable(functionsUs, 'adminListAssetJobs');
  const createAssetJobCallable = httpsCallable(functionsUs, 'adminCreateAssetJob');
  const runAssetJobCallable = httpsCallable(functionsUs, 'adminRunAssetJob');
  const analyticsCallable = httpsCallable(functionsUs, 'adminGetAnalyticsSnapshot');
  const searchUsersCallable = httpsCallable(functionsUs, 'adminSearchUsers');
  const getUserProfileCallable = httpsCallable(functionsUs, 'adminGetUserProfile');
  const listBetaTestersCallable = httpsCallable(functionsUs, 'adminListBetaTesters');
  const updateBetaTesterCallable = httpsCallable(functionsUs, 'adminUpdateBetaTester');
  const previewManualAccessCallable = httpsCallable(functionsUs, 'adminPreviewManualAccess');
  const applyManualAccessCallable = httpsCallable(functionsUs, 'adminApplyManualAccess');
  const getMoneyOperationsWorkspaceCallable = httpsCallable(functionsUs, 'adminGetMoneyOperationsWorkspace');
  const getMoneyOperationDetailCallable = httpsCallable(functionsUs, 'adminGetMoneyOperationDetail');
  const previewMoneyMutationCallable = httpsCallable(functionsUs, 'adminPreviewMoneyMutation');
  const requestMoneyApprovalCallable = httpsCallable(functionsUs, 'adminRequestMoneyApproval');
  const approveMoneyMutationCallable = httpsCallable(functionsUs, 'adminApproveMoneyMutation');
  const applyMoneyMutationCallable = httpsCallable(functionsUs, 'adminApplyMoneyMutation');
  const getContentOperationsWorkspaceCallable = httpsCallable(functionsUs, 'adminGetContentOperationsWorkspace');
  const getContentOperationDetailCallable = httpsCallable(functionsUs, 'adminGetContentOperationDetail');
  const previewContentMutationCallable = httpsCallable(functionsUs, 'adminPreviewContentMutation');
  const requestContentApprovalCallable = httpsCallable(functionsUs, 'adminRequestContentApproval');
  const approveContentMutationCallable = httpsCallable(functionsUs, 'adminApproveContentMutation');
  const applyContentMutationCallable = httpsCallable(functionsUs, 'adminApplyContentMutation');
  const getCommunityOperationsWorkspaceCallable = httpsCallable(functionsUs, 'adminGetCommunityOperationsWorkspace');
  const getCommunityOperationDetailCallable = httpsCallable(functionsUs, 'adminGetCommunityOperationDetail');
  const previewCommunityMutationCallable = httpsCallable(functionsUs, 'adminPreviewCommunityMutation');
  const requestCommunityApprovalCallable = httpsCallable(functionsUs, 'adminRequestCommunityApproval');
  const approveCommunityMutationCallable = httpsCallable(functionsUs, 'adminApproveCommunityMutation');
  const applyCommunityMutationCallable = httpsCallable(functionsUs, 'adminApplyCommunityMutation');
  const resumeCommunityBulkCallable = httpsCallable(functionsUs, 'adminResumeCommunityBulk');
  const openAiBudgetCallable = httpsCallable(functionsUs, 'openAiBudgetDashboard');
  const getRemoteConfigWorkspaceCallable = httpsCallable(functionsUs, 'adminGetRemoteConfigWorkspace');
  const publishRemoteConfigCallable = httpsCallable(functionsUs, 'adminPublishRemoteConfig');
  const getPaywallAbWorkspaceCallable = httpsCallable(functionsUs, 'adminGetPaywallAbWorkspace');
  const publishPaywallAbCallable = httpsCallable(functionsUs, 'adminPublishPaywallAb');
  const listPromoCodesCallable = httpsCallable(functionsUs, 'adminListPromoCodes');
  const listAppMessagesCallable = httpsCallable(functionsUs, 'adminListAppMessages');
  const createAppMessageCallable = httpsCallable(functionsUs, 'adminCreateAppMessage');
  const setAppMessageActiveCallable = httpsCallable(functionsUs, 'adminSetAppMessageActive');
  const updateAppMessageCallable = httpsCallable(functionsUs, 'adminUpdateAppMessage');
  const deleteAppMessageCallable = httpsCallable(functionsUs, 'adminDeleteAppMessage');
  const cleanupExpiredAppMessagesCallable = httpsCallable(functionsUs, 'adminCleanupExpiredAppMessages');
  const previewPushAudienceCallable = httpsCallable(functionsUs, 'adminPreviewPushAudience');
  const requestPushApprovalCallable = httpsCallable(functionsUs, 'adminRequestPushApproval');
  const approvePushCampaignCallable = httpsCallable(functionsUs, 'adminApprovePushCampaign');
  const createPushJobCallable = httpsCallable(functionsUs, 'adminCreatePushJob');
  const listPushJobsCallable = httpsCallable(functionsUs, 'adminListPushJobs');
  const cancelPushJobCallable = httpsCallable(functionsUs, 'adminCancelPushJob');
  const promoCodeUpsertCallable = httpsCallable(functionsUs, 'promoCodeUpsert');
  const promoCodeBatchUpsertCallable = httpsCallable(functionsUs, 'promoCodeBatchUpsert');
  const getDailyBriefingCallable = httpsCallable(functionsUs, 'adminGetDailyBriefing');
  const generateDailyBriefingCallable = httpsCallable(functionsUs, 'adminGenerateDailyDigest');
  const listReportQueueCallable = httpsCallable(functionsUs, 'adminListReportQueue');
  const updateReportStatusCallable = httpsCallable(functionsUs, 'adminUpdateReportStatus');
  const listAppHealthCallable = httpsCallable(functionsUs, 'adminListAppHealth');
  const listAppActivityCallable = httpsCallable(functionsUs, 'adminListAppActivity');
  const getAppHealthDetailCallable = httpsCallable(functionsUs, 'adminGetAppHealthDetail');
  const exportAppHealthCallable = httpsCallable(functionsUs, 'adminExportAppHealth');
  const listDiagnosticsArchiveCallable = httpsCallable(functionsUs, 'adminListDiagnosticsArchive');
  const getDiagnosticsArchiveDetailCallable = httpsCallable(functionsUs, 'adminGetDiagnosticsArchiveDetail');
  const draftReportReplyCallable = httpsCallable(functionsUs, 'adminDraftReportReply');
  const sendReportReplyCallable = httpsCallable(functionsUs, 'adminReplyToReport');
  const listAuditLogCallable = httpsCallable(functionsUs, 'adminListAuditLog');
  const listOpsLogCallable = httpsCallable(functionsUs, 'adminListOpsLog');

  async function loadOpenAiBudgetDashboard() {
    const result = await openAiBudgetCallable({ rangeDays: 30 });
    return renderOpenAiBudgetContract(unwrap(result));
  }

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      onAuth({ authorized: false, email: '', role: '', uid: '' });
      return;
    }
    try {
      const token = await user.getIdTokenResult(true);
      const claimedRole = typeof token.claims.adminRole === 'string' && ADMIN_ROLES.has(token.claims.adminRole) ? token.claims.adminRole : '';
      const role = claimedRole || (token.claims.admin === true ? 'admin' : '');
      onAuth({ authorized: token.claims.admin === true, email: user.email ?? '', role, uid: user.uid });
    } catch {
      onAuth({ authorized: false, email: user.email ?? '', role: '', uid: user.uid });
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
    listEmailContacts: async (input) => unwrap(await listEmailContactsCallable(input)),
    exportEmailContacts: async (input) => unwrap(await exportEmailContactsCallable(input)),
    backfillEmailContacts: async (input) => unwrap(await backfillEmailContactsCallable(input)),
    previewEmailCampaign: async (input) => unwrap(await previewEmailCampaignCallable(input)),
    requestEmailApproval: async (input) => unwrap(await requestEmailApprovalCallable(input)),
    approveEmailCampaign: async (input) => unwrap(await approveEmailCampaignCallable(input)),
    createEmailCampaign: async (input) => unwrap(await createEmailCampaignCallable(input)),
    listEmailCampaigns: async () => unwrap(await listEmailCampaignsCallable({})),
    cancelEmailCampaign: async (input) => unwrap(await cancelEmailCampaignCallable(input)),
    listCacheEntries: async (input) => unwrap(await listCacheEntriesCallable(input)),
    exportCacheEntries: async (input) => unwrap(await exportCacheEntriesCallable(input)),
    previewCacheReset: async (input) => unwrap(await previewCacheResetCallable(input)),
    resetCacheEntry: async (input) => unwrap(await resetCacheEntryCallable(input)),
    getCompassWorkspace: async (input) => unwrap(await getCompassWorkspaceCallable(input)),
    previewCompassChange: async (input) => unwrap(await previewCompassChangeCallable(input)),
    requestCompassApproval: async (input) => unwrap(await requestCompassApprovalCallable(input)),
    approveCompassChange: async (input) => unwrap(await approveCompassChangeCallable(input)),
    applyCompassChange: async (input) => unwrap(await applyCompassChangeCallable(input)),
    getVipSurveyWorkspace: async () => unwrap(await getVipSurveyWorkspaceCallable({})),
    listVipSurveyResponses: async (input) => unwrap(await listVipSurveyResponsesCallable(input)),
    previewVipSurveyCampaign: async (input) => unwrap(await previewVipSurveyCampaignCallable(input)),
    applyVipSurveyCampaign: async (input) => unwrap(await applyVipSurveyCampaignCallable(input)),
    getAlertsWorkspace: async () => unwrap(await getAlertsWorkspaceCallable({})),
    previewAlertsConfig: async (input) => unwrap(await previewAlertsConfigCallable(input)),
    applyAlertsConfig: async (input) => unwrap(await applyAlertsConfigCallable(input)),
    previewAlertTest: async (input) => unwrap(await previewAlertTestCallable(input)),
    queueAlertTest: async (input) => unwrap(await queueAlertTestCallable(input)),
    getPlusControlWorkspace: async (input) => unwrap(await getPlusControlWorkspaceCallable(input)),
    previewLegacyPlusMigration: async (input) => unwrap(await previewLegacyPlusMigrationCallable(input)),
    applyLegacyPlusMigration: async (input) => unwrap(await applyLegacyPlusMigrationCallable(input)),
    getVoiceResearchWorkspace: async (input) => unwrap(await getVoiceResearchWorkspaceCallable(input)),
    previewVoiceResearchMutation: async (input) => unwrap(await previewVoiceResearchMutationCallable(input)),
    applyVoiceResearchMutation: async (input) => unwrap(await applyVoiceResearchMutationCallable(input)),
    draftIdeaDecision: async (input) => unwrap(await draftIdeaDecisionCallable(input)),
    getSafetyModerationWorkspace: async (input) => unwrap(await getSafetyModerationWorkspaceCallable(input)),
    getSafetyModerationSensitiveDetail: async (input) => unwrap(await getSafetyModerationSensitiveDetailCallable(input)),
    previewSafetyModerationMutation: async (input) => unwrap(await previewSafetyModerationMutationCallable(input)),
    requestSafetyModerationApproval: async (input) => unwrap(await requestSafetyModerationApprovalCallable(input)),
    listSafetyModerationApprovals: async () => unwrap(await listSafetyModerationApprovalsCallable({})),
    listSafetyModerationHistory: async () => unwrap(await listSafetyModerationHistoryCallable({})),
    approveSafetyModerationMutation: async (input) => unwrap(await approveSafetyModerationMutationCallable(input)),
    applySafetyModerationMutation: async (input) => unwrap(await applySafetyModerationMutationCallable(input)),
    resumeSafetyModerationBulk: async (input) => unwrap(await resumeSafetyModerationBulkCallable(input)),
    listWebsiteInbox: async (input) => unwrap(await websiteInboxListCallable(input)),
    markWebsiteInboxRead: async (input) => unwrap(await websiteInboxMarkReadCallable(input)),
    listAssetJobs: async (input) => unwrap(await listAssetJobsCallable(input)),
    createAssetJob: async (input) => unwrap(await createAssetJobCallable(input)),
    runAssetJob: async (input) => unwrap(await runAssetJobCallable(input)),
    loadAnalytics: async (input) => unwrap(await analyticsCallable(input)),
    searchUsers: async (input) => unwrap(await searchUsersCallable(input)),
    getUserProfile: async (input) => unwrap(await getUserProfileCallable(input)),
    listBetaTesters: async () => unwrap(await listBetaTestersCallable({})),
    updateBetaTester: async (input) => unwrap(await updateBetaTesterCallable(input)),
    previewManualAccess: async (input) => unwrap(await previewManualAccessCallable(input)),
    applyManualAccess: async (input) => unwrap(await applyManualAccessCallable(input)),
    getMoneyOperationsWorkspace: async (input) => unwrap(await getMoneyOperationsWorkspaceCallable(input)),
    getMoneyOperationDetail: async (input) => unwrap(await getMoneyOperationDetailCallable(input)),
    previewMoneyMutation: async (input) => unwrap(await previewMoneyMutationCallable(input)),
    requestMoneyApproval: async (input) => unwrap(await requestMoneyApprovalCallable(input)),
    approveMoneyMutation: async (input) => unwrap(await approveMoneyMutationCallable(input)),
    applyMoneyMutation: async (input) => unwrap(await applyMoneyMutationCallable(input)),
    getContentOperationsWorkspace: async (input) => unwrap(await getContentOperationsWorkspaceCallable(input)),
    getContentOperationDetail: async (input) => unwrap(await getContentOperationDetailCallable(input)),
    previewContentMutation: async (input) => unwrap(await previewContentMutationCallable(input)),
    requestContentApproval: async (input) => unwrap(await requestContentApprovalCallable(input)),
    approveContentMutation: async (input) => unwrap(await approveContentMutationCallable(input)),
    applyContentMutation: async (input) => unwrap(await applyContentMutationCallable(input)),
    getCommunityOperationsWorkspace: async (input) => unwrap(await getCommunityOperationsWorkspaceCallable(input)),
    getCommunityOperationDetail: async (input) => unwrap(await getCommunityOperationDetailCallable(input)),
    previewCommunityMutation: async (input) => unwrap(await previewCommunityMutationCallable(input)),
    requestCommunityApproval: async (input) => unwrap(await requestCommunityApprovalCallable(input)),
    approveCommunityMutation: async (input) => unwrap(await approveCommunityMutationCallable(input)),
    applyCommunityMutation: async (input) => unwrap(await applyCommunityMutationCallable(input)),
    resumeCommunityBulk: async (input) => unwrap(await resumeCommunityBulkCallable(input)),
    loadOpenAiBudgetDashboard,
    getRemoteConfigWorkspace: async () => unwrap(await getRemoteConfigWorkspaceCallable({})),
    publishRemoteConfig: async (input) => unwrap(await publishRemoteConfigCallable(input)),
    getPaywallAbWorkspace: async (input) => unwrap(await getPaywallAbWorkspaceCallable(input)),
    publishPaywallAb: async (input) => unwrap(await publishPaywallAbCallable(input)),
    listPromoCodes: async (input) => unwrap(await listPromoCodesCallable(input)),
    listAppMessages: async (input) => unwrap(await listAppMessagesCallable(input)),
    createAppMessage: async (input) => unwrap(await createAppMessageCallable(input)),
    setAppMessageActive: async (input) => unwrap(await setAppMessageActiveCallable(input)),
    updateAppMessage: async (input) => unwrap(await updateAppMessageCallable(input)),
    deleteAppMessage: async (input) => unwrap(await deleteAppMessageCallable(input)),
    cleanupExpiredAppMessages: async (input) => unwrap(await cleanupExpiredAppMessagesCallable(input)),
    previewPushAudience: async (input) => unwrap(await previewPushAudienceCallable(input)),
    requestPushApproval: async (input) => unwrap(await requestPushApprovalCallable(input)),
    approvePushCampaign: async (input) => unwrap(await approvePushCampaignCallable(input)),
    createPushJob: async (input) => unwrap(await createPushJobCallable(input)),
    listPushJobs: async () => unwrap(await listPushJobsCallable({})),
    cancelPushJob: async (input) => unwrap(await cancelPushJobCallable(input)),
    promoCodeUpsert: async (input) => unwrap(await promoCodeUpsertCallable(input)),
    promoCodeBatchUpsert: async (input) => unwrap(await promoCodeBatchUpsertCallable(input)),
    getDailyBriefing: async () => unwrap(await getDailyBriefingCallable({})),
    generateDailyBriefing: async () => unwrap(await generateDailyBriefingCallable({})),
    listReportQueue: async (input) => unwrap(await listReportQueueCallable(input)),
    updateReportStatus: async (input) => unwrap(await updateReportStatusCallable(input)),
    listAppHealth: async (input) => unwrap(await listAppHealthCallable(input)),
    listAppActivity: async (input) => unwrap(await listAppActivityCallable(input)),
    getAppHealthDetail: async (input) => unwrap(await getAppHealthDetailCallable(input)),
    exportAppHealth: async (input) => unwrap(await exportAppHealthCallable(input)),
    listDiagnosticsArchive: async (input) => unwrap(await listDiagnosticsArchiveCallable(input)),
    getDiagnosticsArchiveDetail: async (input) => unwrap(await getDiagnosticsArchiveDetailCallable(input)),
    draftReportReply: async (input) => unwrap(await draftReportReplyCallable(input)),
    sendReportReply: async (input) => unwrap(await sendReportReplyCallable(input)),
    listAuditLog: async (input) => unwrap(await listAuditLogCallable(input)),
    listOpsLog: async (input) => unwrap(await listOpsLogCallable(input)),
  });
}
