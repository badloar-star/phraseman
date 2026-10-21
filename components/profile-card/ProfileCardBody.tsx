// ─── Визитка 2.0: имя, плашка ранга, свой текст / замок (.vz-body) ───────────
// зачем: макет VC-*: имя 33/38, ранг «Титул · ранг N» с монетой, ниже — свой текст
// «Про» в кавычках (у своей визитки — карандаш), у своей обычной — замок «Свой
// текст — в Про визитке», ведущий к покупке. Во время повышения ранга старая плашка
// уезжает вверх, новая въезжает снизу (таймлайн ProfileCardRankUp).
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ReanimatedView from 'react-native-reanimated';

import { coinRankTitle } from '../../app/coin_rank_table_v1';
import type { Lang } from '../../constants/i18n';
import { hapticTap } from '../../hooks/use-haptics';
import type { CoinRankCeremony } from '../../hooks/use_coin_rank_upgrade';
import { RankChip } from './ProfileCardParts';
import { PlusTag } from '../plus/PlusAvatarRing';
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
  /** У человека есть Plus: метка «◆ Plus» у имени (владелец 21.10, реестр №6). Карточка всегда тёмная — метка тёмного варианта. */
  plus?: boolean;
}>;

// зачем (Сверка 05.10 04:45: при rank=5 визитка писала «ранг 6», после повышения «ранг 7»): ранги 0…19 показываются
// как есть — как в макете coins.html («Лектор · ранг 5», «Ранг 5 → 6») и на экране coin_rank.tsx.
export function profileCardRankLabel(rank: number, lang: Lang): string {
  return `${coinRankTitle(rank, lang)} · ${t4(lang, PC.rank)} ${rank}`;
}

function ProfileCardBodyBase({
  lang, tokens, name, rank, ceremony, chipStyles, bioText, canEditBio, showLock, onEditBio, onOpenBuy, plus,
}: Props) {
  const editable = canEditBio && !ceremony;
  const content = (
    <>
      <View style={styles.nameRow}>
        <Text
          testID="profile-card-name"
          style={[styles.name, { color: tokens.title }, tokens.titleGlow ? { textShadowColor: tokens.titleGlow, textShadowRadius: 18 } : null]}
        >
          {name}
        </Text>
        {plus === true ? <PlusTag testID="profile-card-plus-tag" isLight={false} style={styles.plusTag} /> : null}
      </View>
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
              <View style={styles.penInner}><Ionicons name="pencil" size={15} color="#FFFFFF" /></View>{/* theme-exempt: текст и значки на арте визитки — белые поверх арта (иллюстрация) */}
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
          <Ionicons name="pencil" size={15} color="rgba(255,255,255,0.72)" />{/* theme-exempt: текст и значки на арте визитки — белые поверх арта (иллюстрация) */}
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
          <Ionicons name="lock-closed-outline" size={15} color="rgba(255,255,255,0.72)" />{/* theme-exempt: текст и значки на арте визитки — белые поверх арта (иллюстрация) */}
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
    backgroundColor: 'rgba(255,255,255,0.14)', // theme-exempt: текст и значки на арте визитки — белые поверх арта (иллюстрация)
    // зачем (владелец 12.10, стиль «Тень»): стеклянная плашка «Ауры» без кромки — отделяет полупрозрачный белый тон на арте
  },
  center: { alignItems: 'center' },
  nameRow: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  plusTag: { marginLeft: 8, flexShrink: 0 },
  name: {
    flexShrink: 1, fontSize: 33, lineHeight: 38, fontWeight: '800', letterSpacing: -0.7, textAlign: 'center',
  },
  rankWrap: { marginTop: 10, alignItems: 'center', justifyContent: 'center', minHeight: 36 },
  bioRow: { marginTop: 12, maxWidth: 320, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  bio: { flexShrink: 1, fontSize: 16, lineHeight: 22, fontWeight: '500', color: 'rgba(255,255,255,0.86)', textAlign: 'center' }, // theme-exempt: текст и значки на арте визитки — белые поверх арта (иллюстрация)
  pen: { width: 44, height: 44, marginVertical: -10, marginRight: -10, alignItems: 'center', justifyContent: 'center' },
  penInner: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' }, // theme-exempt: текст и значки на арте визитки — белые поверх арта (иллюстрация)
  lock: {
    marginTop: 12, minHeight: 40, paddingHorizontal: 14, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.12)', // theme-exempt: текст и значки на арте визитки — белые поверх арта (иллюстрация); зачем (владелец 12.10, стиль «Тень»): замок без hairline — тон 0.12 вместо 0.05 + кромка
    // guard-ok: (.vz-lock hairline макета снят по приказу 12.10) // theme-exempt: текст и значки на арте визитки — белые поверх арта (иллюстрация)
  },
  lockText: { color: 'rgba(255,255,255,0.72)', fontSize: 13, fontWeight: '700', flexShrink: 1 }, // theme-exempt: текст и значки на арте визитки — белые поверх арта (иллюстрация)
});
