// ═══════════════════════════════════════════════════════════════════════════
// use_my_rank_coin.ts — картинка монеты РАНГА текущего пользователя (одна точка для всех экранов валюты).
//
// зачем (слово владельца ~19:15, 05.11: «монета абсолютно во всех местах обязана соответствовать рангу строго», без исключений, и летящая монета наград тоже; координатор): раньше баланс,
// итоги, праздничные окна и полёт монет рисовали одну фиксированную базовую монету coin_rank_00 (HOME_RUNE_ICON_SOURCE). Теперь все они берут монету ранга ТОГО ЖЕ источника,
// что строка «Ты» в Пике и аватар (useMyCoinRank → coinRankSourceForSize): ранг из локального кэша в памяти и диска, без сети.
// Первый кадр не мигает базовой монетой: пока ранг ещё не прочитан, показываем ПОСЛЕДНИЙ ИЗВЕСТНЫЙ ранг этого запуска; только если его нет совсем — базовую (ранг 0) и пишем
// [RANK-COIN] source=pending. Картинка — мемо по (ранг, размер): лишних перерисовок нет. Журнал [RANK-COIN]: source=live|last_known|pending_base, rank, size — по одному разу на смену.
// ═══════════════════════════════════════════════════════════════════════════
import { useMemo } from 'react';
import { PixelRatio, type ImageSourcePropType } from 'react-native';
import { onAccountOwnerChanged } from '../app/account_owner_change';
import { coinRankSourceForSize, COIN_RANK_MIN } from '../app/coin_rank_table_v1';
import { useMyCoinRank } from './use_my_coin_rank';

const LOG = '[RANK-COIN]';
/** Размер по умолчанию (dp), когда экран его не сообщил: картинка s192 хватает до 64 dp на плотных экранах. */
export const MY_RANK_COIN_DEFAULT_SIZE = 48;

export type MyRankCoinOrigin = 'live' | 'last_known' | 'pending_base';
let lastKnownRank: number | null = null;
// зачем (F17, аудит, владелец 11.11): пока ранг нового игрока не прочитан, монета рисовалась рангом прошлого
onAccountOwnerChanged('my_rank_coin_last_known', () => { lastKnownRank = null; });
let lastLoggedKey = '';

/** Ранг монеты для показа и откуда он взят (без сети). */
export function useMyRankCoinRank(): Readonly<{ rank: number; origin: MyRankCoinOrigin }> {
  const live = useMyCoinRank();
  if (live !== null) lastKnownRank = live;
  const rank = live ?? lastKnownRank ?? COIN_RANK_MIN;
  const origin: MyRankCoinOrigin = live !== null ? 'live' : lastKnownRank !== null ? 'last_known' : 'pending_base';
  return useMemo(() => ({ rank, origin }), [rank, origin]);
}

/** Источник картинки монеты ранга текущего пользователя под размер показа (dp). */
export function useMyRankCoinSource(sizeDp: number = MY_RANK_COIN_DEFAULT_SIZE): ImageSourcePropType {
  const { rank, origin } = useMyRankCoinRank();
  return useMemo(() => {
    const picked = coinRankSourceForSize(rank, sizeDp, PixelRatio.get());
    const key = `${origin}|${rank}|${picked.variant}`;
    if (key !== lastLoggedKey) {
      lastLoggedKey = key;
      console.log(LOG, `source=${origin}`, JSON.stringify({ rank, variant: picked.variant, sizeDp })); // guard-ok: одна строка на смену источника/ранга
    }
    return picked.source;
  }, [rank, origin, sizeDp]);
}

/** Только для тестов: сброс памяти последнего ранга. */
export function __resetMyRankCoinForTests(): void {
  lastKnownRank = null;
  lastLoggedKey = '';
}
