/**
 * Native-only integrations are intentionally disabled in the web DEV shell.
 * React Native Web owns DOM styles, while RN Firebase expects a native default
 * app; invoking either native seam in a browser turns a harmless preview into
 * a fatal runtime error.
 */
export function shouldInstallNativeTextRenderPatch(platformOS: string): boolean {
  return platformOS !== "web";
}

export function shouldUseNativeFirebaseTelemetry(
  platformOS: string,
  isExpoGo: boolean,
): boolean {
  return !isExpoGo && platformOS !== "web";
}

/**
 * The focused Learning V2 authoring surface is deliberately side-effect free.
 * Loading cloud restore, shop, leaderboards, notifications and flashcards in
 * that web-only DEV shell wastes several gigabytes and can kill Metro before
 * the actual session chunk arrives.
 */
export function shouldRunFullAppBootstrap(
  platformOS: string,
  isDev: boolean,
  pathname: string,
): boolean {
  if (platformOS !== "web" || !isDev) return true;
  return !(
    pathname === "/learning_v2_authoring_preview" ||
    pathname.startsWith("/learning-v2/session/")
  );
}
