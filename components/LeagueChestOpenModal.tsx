import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import { LinearGradient } from './SafeLinearGradient';
import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { isActiveLeagueChestReward, type LeagueChestRewardDrop } from '../app/services/league_chest_rewards';
import { getAvatarAuraById } from '../constants/avatar_auras';
import {
  CUSTOM_AVATAR_GRADIENTS,
  CUSTOM_AVATARS,
  customAvatarGiftLabelForLang,
  customAvatarGradientNameForLang,
  customAvatarNameForLang,
  getCustomAvatarById,
  getCustomAvatarGradientById,
  type CustomAvatarDef,
  type CustomAvatarGradient,
  type CustomAvatarLogoColor,
} from '../constants/custom_avatars';
import { triLang, type Lang } from '../constants/i18n';
import { getLeagueBonusPalette } from '../constants/leagueBonusPalette';
import type { ThemeMode } from '../constants/theme';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { oskolokImageForPackShards } from '../app/oskolok';
import { spinTicketImageSource } from '../app/spin_ticket_asset';
import AvatarAura from './AvatarAura';
import CustomAvatarBadge from './CustomAvatarBadge';
import LeagueCrownName from './LeagueCrownName';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import LeagueChestSlitOpen from './league/LeagueChestSlitOpen';
import type { RewardCard } from './league/leagueChestRewardCard';
import RetiredRasterFallback from './feedback/RetiredRasterFallback';

import { noAndroidOutline } from '../constants/androidGlow';
type Props = {
  visible: boolean;
  crownName?: string;
  isCrownWinner?: boolean;
  rewards?: LeagueChestRewardDrop[];
  onClose: () => void;
  /**
   * зачем: гибрид «Световод + Чекан» (макет .motion-mockups/phraseman-hybrid.html,
   * сцена «Сундук · щель света») живёт РЯДОМ со старой версией под флагом.
   * Боевой дефолт — 'classic', ничего не меняется без явного включения.
   */
  motionVariant?: 'classic' | 'hybrid';
};

const LEAGUE_CROWN_ICON = require('../assets/images/league/league_crown.webp');
const FALLBACK_CUSTOM_AVATAR_ID = 'custom-gen-04';
const FALLBACK_CUSTOM_GRADIENT_ID = 'noirgold';
const FALLBACK_CUSTOM_LOGO_COLOR: CustomAvatarLogoColor = 'black';
const REWARD_IMAGE_ICON_SIZE = 64;
const REWARD_COSMETIC_ICON_SIZE = 58;

function rewardAmount(drop: LeagueChestRewardDrop): number {
  return Math.max(0, Math.floor(Number(drop.amount) || 0));
}

function slavicPlural(count: number, one: string, few: string, many: string): string {
  const normalized = Math.abs(Math.floor(count));
  const mod10 = normalized % 10;
  const mod100 = normalized % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

function shardsTitle(amount: number, lang: Lang): string {
  if (lang === 'es') return `+${amount} perlas`;
  if (lang === 'uk') return `+${amount} ${slavicPlural(amount, 'перлина', 'перлини', 'перлин')}`;
  return `+${amount} ${slavicPlural(amount, 'жемчужина', 'жемчужины', 'жемчужин')}`;
}

/**
 * зачем (владелец, 2026-08-26): награда сундука — спин общей рулетки вместо
 * фиктивной жемчужины. Русский и украинский требуют склонения («1 спин»,
 * «2 спина», «5 спинов»), поэтому идём через тот же slavicPlural.
 */
function spinTitle(amount: number, lang: Lang): string {
  return `+${amount} ${triLang(lang, {
    ru: slavicPlural(amount, 'спин', 'спина', 'спинов'),
    uk: slavicPlural(amount, 'спін', 'спіни', 'спінів'),
    en: amount === 1 ? 'spin' : 'spins',
    es: amount === 1 ? 'giro' : 'giros',
    'pt-BR': amount === 1 ? 'giro' : 'giros',
    vi: 'lượt quay',
    id: 'putaran',
    tr: 'çevirme',
    pl: slavicPlural(amount, 'spin', 'spiny', 'spinów'),
  })}`;
}

function formatMinutes(ms?: number): number {
  return Math.max(1, Math.round(Math.max(60_000, Number(ms) || 5 * 60 * 1000) / 60_000));
}

function resolveCustomAvatarReward(drop: LeagueChestRewardDrop): {
  avatar: CustomAvatarDef;
  gradient: CustomAvatarGradient;
  logoColor: CustomAvatarLogoColor;
} {
  const avatar = getCustomAvatarById(String(drop.customAvatarId ?? '').trim())
    ?? getCustomAvatarById(FALLBACK_CUSTOM_AVATAR_ID)
    ?? CUSTOM_AVATARS[0]!;
  const gradient = getCustomAvatarGradientById(String(drop.gradientId ?? '').trim())
    ?? getCustomAvatarGradientById(FALLBACK_CUSTOM_GRADIENT_ID)
    ?? CUSTOM_AVATAR_GRADIENTS[0]!;
  const logoColor: CustomAvatarLogoColor = drop.logoColor === 'white' ? 'white' : FALLBACK_CUSTOM_LOGO_COLOR;
  return { avatar, gradient, logoColor };
}

type RewardLocale = Lang | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';

function auraNameForLang(aura: NonNullable<ReturnType<typeof getAvatarAuraById>>, lang: RewardLocale): string {
  if (lang === 'uk') return aura.nameUk;
  if (lang === 'es') return aura.nameEs;
  return aura.nameRu;
}

function cosmeticPreviewAvatar(): {
  avatarId: string;
  gradientId: string;
  logoColor: CustomAvatarLogoColor;
} {
  const avatar = getCustomAvatarById(FALLBACK_CUSTOM_AVATAR_ID) ?? CUSTOM_AVATARS[0]!;
  const gradient = getCustomAvatarGradientById(FALLBACK_CUSTOM_GRADIENT_ID) ?? CUSTOM_AVATAR_GRADIENTS[0]!;
  return { avatarId: avatar.id, gradientId: gradient.id, logoColor: FALLBACK_CUSTOM_LOGO_COLOR };
}

function formatReward(drop: LeagueChestRewardDrop, lang: Lang, themeMode: ThemeMode): RewardCard {
  if (drop.kind === 'energy_fast_recovery') {
    const minutes = formatMinutes(drop.recoveryMs);
    return {
      title: triLang(lang, { ru: 'Энергия', uk: 'Енергія', en: 'Energy', es: 'Energía', 'pt-BR': 'Energia', vi: 'Năng lượng', id: 'Energi', tr: 'Enerji', pl: 'Energia' }),
      subtitle: triLang(lang, { ru: `${minutes} мин быстрее`, uk: `${minutes} хв швидше`, en: `${minutes} min faster`, es: `${minutes} min rápido`, 'pt-BR': `${minutes} min mais rápido`, vi: `${minutes} phút nhanh hơn`, id: `${minutes} menit lebih cepat`, tr: `${minutes} dk daha hızlı`, pl: `${minutes} min szybciej` }),
      accent: '#7BE7C8',
      icon: { type: 'fallback', kind: 'gift' },
    };
  }

  if (drop.kind === 'streak_shield') {
    return {
      title: triLang(lang, { ru: 'Щит серии', uk: 'Щит серії', en: 'Streak shield', es: 'Escudo', 'pt-BR': 'Escudo de sequência', vi: 'Khiên chuỗi', id: 'Perisai streak', tr: 'Seri kalkanı', pl: 'Tarcza serii' }),
      subtitle: `+${rewardAmount(drop) || 1}`,
      accent: '#A7F3D0',
      icon: { type: 'fallback', kind: 'gift' },
    };
  }

  if (drop.kind === 'pack_trial_48h') {
    return {
      title: triLang(lang, { ru: 'Пак фраз', uk: 'Пак фраз', en: 'Phrase pack', es: 'Pack', 'pt-BR': 'Pacote de frases', vi: 'Gói cụm từ', id: 'Paket frasa', tr: 'İfade paketi', pl: 'Pakiet fraz' }),
      subtitle: triLang(lang, { ru: '48 часов', uk: '48 годин', en: '48 hours', es: '48 horas', 'pt-BR': '48 horas', vi: '48 giờ', id: '48 jam', tr: '48 saat', pl: '48 godzin' }),
      accent: '#BFA5FF',
      icon: { type: 'fallback', kind: 'gift' },
    };
  }

  if (drop.kind === 'avatar_aura') {
    const aura = getAvatarAuraById(drop.auraId) ?? getAvatarAuraById('aura-ember')!;
    const preview = cosmeticPreviewAvatar();
    return {
      title: triLang(lang, {
        ru: `Аура «${auraNameForLang(aura, lang)}»`,
        uk: `Аура «${auraNameForLang(aura, lang)}»`,
        en: `Aura "${auraNameForLang(aura, 'en')}"`,
        es: `Aura «${auraNameForLang(aura, lang)}»`,
        'pt-BR': `Aura «${auraNameForLang(aura, 'pt-BR')}»`,
        vi: `Hào quang «${auraNameForLang(aura, 'vi')}»`,
        id: `Aura «${auraNameForLang(aura, 'id')}»`,
        tr: `Aura «${auraNameForLang(aura, 'tr')}»`,
        pl: `Aura «${auraNameForLang(aura, 'pl')}»`,
      }),
      subtitle: triLang(lang, { ru: 'Для аватара', uk: 'Для аватара', en: 'For avatar', es: 'Para avatar', 'pt-BR': 'Para avatar', vi: 'Cho avatar', id: 'Untuk avatar', tr: 'Avatar için', pl: 'Dla awatara' }),
      accent: '#F8D982',
      icon: { type: 'aura', auraId: aura.id, ...preview },
    };
  }

  if (drop.kind === 'custom_avatar') {
    const { avatar, gradient, logoColor } = resolveCustomAvatarReward(drop);
    return {
      title: customAvatarNameForLang(avatar, lang) || customAvatarGiftLabelForLang(avatar, gradient, lang),
      subtitle: customAvatarGradientNameForLang(gradient, lang),
      accent: '#F2C56E',
      icon: { type: 'avatar', avatarId: avatar.id, gradientId: gradient.id, logoColor },
    };
  }

  if (drop.kind === 'gold_theme') {
    return {
      title: triLang(lang, { ru: 'Тема «Золото»', uk: 'Тема «Золото»', en: 'Gold theme', es: 'Tema Oro', 'pt-BR': 'Tema «Ouro»', vi: 'Chủ đề «Vàng»', id: 'Tema «Emas»', tr: '«Altın» teması', pl: 'Motyw «Złoto»' }),
      subtitle: triLang(lang, { ru: 'Золотая карточка', uk: 'Золота картка', en: 'Gold card', es: 'Tarjeta dorada', 'pt-BR': 'Cartão dourado', vi: 'Thẻ vàng', id: 'Kartu emas', tr: 'Altın kart', pl: 'Złota karta' }),
      accent: '#F8D982',
      icon: { type: 'fallback', kind: 'league' },
    };
  }

  switch (drop.kind) {
    case 'shards':
      return {
        title: shardsTitle(rewardAmount(drop), lang),
        // зачем: RU-интерфейс называет валюту «жемчужины» (constants/shard_plurals.ts),
        // украинское «Перлины» протекало в русский сундук лиги.
        subtitle: triLang(lang, { ru: 'Жемчужины', uk: 'Перлини', en: 'Pearls', es: 'Perlas', 'pt-BR': 'Pérolas', vi: 'Ngọc trai', id: 'Mutiara', tr: 'İnci', pl: 'Perły' }),
        accent: '#9FDBFF',
        icon: { type: 'image', source: oskolokImageForPackShards(rewardAmount(drop), themeMode), scale: 'large' },
      };
    // зачем (владелец, 2026-08-26): здесь стоял `rewardAmount(drop) || 25` —
    // сервер присылал amount=0, а модалка дорисовывала «+25 жемчужин», которых
    // никто не получал. Ровно тот баг, о котором сообщил владелец. Награда
    // заменена на спин, а фиктивный фолбэк убран: показываем то, что выдано.
    case 'spin_credit':
    case 'gold_theme_duplicate':
      return {
        title: spinTitle(Math.max(1, rewardAmount(drop) || 1), lang),
        subtitle: triLang(lang, { ru: 'Крутить рулетку', uk: 'Крутити рулетку', en: 'Spin the wheel', es: 'Girar la ruleta', 'pt-BR': 'Girar a roleta', vi: 'Quay vòng quay', id: 'Putar roda', tr: 'Çarkı çevir', pl: 'Zakręć kołem' }),
        accent: '#F8D982',
        // зачем (владелец, 2026-08-26): у спина появился свой узнаваемый значок,
        // один и тот же во всех местах. Пока файл не сгенерирован, источник
        // резолвится в null и карточка честно откатывается на прежний подарок.
        icon: spinTicketImageSource()
          ? { type: 'image', source: spinTicketImageSource()!, scale: 'large' }
          : { type: 'fallback', kind: 'gift' },
      };
    case 'xp_boost':
      return {
        title: `x${Math.max(2, Number(drop.multiplier) || 2)} XP`,
        subtitle: triLang(lang, { ru: 'Бонус опыта', uk: 'Бонус досвіду', en: 'XP bonus', es: 'Bono de XP', 'pt-BR': 'Bônus de XP', vi: 'Thưởng XP', id: 'Bonus XP', tr: 'XP bonusu', pl: 'Bonus XP' }),
        accent: '#F7D774',
        icon: { type: 'fallback', kind: 'gift' },
      };
  }

  // Запасной вариант для будущих видов.
  return {
    title: triLang(lang, { ru: 'Награда', uk: 'Нагорода', en: 'Reward', es: 'Recompensa', 'pt-BR': 'Recompensa', vi: 'Phần thưởng', id: 'Hadiah', tr: 'Ödül', pl: 'Nagroda' }),
    accent: '#9FDBFF',
    icon: { type: 'fallback', kind: 'gift' },
  };
}

function RewardIcon({ card }: { card: RewardCard; drop: LeagueChestRewardDrop }) {
  const icon = card.icon;

  if (icon.type === 'avatar') {
    return (
      <View style={styles.rewardIconSlot}>
        <CustomAvatarBadge
          avatarId={icon.avatarId}
          gradientId={icon.gradientId}
          logoColor={icon.logoColor}
          size={REWARD_COSMETIC_ICON_SIZE}
        />
      </View>
    );
  }

  if (icon.type === 'aura') {
    return (
      <View style={styles.rewardIconSlot}>
        <AvatarAura auraId={icon.auraId} size={50}>
          <CustomAvatarBadge
            avatarId={icon.avatarId}
            gradientId={icon.gradientId}
            logoColor={icon.logoColor}
            size={50}
          />
        </AvatarAura>
      </View>
    );
  }

  if (icon.type === 'fallback') {
    return (
      <View style={styles.rewardIconSlot}>
        <RetiredRasterFallback kind={icon.kind} size={REWARD_IMAGE_ICON_SIZE} color={card.accent} />
      </View>
    );
  }

  return (
    <View style={styles.rewardIconSlot}>
      <Image
        source={icon.source}
        contentFit="contain"
        style={[
          styles.rewardIconImage,
          icon.scale === 'large' ? styles.rewardIconImageLarge : null,
        ]}
      />
    </View>
  );
}

function LeagueChestOpenModal({
  visible,
  crownName,
  isCrownWinner = false,
  rewards,
  onClose,
  motionVariant = 'classic',
}: Props) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const scale = useRef(new Animated.Value(0.72)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const crownFloat = useRef(new Animated.Value(0)).current;
  const shine = useRef(new Animated.Value(0)).current;

  // зачем: цикл «блика» — только у классики; в гибриде своя хореография
  // живёт в LeagueChestSlitOpen, запускать оба параллельно бессмысленно.
  const isClassic = motionVariant === 'classic';

  const visibleRewards = useMemo(
    () => (Array.isArray(rewards) ? rewards : []).filter(isActiveLeagueChestReward),
    [rewards],
  );
  const rewardCards = useMemo(() => visibleRewards.map((drop) => ({ drop, card: formatReward(drop, lang, themeMode) })), [visibleRewards, lang, themeMode]);
  const hasAvatarCosmetic = visibleRewards.some((drop) => drop.kind === 'avatar_aura' || drop.kind === 'custom_avatar');
  const modalTheme = getLeagueBonusPalette(t, themeMode).modal;

  useEffect(() => {
    if (!visible || !isClassic) return;
    hapticSuccess();
    scale.setValue(0.72);
    opacity.setValue(0);
    crownFloat.setValue(0);
    shine.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 7, tension: 110, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(crownFloat, { toValue: -8, duration: 1000, useNativeDriver: true }),
        Animated.timing(crownFloat, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ]),
    );
    const shineLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shine, { toValue: 1, duration: 2600, useNativeDriver: true }),
        Animated.timing(shine, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(800),
      ]),
      { iterations: 3 },
    );
    floatLoop.start();
    shineLoop.start();
    return () => {
      floatLoop.stop();
      shineLoop.stop();
    };
  }, [visible, isClassic, crownFloat, opacity, scale, shine]);

  if (!visible) return null;

  if (motionVariant === 'hybrid') {
    return (
      <LeagueChestSlitOpen
        visible={visible}
        lang={lang}
        crownName={crownName}
        isCrownWinner={isCrownWinner}
        rewards={rewards}
        formatReward={(drop) => formatReward(drop, lang, themeMode)}
        renderRewardIcon={(card, drop) => <RewardIcon card={card} drop={drop} />}
        onClose={onClose}
      />
    );
  }

  const dim = modalTheme.overlay;
  const crownDisplayName = crownName || triLang(lang, { ru: 'лидер', uk: 'лідер', en: 'leader', es: 'líder', 'pt-BR': 'líder', vi: 'người dẫn đầu', id: 'pemimpin', tr: 'lider', pl: 'lider' });
  const giftCopy = isCrownWinner
    ? triLang(lang, {
      ru: 'Корона активна: она появится на твоей карточке, в лиге и рейтингах.',
      uk: 'Корона активна: вона зʼявиться на твоїй картці, у лізі й рейтингах.',
      en: 'Crown active: it’ll show up on your card, in the league, and in rankings.',
      es: 'Corona activa: aparecerá en tu tarjeta, liga y rankings.',
      'pt-BR': 'Coroa ativa: ela aparecerá no seu cartão, liga e rankings.',
      vi: 'Vương miện đang hoạt động: nó sẽ xuất hiện trên thẻ, giải đấu và bảng xếp hạng của bạn.',
      id: 'Mahkota aktif: akan muncul di kartu, liga, dan peringkatmu.',
      tr: 'Taç aktif: kartında, ligde ve sıralamalarda görünecek.',
      pl: 'Korona aktywna: pojawi się na twojej karcie, w lidze i rankingach.',
    })
    : hasAvatarCosmetic
      ? null
      : triLang(lang, {
        ru: 'Бонус собран. Награды выпадают отдельно для каждого игрока и сразу добавляются в профиль.',
        uk: 'Бонус зібрано. Нагороди випадають окремо для кожного гравця й одразу додаються до профілю.',
        en: 'Bonus collected. Rewards are calculated per player and added to your profile right away.',
        es: 'Bono recogido. Las recompensas se calculan por jugador y se añaden al perfil.',
        'pt-BR': 'Bônus coletado. As recompensas são calculadas por jogador e adicionadas ao perfil.',
        vi: 'Đã nhận thưởng. Phần thưởng được tính riêng cho từng người chơi và thêm vào hồ sơ.',
        id: 'Bonus terkumpul. Hadiah dihitung per pemain dan langsung ditambahkan ke profil.',
        tr: 'Bonus alındı. Ödüller her oyuncu için ayrı hesaplanır ve profile eklenir.',
        pl: 'Bonus odebrany. Nagrody są liczone osobno dla każdego gracza i trafiają do profilu.',
      });

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: dim }]}
          onPress={() => {
            hapticTap();
            onClose();
          }}
        />
        <View
          style={[
            styles.center,
            {
              paddingTop: Math.max(18, insets.top + 8),
              paddingBottom: Math.max(18, bottomInset + 8),
              paddingLeft: Math.max(18, insets.left + 8),
              paddingRight: Math.max(18, insets.right + 8),
            },
          ]}
          pointerEvents="box-none"
        >
          <Animated.View style={[styles.shell, { opacity, transform: [{ scale }] }]} pointerEvents="auto">
            <LinearGradient
              colors={modalTheme.frame}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.frame, { shadowColor: modalTheme.eyebrow }]}
            >
              <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: modalTheme.rewardBorder }]}>
                <LinearGradient
                  colors={modalTheme.card}
                  locations={modalTheme.cardLocations}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <LinearGradient
                  colors={modalTheme.wash}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View pointerEvents="none" style={[styles.topRail, { backgroundColor: modalTheme.rail }]} />
                <View pointerEvents="none" style={[styles.ribbon, { backgroundColor: modalTheme.ribbon }]} />
                <View pointerEvents="none" style={[styles.ribbonAlt, { backgroundColor: modalTheme.ribbonAlt }]} />
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.shine,
                    {
                      backgroundColor: modalTheme.shine,
                      opacity: shine.interpolate({ inputRange: [0, 1], outputRange: [0, 0.24] }),
                      transform: [
                        { translateX: shine.interpolate({ inputRange: [0, 1], outputRange: [-160, 180] }) },
                        { rotate: '18deg' },
                      ],
                    },
                  ]}
                />

                <ScrollView decelerationRate="fast"
                  bounces={false}
                  showsVerticalScrollIndicator={false}
                  style={styles.scroll}
                  contentContainerStyle={styles.scrollContent}
                >
                <Text style={[styles.eyebrow, { color: modalTheme.eyebrow }]} numberOfLines={1}>
                  {triLang(lang, { ru: 'Бонус лиги открыт', uk: 'Бонус ліги відкрито', en: 'League bonus opened', es: 'Bono de liga abierto', 'pt-BR': 'Bônus da liga aberto', vi: 'Đã mở thưởng giải đấu', id: 'Bonus liga terbuka', tr: 'Lig bonusu açıldı', pl: 'Bonus ligi otwarty' })}
                </Text>

                <Animated.View style={{ alignItems: 'center', transform: [{ translateY: crownFloat }] }}>
                  {/* зачем: без обводок — кольцо тоном (внешний слой цвета кромки, внутренний фон герба) */}
                  <View style={[styles.crownHalo, { backgroundColor: modalTheme.crestBorder }]}>
                  <View style={[styles.crownHaloInner, { backgroundColor: modalTheme.crestBg }]}>
                    {isCrownWinner ? (
                      <Image source={LEAGUE_CROWN_ICON} contentFit="contain" style={styles.crownImage} />
                    ) : (
                      <RetiredRasterFallback kind="league" size={96} color={modalTheme.eyebrow} />
                    )}
                  </View>
                  </View>
                </Animated.View>

                <Text style={[styles.title, { color: t.textPrimary, fontSize: Math.max(26, f.h1 + 2) }]}>
                  {isCrownWinner
                    ? triLang(lang, { ru: 'Ты взял корону', uk: 'Ти взяв корону', en: 'You took the crown', es: 'Tomaste la corona', 'pt-BR': 'Você pegou a coroa', vi: 'Bạn đã nhận vương miện', id: 'Kamu mengambil mahkota', tr: 'Tacını aldın', pl: 'Korona odebrana' })
                    : rewardCards.length > 0
                      ? triLang(lang, { ru: 'Награды готовы', uk: 'Нагороди готові', en: 'Rewards ready', es: 'Recompensas listas', 'pt-BR': 'Recompensas prontas', vi: 'Phần thưởng đã sẵn sàng', id: 'Hadiah siap', tr: 'Ödüller hazır', pl: 'Nagrody gotowe' })
                      : triLang(lang, { ru: 'Награды подгружаются…', uk: 'Нагороди завантажуються…', en: 'Loading rewards…', es: 'Cargando recompensas…', 'pt-BR': 'Carregando recompensas…', vi: 'Đang tải phần thưởng…', id: 'Memuat hadiah…', tr: 'Ödüller yükleniyor…', pl: 'Ładowanie nagród…' })}
                </Text>
                <View style={{ alignItems: 'center', maxWidth: '100%' }}>
                  <LeagueCrownName text={crownDisplayName} fontSize={Math.max(16, f.body)} />
                </View>
                {giftCopy ? (
                  <Text style={[styles.goldGiftCopy, { color: t.textSecond, fontSize: Math.max(13, f.caption) }]}>
                    {giftCopy}
                  </Text>
                ) : null}

                {rewardCards.length > 0 ? (
                  <View style={styles.rewardsGrid}>
                    {rewardCards.map(({ drop, card }) => (
                      <View key={`${drop.id}:${drop.kind}`} style={[styles.reward, { backgroundColor: modalTheme.rewardBg, borderColor: modalTheme.rewardBorder }]}>
                        <RewardIcon card={card} drop={drop} />
                        <Text
                          style={[styles.rewardTitle, { color: t.textPrimary }]}
                        >
                          {card.title}
                        </Text>
                        {card.subtitle ? (
                          <Text
                            style={[styles.rewardSubtitle, { color: card.accent }]}
                          >
                            {card.subtitle}
                          </Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={[styles.rewardsLoading, { color: t.textSecond, fontSize: Math.max(13, f.caption) }]}>
                    {triLang(lang, { ru: 'Награды подгружаются…', uk: 'Нагороди завантажуються…', en: 'Loading rewards…', es: 'Cargando recompensas…', 'pt-BR': 'Carregando recompensas…', vi: 'Đang tải phần thưởng…', id: 'Memuat hadiah…', tr: 'Ödüller yükleniyor…', pl: 'Ładowanie nagród…' })}
                  </Text>
                )}

                <View style={styles.actions}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => {
                      hapticTap();
                      onClose();
                    }}
                    style={styles.primaryBtn}
                  >
                    <LinearGradient colors={modalTheme.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                    <Text style={[styles.primaryText, { color: modalTheme.primaryText }]}>
                      {rewardCards.length > 0
                        ? triLang(lang, { ru: 'Забрать', uk: 'Забрати', en: 'Claim', es: 'Recoger', 'pt-BR': 'Resgatar', vi: 'Nhận', id: 'Klaim', tr: 'Al', pl: 'Odbierz' })
                        : triLang(lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' })}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      hapticTap();
                      onClose();
                    }}
                    style={styles.laterBtn}
                  >
                    <Text style={[styles.laterText, { color: t.textMuted }]}>{triLang(lang, { ru: 'Позже', uk: 'Пізніше', en: 'Later', es: 'Más tarde', 'pt-BR': 'Mais tarde', vi: 'Để sau', id: 'Nanti', tr: 'Daha sonra', pl: 'Później' })}</Text>
                  </TouchableOpacity>
                </View>
                </ScrollView>
              </View>
            </LinearGradient>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

export default memo(LeagueChestOpenModal);

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  shell: { width: '100%', maxWidth: 378, maxHeight: '100%' },
  frame: {
    borderRadius: 24,
    padding: 2,
    maxHeight: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.32,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    ...noAndroidOutline,
  },
  card: {
    borderRadius: 22,
    borderWidth: 0,
    overflow: 'hidden',
    maxHeight: '100%',
  },
  scroll: {
    width: '100%',
  },
  scrollContent: {
    padding: 18,
    alignItems: 'center',
    paddingBottom: 22,
  },
  topRail: {
    position: 'absolute',
    top: 0,
    left: 22,
    right: 22,
    height: 1,
  },
  ribbon: {
    position: 'absolute',
    top: 24,
    right: -70,
    width: 218,
    height: 38,
    transform: [{ rotate: '-22deg' }],
  },
  ribbonAlt: {
    position: 'absolute',
    bottom: -20,
    left: -58,
    width: 224,
    height: 44,
    transform: [{ rotate: '-18deg' }],
  },
  shine: {
    position: 'absolute',
    top: -40,
    bottom: -40,
    width: 90,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  crownHalo: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  crownHaloInner: {
    width: 148,
    height: 148,
    borderRadius: 74,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crownImage: {
    width: 92,
    height: 92,
  },
  leagueGiftImage: {
    width: 172,
    height: 172,
  },
  title: {
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  goldGiftCopy: {
    textAlign: 'center',
    lineHeight: 19,
    fontWeight: '700',
    marginTop: 10,
  },
  rewardsGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 20,
  },
  reward: {
    width: '31%',
    minHeight: 118,
    borderRadius: 12,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
    paddingVertical: 10,
  },
  rewardIconSlot: {
    width: 72,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardIconImage: {
    width: REWARD_IMAGE_ICON_SIZE,
    height: REWARD_IMAGE_ICON_SIZE,
  },
  rewardIconImageLarge: {
    width: 70,
    height: 70,
  },
  goldThemeIconSlot: {
    width: 76,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goldThemeIconImage: {
    width: 80,
    height: 80,
  },
  rewardTitle: {
    fontSize: 13.5,
    lineHeight: 16,
    fontWeight: '900',
    marginTop: 6,
    minHeight: 32,
    width: '100%',
    textAlign: 'center',
  },
  rewardSubtitle: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    marginTop: 3,
    textAlign: 'center',
    textTransform: 'uppercase',
    width: '100%',
  },
  actions: {
    width: '100%',
    marginTop: 18,
  },
  primaryBtn: {
    alignSelf: 'stretch',
    minHeight: 46,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontSize: 14,
    fontWeight: '900',
  },
  laterBtn: {
    alignSelf: 'stretch',
    marginTop: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  laterText: {
    fontSize: 14,
    fontWeight: '700',
  },
  rewardsLoading: {
    marginTop: 20,
    textAlign: 'center',
    fontWeight: '700',
  },
});
