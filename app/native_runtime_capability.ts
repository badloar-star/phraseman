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
