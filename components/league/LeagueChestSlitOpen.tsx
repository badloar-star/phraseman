// ─── ГИБРИД «Световод + Чекан»: Сундук лиги — щель света ────────────────────
// зачем: макет-эталон .motion-mockups/phraseman-hybrid.html, сцена L4 «Сундук ·
// щель света». Перенесено ВТОЧНОСТИ: тьма + силуэт сундука → щель раскрывается
// ПОПЕРЁК него (scaleX 340 out → scaleY раскрытие) → награды вылетают из щели
// по одной и складываются веером (пружина .8/15/130, rotate ±8°) → корона
// ЛЕТИТ на аватар в углу и садится ударом (squash героя + отдача поверхности,
// закон №1 «удар только у героя кульминации»). Подключается ТОЛЬКО через
// LeagueChestOpenModal.motionVariant='hybrid' — боевой путь не тронут.
import React, { memo, useEffect, useRef } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';
import { triLang, type Lang } from '../../constants/i18n';
import type { LeagueChestRewardDrop, LeagueChestRewardRarity } from '../../app/services/league_chest_rewards';
import { isActiveLeagueChestReward } from '../../app/services/league_chest_rewards';
import { hapticSuccess, hapticTap } from '../../hooks/use-haptics';
import DuoPressable from '../DuoPressable';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { soundDirector } from '../../modules/audio/sound_director';
import { noAndroidOutline } from '../../constants/androidGlow';
import { CHK } from '../../constants/motionHybrid';
import LeagueCrownName from '../LeagueCrownName';
import { useTheme } from '../ThemeContext';
import type { RewardCard, RewardIconRenderer } from './leagueChestRewardCard';

const LEAGUE_CROWN_ICON = require('../../assets/images/league/league_crown.webp');

type Props = {
  visible: boolean;
  lang: Lang;
  crownName?: string;
  isCrownWinner?: boolean;
  rewards?: LeagueChestRewardDrop[];
  /** Форматирует дроп в отображаемую карточку — тот же формат, что классика (formatReward). */
  formatReward: (drop: LeagueChestRewardDrop) => RewardCard;
  /** Рендерит иконку карточки — переиспользует RewardIcon классики (аватары/ауры/картинки). */
  renderRewardIcon: RewardIconRenderer;
  onClose: () => void;
};

const RARITY_RIM: Record<LeagueChestRewardRarity, string> = {
  common: '#7F8793',
  rare: '#4AA3E2',
  epic: '#A06BE0',
  legendary: '#FFD43B',
};

const FAN_OFFSETS = [-14, 0, 14] as const;
const FAN_ROTATIONS = [-8, 0, 8] as const;

function eyebrowLabel(lang: Lang): string {
  return triLang(lang, { ru: 'Бонус лиги открыт', uk: 'Бонус ліги відкрито', en: 'League bonus unlocked', es: 'Bono de liga abierto', 'pt-BR': 'Bônus da liga aberto', vi: 'Đã mở thưởng giải đấu', id: 'Bonus liga terbuka', tr: 'Lig bonusu açıldı', pl: 'Bonus ligi otwarty' });
}

function crownTitle(lang: Lang): string {
  return triLang(lang, { ru: 'Ты взял корону', uk: 'Ти взяв корону', en: 'You took the crown', es: 'Tomaste la corona', 'pt-BR': 'Você pegou a coroa', vi: 'Bạn đã nhận vương miện', id: 'Kamu mengambil mahkota', tr: 'Tacını aldın', pl: 'Korona odebrana' });
}

function readyTitle(lang: Lang): string {
  return triLang(lang, { ru: 'Награды готовы', uk: 'Нагороди готові', en: 'Rewards ready', es: 'Recompensas listas', 'pt-BR': 'Recompensas prontas', vi: 'Phần thưởng đã sẵn sàng', id: 'Hadiah siap', tr: 'Ödüller hazır', pl: 'Nagrody gotowe' });
}

function claimAllLabel(lang: Lang): string {
  return triLang(lang, { ru: 'Забрать всё', uk: 'Забрати все', en: 'Claim all', es: 'Recoger todo', 'pt-BR': 'Resgatar tudo', vi: 'Nhận tất cả', id: 'Ambil semua', tr: 'Hepsini al', pl: 'Odbierz wszystko' });
}

function closeLabel(lang: Lang): string {
  return triLang(lang, { ru: 'Закрыть окно сундука', uk: 'Закрити вікно скрині', en: 'Close the chest window', es: 'Cerrar ventana del cofre', 'pt-BR': 'Fechar janela do baú', vi: 'Đóng cửa sổ rương', id: 'Tutup jendela peti', tr: 'Sandık penceresini kapat', pl: 'Zamknij okno skrzyni' });
}

function RewardFanCard({
  drop,
  card,
  offset,
  rotation,
  delayMs,
  reduceMotion,
  renderRewardIcon,
  cardBg,
}: {
  drop: LeagueChestRewardDrop;
  card: RewardCard;
  offset: number;
  rotation: number;
  delayMs: number;
  reduceMotion: boolean;
  renderRewardIcon: RewardIconRenderer;
  cardBg: string;
}) {
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const translateY = useSharedValue(reduceMotion ? offset : 40);
  const scale = useSharedValue(reduceMotion ? 1 : 0.6);
  const rotate = useSharedValue(reduceMotion ? rotation : 0);

  useEffect(() => {
    if (reduceMotion) return;
    opacity.value = 0;
    translateY.value = 40;
    scale.value = 0.6;
    rotate.value = 0;
    opacity.value = withDelay(delayMs, withTiming(1, { duration: 160, easing: Easing.linear }));
    translateY.value = withDelay(delayMs, withSpring(offset, { mass: 0.8, damping: 15, stiffness: 130 }));
    scale.value = withDelay(delayMs, withSpring(1, { mass: 0.8, damping: 15, stiffness: 130 }));
    rotate.value = withDelay(delayMs + 90, withTiming(rotation, { duration: 420, easing: Easing.out(Easing.cubic) }));
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(translateY);
      cancelAnimation(scale);
      cancelAnimation(rotate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion, delayMs, offset, rotation]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.fanCard, { backgroundColor: cardBg }, style]}>
      {renderRewardIcon(card, drop)}
      <View style={styles.fanCardText}>
        <Text style={[styles.fanCardTitle, { color: card.accent }]} numberOfLines={1}>{card.title}</Text>
        {card.subtitle ? (
          <Text style={styles.fanCardSubtitle} numberOfLines={1}>{card.subtitle}</Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

function LeagueChestSlitOpen({
  visible,
  lang,
  crownName,
  isCrownWinner = false,
  rewards,
  formatReward,
  renderRewardIcon,
  onClose,
}: Props) {
  const { theme: t, f } = useTheme();
  const reduceMotion = useReduceMotion();

  const sceneOpacity = useSharedValue(0);
  const chestOpacity = useSharedValue(0.5);
  const slitOpacity = useSharedValue(0);
  const slitScaleX = useSharedValue(0);
  const slitScaleY = useSharedValue(1);
  const titleOpacity = useSharedValue(0);
  const avatarCrownOpacity = useSharedValue(0);
  const avatarCrownX = useSharedValue(-70);
  const avatarCrownY = useSharedValue(140);
  const avatarCrownScale = useSharedValue(2);
  const avatarNudgeY = useSharedValue(0);
  const ctaOpacity = useSharedValue(0);
  const ctaY = useSharedValue(10);

  const visibleRewards = React.useMemo(
    () => (Array.isArray(rewards) ? rewards : []).filter(isActiveLeagueChestReward).slice(0, 3),
    [rewards],
  );
  const rewardCards = React.useMemo(
    () => visibleRewards.map((drop) => ({ drop, card: formatReward(drop) })),
    [visibleRewards, formatReward],
  );

  const crownDoneRef = useRef(false);

  useEffect(() => {
    if (!visible) return;
    crownDoneRef.current = false;

    if (reduceMotion) {
      // зачем: закон Motion DNA — Reduce Motion = один финальный кадр, без веера/полёта короны.
      sceneOpacity.value = 1;
      chestOpacity.value = 0.85;
      slitOpacity.value = 1;
      slitScaleX.value = 1;
      slitScaleY.value = 3.4;
      titleOpacity.value = 1;
      if (isCrownWinner) {
        avatarCrownOpacity.value = 1;
        avatarCrownX.value = 0;
        avatarCrownY.value = 0;
        avatarCrownScale.value = 1;
      }
      ctaOpacity.value = 1;
      ctaY.value = 0;
      return;
    }

    sceneOpacity.value = 0;
    chestOpacity.value = 0.5;
    slitOpacity.value = 0;
    slitScaleX.value = 0;
    slitScaleY.value = 1;
    titleOpacity.value = 0;
    avatarCrownOpacity.value = 0;
    avatarCrownX.value = -70;
    avatarCrownY.value = 140;
    avatarCrownScale.value = 2;
    avatarNudgeY.value = 0;
    ctaOpacity.value = 0;
    ctaY.value = 10;

    sceneOpacity.value = withTiming(1, { duration: 340, easing: Easing.out(Easing.cubic) });
    titleOpacity.value = withDelay(200, withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }));

    slitOpacity.value = withDelay(600, withTiming(1, { duration: 120, easing: Easing.linear }));
    slitScaleX.value = withDelay(600, withTiming(1, { duration: 340, easing: Easing.out(Easing.cubic) }));
    slitScaleY.value = withDelay(940, withTiming(3.4, { duration: 300, easing: Easing.out(Easing.cubic) }));
    chestOpacity.value = withDelay(700, withTiming(0.85, { duration: 500, easing: Easing.out(Easing.cubic) }));

    if (isCrownWinner) {
      const crownDelay = 2700;
      avatarCrownOpacity.value = withDelay(crownDelay, withTiming(1, { duration: 140, easing: Easing.linear }));
      avatarCrownX.value = withDelay(crownDelay, withTiming(0, { duration: 620, easing: Easing.bezier(0.3, 0, 0.2, 1) }));
      avatarCrownScale.value = withDelay(crownDelay, withTiming(1, { duration: 620, easing: Easing.bezier(0.3, 0, 0.2, 1) }));
      avatarCrownY.value = withDelay(
        crownDelay,
        withTiming(0, { duration: 620, easing: Easing.bezier(0.3, 0, 0.2, 1) }, (finished) => {
          'worklet';
          if (finished) {
            // Удар героя кульминации: squash короны + отдача поверхности аватара.
            avatarCrownScale.value = withSequence(
              withTiming(0.94, { duration: 60 }),
              withSpring(1, CHK.squash),
            );
            avatarNudgeY.value = withSequence(
              withTiming(CHK.recoilShiftPx, { duration: 40 }),
              withSpring(0, CHK.recoil),
            );
          }
        }),
      );
      const impactTimer = setTimeout(() => { void hapticSuccess(); }, crownDelay + 620);
      const soundTimer = setTimeout(() => {
        soundDirector.request('pm.reward.chest_open', { scope: 'league-chest-slit', dedupeKey: 'league-chest-slit' });
      }, 600);
      ctaOpacity.value = withDelay(3400, withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) }));
      ctaY.value = withDelay(3400, withSpring(0, { stiffness: 150, damping: 22, mass: 1 }));
      return () => {
        clearTimeout(impactTimer);
        clearTimeout(soundTimer);
        cancelAnimation(sceneOpacity);
        cancelAnimation(chestOpacity);
        cancelAnimation(slitOpacity);
        cancelAnimation(slitScaleX);
        cancelAnimation(slitScaleY);
        cancelAnimation(titleOpacity);
        cancelAnimation(avatarCrownOpacity);
        cancelAnimation(avatarCrownX);
        cancelAnimation(avatarCrownY);
        cancelAnimation(avatarCrownScale);
        cancelAnimation(avatarNudgeY);
        cancelAnimation(ctaOpacity);
        cancelAnimation(ctaY);
      };
    }

    const soundTimer = setTimeout(() => {
      soundDirector.request('pm.reward.chest_open', { scope: 'league-chest-slit', dedupeKey: 'league-chest-slit' });
    }, 600);
    ctaOpacity.value = withDelay(2700, withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) }));
    ctaY.value = withDelay(2700, withSpring(0, { stiffness: 150, damping: 22, mass: 1 }));

    return () => {
      clearTimeout(soundTimer);
      cancelAnimation(sceneOpacity);
      cancelAnimation(chestOpacity);
      cancelAnimation(slitOpacity);
      cancelAnimation(slitScaleX);
      cancelAnimation(slitScaleY);
      cancelAnimation(titleOpacity);
      cancelAnimation(ctaOpacity);
      cancelAnimation(ctaY);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reduceMotion, isCrownWinner]);

  const sceneStyle = useAnimatedStyle(() => ({ opacity: sceneOpacity.value }));
  const chestStyle = useAnimatedStyle(() => ({ opacity: chestOpacity.value }));
  const slitStyle = useAnimatedStyle(() => ({
    opacity: slitOpacity.value,
    transform: [{ scaleX: slitScaleX.value }, { scaleY: slitScaleY.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value }));
  const avatarCrownStyle = useAnimatedStyle(() => ({
    opacity: avatarCrownOpacity.value,
    transform: [
      { translateX: avatarCrownX.value },
      { translateY: avatarCrownY.value },
      { scale: avatarCrownScale.value },
    ],
  }));
  const avatarNudgeStyle = useAnimatedStyle(() => ({ transform: [{ translateY: avatarNudgeY.value }] }));
  const ctaStyle = useAnimatedStyle(() => ({ opacity: ctaOpacity.value, transform: [{ translateY: ctaY.value }] }));

  if (!visible) return null;

  const crownDisplayName = crownName || triLang(lang, { ru: 'лидер', uk: 'лідер', en: 'leader', es: 'líder', 'pt-BR': 'líder', vi: 'người dẫn đầu', id: 'pemimpin', tr: 'lider', pl: 'lider' });

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.scrim, sceneStyle]} />
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel={closeLabel(lang)}
          onPress={() => { void hapticTap(); onClose(); }}
        />

        <View style={styles.stage} pointerEvents="box-none">
          {/* Аватар владельца в углу — корона летит именно сюда (связь награды с профилем). */}
          <Animated.View style={[styles.avatarSlot, avatarNudgeStyle]} pointerEvents="none">
            <View style={[styles.avatarBadge, { backgroundColor: t.accent }]}>
              <Text style={styles.avatarInitial}>{crownDisplayName.slice(0, 1).toUpperCase()}</Text>
            </View>
            {isCrownWinner ? (
              <Animated.View style={[styles.avatarCrown, avatarCrownStyle]}>
                <Image source={LEAGUE_CROWN_ICON} contentFit="contain" style={styles.avatarCrownImage} accessible={false} />
              </Animated.View>
            ) : null}
          </Animated.View>

          <Animated.View style={titleStyle}>
            <Text style={[styles.eyebrow, { color: t.gold }]}>{eyebrowLabel(lang)}</Text>
            <Text style={[styles.title, { color: t.textPrimary, fontSize: Math.max(20, f.h2) }]}>
              {isCrownWinner ? crownTitle(lang) : readyTitle(lang)}
            </Text>
            <View style={styles.crownNameRow}>
              <LeagueCrownName text={crownDisplayName} fontSize={Math.max(14, f.body)} />
            </View>
          </Animated.View>

          {/* Сундук-силуэт в темноте + щель света, раскрывающаяся поперёк него.
              зачем: владелец забраковал первую версию — «жёлтая полоса на плоском
              фоне (дёшево)». Макет требует затухающий по краям градиент (.sl-slit:
              transparent→кремовый→белое ядро→кремовый→transparent) плюс отдельный
              слой глоу под ним — щель светится, а не просто закрашена цветом. */}
          <View style={styles.chestZone}>
            <Animated.View style={[styles.chestSilhouette, chestStyle]}>
              <Ionicons name="cube" size={64} color="#2A2208" />
            </Animated.View>
            <Animated.View pointerEvents="none" style={[styles.slitGlow, { backgroundColor: t.gold }, slitStyle]} />
            <Animated.View pointerEvents="none" style={[styles.slit, slitStyle]}>
              <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                <Defs>
                  <SvgLinearGradient id="chestSlitBeam" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor={t.gold} stopOpacity="0" />
                    <Stop offset="0.28" stopColor="#FFF6D8" stopOpacity="0.9" />
                    <Stop offset="0.5" stopColor="#FFFDF3" stopOpacity="1" />
                    <Stop offset="0.72" stopColor="#FFF6D8" stopOpacity="0.9" />
                    <Stop offset="1" stopColor={t.gold} stopOpacity="0" />
                  </SvgLinearGradient>
                </Defs>
                <Rect x="0" y="0" width="100%" height="100%" fill="url(#chestSlitBeam)" />
              </Svg>
            </Animated.View>
          </View>

          <ScrollView decelerationRate="fast"
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.fanRow}
            style={styles.fanScroll}
          >
            {rewardCards.map(({ drop, card }, index) => (
              <RewardFanCard
                key={`${drop.id}:${drop.kind}`}
                drop={drop}
                card={card}
                offset={FAN_OFFSETS[index] ?? 0}
                rotation={FAN_ROTATIONS[index] ?? 0}
                delayMs={1100 + index * 500}
                reduceMotion={reduceMotion}
                renderRewardIcon={renderRewardIcon}
                cardBg={t.bgCard}
              />
            ))}
          </ScrollView>

          <Animated.View style={[styles.ctaWrap, ctaStyle]}>
            {/* зачем: главный CTA — золотая клавиша с кромкой, вдавливается по-настоящему */}
            <DuoPressable
              accessibilityLabel={claimAllLabel(lang)}
              onPress={onClose}
              edgeColor={t.bgSurface2}
              edgeHeight={6}
              style={[styles.ctaBtn, { backgroundColor: t.gold }, noAndroidOutline]}
            >
              <Text style={[styles.ctaText, { color: t.textOnGold }]}>{claimAllLabel(lang)}</Text>
            </DuoPressable>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

export default memo(LeagueChestSlitOpen);

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrim: { backgroundColor: 'rgba(2,2,1,0.88)' },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  avatarSlot: {
    position: 'absolute',
    top: 46,
    right: 16,
    width: 40,
    height: 40,
  },
  avatarBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  avatarCrown: {
    position: 'absolute',
    top: -16,
    left: '50%',
    marginLeft: -12,
    width: 24,
    height: 24,
  },
  avatarCrownImage: { width: 24, height: 24 },
  eyebrow: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
  title: {
    marginTop: 8,
    fontWeight: '900',
    textAlign: 'center',
  },
  crownNameRow: {
    marginTop: 6,
    alignItems: 'center',
  },
  chestZone: {
    marginTop: 26,
    width: 140,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chestSilhouette: {
    width: 96,
    height: 77,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slit: {
    position: 'absolute',
    left: '18%',
    right: '18%',
    height: 3,
    overflow: 'visible',
  },
  slitGlow: {
    position: 'absolute',
    left: '24%',
    right: '24%',
    height: 3,
    borderRadius: 2,
    opacity: 0.55,
    shadowColor: '#F8D982',
    shadowOpacity: 0.9,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  fanScroll: {
    marginTop: 22,
    alignSelf: 'stretch',
  },
  fanRow: {
    paddingHorizontal: 16,
    gap: 10,
    justifyContent: 'center',
    flexGrow: 1,
  },
  fanCard: {
    width: 150,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  fanCardText: {
    flexShrink: 1,
  },
  fanCardTitle: {
    fontSize: 12.5,
    fontWeight: '900',
  },
  fanCardSubtitle: {
    marginTop: 2,
    fontSize: 10.5,
    fontWeight: '700',
    opacity: 0.7,
  },
  ctaWrap: {
    marginTop: 22,
    width: '100%',
    maxWidth: 340,
  },
  ctaBtn: {
    minHeight: 52,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '900',
  },
});
