// moments_flag.ts — удалённый флаг «моментов вовлечения» v3.
// зачем (координатор 14.10): показ — за удалённым флагом moments_v3, по умолчанию ВЫКЛ. Где и когда показывать (D191: первое открытие после закрытия недели,
// поверх Главной) решает Ядро: оно читает флаг тем же кэшем remote_config/app.bools (как spire_tab_flag.ts) и вешает показ. Здесь — только имя ключа и чистое решение.
export const MOMENTS_V3_FLAG_KEY = 'moments_v3';

/** Включён ли показ моментов v3: только явное `true` из remote_config/app.bools (нет ключа / не булево — выключено). */
export function isMomentsV3Enabled(bools: Readonly<Record<string, unknown>> | null | undefined): boolean {
  return bools?.[MOMENTS_V3_FLAG_KEY] === true;
}
