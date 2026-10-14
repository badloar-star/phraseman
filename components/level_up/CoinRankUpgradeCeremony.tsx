// ─── Церемония «Монетный двор» для повышения ранга монеты (PM-077 ← PM-075) ─
// зачем (D62 п.4): LevelUpMintCeremony уже готова; здесь она подключена к результату
// повышения из hooks/use_coin_rank_upgrade.ts — старая и новая монеты берутся из единой
// таблицы рангов (coinRankMintSide). Компонент ничего не пишет: к моменту показа ранг и
// списание уже применены атомарно, закрытие/пропуск только убирает украшение.
import React, { memo, useEffect, useMemo } from 'react';
import { tryPlayV2Event } from '../../modules/sound_v2/legacy_bridge';

import LevelUpMintCeremony from './LevelUpMintCeremony';
import { coinRankMintSide } from './coin_rank_mint_side';
import { useLang } from '../LangContext';
import type { CoinRankCeremony } from '../../hooks/use_coin_rank_upgrade';

type Props = Readonly<{
  ceremony: CoinRankCeremony | null;
  onDone: () => void;
}>;

function CoinRankUpgradeCeremony({ ceremony, onDone }: Props) {
  const { lang } = useLang();
  // Без повышения модалка просто невидима (visible=false); стороны-заглушки 0→1 не
  // показываются — нужны лишь чтобы дерево было одинаковым в обоих состояниях.
  const from = useMemo(() => coinRankMintSide(ceremony?.fromRank ?? 0, lang), [ceremony, lang]);
  const to = useMemo(() => coinRankMintSide(ceremony?.toRank ?? 1, lang), [ceremony, lang]);
  // зачем (координатор 14.10): звук повышения ранга монеты V2 в момент показа церемонии; флаг sound_v2 выключен — тишина как раньше
  const showing = ceremony !== null;
  useEffect(() => {
    if (showing) tryPlayV2Event('coin_rank', 'coin_rank_ceremony');
  }, [showing]);
  return <LevelUpMintCeremony visible={ceremony !== null} from={from} to={to} onDone={onDone} />;
}

export default memo(CoinRankUpgradeCeremony);
