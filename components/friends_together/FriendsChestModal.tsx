// «Вместе» — результат общего пламени. Один заголовок, одна строка награды,
// одна кнопка: без поясняющего мелкого текста. Каркас — общий Motion Hybrid sheet.
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Reanimated from 'react-native-reanimated';
import DuoPressable from '../DuoPressable';
import HybridSheetShell from '../modal_fx/HybridSheetShell';
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

function FriendsChestModal({ visible, tier, starsGranted, xpBoostMinutes, streakShield, aura, onClaim }: FriendsChestModalProps) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const rarity = rarityForTier(tier);
  const isGold = tier >= 2;
  const impact = useRewardImpactHybrid({ visible, rarity, impactSoundId: 'pm.reward.chest_open', scope: 'friends-chest-modal' });
  const L = (ru: string, uk: string, es: string, ptBr: string, vi: string, id: string, tr: string, pl: string) =>
    triLang(lang as any, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });
  const title = L('Общее пламя зажжено', 'Спільне полум’я запалено', 'Llama compartida encendida', 'Chama compartilhada acesa', 'Ngọn lửa chung đã bừng sáng', 'Api bersama telah menyala', 'Ortak alev parlıyor', 'Wspólny płomień rozpalony');
  const claimLabel = L('Забрать', 'Забрати', 'Recoger', 'Resgatar', 'Nhận', 'Ambil', 'Al', 'Odbierz');
  const rewards = [
    starsGranted > 0 ? `+${starsGranted} ${L('жемчужин', 'перлин', 'perlas', 'pérolas', 'ngọc trai', 'mutiara', 'inci', 'pereł')}` : '',
    xpBoostMinutes > 0 ? `×2 XP · ${xpBoostMinutes} ${L('мин', 'хв', 'min', 'min', 'phút', 'mnt', 'dk', 'min')}` : '',
    streakShield ? L('Щит', 'Щит', 'Escudo', 'Escudo', 'Khiên', 'Perisai', 'Kalkan', 'Tarcza') : '',
    aura ? L('Аура', 'Аура', 'Aura', 'Aura', 'Hào quang', 'Aura', 'Aura', 'Aura') : '',
  ].filter(Boolean).join(' · ');

  return (
    <HybridSheetShell
      visible={visible}
      onClose={onClaim}
      closeLabel={claimLabel}
      backdropAccessible={false}
      glowColor={isGold ? t.gold : t.accent}
      testID="friends-chest-modal"
    >
      {({ requestDismiss }) => (
        <View style={styles.content}>
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
          <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>{title}</Text>
          <Text testID="friends-chest-reward" style={[styles.reward, { color: t.textPrimary, fontSize: f.h3 }]}>{rewards}</Text>
          <DuoPressable
            testID="friends-chest-modal-claim"
            onPress={requestDismiss}
            edgeColor={isGold ? t.gold : t.accent}
            edgeHeight={4}
            style={[styles.ctaBtn, { backgroundColor: isGold ? t.gold : t.accent }]}
          >
            <Text style={[styles.ctaText, { color: t.correctText }]}>{claimLabel}</Text>
          </DuoPressable>
        </View>
      )}
    </HybridSheetShell>
  );
}

export default memo(FriendsChestModal);

const styles = StyleSheet.create({
  content: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  heroFrame: { width: 126, height: 126, alignItems: 'center', justifyContent: 'center' },
  hero: { width: 94, height: 94, borderRadius: 47, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '700', textAlign: 'center', marginTop: 4 },
  reward: { fontWeight: '700', textAlign: 'center', marginTop: 16, marginBottom: 24 },
  ctaBtn: { width: '100%', minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontWeight: '700', fontSize: 16 },
});
