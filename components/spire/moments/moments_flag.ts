// moments_flag.ts — удалённый флаг «моментов вовлечения» v3.
// Флаг читается кэшем remote_config/app.bools (как spire_tab_flag.ts): хук экранов use_moments_v3_flag и ворота app/moments_v3_flag_read.ts.
// Здесь — только имя ключа и чистое решение.
export const MOMENTS_V3_FLAG_KEY = 'moments_v3';

// зачем: v3 одобрены владельцем в 2.0, ключа в проде нет; явный false — аварийный выключатель без сборки (координатор 15.10).
// Было «только явное true» — при отсутствующем ключе в проде все моменты v3 молча не показывались.
/** Включён ли показ моментов v3: всё, кроме явного `false` в remote_config/app.bools (нет ключа / не булево — включено). */
export function isMomentsV3Enabled(bools: Readonly<Record<string, unknown>> | null | undefined): boolean {
  return bools?.[MOMENTS_V3_FLAG_KEY] !== false;
}

/** Для журнала: что сказал сервер — true / false / ключа нет (absent). */
export function momentsV3RemoteState(bools: Readonly<Record<string, unknown>> | null | undefined): 'true' | 'false' | 'absent' {
  const value = bools?.[MOMENTS_V3_FLAG_KEY];
  return value === true ? 'true' : value === false ? 'false' : 'absent';
}
