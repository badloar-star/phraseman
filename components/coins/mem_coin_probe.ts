// mem_coin_probe.ts — журнал [MEM-COIN]: где и в каком размере рисуется монета ранга (исходник 768×768).
// зачем (координатор 18.10, R129): обычный Image из React Native декодировал монету целиком (768² ≈ 2,36 МБ на картинку) даже в 16–48 dp;
// места переведены на expo-image (декод под размер вида). Журнал подтверждает место и размер вида — одна строка на «место + размер»,
// чтобы списки (друзья) не засоряли журнал. Только отладка (общий гейт dev_diag_gate), в сторе — пустой вызов.
import { DIAG_ENABLED } from '../../app/dev_diag_gate';

export const MEM_COIN_LOG = '[MEM-COIN]';
const COIN_SOURCE_PX = 768;
const seen = new Set<string>();

export function logMemCoin(place: string, sizeDp: number): void {
  if (!DIAG_ENABLED) return;
  const key = `${place}:${sizeDp}`;
  if (seen.has(key)) return;
  seen.add(key); // guard-ok: множество в памяти процесса (дедуп строк журнала), не запись данных
  console.log(`${MEM_COIN_LOG} ${JSON.stringify({ place, sizeDp, decoder: 'expo-image downscale', sourcePx: COIN_SOURCE_PX })}`); // guard-ok: строка пробы (только отладка)
}
