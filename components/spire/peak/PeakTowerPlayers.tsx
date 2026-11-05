// PeakTowerPlayers.tsx — иконки участников на башне Пика B (кто на каком этаже).
// зачем (владелец 05.11: «на башне все еще надо показывать иконки юзеров кто где»; запреты прежние — ни цифр этажей слева, ни подписей, ни «+N»):
// компактные круглые монеты ранга прямо на теле башни, по центру своего этажа; кольца нет (кольцо только у «я» — это метка SpireTower).
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import SpireRankCoin from '../SpireRankCoin';
import { SPIRE_CX, SPIRE_TOWER_GEOM } from '../spire_tower_model';
import { peakTowerCoinSize, type PeakTowerPlayer } from './peak_tower_players';

function PeakTowerPlayers({ players, scale }: Readonly<{ players: readonly PeakTowerPlayer[]; scale: number }>) {
  if (players.length === 0 || !(scale > 0)) return null;
  const size = peakTowerCoinSize(scale);
  const step = size * 0.78; // внахлёст, как монеты «рядом на этаже»
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} testID="peak-tower-players">
      {players.map((pl) => {
        const fl = SPIRE_TOWER_GEOM.floors[Math.min(Math.max(pl.floor, 1), SPIRE_TOWER_GEOM.floors.length) - 1];
        const cx = SPIRE_CX * scale + (pl.slot - (pl.slots - 1) / 2) * step;
        const cy = (fl.y + fl.h / 2) * scale;
        return (
          <View key={pl.uid} style={[s.coin, { width: size, height: size, left: cx - size / 2, top: cy - size / 2 }]}>
            <SpireRankCoin rank={pl.coinRank} size={size} plus={false} />
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({ coin: { position: 'absolute' } });

export default memo(PeakTowerPlayers);
