// «Вместе» — модалка «Сундук недели» открыт (макет 4.5). Гибрид «Световод +
// Чекан», герой — сундук. Редкость по достигнутому порогу: I common, II rare,
// III epic (владелец, ТЗ раздел D).
import React, { memo, useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Reanimated from 'react-native-reanimated';
import DuoPressable from '../DuoPressable';
import { useTheme } from '../ThemeContext';
import { useLang } from '../LangContext';
import { triLang } from '../../constants/i18n';
import { useRewardImpactHybrid, type RewardImpactRarity } from '../celebration/use_reward_impact_hybrid';
import RewardImpactRings from '../celebration/RewardImpactRings';

function rarityForTier(tier: number): RewardImpactRarity {
  if (tier >= 3) return 'epic';
  if (tier >= 2) return 'rare';
  return 'common';
}

export interface FriendsChestModalProps {
  visible: boolean;
  tier: number;
  starsGranted: number;
  xpBoostMinutes: number;
  streakShield: boolean;
  aura: boolean;
  onClaim: () => void;
}

function FriendsChestModal({
  visible,
  tier,
  starsGranted,
  xpBoostMinutes,
  streakShield,
  aura,
  onClaim,
}: FriendsChestModalProps) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const rarity = rarityForTier(tier);
  const isGold = tier >= 2;

  const impact = useRewardImpactHybrid({
    visible,
    rarity,
    impactSoundId: 'pm.reward.chest_open',
    scope: 'friends-chest-modal',
  });

  useEffect(() => {
    impact.setOnImpact(() => {});
  }, [impact]);

  const L = (ru: string, uk: string, es: string, ptBr: string, vi: string, id: string, tr: string, pl: string) =>
    triLang(lang as any, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });

  const title = L('Сундук недели', 'Скриня тижня', 'Cofre semanal', 'Baú semanal', 'Rương tuần', 'Peti mingguan', 'Haftalık sandık', 'Skrzynia tygodnia');
  const claimLabel = L('Забрать', 'Забрати', 'Reclamar', 'Resgatar', 'Nhận', 'Ambil', 'Al', 'Odbierz');
  const xpBoostLabel = L(
    `×2 опыта · ${xpBoostMinutes} мин`,
    `×2 досвіду · ${xpBoostMinutes} хв`,
    `×2 XP · ${xpBoostMinutes} min`,
    `×2 XP · ${xpBoostMinutes} min`,
    `×2 XP · ${xpBoostMinutes} phút`,
    `×2 XP · ${xpBoostMinutes} mnt`,
    `×2 XP · ${xpBoostMinutes} dk`,
    `×2 XP · ${xpBoostMinutes} min`,
  );
  const shieldLabel = L('щит цепи', 'щит ланцюга', 'escudo de racha', 'escudo de sequência', 'khiên chuỗi', 'perisai rantai', 'seri kalkanı', 'tarcza serii');
  const auraLabel = L('аура', 'аура', 'aura', 'aura', 'hào quang', 'aura', 'aura', 'aura');

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClaim}>
      <View style={styles.root}>
        <Reanimated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.scrim, impact.styles.backdrop]} />
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={claimLabel} onPress={onClaim} />

        <View style={styles.stage} pointerEvents="box-none">
          <Reanimated.View pointerEvents="none" style={[styles.bloom, { backgroundColor: isGold ? `${t.gold}38` : `${t.accent}38` }, impact.styles.bloom]} />

          <Reanimated.View
            style={[
              styles.card,
              { backgroundColor: t.bgCard, shadowColor: isGold ? t.gold : t.accent },
              // guard-ok: тот же радиус тени, что в BoonChestHybrid.tsx/FriendLevelUpModal —
              // единый язык celebration-карточек семьи, не отдельная новая дорогая тень.
              impact.styles.card,
            ]}
            pointerEvents="box-none"
          >
            <View style={styles.heroFrame}>
              <RewardImpactRings
                show={impact.showRings}
                dustCount={impact.dustCount}
                color={isGold ? t.gold : t.accent}
                ring0Style={impact.styles.ring0}
                ring1Style={impact.styles.ring1}
              />
              <Reanimated.View style={[styles.hero, { backgroundColor: isGold ? t.goldBg : t.accentBg }, impact.styles.hero]}>
                <Ionicons name="cube" size={48} color={isGold ? t.gold : t.accent} />
              </Reanimated.View>
            </View>

            <Reanimated.View style={impact.styles.text}>
              <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>{title}</Text>
            </Reanimated.View>

            <Reanimated.View style={impact.styles.rows}>
              <View style={styles.rewardsRow}>
                {starsGranted > 0 && (
                  <View style={[styles.rewardChip, { backgroundColor: t.goldBg }]}>
                    <Ionicons name="star" size={16} color={t.gold} />
                    <Text style={[styles.rewardText, { color: t.gold, fontSize: f.sub }]}>{`+${starsGranted}`}</Text>
                  </View>
                )}
                {xpBoostMinutes > 0 && (
                  <View style={[styles.rewardChip, { backgroundColor: t.accentBg }]}>
                    <Ionicons name="flash" size={16} color={t.accent} />
                    <Text style={[styles.rewardText, { color: t.accent, fontSize: f.sub }]}>{xpBoostLabel}</Text>
                  </View>
                )}
                {streakShield && (
                  <View style={[styles.rewardChip, { backgroundColor: t.accentBg }]}>
                    <Ionicons name="shield-checkmark" size={16} color={t.accent} />
                    <Text style={[styles.rewardText, { color: t.accent, fontSize: f.sub }]}>{shieldLabel}</Text>
                  </View>
                )}
                {aura && (
                  <View style={[styles.rewardChip, { backgroundColor: t.goldBg }]}>
                    <Ionicons name="sparkles" size={16} color={t.gold} />
                    <Text style={[styles.rewardText, { color: t.gold, fontSize: f.sub }]}>{auraLabel}</Text>
                  </View>
                )}
              </View>
            </Reanimated.View>

            <Reanimated.View style={[styles.ctaWrap, impact.styles.cta]}>
              <DuoPressable
                testID="friends-chest-modal-claim"
                onPress={onClaim}
                edgeColor={t.bgSurface2}
                edgeHeight={4}
                style={[styles.ctaBtn, { backgroundColor: isGold ? t.gold : t.accent }]}
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

export default memo(FriendsChestModal);

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
    shadowOpacity: 0.4,
    // guard-ok: тот же радиус тени, что в BoonChestHybrid.tsx/FriendLevelUpModal —
    // единый язык celebration-карточек семьи, не отдельная новая дорогая тень.
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
