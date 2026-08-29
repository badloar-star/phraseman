// «Вместе» — модалка «Уровень дружбы вырос» (макет 4.4). Гибрид «Световод +
// Чекан»: блум → карточка выходит из света → сердце падает и бьёт (кольца,
// пыль по редкости) → каскад строк/CTA. Редкость: 2–3 common, 4 rare, 5 epic
// (владелец, ТЗ раздел D).
import React, { memo, useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import RuneGlyph from '../RuneGlyph';
import Reanimated from 'react-native-reanimated';
import DuoPressable from '../DuoPressable';
import AvatarView from '../AvatarView';
import { useTheme } from '../ThemeContext';
import { useLang } from '../LangContext';
import { triLang } from '../../constants/i18n';
import { useRewardImpactHybrid, type RewardImpactRarity } from '../celebration/use_reward_impact_hybrid';
import RewardImpactRings from '../celebration/RewardImpactRings';
import { LEVEL_NAMES } from '../../app/friends_together/together_days';

function rarityForLevel(level: number): RewardImpactRarity {
  if (level >= 5) return 'epic';
  if (level >= 4) return 'rare';
  return 'common';
}

export interface FriendLevelUpModalProps {
  visible: boolean;
  friendName: string;
  friendAvatar: string;
  friendTotalXp: number;
  friendAura?: string;
  myAvatar: string;
  myTotalXp: number;
  level: number;
  bonusPercent: number;
  starsGranted: number;
  claimBusy?: boolean;
  onClaim: () => void;
}

function FriendLevelUpModal({
  visible,
  friendName,
  friendAvatar,
  friendTotalXp,
  friendAura,
  myAvatar,
  myTotalXp,
  level,
  bonusPercent,
  starsGranted,
  claimBusy = false,
  onClaim,
}: FriendLevelUpModalProps) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const rarity = rarityForLevel(level);
  const isGold = level >= 4;

  const impact = useRewardImpactHybrid({
    visible,
    rarity,
    impactSoundId: 'pm.reward.chest_open',
    scope: 'friend-level-up',
  });

  useEffect(() => {
    impact.setOnImpact(() => {});
  }, [impact]);

  const L = (ru: string, uk: string, en: string, es: string, ptBr: string, vi: string, id: string, tr: string, pl: string) =>
    triLang(lang as any, { ru, uk, en, es, 'pt-BR': ptBr, vi, id, tr, pl });

  const levelName = LEVEL_NAMES[Math.max(1, Math.min(LEVEL_NAMES.length - 1, level))] || '';
  const title = L(
    `Вы с ${friendName} — ${levelName}`,
    `Ви з ${friendName} — ${levelName}`,
    `You and ${friendName} — ${levelName}`,
    `Tú y ${friendName} — ${levelName}`,
    `Você e ${friendName} — ${levelName}`,
    `Bạn và ${friendName} — ${levelName}`,
    `Kamu dan ${friendName} — ${levelName}`,
    `Sen ve ${friendName} — ${levelName}`,
    `Ty i ${friendName} — ${levelName}`,
  );
  const claimLabel = L('Забрать', 'Забрати', 'Claim', 'Reclamar', 'Resgatar', 'Nhận', 'Ambil', 'Al', 'Odbierz');
  const xpRewardLabel = L(
    `+${bonusPercent}% опыта вместе`,
    `+${bonusPercent}% досвіду разом`,
    `+${bonusPercent}% XP together`,
    `+${bonusPercent}% XP juntos`,
    `+${bonusPercent}% XP juntos`,
    `+${bonusPercent}% XP cùng nhau`,
    `+${bonusPercent}% XP bersama`,
    `+%${bonusPercent} birlikte XP`,
    `+${bonusPercent}% XP razem`,
  );
  const starsLabel = `+${starsGranted}`;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={() => { if (!claimBusy) onClaim(); }}>
      <View style={styles.root}>
        <Reanimated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.scrim, impact.styles.backdrop]} />
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={claimLabel} disabled={claimBusy} onPress={onClaim} />

        <View style={styles.stage} pointerEvents="box-none">
          <Reanimated.View pointerEvents="none" style={[styles.bloom, { backgroundColor: isGold ? `${t.gold}38` : `${t.accent}38` }, impact.styles.bloom]} />

          <Reanimated.View style={[styles.card, { backgroundColor: t.bgCard, shadowColor: isGold ? t.gold : t.accent }, impact.styles.card]} pointerEvents="box-none">
            <View style={styles.heroFrame}>
              <RewardImpactRings
                show={impact.showRings}
                dustCount={impact.dustCount}
                color={isGold ? t.gold : t.accent}
                ring0Style={impact.styles.ring0}
                ring1Style={impact.styles.ring1}
              />
              <Reanimated.View style={[styles.hero, { backgroundColor: isGold ? t.goldBg : t.accentBg }, impact.styles.hero]}>
                <Ionicons name="heart" size={48} color={isGold ? t.gold : t.accent} />
              </Reanimated.View>
            </View>

            <Reanimated.View style={impact.styles.text}>
              <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>{title}</Text>
            </Reanimated.View>

            <Reanimated.View style={impact.styles.rows}>
              <View style={styles.pairRow}>
                <AvatarView avatar={myAvatar} totalXP={myTotalXp} size={56} />
                <View style={[styles.link, { backgroundColor: isGold ? t.gold : t.accent }]} />
                <AvatarView avatar={friendAvatar} totalXP={friendTotalXp} size={56} auraId={friendAura} />
              </View>
              <View style={styles.rewardsRow}>
                <View style={[styles.rewardChip, { backgroundColor: t.accentBg }]}>
                  <Ionicons name="flash" size={16} color={t.accent} />
                  <Text style={[styles.rewardText, { color: t.accent, fontSize: f.sub }]}>{xpRewardLabel}</Text>
                </View>
                {starsGranted > 0 && (
                  <View style={[styles.rewardChip, { backgroundColor: t.goldBg }]}>
                    <RuneGlyph size={16} color={t.gold} />
                    <Text style={[styles.rewardText, { color: t.gold, fontSize: f.sub }]}>{starsLabel}</Text>
                  </View>
                )}
              </View>
            </Reanimated.View>

            <Reanimated.View style={[styles.ctaWrap, impact.styles.cta]}>
              <DuoPressable
                testID="friend-level-up-claim"
                onPress={onClaim}
                disabled={claimBusy}
                edgeColor={t.bgSurface2}
                edgeHeight={4}
                style={[styles.ctaBtn, { backgroundColor: isGold ? t.gold : t.accent, opacity: claimBusy ? 0.62 : 1 }]}
              >
                <Text style={[styles.ctaText, { color: t.correctText }]}>{claimLabel}</Text>
              </DuoPressable>
            </Reanimated.View>
          </Reanimated.View>
        </View>
      </View>
    </Modal>
  );
}

export default memo(FriendLevelUpModal);

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrim: { backgroundColor: 'rgba(0,0,0,0.6)' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  bloom: {
    position: 'absolute',
    left: '-30%',
    right: '-30%',
    bottom: -240,
    height: 520,
    borderRadius: 300,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 22,
    alignItems: 'center',
    overflow: 'hidden',
    // guard-ok: тот же радиус тени, что в BoonChestHybrid.tsx/CollectibleDropModal —
    // единый язык celebration-карточек семьи, не отдельная новая дорогая тень.
    shadowOpacity: 0.4,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
  },
  heroFrame: {
    width: 130,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  hero: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontWeight: '700', textAlign: 'center', marginBottom: 14 },
  pairRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  link: { width: 44, height: 8, borderRadius: 4 },
  rewardsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  rewardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  rewardText: { fontWeight: '700' },
  ctaWrap: { alignSelf: 'stretch' },
  ctaBtn: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontWeight: '700', fontSize: 16 },
});
