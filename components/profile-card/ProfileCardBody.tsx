// ─── Визитка 2.0: имя, плашка ранга, свой текст / замок (.vz-body) ───────────
// зачем: макет VC-*: имя 33/38, ранг «Титул · ранг N» с монетой, ниже — свой текст
// «Про» в кавычках (у своей визитки — карандаш), у своей обычной — замок «Свой
// текст — в Про визитке», ведущий к покупке. Во время повышения ранга старая плашка
// уезжает вверх, новая въезжает снизу (таймлайн ProfileCardRankUp).
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ReanimatedView from 'react-native-reanimated';

import { coinRankRowForDisplay } from '../../app/coin_rank_table_v1';
import type { Lang } from '../../constants/i18n';
import { hapticTap } from '../../hooks/use-haptics';
import type { CoinRankCeremony } from '../../hooks/use_coin_rank_upgrade';
import { RankChip } from './ProfileCardParts';
import type { useRankChipStyles } from './ProfileCardRankUp';
import type { ProfileCardLookTokens } from './profile_card_looks';
import { PC, t4 } from './profile_card_copy';

type Props = Readonly<{
  lang: Lang;
  tokens: ProfileCardLookTokens;
  name: string;
  rank: number | null;
  ceremony: CoinRankCeremony | null;
  chipStyles: ReturnType<typeof useRankChipStyles>;
  bioText: string;
  /** Своя визитка «Про» — карандаш у текста. */
  canEditBio: boolean;
  /** Своя обычная визитка (статус «Про» прочитан) — замок, ведущий к покупке. */
  showLock: boolean;
  onEditBio: () => void;
  onOpenBuy: () => void;
}>;

export function profileCardRankLabel(rank: number, lang: Lang): string {
  return `${coinRankRowForDisplay(rank).levelTitle} · ${t4(lang, PC.rank)} ${rank + 1}`;
}

function ProfileCardBodyBase({
  lang, tokens, name, rank, ceremony, chipStyles, bioText, canEditBio, showLock, onEditBio, onOpenBuy,
}: Props) {
  const editable = canEditBio && !ceremony;
  const content = (
    <>
      <Text
        testID="profile-card-name"
        style={[styles.name, { color: tokens.title }, tokens.titleGlow ? { textShadowColor: tokens.titleGlow, textShadowRadius: 18 } : null]}
      >
        {name}
      </Text>
      <View style={styles.rankWrap}>
        {ceremony ? (
          <>
            <ReanimatedView.View style={chipStyles.oldChip}>
              <RankChip rank={ceremony.fromRank} label={profileCardRankLabel(ceremony.fromRank, lang)} bg={tokens.rankBg} ink={tokens.rankText} />
            </ReanimatedView.View>
            <ReanimatedView.View style={[StyleSheet.absoluteFill, styles.center, chipStyles.newChip]}>
              <RankChip rank={ceremony.toRank} label={profileCardRankLabel(ceremony.toRank, lang)} bg={tokens.rankBg} ink={tokens.rankText} />
            </ReanimatedView.View>
          </>
        ) : rank !== null ? (
          <RankChip testID="profile-card-rank-chip" rank={rank} label={profileCardRankLabel(rank, lang)} bg={tokens.rankBg} ink={tokens.rankText} />
        ) : (
          <View testID="player-profile-rank-placeholder" accessible accessibilityLabel={t4(lang, PC.rankUnknown)}>
            <RankChip rank={null} label="—" bg={tokens.rankBg} ink={tokens.rankText} />
          </View>
        )}
      </View>
      {bioText ? (
        <View style={styles.bioRow}>
          <Text testID="profile-card-bio" style={styles.bio}>{`«${bioText}»`}</Text>
          {editable ? (
            <Pressable
              testID="profile-card-bio-edit"
              accessibilityRole="button"
              accessibilityLabel={t4(lang, PC.editBio)}
              hitSlop={6}
              onPress={() => { hapticTap(); onEditBio(); }}
              style={styles.pen}
            >
              <View style={styles.penInner}><Ionicons name="pencil" size={15} color="#FFFFFF" /></View>
            </Pressable>
          ) : null}
        </View>
      ) : editable ? (
        <Pressable
          testID="profile-card-bio-edit"
          accessibilityRole="button"
          accessibilityLabel={t4(lang, PC.addBio)}
          onPress={() => { hapticTap(); onEditBio(); }}
          style={styles.lock}
        >
          <Ionicons name="pencil" size={15} color="rgba(255,255,255,0.72)" />
          <Text style={styles.lockText}>{t4(lang, PC.addBio)}</Text>
        </Pressable>
      ) : showLock && !ceremony ? (
        <Pressable
          testID="profile-card-bio-lock"
          accessibilityRole="button"
          accessibilityLabel={t4(lang, PC.lock)}
          onPress={() => { hapticTap(); onOpenBuy(); }}
          style={styles.lock}
        >
          <Ionicons name="lock-closed-outline" size={15} color="rgba(255,255,255,0.72)" />
          <Text style={styles.lockText}>{t4(lang, PC.lock)}</Text>
        </Pressable>
      ) : null}
    </>
  );
  return (
    <View style={styles.body} pointerEvents="box-none">
      {tokens.glassBody ? <View style={styles.glass}>{content}</View> : content}
    </View>
  );
}

export default memo(ProfileCardBodyBase);

const styles = StyleSheet.create({
  body: { position: 'absolute', left: 0, right: 0, bottom: 14, paddingHorizontal: 22, alignItems: 'center', zIndex: 6 },
  glass: {
    alignSelf: 'stretch', alignItems: 'center',
    paddingTop: 16, paddingHorizontal: 14, paddingBottom: 18, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.26)', // guard-ok: стеклянная плашка «Ауры» (.st-aura .glass)
  },
  center: { alignItems: 'center' },
  name: {
    fontSize: 33, lineHeight: 38, fontWeight: '800', letterSpacing: -0.7, textAlign: 'center', alignSelf: 'stretch',
  },
  rankWrap: { marginTop: 10, alignItems: 'center', justifyContent: 'center', minHeight: 36 },
  bioRow: { marginTop: 12, maxWidth: 320, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  bio: { flexShrink: 1, fontSize: 16, lineHeight: 22, fontWeight: '500', color: 'rgba(255,255,255,0.86)', textAlign: 'center' },
  pen: { width: 44, height: 44, marginVertical: -10, marginRight: -10, alignItems: 'center', justifyContent: 'center' },
  penInner: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  lock: {
    marginTop: 12, minHeight: 40, paddingHorizontal: 14, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', // guard-ok: .vz-lock hairline из макета
  },
  lockText: { color: 'rgba(255,255,255,0.72)', fontSize: 14, fontWeight: '600', flexShrink: 1 },
});
