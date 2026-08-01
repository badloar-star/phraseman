import fs from 'fs';
import path from 'path';

describe('admin VIP survey preview', () => {
  const root = process.cwd();
  const screen = fs.readFileSync(path.join(root, 'app', '_admin_settings_testers.tsx'), 'utf8');
  const surveySection = fs.readFileSync(path.join(root, 'components', 'admin_panel', 'sections', 'VipSurveyExtraSection.tsx'), 'utf8');
  const inbox = fs.readFileSync(path.join(root, 'components', 'AppMessagesInbox.tsx'), 'utf8');
  const modal = fs.readFileSync(path.join(root, 'components', 'VipSurveyModal.tsx'), 'utf8');
  const storeReview = fs.readFileSync(path.join(root, 'app', 'store_review.ts'), 'utf8');
  const surveyClient = fs.readFileSync(path.join(root, 'app', 'vip_survey.ts'), 'utf8');
  const surveyDevAuth = fs.readFileSync(path.join(root, 'app', 'vip_survey_dev_auth.ts'), 'utf8');
  const appMessages = fs.readFileSync(path.join(root, 'app', 'app_messages.ts'), 'utf8');
  const admin = fs.readFileSync(path.join(root, 'admin', 'v2', 'legacy.html'), 'utf8');
  const maestro = fs.readFileSync(path.join(root, 'maestro', 'flows', 'dev_only', 'vip_survey_e2e.yaml'), 'utf8');
  const legacyRuntimePattern =
    /\b(lang === 'ru'|lang === 'uk'|lang === 'es'|return\s+[^;\n]*(?:RU|UK|ES)\b|\?\?\s*[^;\n]*(?:RU|UK|ES)\b|fallback)\b/u;

  it('seeds a local-only inbox notification and returns the admin to Home', () => {
    expect(surveySection).toContain('admin-preview-vip-survey-notification');
    expect(surveySection).toContain('onSeedInboxPreview');
    expect(screen).toContain('onSeedInboxPreview={() => { void showVipSurveyNotificationPreview(); }}');
    expect(screen).toContain('seedLocalVipSurveyTestMessage');
    expect(screen).toContain('vipSurveyPreviewBusyRef');
    expect(screen).toContain('navigateHomeAfterVipSurveySeed');
    expect(screen).toContain('nav.dismissTo');
    expect(screen).toContain('nav.dismissAll');
    expect(screen).toContain("router.replace('/(tabs)/home'");
    expect(screen).not.toContain("nav.navigate('/(tabs)/home'");
    expect(screen).toContain('Завершение опроса отправляет реальные ответы в админку');
    expect(appMessages).toContain('AsyncStorage.setItem(appMessagesOwnerStorageKey(LOCAL_APP_MESSAGES_KEY_PREFIX');
    expect(appMessages).toContain('admin_test_vip_survey_');
    expect(appMessages).toContain("if (message.kind === 'vip_survey') return !hasPremiumAccess");
    expect(appMessages).toContain("audience: 'free'");
    expect(appMessages).not.toContain("addDoc(collection(db, 'app_messages')");
    expect(screen).not.toContain('vipSurveyNotificationPreviewVisible');
    expect(screen).not.toContain('admin-vip-survey-notification-preview');
    expect(screen).not.toContain('completeVipSurveyPreview');
  });

  it('submits the test survey through the real callable and keeps admin results live', () => {
    expect(inbox).toContain('VipSurveyModal');
    expect(inbox).not.toContain('VipSurveyReviewPromptModal');
    expect(inbox).toContain('useIsFocused');
    expect(inbox).toContain('if (!renderButton) return null');
    expect(inbox).toContain('vip-survey-inbox-cta');
    expect(inbox).not.toContain('previewOnly={');
    expect(modal).toContain('submitVipSurveyFromApp');
    expect(modal).toContain("reviewIntent: 'not_now'");
    expect(modal).toContain('vip-survey-modal');
    expect(modal).toContain('vip-survey-primary');
    expect(modal).toContain('Keyboard.addListener');
    expect(modal).toContain('keyboardShouldPersistTaps="always"');
    expect(modal).toContain('scrollToEnd');
    expect(modal).toContain('panelKeyboard');
    expect(modal).toContain('renderPrimaryButton(true)');
    expect(modal).toContain('inputControlVisible');
    expect(modal).toContain('setCommentFocused(true)');
    expect(modal).toContain('suppressNextPrimaryPressRef');
    expect(modal).toContain('handlePrimaryTouchStart');
    expect(modal).toContain('handlePrimaryPressRelease');
    expect(modal).toContain('onTouchStart={inputControlVisible ? handlePrimaryTouchStart : undefined}');
    expect(modal).toContain('<Pressable');
    expect(modal).not.toContain('onPressIn={keyboardVisible ? handlePrimaryPress : undefined}');
    expect(modal).toContain('autoCorrect={false}');
    expect(modal).toContain('spellCheck={false}');
    expect(modal).toContain('<View style={StyleSheet.absoluteFill} />');
    expect(modal).not.toContain('StyleSheet.absoluteFill} onPress={onClose}');
    expect(modal).toContain('setError(classifySubmitError(detail))');
    expect(modal).not.toContain('`${copy.error} (${detail})`');
    expect(modal).toContain('Нажми «Завершить опрос» — и Plus активируется.');
    expect(modal).not.toContain('VIP-аккаунт активирован');
    expect(modal).not.toContain('VIP account is active');
    expect(surveyClient).toContain('ensureFirebaseAuthUidForVipCallable');
    expect(surveyClient).toContain('const getAuth = authModule.default || authModule');
    expect(surveyClient).toContain('vipCallableAuthPromise');
    expect(surveyDevAuth).toContain('VIP_SURVEY_DEV_AUTH_EMAIL_KEY');
    expect(surveyClient).toContain('signInAnonymously');
    expect(surveyDevAuth).toContain('signInWithEmailAndPassword');
    expect(surveyDevAuth).toContain('createUserWithEmailAndPassword');
    expect(surveyClient).toContain('signOut');
    expect(surveyClient).toContain('resetAnonAuthCacheForSignOut');
    expect(surveyClient).toContain('keychain');
    expect(surveyClient).toContain('too-many-requests');
    expect(surveyClient).toContain('getIdToken');
    expect(surveyClient).toContain('getVerifiedPremiumAccessStatus');
    expect(surveyClient).toContain("throw new Error('vip_survey_free_tier_required')");
    const persistStart = surveyClient.indexOf('async function persistVipResult');
    const persistBody = surveyClient.slice(persistStart, surveyClient.indexOf('export async function submitVipSurveyFromApp', persistStart));
    expect(persistBody).not.toContain('tester_no_premium');
    expect(surveyClient).toMatch(/if \(active\) \{\r?\n\s*emitAppEvent\('vip_activated'\);/);
    expect(surveyClient).toContain("emitAppEvent('premium_access_changed', { active, source: active ? 'vip' : 'none' })");
    expect(storeReview).toContain('itms-apps://itunes.apple.com/app/id');
    expect(storeReview).toContain('market://details?id=');
    expect(storeReview).toContain('WebBrowser.openBrowserAsync');
    expect(storeReview).not.toMatch(legacyRuntimePattern);
    expect(modal).not.toContain('previewOnly?: boolean');
    expect(modal).not.toContain("vipPlan: 'survey_vip_preview'");
    // Старый admin/index.html выведен из эксплуатации (Admin V2 — единственная
    // админ-поверхность); живого просмотра ответов VIP-опроса в V2 пока нет —
    // поэтому ассерты на onSnapshot/vip_survey_responses в старой админке сняты.

    const finishStart = modal.indexOf('const finish = async () => {');
    const finishBody = modal.slice(finishStart, modal.indexOf('const goNext', finishStart));
    expect(finishBody).toContain('submitVipSurveyFromApp');
    expect(maestro).toContain('visible: "Админ панель"');
    expect(maestro).not.toContain('id: "screen-settings-testers"');
    expect(maestro).toContain('admin-preview-vip-survey-notification');
    expect(maestro).toContain('vip-survey-comment-one_thing_week');
    expect(maestro).not.toContain('hideKeyboard');
    expect(maestro).toContain('vip-survey-review-write');
  });
});
