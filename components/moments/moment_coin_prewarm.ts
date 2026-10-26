// ═══════════════════════════════════════════════════════════════════════════
// moment_coin_prewarm.ts — заранее декодирует арт монеты ранга человека, пока окно момента ещё не открыто.
//
// зачем (координатор 26.10, аудит скорости Моментов №3): монета — герой каждого окна (итог ступени и этажа, неделя, позиция, серия),
// но грузилась только при монтировании окна: 80–130 dp берут полный арт 768², монета появлялась на кадр-другой позже текста.
// Греем кэш expo-image (Image.loadAsync) в момент, когда окно становится вероятным (вошёл в Пик), а не при показе.
// Один раз на ранг и вариант за процесс; сбой — только журнал, окно всё равно загрузит монету само.
// ═══════════════════════════════════════════════════════════════════════════
import { PixelRatio } from 'react-native';
import { coinRankSourceForSize } from '../../app/coin_rank_table_v1';

const LOG = '[MOMENT-COIN-PREWARM]';
/** Размеры монеты в окнах моментов, dp: этаж 56, обгон 96, спуск 110, повышение 120. */
export const MOMENT_COIN_PREWARM_SIZES: readonly number[] = [56, 96, 110, 120];

const warmed = new Set<string>();

/** Греет арт монеты ранга под размеры окон моментов. Повторный вызов с тем же рангом — без работы. */
export function prewarmMomentCoin(rank: number | null, reason: string): void {
  if (rank === null || !Number.isFinite(rank)) {
    console.log(LOG, 'skip', JSON.stringify({ reason, why: 'no_rank' })); // guard-ok: ранний выход с причиной
    return;
  }
  try {
    warmRank(rank, reason);
  } catch (error: unknown) {
    // зачем: прогрев — только ускорение; любой сбой (нет PixelRatio/expo-image) не должен ронять окно или экран Пика
    console.warn(LOG, 'failed', JSON.stringify({ reason, rank, stage: 'setup', error: error instanceof Error ? error.message : String(error) })); // guard-ok: catch пишет причину
  }
}

function warmRank(rank: number, reason: string): void {
  const ratio = PixelRatio.get();
  const picks = new Map<string, ReturnType<typeof coinRankSourceForSize>>();
  for (const size of MOMENT_COIN_PREWARM_SIZES) {
    const pick = coinRankSourceForSize(rank, size, ratio);
    picks.set(`${rank}:${pick.variant}`, pick); // guard-ok: Map в памяти процесса, не запись данных пользователя
  }
  // зачем (26.10): expo-image берём при первом прогреве, а не при загрузке модуля — модуль импортирует слой окон Пика, и статический
  // импорт тянул ESM expo-image во все тесты экрана Пика (spire_rise_queue_p17 падал на «Unexpected token export»).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Image } = require('expo-image') as typeof import('expo-image');
  for (const [key, pick] of picks) {
    if (warmed.has(key)) continue;
    warmed.add(key);
    const t0 = Date.now();
    Image.loadAsync(pick.source as Parameters<typeof Image.loadAsync>[0])
      .then(() => {
        if (__DEV__) console.log(LOG, 'ready', JSON.stringify({ reason, rank, variant: pick.variant, ms: Date.now() - t0 })); // guard-ok: одна строка на вариант
      })
      .catch((error: unknown) => {
        warmed.delete(key);
        console.warn(LOG, 'failed', JSON.stringify({ reason, rank, variant: pick.variant, error: error instanceof Error ? error.message : String(error) })); // guard-ok: сбой с причиной — окно загрузит само
      });
  }
}

/** Только для тестов: сбросить память «уже прогрето». */
export function __resetMomentCoinPrewarmForTests(): void {
  warmed.clear();
}
