// VideoRewardBadge — плашка награды на превью ролика: монета ТЕКУЩЕГО ранга + «+500»; получено — приглушённая монета с галочкой.
// Эталон: docs/work/mockups/video-reward-2026-11-05/video_reward.html (кадр 900 px = 360 dp → 1 px макета = 0.4 dp).
// зачем: один компонент на Главную (HomeV2VideoRail) и раздел «Видео»; без обводки; плашка тёмная полупрозрачная, чтобы читаться на любой обложке и в любой теме.
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image as CoinImage } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useMyCoinRankBinding } from '../../hooks/use_my_coin_rank';
import { COIN_RANK_TABLE, isValidCoinRank } from '../../app/coin_rank_table_v1';
import { isVideoFullRewardEnabled, useVideoFullRewarded } from '../../hooks/use_video_full_rewarded';
import { videoFullEligibility } from '../../app/video_full_watch';
import { VIDEO_REWARD_COINS } from './video_reward_flag';

type Props = Readonly<{
  /** Ролик: по нему решаются «получено» (useVideoFullRewarded) и «награда возможна» (длительность ≥ 30 с, не эфир). */
  videoId: string;
  durationSec?: number | null;
  live?: boolean;
  /** Отступ от угла обложки; по макету 5.6 dp (14 px макета). */
  inset?: number;
}>;

function VideoRewardBadge({ videoId, durationSec, live = false, inset = 6 }: Props) {
  const rank = useMyCoinRankBinding()?.rank ?? null;
  const rewarded = useVideoFullRewarded();
  // зачем (Моменты 05.11): +500 не обещаем, пока награда выключена (remote video_full_reward_enabled) и когда её у ролика быть не может (нет длительности / эфир / короче 30 с)
  if (!isVideoFullRewardEnabled() || videoFullEligibility(durationSec, live) !== 'ok') return null;
  const got = rewarded.has(videoId);
  const row = isValidCoinRank(rank) ? COIN_RANK_TABLE.find((item) => item.rank === rank) : COIN_RANK_TABLE[0];
  return (
    <View
      testID={got ? 'video-reward-badge-got' : 'video-reward-badge'}
      pointerEvents="none"
      accessible
      accessibilityLabel={got ? `+${VIDEO_REWARD_COINS}, ✓` : `+${VIDEO_REWARD_COINS}`}
      style={[s.badge, got ? s.badgeGot : null, { left: inset, top: inset }]}
    >
      {row ? <CoinImage source={row.source} contentFit="contain" style={[s.coin, got ? s.coinGot : null]} accessible={false} /> : null}
      {got ? (
        <View style={s.check}><Ionicons name="checkmark" size={8} color="#FFFFFF" /* theme-exempt: галочка на зелёном кружке плашки поверх фото */ /></View>
      ) : (
        // guard-ok: счётчик награды по утверждённому макету (30 px макета = 12 dp), не подпись
        <Text style={s.text}>{`+${VIDEO_REWARD_COINS}`}</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  // theme-exempt: плашка лежит на фото обложки ролика, не на фоне темы (макет: rgba(8,10,14,.66), без обводки)
  badge: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, paddingLeft: 3, paddingRight: 7, borderRadius: 999, backgroundColor: 'rgba(8,10,14,0.66)' },
  badgeGot: { backgroundColor: 'rgba(8,10,14,0.5)' },
  coin: { width: 16, height: 16 },
  coinGot: { opacity: 0.5 },
  text: { color: '#FFFFFF', fontSize: 12, lineHeight: 12, fontWeight: '800', letterSpacing: 0.2 }, // theme-exempt: белый текст на тёмной плашке поверх фото; guard-ok: счётчик награды по макету (12 dp), не подпись
  check: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#35C27A', alignItems: 'center', justifyContent: 'center' }, // theme-exempt: зелёный кружок галочки из макета
});

export default memo(VideoRewardBadge);
