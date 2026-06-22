import { LinearGradient } from './SafeLinearGradient';
import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import type { ImageSourcePropType } from 'react-native';
import type { LeagueChestRewardDrop } from '../app/services/league_chest_rewards';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { triLang, type Lang } from '../constants/i18n';
import { getLeagueBonusGiftImage } from '../constants/leagueBonusGiftImages';
import { getLeagueBonusPalette } from '../constants/leagueBonusPalette';
import { getLevelGiftRewardIcon, type LevelGiftRewardIconId } from '../constants/levelGiftRewardIcons';
import type { ThemeMode } from '../constants/theme';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { oskolokImageForPackShards } from '../app/oskolok';
import AvatarAura from './AvatarAura';
import CustomAvatarBadge from './CustomAvatarBadge';
import LeagueCrownName from './LeagueCrownName';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';

type Props = {
  visible: boolean;
  crownName?: string;
  isCrownWinner?: boolean;
  rewards?: LeagueChestRewardDrop[];
  onClose: () => void;
};

type RewardCard = {
  title: string;
  subtitle?: string;
  accent: string;
  icon:
    | { type: 'image'; source: ImageSourcePropType; scale?: 'large' | 'normal' }
    | { type: 'avatar'; avatarId: string; gradientId: string; logoColor: CustomAvatarLogoColor }
    | { type: 'aura'; auraId: string; avatarId: string; gradientId: string; logoColor: CustomAvatarLogoColor }
    | { type: 'goldTheme'; source: ImageSourcePropType };
};

const LEAGUE_CROWN_ICON = require('../assets/images/league/league_crown.webp');
const LEAGUE_GOLD_THEME_REWARD_ICON = require('../assets/images/league_bonus/gold-theme-card-reward.webp');
const FALLBACK_CUSTOM_AVATAR_ID = 'custom-gen-04';
const FALLBACK_CUSTOM_GRADIENT_ID = 'noirgold';
const FALLBACK_CUSTOM_LOGO_COLOR: CustomAvatarLogoColor = 'black';
const REWARD_IMAGE_ICON_SIZE = 64;
const REWARD_COSMETIC_ICON_SIZE = 58;

const PREVIEW_REWARDS: LeagueChestRewardDrop[] = [
  { id: 'preview_shards', kind: 'shards', rarity: 'common', amount: 24 },
  { id: 'preview_energy', kind: 'energy_fast_recovery', rarity: 'rare', recoveryMs: 5 * 60 * 1000 },
  { id: 'preview_aura', kind: 'avatar_aura', rarity: 'epic', auraId: 'aura-violet' },
  { id: 'preview_gold', kind: 'gold_theme', rarity: 'legendary' },
];

function rewardAmount(drop: LeagueChestRewardDrop): number {
  return Math.max(0, Math.floor(Number(drop.amount) || 0));
}

function getLeagueChestRewardIconId(drop: LeagueChestRewardDrop): LevelGiftRewardIconId | null {
  switch (drop.kind) {
    case 'shards':
      return rewardAmount(drop) >= 18 ? 'prem_shards_20' : rewardAmount(drop) >= 10 ? 'shards_10' : 'shards_6';
    case 'gold_theme_duplicate':
      return 'prem_shards_20';
    case 'xp_boost':
      return 'xp_2x_24h';
    case 'energy_fast_recovery':
      return 'energy_full';
    case 'streak_shield':
      return rewardAmount(drop) >= 3 ? 'chain_shield_3' : 'chain_shield_1';
    case 'arena_plays':
      return 'arena_extra_5';
    case 'pack_trial_48h':
      return 'pack_voucher_48h';
    case 'avatar_aura':
      return 'cosmetic_avatar_aura';
    case 'custom_avatar':
      return 'cosmetic_avatar_common';
    case 'gold_theme':
    default:
      return null;
  }
}

function getLeagueChestRewardIconSource(drop: LeagueChestRewardDrop): ImageSourcePropType {
  const iconId = getLeagueChestRewardIconId(drop);
  return iconId ? getLevelGiftRewardIcon(iconId) : LEAGUE_GOLD_THEME_REWARD_ICON;
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
  if (lang === 'es') return `+${amount} fragmentos`;
  if (lang === 'uk') return `+${amount} ${slavicPlural(amount, 'осколок', 'осколки', 'осколків')}`;
  return `+${amount} ${slavicPlural(amount, 'осколок', 'осколка', 'осколков')}`;
}

function arenaPlaysTitle(amount: number, lang: Lang): string {
  if (lang === 'es') return `+${amount} arenas`;
  if (lang === 'uk') return `+${amount} ${slavicPlural(amount, 'бій', 'бої', 'боїв')}`;
  return `+${amount} ${slavicPlural(amount, 'бой', 'боя', 'боёв')}`;
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
      title: triLang(lang, { ru: 'Энергия', uk: 'Енергія', es: 'Energía', 'pt-BR': 'Energia', vi: 'Năng lượng', id: 'Energi', tr: 'Enerji', pl: 'Energia' }),
      subtitle: triLang(lang, { ru: `${minutes} мин быстрее`, uk: `${minutes} хв швидше`, es: `${minutes} min rápido`, 'pt-BR': `${minutes} min mais rápido`, vi: `${minutes} phút nhanh hơn`, id: `${minutes} menit lebih cepat`, tr: `${minutes} dk daha hızlı`, pl: `${minutes} min szybciej` }),
      accent: '#7BE7C8',
      icon: { type: 'image', source: getLeagueChestRewardIconSource(drop) },
    };
  }

  if (drop.kind === 'streak_shield') {
    return {
      title: triLang(lang, { ru: 'Щит серии', uk: 'Щит серії', es: 'Escudo', 'pt-BR': 'Escudo de sequência', vi: 'Khiên chuỗi', id: 'Perisai streak', tr: 'Seri kalkanı', pl: 'Tarcza serii' }),
      subtitle: `+${rewardAmount(drop) || 1}`,
      accent: '#A7F3D0',
      icon: { type: 'image', source: getLeagueChestRewardIconSource(drop) },
    };
  }

  if (drop.kind === 'arena_plays') {
    return {
      title: arenaPlaysTitle(rewardAmount(drop) || 5, lang),
      subtitle: triLang(lang, { ru: 'Арена', uk: 'Арена', es: 'Arena', 'pt-BR': 'Arena', vi: 'Đấu trường', id: 'Arena', tr: 'Arena', pl: 'Arena' }),
      accent: '#FFB86B',
      icon: { type: 'image', source: getLeagueChestRewardIconSource(drop) },
    };
  }

  if (drop.kind === 'pack_trial_48h') {
    return {
      title: triLang(lang, { ru: 'Пак фраз', uk: 'Пак фраз', es: 'Pack', 'pt-BR': 'Pacote de frases', vi: 'Gói cụm từ', id: 'Paket frasa', tr: 'İfade paketi', pl: 'Pakiet fraz' }),
      subtitle: triLang(lang, { ru: '48 часов', uk: '48 годин', es: '48 horas', 'pt-BR': '48 horas', vi: '48 giờ', id: '48 jam', tr: '48 saat', pl: '48 godzin' }),
      accent: '#BFA5FF',
      icon: { type: 'image', source: getLeagueChestRewardIconSource(drop) },
    };
  }

  if (drop.kind === 'avatar_aura') {
    const aura = getAvatarAuraById(drop.auraId) ?? getAvatarAuraById('aura-violet')!;
    const preview = cosmeticPreviewAvatar();
    return {
      title: triLang(lang, {
        ru: `Аура «${auraNameForLang(aura, lang)}»`,
        uk: `Аура «${auraNameForLang(aura, lang)}»`,
        es: `Aura «${auraNameForLang(aura, lang)}»`,
        'pt-BR': `Aura «${auraNameForLang(aura, 'pt-BR')}»`,
        vi: `Hào quang «${auraNameForLang(aura, 'vi')}»`,
        id: `Aura «${auraNameForLang(aura, 'id')}»`,
        tr: `Aura «${auraNameForLang(aura, 'tr')}»`,
        pl: `Aura «${auraNameForLang(aura, 'pl')}»`,
      }),
      subtitle: triLang(lang, { ru: 'Для аватара', uk: 'Для аватара', es: 'Para avatar', 'pt-BR': 'Para avatar', vi: 'Cho avatar', id: 'Untuk avatar', tr: 'Avatar için', pl: 'Dla awatara' }),
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
      title: triLang(lang, { ru: 'Тема «Золото»', uk: 'Тема «Золото»', es: 'Tema Oro', 'pt-BR': 'Tema «Ouro»', vi: 'Chủ đề «Vàng»', id: 'Tema «Emas»', tr: '«Altın» teması', pl: 'Motyw «Złoto»' }),
      subtitle: triLang(lang, { ru: 'Золотая карточка', uk: 'Золота картка', es: 'Tarjeta dorada', 'pt-BR': 'Cartão dourado', vi: 'Thẻ vàng', id: 'Kartu emas', tr: 'Altın kart', pl: 'Złota karta' }),
      accent: '#F8D982',
      icon: { type: 'goldTheme', source: LEAGUE_GOLD_THEME_REWARD_ICON },
    };
  }

  switch (drop.kind) {
    case 'shards':
      return {
        title: shardsTitle(rewardAmount(drop), lang),
        subtitle: triLang(lang, { ru: 'Осколки', uk: 'Осколки', es: 'Fragmentos', 'pt-BR': 'Fragmentos', vi: 'Mảnh', id: 'Pecahan', tr: 'Parça', pl: 'Odłamki' }),
        accent: '#9FDBFF',
        icon: { type: 'image', source: oskolokImageForPackShards(rewardAmount(drop), themeMode), scale: 'large' },
      };
    case 'gold_theme_duplicate':
      return {
        title: shardsTitle(rewardAmount(drop) || 25, lang),
        subtitle: triLang(lang, { ru: 'Повтор темы', uk: 'Повтор теми', es: 'Tema repetido', 'pt-BR': 'Tema repetido', vi: 'Chủ đề lặp lại', id: 'Tema duplikat', tr: 'Tekrar tema', pl: 'Powtórzony motyw' }),
        accent: '#F8D982',
        icon: { type: 'image', source: oskolokImageForPackShards(rewardAmount(drop) || 25, themeMode), scale: 'large' },
      };
    case 'xp_boost':
      return {
        title: `x${Math.max(2, Number(drop.multiplier) || 2)} XP`,
        subtitle: triLang(lang, { ru: 'Бонус опыта', uk: 'Бонус досвіду', es: 'Bono de XP', 'pt-BR': 'Bônus de XP', vi: 'Thưởng XP', id: 'Bonus XP', tr: 'XP bonusu', pl: 'Bonus XP' }),
        accent: '#F7D774',
        icon: { type: 'image', source: getLeagueChestRewardIconSource(drop) },
      };
  }
}

function RewardIcon({ card, drop }: { card: RewardCard; drop: LeagueChestRewardDrop }) {
  const fallbackSource = getLeagueChestRewardIconSource(drop);
  const icon = card.icon ?? { type: 'image' as const, source: fallbackSource };

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

  if (icon.type === 'goldTheme') {
    return (
      <View style={styles.goldThemeIconSlot}>
        <Image source={icon.source} contentFit="contain" style={styles.goldThemeIconImage} />
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
}: Props) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const insets = useSafeAreaInsets();
  const scale = useRef(new Animated.Value(0.72)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const crownFloat = useRef(new Animated.Value(0)).current;
  const shine = useRef(new Animated.Value(0)).current;

  const visibleRewards = useMemo(
    () => (Array.isArray(rewards) && rewards.length > 0 ? rewards : PREVIEW_REWARDS),
    [rewards],
  );
  const rewardCards = useMemo(() => visibleRewards.map((drop) => ({ drop, card: formatReward(drop, lang, themeMode) })), [visibleRewards, lang, themeMode]);
  const hasAvatarCosmetic = visibleRewards.some((drop) => drop.kind === 'avatar_aura' || drop.kind === 'custom_avatar');
  const leagueBonusGiftImage = getLeagueBonusGiftImage(themeMode);
  const modalTheme = getLeagueBonusPalette(t, themeMode).modal;

  useEffect(() => {
    if (!visible) return;
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
  }, [visible, crownFloat, opacity, scale, shine]);

  if (!visible) return null;

  const dim = modalTheme.overlay;
  const crownDisplayName = crownName || triLang(lang, { ru: 'лидер', uk: 'лідер', es: 'líder', 'pt-BR': 'líder', vi: 'người dẫn đầu', id: 'pemimpin', tr: 'lider', pl: 'lider' });
  const giftCopy = isCrownWinner
    ? triLang(lang, {
      ru: 'Корона активна: она появится на твоей карточке, в лиге и рейтингах.',
      uk: 'Корона активна: вона зʼявиться на твоїй картці, у лізі й рейтингах.',
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
              paddingBottom: Math.max(18, insets.bottom + 8),
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

                <ScrollView
                  bounces={false}
                  showsVerticalScrollIndicator={false}
                  style={styles.scroll}
                  contentContainerStyle={styles.scrollContent}
                >
                <Text style={[styles.eyebrow, { color: modalTheme.eyebrow }]} numberOfLines={1}>
                  {triLang(lang, { ru: 'Бонус лиги открыт', uk: 'Бонус ліги відкрито', es: 'Bono de liga abierto', 'pt-BR': 'Bônus da liga aberto', vi: 'Đã mở thưởng giải đấu', id: 'Bonus liga terbuka', tr: 'Lig bonusu açıldı', pl: 'Bonus ligi otwarty' })}
                </Text>

                <Animated.View style={{ alignItems: 'center', transform: [{ translateY: crownFloat }] }}>
                  <View style={[styles.crownHalo, { borderColor: modalTheme.crestBorder, backgroundColor: modalTheme.crestBg }]}>
                    {isCrownWinner ? (
                      <Image source={LEAGUE_CROWN_ICON} contentFit="contain" style={styles.crownImage} />
                    ) : (
                      <Image source={leagueBonusGiftImage} contentFit="contain" style={styles.leagueGiftImage} />
                    )}
                  </View>
                </Animated.View>

                <Text style={[styles.title, { color: t.textPrimary, fontSize: Math.max(26, f.h1 + 2) }]}>
                  {isCrownWinner
                    ? triLang(lang, { ru: 'Ты взял корону', uk: 'Ти взяв корону', es: 'Tomaste la corona', 'pt-BR': 'Você pegou a coroa', vi: 'Bạn đã nhận vương miện', id: 'Kamu mengambil mahkota', tr: 'Tacını aldın', pl: 'Korona odebrana' })
                    : triLang(lang, { ru: 'Награды готовы', uk: 'Нагороди готові', es: 'Recompensas listas', 'pt-BR': 'Recompensas prontas', vi: 'Phần thưởng đã sẵn sàng', id: 'Hadiah siap', tr: 'Ödüller hazır', pl: 'Nagrody gotowe' })}
                </Text>
                <View style={{ alignItems: 'center', maxWidth: '100%' }}>
                  <LeagueCrownName text={crownDisplayName} fontSize={Math.max(16, f.body)} />
                </View>
                {giftCopy ? (
                  <Text style={[styles.goldGiftCopy, { color: t.textSecond, fontSize: Math.max(13, f.caption) }]}>
                    {giftCopy}
                  </Text>
                ) : null}

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
                    <Text style={[styles.primaryText, { color: modalTheme.primaryText }]}>{triLang(lang, { ru: 'Забрать', uk: 'Забрати', es: 'Recoger', 'pt-BR': 'Resgatar', vi: 'Nhận', id: 'Klaim', tr: 'Al', pl: 'Odbierz' })}</Text>
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
    elevation: 14,
  },
  card: {
    borderRadius: 22,
    borderWidth: 0.5,
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
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
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
    borderWidth: 0.5,
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
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  primaryBtn: {
    flex: 1,
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
});
