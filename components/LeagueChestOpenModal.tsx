import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { LeagueChestRewardDrop } from '../app/services/league_chest_rewards';
import { triLang } from '../constants/i18n';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import LeagueCrownName from './LeagueCrownName';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';

type RewardIcon = React.ComponentProps<typeof Ionicons>['name'];

type Props = {
  visible: boolean;
  crownName?: string;
  isCrownWinner?: boolean;
  rewards?: LeagueChestRewardDrop[];
  onClose: () => void;
};

type RewardCard = {
  icon: RewardIcon;
  title: string;
  accent: string;
  captionRu: string;
  captionUk: string;
  captionEs: string;
  captionPtBR: string;
  captionVi: string;
  captionId: string;
  captionTr: string;
  captionPl: string;
};

const LEAGUE_CROWN_ICON = require('../assets/images/league/league_crown.png');

const PREVIEW_REWARDS: LeagueChestRewardDrop[] = [
  { id: 'preview_shards', kind: 'shards', rarity: 'common', amount: 24 },
  { id: 'preview_energy', kind: 'energy_fast_recovery', rarity: 'rare', recoveryMs: 5 * 60 * 1000 },
  { id: 'preview_aura', kind: 'avatar_aura', rarity: 'epic', auraId: 'aura-gold' },
  { id: 'preview_gold', kind: 'gold_theme', rarity: 'legendary' },
];

function rewardAmount(drop: LeagueChestRewardDrop): number {
  return Math.max(0, Math.floor(Number(drop.amount) || 0));
}

function formatReward(drop: LeagueChestRewardDrop): RewardCard {
  switch (drop.kind) {
    case 'shards':
      return {
        icon: 'diamond-outline',
        title: `+${rewardAmount(drop)}`,
        accent: '#9FDBFF',
        captionRu: 'осколков',
        captionUk: 'осколків',
        captionEs: 'fragmentos',
        captionPtBR: 'fragmentos',
        captionVi: 'mảnh',
        captionId: 'pecahan',
        captionTr: 'parça',
        captionPl: 'odłamków',
      };
    case 'gold_theme_duplicate':
      return {
        icon: 'diamond-outline',
        title: `+${rewardAmount(drop) || 25}`,
        accent: '#F8D982',
        captionRu: 'компенсация',
        captionUk: 'компенсація',
        captionEs: 'compensación',
        captionPtBR: 'compensação',
        captionVi: 'bồi hoàn',
        captionId: 'kompensasi',
        captionTr: 'telafi',
        captionPl: 'rekompensata',
      };
    case 'xp_boost':
      return {
        icon: 'flash-outline',
        title: `x${Math.max(2, Number(drop.multiplier) || 2)} XP`,
        accent: '#F7D774',
        captionRu: `${Math.max(1, rewardAmount(drop) || Math.floor(Number(drop.uses) || 3))} усиления`,
        captionUk: `${Math.max(1, rewardAmount(drop) || Math.floor(Number(drop.uses) || 3))} підсилення`,
        captionEs: `${Math.max(1, rewardAmount(drop) || Math.floor(Number(drop.uses) || 3))} usos`,
        captionPtBR: `${Math.max(1, rewardAmount(drop) || Math.floor(Number(drop.uses) || 3))} usos`,
        captionVi: `${Math.max(1, rewardAmount(drop) || Math.floor(Number(drop.uses) || 3))} lượt boost`,
        captionId: `${Math.max(1, rewardAmount(drop) || Math.floor(Number(drop.uses) || 3))} boost`,
        captionTr: `${Math.max(1, rewardAmount(drop) || Math.floor(Number(drop.uses) || 3))} güçlendirme`,
        captionPl: `${Math.max(1, rewardAmount(drop) || Math.floor(Number(drop.uses) || 3))} użycia`,
      };
    case 'energy_fast_recovery':
      return {
        icon: 'timer-outline',
        title: '5 мин',
        accent: '#7BE7C8',
        captionRu: 'быстрая энергия',
        captionUk: 'швидка енергія',
        captionEs: 'energía semanal',
        captionPtBR: 'energia rápida',
        captionVi: 'năng lượng nhanh',
        captionId: 'energi cepat',
        captionTr: 'hızlı enerji',
        captionPl: 'szybka energia',
      };
    case 'streak_shield':
      return {
        icon: 'shield-checkmark-outline',
        title: 'Щит',
        accent: '#A7F3D0',
        captionRu: '+1 день серии',
        captionUk: '+1 день серії',
        captionEs: '+1 día racha',
        captionPtBR: '+1 dia de sequência',
        captionVi: '+1 ngày streak',
        captionId: '+1 hari streak',
        captionTr: 'seriye +1 gün',
        captionPl: '+1 dzień serii',
      };
    case 'arena_plays':
      return {
        icon: 'ticket-outline',
        title: `+${rewardAmount(drop) || 5}`,
        accent: '#FFB86B',
        captionRu: 'матчей в арене',
        captionUk: 'матчів в арені',
        captionEs: 'duelos arena',
        captionPtBR: 'partidas na arena',
        captionVi: 'trận đấu arena',
        captionId: 'pertandingan arena',
        captionTr: 'arena maçı',
        captionPl: 'meczów areny',
      };
    case 'pack_trial_48h':
      return {
        icon: 'albums-outline',
        title: '48 ч',
        accent: '#BFA5FF',
        captionRu: 'ваучер набора',
        captionUk: 'ваучер набору',
        captionEs: 'pack temporal',
        captionPtBR: 'voucher de pack',
        captionVi: 'phiếu pack',
        captionId: 'voucher pack',
        captionTr: 'paket kuponu',
        captionPl: 'voucher pakietu',
      };
    case 'avatar_aura':
      return {
        icon: 'sparkles-outline',
        title: 'Аура',
        accent: '#F8D982',
        captionRu: 'для аватара',
        captionUk: 'для аватара',
        captionEs: 'para avatar',
        captionPtBR: 'para avatar',
        captionVi: 'cho avatar',
        captionId: 'untuk avatar',
        captionTr: 'avatar için',
        captionPl: 'dla awatara',
      };
    case 'custom_avatar':
      return {
        icon: 'person-circle-outline',
        title: 'Стиль',
        accent: '#F2C56E',
        captionRu: 'для аватара',
        captionUk: 'для аватара',
        captionEs: 'estilo raro',
        captionPtBR: 'estilo raro',
        captionVi: 'kiểu hiếm',
        captionId: 'gaya langka',
        captionTr: 'nadir stil',
        captionPl: 'rzadki styl',
      };
    case 'gold_theme':
    default:
      return {
        icon: 'color-palette-outline',
        title: 'Тема',
        accent: '#F8D982',
        captionRu: 'редкий стиль',
        captionUk: 'рідкісний стиль',
        captionEs: 'tema trofeo',
        captionPtBR: 'estilo raro',
        captionVi: 'chủ đề cúp',
        captionId: 'tema trofi',
        captionTr: 'kupa teması',
        captionPl: 'motyw trofeum',
      };
  }
}

export default function LeagueChestOpenModal({
  visible,
  crownName,
  isCrownWinner = false,
  rewards,
  onClose,
}: Props) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const scale = useRef(new Animated.Value(0.72)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const crownFloat = useRef(new Animated.Value(0)).current;
  const shine = useRef(new Animated.Value(0)).current;

  const visibleRewards = useMemo(
    () => (Array.isArray(rewards) && rewards.length > 0 ? rewards : PREVIEW_REWARDS),
    [rewards],
  );
  const rewardCards = useMemo(() => visibleRewards.map((drop) => ({ drop, card: formatReward(drop) })), [visibleRewards]);
  const hasAvatarCosmetic = visibleRewards.some((drop) => drop.kind === 'avatar_aura' || drop.kind === 'custom_avatar');

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

  const dim = themeMode === 'minimalLight'
    ? 'rgba(4,10,22,0.58)'
    : 'rgba(0,0,0,0.72)';
  const crownDisplayName = crownName || triLang(lang, { ru: 'лидер недели', uk: 'лідер тижня', es: 'líder semanal', 'pt-BR': 'líder da semana', vi: 'người dẫn đầu tuần', id: 'pemimpin minggu ini', tr: 'haftanın lideri', pl: 'lider tygodnia' });
  const giftCopy = isCrownWinner
    ? triLang(lang, {
      ru: 'Корона активна: она появится на твоей карточке, в лиге и рейтингах, пока идёт неделя.',
      uk: 'Корона активна: вона зʼявиться на твоїй картці, у лізі й рейтингах, доки триває тиждень.',
      es: 'La corona está activa: aparecerá en tu tarjeta, liga y rankings durante la semana.',
      'pt-BR': 'A coroa está ativa: ela aparecerá no seu cartão, na liga e nos rankings durante a semana.',
      vi: 'Vương miện đang hoạt động: nó sẽ xuất hiện trên thẻ, trong giải đấu và bảng xếp hạng suốt tuần.',
      id: 'Mahkota aktif: akan muncul di kartumu, liga, dan peringkat selama minggu ini.',
      tr: 'Taç aktif: hafta boyunca kartında, ligde ve sıralamalarda görünecek.',
      pl: 'Korona jest aktywna: będzie widoczna na twojej karcie, w lidze i rankingach przez cały tydzień.',
    })
    : hasAvatarCosmetic
      ? triLang(lang, {
        ru: 'Бонус собран. Косметика уже добавлена, а остальные награды начинают действовать сразу.',
        uk: 'Бонус зібрано. Косметику вже додано, а решта нагород починає діяти одразу.',
        es: 'Bono recogido. La cosmética ya está añadida y las demás recompensas empiezan ahora.',
        'pt-BR': 'Bônus coletado. A cosmética já foi adicionada e as outras recompensas começam a valer agora.',
        vi: 'Đã nhận thưởng. Vật phẩm trang trí đã được thêm, các phần thưởng còn lại có hiệu lực ngay.',
        id: 'Bonus terkumpul. Kosmetik sudah ditambahkan dan hadiah lainnya langsung aktif.',
        tr: 'Bonus alındı. Kozmetik eklendi, diğer ödüller hemen aktif olur.',
        pl: 'Bonus odebrany. Kosmetyka została dodana, a pozostałe nagrody działają od razu.',
      })
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
        <View style={styles.center} pointerEvents="box-none">
          <Animated.View style={[styles.shell, { opacity, transform: [{ scale }] }]} pointerEvents="auto">
            <LinearGradient
              colors={['#FFF0B8', '#D7AD56', '#0C0802']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.frame}
            >
              <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.border }]}>
                <LinearGradient
                  colors={['rgba(255,240,184,0.20)', 'rgba(0,0,0,0)', 'rgba(215,173,86,0.18)']}
                  style={StyleSheet.absoluteFill}
                />
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.shine,
                    {
                      opacity: shine.interpolate({ inputRange: [0, 1], outputRange: [0, 0.24] }),
                      transform: [{ translateX: shine.interpolate({ inputRange: [0, 1], outputRange: [-160, 180] }) }],
                    },
                  ]}
                />

                <Text style={[styles.eyebrow, { color: t.gold }]} numberOfLines={1}>
                  {triLang(lang, { ru: 'Бонус лиги открыт', uk: 'Бонус ліги відкрито', es: 'Bono de liga abierto', 'pt-BR': 'Bônus da liga aberto', vi: 'Đã mở thưởng giải đấu', id: 'Bonus liga terbuka', tr: 'Lig bonusu açıldı', pl: 'Bonus ligi otwarty' })}
                </Text>

                <Animated.View style={{ alignItems: 'center', transform: [{ translateY: crownFloat }] }}>
                  <View style={[styles.crownHalo, { borderColor: '#F7D77466', backgroundColor: '#D7AD5622' }]}>
                    {isCrownWinner ? (
                      <Image source={LEAGUE_CROWN_ICON} resizeMode="contain" style={styles.crownImage} />
                    ) : (
                      <Ionicons name="gift" size={58} color="#F7D774" />
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
                <Text style={[styles.goldGiftCopy, { color: t.textSecond, fontSize: Math.max(13, f.caption) }]}>
                  {giftCopy}
                </Text>

                <View style={styles.rewardsGrid}>
                  {rewardCards.map(({ drop, card }) => (
                    <View key={`${drop.id}:${drop.kind}`} style={[styles.reward, { backgroundColor: t.bgSurface, borderColor: t.border }]}>
                      <Ionicons name={card.icon} size={20} color={card.accent} />
                      <Text
                        style={[styles.rewardTitle, { color: t.textPrimary }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.72}
                      >
                        {card.title}
                      </Text>
                      <Text
                        style={[styles.rewardCaption, { color: t.textMuted, fontSize: Math.max(9, f.caption - 2) }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.72}
                      >
                        {triLang(lang, {
                          ru: card.captionRu,
                          uk: card.captionUk,
                          es: card.captionEs,
                          'pt-BR': card.captionPtBR,
                          vi: card.captionVi,
                          id: card.captionId,
                          tr: card.captionTr,
                          pl: card.captionPl,
                        })}
                      </Text>
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
                    <LinearGradient colors={['#FFF0B8', '#D7AD56', '#8D6826']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                    <Text style={styles.primaryText}>{triLang(lang, { ru: 'Забрать', uk: 'Забрати', es: 'Recoger', 'pt-BR': 'Resgatar', vi: 'Nhận', id: 'Klaim', tr: 'Al', pl: 'Odbierz' })}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  shell: { width: '100%', maxWidth: 360 },
  frame: {
    borderRadius: 24,
    padding: 2,
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
    padding: 18,
    alignItems: 'center',
  },
  shine: {
    position: 'absolute',
    top: -40,
    bottom: -40,
    width: 90,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '18deg' }],
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  crownHalo: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  crownImage: {
    width: 76,
    height: 76,
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
    gap: 8,
    marginTop: 18,
  },
  reward: {
    width: '31.5%',
    minHeight: 78,
    borderRadius: 12,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 9,
  },
  rewardTitle: {
    fontSize: 15,
    fontWeight: '900',
    marginTop: 5,
    textAlign: 'center',
  },
  rewardCaption: {
    fontWeight: '800',
    marginTop: 1,
    textAlign: 'center',
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
    color: '#120D04',
    fontSize: 14,
    fontWeight: '900',
  },
});
