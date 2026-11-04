// count_format.ts — формат числа для UI-счётчика (без Reanimated: чистая функция, её же зовёт worklet и тесты).
// зачем (UX-приятности 04.11, «плавный счёт»): окна Пика и статистика считали число через setInterval/setState или runOnJS(setState) — JS в кадрах;
// теперь число рисует UI-поток (AnimatedCountUpText), а формат — простое описание: префикс, суффикс, знаки после запятой, «м:сс» из миллисекунд.
export type CountFormat = Readonly<{ prefix?: string; suffix?: string; decimals?: number; /** value — миллисекунды, показываем «м:сс» (как spireClock) */ clock?: boolean }>;

export function formatCountValue(v: number, format?: CountFormat): string {
  'worklet';
  const prefix = format?.prefix ?? '';
  const suffix = format?.suffix ?? '';
  if (format?.clock) {
    const total = Math.ceil(Math.max(0, v) / 1000);
    const sec = total % 60;
    return `${prefix}${Math.floor(total / 60)}:${sec < 10 ? '0' : ''}${sec}${suffix}`;
  }
  const decimals = format?.decimals ?? 0;
  if (decimals > 0) {
    const factor = Math.pow(10, decimals);
    return `${prefix}${(Math.round(v * factor) / factor).toFixed(decimals)}${suffix}`;
  }
  return `${prefix}${Math.max(0, Math.round(v))}${suffix}`;
}
