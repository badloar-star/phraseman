export const ctx = require.context(
  process.env.EXPO_ROUTER_APP_ROOT,
  true,
  /^(?:\.\/)(?!(?:audio|community_packs|components|constants|error_traps|flashcards|graphify-out|quizzes|services|settings|types)(?:\/|$))(?!(?:(?:.*\+api)|(?:\+html)|(?:\+middleware))\.tsx?$).*(?:\.ios|\.web)?\.tsx$/,
  process.env.EXPO_ROUTER_IMPORT_MODE,
);
