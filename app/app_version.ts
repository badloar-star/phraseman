export type AppVersionSource = Readonly<{
  nativeAppVersion?: string | null;
  expoConfig?: Readonly<{ version?: string | null }> | null;
}>;

function nonEmptyVersion(value: unknown): string | null {
  const version = String(value ?? '').trim();
  return version ? version : null;
}

/**
 * The native value is the version of the binary the person actually installed.
 * Expo's config can belong to an older cached OTA manifest, so it must only be
 * a fallback when native metadata is unavailable (for example, Expo Go).
 */
export function getInstalledAppVersion(source: AppVersionSource): string {
  return nonEmptyVersion(source.nativeAppVersion)
    ?? nonEmptyVersion(source.expoConfig?.version)
    ?? 'unknown';
}
