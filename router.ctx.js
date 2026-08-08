export const ctx = process.env.EXPO_PUBLIC_STORE_RELEASE === '1'
  ? require.context(
      process.env.EXPO_ROUTER_APP_ROOT,
      true,
      /^(?:\.\/)(?!(?:audio|community_packs|components|constants|error_traps|flashcards|graphify-out|quizzes|services|settings|types)(?:\/|$))(?!(?:(?:.*\+api)|(?:\+html)|(?:\+middleware))\.tsx?$)(?!(?:.*\/)?(?:settings_testers|admin_intro_preview|admin_review_test|admin_premium_delivery_test|admin_celebration_lab|admin_speaking_lab|admin_referral_lab|pos_analytics_audit|vip_survey_dev_auth|flashcards_market_dev|personal_plan_dev|personal_plan_runtime_dev|_admin_settings_testers|_admin_intro_preview|_admin_review_test|_admin_premium_delivery_test|_admin_celebration_lab|_admin_speaking_lab|_admin_referral_lab|_pos_analytics_audit)\.tsx?$).*(?:\.ios|\.web)?\.tsx$/,
      process.env.EXPO_ROUTER_IMPORT_MODE,
    )
  : require.context(
      process.env.EXPO_ROUTER_APP_ROOT,
      true,
      /^(?:\.\/)(?!(?:audio|community_packs|components|constants|error_traps|flashcards|graphify-out|quizzes|services|settings|types)(?:\/|$))(?!(?:(?:.*\+api)|(?:\+html)|(?:\+middleware))\.tsx?$).*(?:\.ios|\.web)?\.tsx$/,
      process.env.EXPO_ROUTER_IMPORT_MODE,
    );
