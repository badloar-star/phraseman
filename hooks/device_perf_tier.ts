// ════════════════════════════════════════════════════════════════════════════
// device_perf_tier.ts — «авто-лайт»: определение слабого устройства без
// нативных модулей (спека constellations.md F9/8.4 — было прописано как
// требование, но триггер нигде не был решён и не реализован в коде).
//
// Нет доступа к RAM/чипсету из чистого JS без нативного модуля (ставить
// react-native-device-info ради этого — лишняя нативная пересборка). Вместо
// этого — платформенная эвристика (старый Android API уровня) + системная
// настройка "уменьшить движение", которую спека уже приравнивает к авто-лайту.
// Чистая функция isLowEndDevice — легко тестируется без моков RN.
// ════════════════════════════════════════════════════════════════════════════

/** Android API level ниже этого порога — устройство считается слабым тиром. */
export const LOW_END_ANDROID_API_LEVEL = 26; // Android 8.0 (Oreo) и старше

export interface DevicePlatformInfo {
  OS: 'ios' | 'android' | 'windows' | 'macos' | 'web';
  /** На Android — числовой API level. На iOS обычно строка версии — не используется. */
  Version: number | string;
}

/** Чистая функция: по платформе решает, слабый ли это тир. Без побочных эффектов. */
export function isLowEndDevice(platform: DevicePlatformInfo): boolean {
  if (platform.OS !== 'android') return false;
  const apiLevel = typeof platform.Version === 'number' ? platform.Version : parseInt(String(platform.Version), 10);
  if (!Number.isFinite(apiLevel)) return false;
  return apiLevel < LOW_END_ANDROID_API_LEVEL;
}
