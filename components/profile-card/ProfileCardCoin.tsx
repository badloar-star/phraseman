// ─── Визитка 2.0: монета-аватар ранга (без круглой обрезки) ─────────────────
// зачем: владелец 2026-09-30 — «не обрезать монеты кругом: часть монет овальная».
// Поэтому монета рисуется целиком (contentFit="contain"), без borderRadius/overflow,
// а блик (.vz-sheen) кладётся через маску ПО СИЛУЭТУ самой монеты (MaskedView), а не
// по кругу. Тень — drop-shadow под силуэтом (iOS) / мягкое пятно (Android).
// Обсидиан держит монету в золотом кольце (.goldring) — кольцо рисуется ЗА монетой
// и её не обрезает.
import MaskedView from '@react-native-masked-view/masked-view';
import { Image } from 'expo-image';
import React, { memo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';

import { coinRankRowForDisplay } from '../../app/coin_rank_table_v1';
import type { ProfileCardLook } from '../../app/profile_card_styles';
import { LinearGradient } from '../SafeLinearGradient';
import { PlusRingOverlay } from '../plus/PlusAvatarRing';
import { gradientPoints } from './profile_card_looks';
import { useLoop } from './useLoop';

type Props = Readonly<{
  look: ProfileCardLook;
  rank: number | null;
  size: number;
  animate: boolean;
  testID?: string;
  /** У человека есть Plus (владелец 21.10, реестр №6): кольцо 6 + зазор 5 и значок ◆ 46 у монеты. Кольцо внутри плавающего корня — «летает» вместе с монетой. */
  plus?: boolean;
  /** Цвет карточки — для обводки значка ◆. */
  plusSurface?: string;
}>;

const FLOAT_LOOKS: ReadonlySet<ProfileCardLook> = new Set(['holo', 'aura']);
const SHEEN_LOOKS: ReadonlySet<ProfileCardLook> = new Set(['holo', 'obs', 'ice']);
const SHEEN = gradientPoints(125);

export function CoinImage({ rank, size }: { rank: number | null; size: number }) {
  if (rank === null) {
    // Ранг ещё неизвестен — нейтральный диск, а не выдуманная медная монета.
    return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: 'rgba(255,255,255,0.08)' }} />; // theme-exempt: иллюстрация монеты на карточке профиля
  }
  const row = coinRankRowForDisplay(rank);
  return (
    <Image
      source={row.source}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessible={false}
    />
  );
}

function Sheen({ rank, size, animate }: { rank: number; size: number; animate: boolean }) {
  const t = useLoop(3600, animate, { restAt: 0 });
  const style = useAnimatedStyle(() => ({ opacity: interpolate(t.value, [0, 0.45, 1], [0, 1, 0]) }));
  return (
    <MaskedView
      pointerEvents="none"
      style={[StyleSheet.absoluteFill]}
      maskElement={<CoinImage rank={rank} size={size} />}
    >
      <Animated.View style={[StyleSheet.absoluteFill, style]}>
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0)', 'rgba(255,255,255,0.34)', 'rgba(255,255,255,0)', 'rgba(255,255,255,0)']} // theme-exempt: иллюстрация монеты на карточке профиля
          locations={[0, 0.32, 0.48, 0.62, 1]}
          start={SHEEN.start}
          end={SHEEN.end}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </MaskedView>
  );
}

export function GoldRing({ size }: { size: number }) {
  const outer = size + 14;
  const gold = gradientPoints(145);
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute', left: -7, top: -7, width: outer, height: outer, borderRadius: outer / 2,
        shadowColor: '#000', shadowOpacity: 0.7, shadowRadius: 24, shadowOffset: { width: 0, height: 24 }, // theme-exempt: иллюстрация монеты на карточке профиля
        elevation: 12,
      }}
    >
      <LinearGradient
        colors={['#FFF1C9', '#B58A3E', '#F6DC9C', '#7A5A26', '#E9C983']} // theme-exempt: иллюстрация монеты на карточке профиля
        locations={[0, 0.35, 0.55, 0.8, 1]}
        start={gold.start}
        end={gold.end}
        style={{ width: outer, height: outer, borderRadius: outer / 2 }}
      />
      <View style={{ position: 'absolute', left: 4, top: 4, width: outer - 8, height: outer - 8, borderRadius: (outer - 8) / 2, backgroundColor: '#0A0907' }} />{/* theme-exempt: иллюстрация монеты на карточке профиля */}
    </View>
  );
}

function ProfileCardCoin({ look, rank, size, animate, testID, plus, plusSurface }: Props) {
  const float = useLoop(5500, animate && FLOAT_LOOKS.has(look), { yoyo: true, restAt: 0 });
  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -7 * float.value }] }));
  const shadow = look === 'obs'
    ? null
    : Platform.select({
        ios: { shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 17, shadowOffset: { width: 0, height: 18 } }, // theme-exempt: иллюстрация монеты на карточке профиля
        default: null,
      });
  return (
    <Animated.View testID={testID} style={[{ width: size, height: size }, floatStyle]}>
      {look === 'obs' ? <GoldRing size={size} /> : null}
      {Platform.OS !== 'ios' && look !== 'obs' ? (
        // Android: цветной drop-shadow по силуэту недоступен — мягкое пятно под монетой.
        <View
          pointerEvents="none"
          style={{
            position: 'absolute', left: size * 0.14, right: size * 0.14, top: size * 0.62, height: size * 0.34,
            borderRadius: size, backgroundColor: 'rgba(0,0,0,0.35)', transform: [{ scaleY: 0.6 }], // theme-exempt: иллюстрация монеты на карточке профиля
          }}
        />
      ) : null}
      <View style={[{ width: size, height: size }, shadow]}>
        <CoinImage rank={rank} size={size} />
      </View>
      {rank !== null && SHEEN_LOOKS.has(look) ? <Sheen rank={rank} size={size} animate={animate} /> : null}
      {/* зачем: «Обсидиан» держит монету в своём золотом кольце (GoldRing) — второе кольцо рядом не рисуем, значок ◆ остаётся */}
      {plus === true ? <PlusRingOverlay size={size} kind="card" surface={plusSurface} hideRing={look === 'obs'} testID="profile-card-plus-ring" /> : null}
    </Animated.View>
  );
}

export default memo(ProfileCardCoin);
