// «Вместе» — результат общего пламени. Один заголовок, одна строка награды,
// одна кнопка: без поясняющего мелкого текста. Каркас — общий Motion Hybrid sheet.
//
// зачем (владелец, 2026-08-24): героем модалки был безликий кубик Ionicons,
// хотя у общего пламени есть свой ассет — тот же, что дышит на карточке. Теперь
// модалка показывает пламя ТОЙ ЖЕ стадии, что была достигнута (tier→stage), с
// тем же фолбэком на иконку, что и карточка. Заодно исправлена подпись валюты:
// поле `stars` — это РУНЫ (переименование 23.08), а модалка звала их
// «жемчужинами» (это другая валюта — осколки 💎, сундук её не выдаёт).
import React, { memo, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image as ExpoImage } from 'expo-image';
import Reanimated from 'react-native-reanimated';
import DuoPressable from '../DuoPressable';
import HybridSheetShell from '../modal_fx/HybridSheetShell';
import { useTheme } from '../ThemeContext';
import { useLang } from '../LangContext';
import { triLang } from '../../constants/i18n';
import { useRewardImpactHybrid, type RewardImpactRarity } from '../celebration/use_reward_impact_hybrid';
import RewardImpactRings from '../celebration/RewardImpactRings';
import { resolveFriendsSharedFlameAsset } from './friends_flame_assets';
import { runeWord } from '../../constants/runes';

function rarityForTier(tier: number): RewardImpactRarity {
  if (tier >= 3) return 'epic';
  if (tier >= 2) return 'rare';
  return 'common';
}

export interface FriendsChestModalProps {
  visible: boolean;
  tier: number;
  /** Поле `stars` — это РУНЫ (см. constants/runes.ts), а не жемчужины. */
  starsGranted: number;
  xpBoostMinutes: number;
  streakShield: boolean;
  aura: boolean;
  /** Прямой опыт пачкой — новая награда сундука (владелец, 2026-08-24). */
  xpGranted?: number;
  /** Полное восстановление шкалы энергии — новая награда сундука. */
  energyRefilled?: boolean;
  onClaim: () => void;
}

function FriendsChestModal({ visible, tier, starsGranted, xpBoostMinutes, streakShield, aura, xpGranted = 0, energyRefilled = false, onClaim }: FriendsChestModalProps) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const rarity = rarityForTier(tier);
  const isGold = tier >= 2;
  // зачем: стадия пламени в модалке = достигнутый тир, ровно как на карточке
  // (friends_flame_model: tier>=3 → 3, tier>=2 → 2, иначе 1). Отдельной модели
  // здесь не нужно — у результата нет «процента до следующего порога».
  const flameStage = tier >= 3 ? 3 : tier >= 2 ? 2 : 1;
  const flameAsset = resolveFriendsSharedFlameAsset(themeMode, flameStage);
  const flameAssetKey = `friends-shared-flame-${themeMode}-${flameStage}`;
  const [failedFlameAssetKey, setFailedFlameAssetKey] = useState<string | null>(null);
  const flameImageFailed = failedFlameAssetKey === flameAssetKey;
  useEffect(() => {
    setFailedFlameAssetKey(null);
  }, [flameAssetKey]);
  const impact = useRewardImpactHybrid({ visible, rarity, impactSoundId: 'pm.reward.chest_open', scope: 'friends-chest-modal' });
  const L = (ru: string, uk: string, en: string, es: string, ptBr: string, vi: string, id: string, tr: string, pl: string) =>
    triLang(lang as any, { ru, uk, en, es, 'pt-BR': ptBr, vi, id, tr, pl });
  const title = L('Награда за неделю вместе', 'Нагорода за тиждень разом', 'Reward for a week together', 'Recompensa por la semana juntos', 'Recompensa pela semana juntos', 'Phần thưởng cho tuần cùng nhau', 'Hadiah untuk sepekan bersama', 'Birlikte geçen hafta ödülü', 'Nagroda za tydzień razem');
  const claimLabel = L('Забрать', 'Забрати', 'Claim', 'Recoger', 'Resgatar', 'Nhận', 'Ambil', 'Al', 'Odbierz');
  // зачем (иерархия): на верхнем тире наград стало шесть — одной строкой через
  // точки это читается как список, а не как награда. Делим на два уровня:
  // ГЛАВНОЕ — то, что прибавилось числом (руны и опыт), крупным весом;
  // ОСТАЛЬНОЕ — что теперь работает (энергия, буст, щит, аура), тоном тише.
  // Подпись-расшифровка мелким шрифтом под заголовком запрещена владельцем —
  // это не она: вторая строка равноправна и несёт свои награды, а не поясняет
  // первую.
  const primaryRewards = [
    // `stars` = руны; склонение берём из того же runeWord, что и весь остальной
    // интерфейс рун, — иначе «15 рун» разошлось бы с «15 руны».
    starsGranted > 0 ? `+${starsGranted} ${runeWord(lang as any, starsGranted)}` : '',
    xpGranted > 0 ? `+${xpGranted} ${L('опыта', 'досвіду', 'XP', 'de experiencia', 'de experiência', 'kinh nghiệm', 'pengalaman', 'deneyim', 'doświadczenia')}` : '',
  ].filter(Boolean).join(' · ');
  const bonusRewards = [
    energyRefilled ? L('Полная энергия', 'Повна енергія', 'Full energy', 'Energía llena', 'Energia cheia', 'Năng lượng đầy', 'Energi penuh', 'Enerji dolu', 'Pełna energia') : '',
    xpBoostMinutes > 0 ? `×2 XP · ${xpBoostMinutes} ${L('мин', 'хв', 'min', 'min', 'min', 'phút', 'mnt', 'dk', 'min')}` : '',
    streakShield ? L('Щит', 'Щит', 'Shield', 'Escudo', 'Escudo', 'Khiên', 'Perisai', 'Kalkan', 'Tarcza') : '',
    aura ? L('Аура', 'Аура', 'Aura', 'Aura', 'Aura', 'Hào quang', 'Aura', 'Aura', 'Aura') : '',
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
              {flameImageFailed ? (
                <Ionicons name="flame" size={48} color={isGold ? t.gold : t.accent} />
              ) : (
                <ExpoImage
                  testID="friends-chest-modal-flame"
                  source={flameAsset}
                  style={styles.flame}
                  contentFit="contain"
                  transition={0}
                  cachePolicy="memory-disk"
                  onError={() => setFailedFlameAssetKey(flameAssetKey)}
                />
              )}
            </Reanimated.View>
          </View>
          <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>{title}</Text>
          {primaryRewards ? (
            <Text testID="friends-chest-reward" style={[styles.reward, { color: t.textPrimary, fontSize: f.h2 }]}>{primaryRewards}</Text>
          ) : null}
          {bonusRewards ? (
            <Text testID="friends-chest-reward-bonus" style={[styles.bonus, { color: t.textMuted, fontSize: f.body }]}>{bonusRewards}</Text>
          ) : null}
          <View style={styles.rewardsTail} />
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
  flame: { width: 68, height: 68 },
  title: { fontWeight: '700', textAlign: 'center', marginTop: 4 },
  reward: { fontWeight: '800', textAlign: 'center', marginTop: 16 },
  bonus: { fontWeight: '600', textAlign: 'center', marginTop: 8 },
  // зачем: воздух перед кнопкой держит последний текстовый блок, а не сама
  // кнопка — иначе при пустой второй строке (тир I без бонусов) отступ уплыл бы.
  rewardsTail: { height: 24 },
  ctaBtn: { width: '100%', minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontWeight: '700', fontSize: 16 },
});
