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

/**
 * Версия для серверных проверок «не слишком ли старая сборка».
 *
 * зачем: `getInstalledAppVersion` возвращает 'unknown', когда обе метаданные
 * пусты (на Android `nativeAppVersion` бывает null). Аналитике такая честная
 * метка нужна, а гейту версии — нет: сервер не может разобрать 'unknown' и
 * отвечает «обнови приложение» свежей сборке. Экран Арены рисует на любой
 * отказ карточку «не включена на сервере» — владелец видел именно это.
 *
 * Здесь неизвестное превращается в '0.0.0' — «самая старая из возможных».
 * Сборку, которая реально ниже минимума, это не пропустит: ноль меньше любого
 * настоящего минимума. А когда минимум сам '0.0.0' (никого не отсекаем),
 * вызов пройдёт вместо ложного отказа.
 */
export function getVersionForServerGate(source: AppVersionSource): string {
  const version = nonEmptyVersion(source.nativeAppVersion)
    ?? nonEmptyVersion(source.expoConfig?.version);
  return version && /^\d+(\.\d+)*$/.test(version) ? version : '0.0.0';
}
