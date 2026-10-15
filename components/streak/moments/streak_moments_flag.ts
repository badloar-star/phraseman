// streak_moments_flag.ts — флаг показа моментов серии дней и колец «Сегодня»: тот же удалённый флаг `moments_v3`, что у моментов Пика (по умолчанию ВКЛ, явный false — выключатель).
// зачем (координатор 14.10): один флаг на все моменты v3, второго ключа не заводим; где и когда показывать — решает Ядро.
export { MOMENTS_V3_FLAG_KEY, isMomentsV3Enabled, momentsV3RemoteState } from '../../spire/moments/moments_flag';
