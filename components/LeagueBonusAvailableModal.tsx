import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from './SafeLinearGradient';
import React, { memo, useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { triLang } from '../constants/i18n';
import { getLeagueBonusGiftImage } from '../constants/leagueBonusGiftImages';
import { getLeagueBonusPalette } from '../constants/leagueBonusPalette';
import { hapticTap } from '../hooks/use-haptics';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { MOTION_SPRING_LEGACY } from '../constants/motion';
import type { LeagueBonusAvailability } from '../app/services/league_chest_rewards';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';

type Props = {
  visible: boolean;
  availability: LeagueBonusAvailability | null;
  onClose: () => void;
  onOpenLeague: () => void;
};

const LEAGUE_CROWN_ICON = require('../assets/images/league/league_crown.webp');

function LeagueBonusAvailableModal({
  visible,
  availability,
  onClose,
  onOpenLeague,
}: Props) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const leagueBonusGiftImage = getLeagueBonusGiftImage(themeMode);
  const modalTheme = getLeagueBonusPalette(t, themeMode).modal;

  useEffect(() => {
    if (!visible) return;
    scale.setValue(0.9);
    opacity.setValue(0);
    glow.setValue(0);
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1700, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1700, useNativeDriver: true }),
      ]),
    );
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: MOTION_SPRING_LEGACY.ui.friction, tension: MOTION_SPRING_LEGACY.ui.tension, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      glowLoop,
    ]).start();
    return () => glowLoop.stop();
  }, [glow, opacity, scale, visible]);

  if (!visible || !availability) return null;

  const crownName = availability.crownName || triLang(lang, { ru: 'лидер', uk: 'лідер', es: 'líder', 'pt-BR': 'líder', vi: 'người dẫn đầu', id: 'pemimpin', tr: 'lider', pl: 'lider' });
  const buttonLabel = availability.isCrownWinner
    ? triLang(lang, { ru: 'Забрать корону', uk: 'Забрати корону', es: 'Recoger la corona', 'pt-BR': 'Resgatar a coroa', vi: 'Nhận vương miện', id: 'Klaim mahkota', tr: 'Tacını al', pl: 'Odbierz koronę' })
    : triLang(lang, { ru: 'Забрать бонус лиги', uk: 'Забрати бонус ліги', es: 'Recoger bono de liga', 'pt-BR': 'Resgatar bônus da liga', vi: 'Nhận thưởng giải đấu', id: 'Klaim bonus liga', tr: 'Lig bonusunu al', pl: 'Odbierz bonus ligi' });

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: modalTheme.overlay }]}
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
          <Animated.View style={[styles.shell, { opacity, transform: [{ scale }] }]}>
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
                    styles.halo,
                    {
                      backgroundColor: modalTheme.halo,
                      borderColor: modalTheme.haloBorder,
                      opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.46] }),
                      transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.05] }) }],
                    },
                  ]}
                />
                <View style={[styles.iconWrap, { backgroundColor: modalTheme.crestBg, borderColor: modalTheme.crestBorder }]}>
                  {availability.isCrownWinner ? (
                    <Image source={LEAGUE_CROWN_ICON} contentFit="contain" style={styles.crownImage} />
                  ) : (
                    <Image source={leagueBonusGiftImage} contentFit="contain" style={styles.leagueGiftImage} />
                  )}
                </View>
                <Text style={[styles.eyebrow, { color: modalTheme.eyebrow }]}>
                  {triLang(lang, { ru: 'Цель лиги выполнена', uk: 'Ціль ліги виконано', es: 'Meta de liga completada', 'pt-BR': 'Meta da liga concluída', vi: 'Đã hoàn thành mục tiêu giải đấu', id: 'Target liga selesai', tr: 'Lig hedefi tamamlandı', pl: 'Cel ligi ukończony' })}
                </Text>
                <Text style={[styles.title, { color: t.textPrimary, fontSize: Math.max(24, f.h1 + 2) }]}>
                  {availability.isCrownWinner
                    ? triLang(lang, { ru: 'Корона уже ждёт', uk: 'Корона вже чекає', es: 'La corona te espera', 'pt-BR': 'A coroa já está esperando', vi: 'Vương miện đang chờ bạn', id: 'Mahkota sudah menunggu', tr: 'Taç seni bekliyor', pl: 'Korona już czeka' })
                    : triLang(lang, { ru: 'Подарки уже ждут', uk: 'Подарунки вже чекають', es: 'Los regalos te esperan', 'pt-BR': 'Os presentes já estão esperando', vi: 'Quà đã sẵn sàng', id: 'Hadiah sudah menunggu', tr: 'Hediyeler seni bekliyor', pl: 'Prezenty już czekają' })}
                </Text>
                <Text style={[styles.body, { color: t.textSecond, fontSize: Math.max(14, f.body) }]}>
                  {availability.isCrownWinner
                    ? triLang(lang, {
                      ru: `Ты набрал больше всех. Лига закрыла цель, а корона решила не изображать скромность: она твоя. Осталось забрать.`,
                      uk: `Ти набрав найбільше. Ліга закрила ціль, а корона вирішила не вдавати скромність: вона твоя. Залишилось забрати.`,
                      es: `Has sumado más que nadie. La liga cumplió la meta y la corona no quiere fingir modestia: es tuya.`,
                      'pt-BR': `Você pontuou mais que todos. A liga cumpriu a meta e a coroa não quer fingir modéstia: ela é sua.`,
                      vi: `Bạn ghi nhiều điểm nhất. Giải đấu đã đạt mục tiêu và vương miện không cần khiêm tốn nữa: nó là của bạn.`,
                      id: `Kamu mengumpulkan poin terbanyak. Liga menyelesaikan target, dan mahkota tidak perlu pura-pura rendah hati: itu milikmu.`,
                      tr: `En çok puanı sen topladın. Lig hedefi tamamlandı ve taç mütevazı davranmayacak: artık senin.`,
                      pl: `Masz najwięcej punktów. Liga zamknęła cel, a korona nie udaje skromności: jest twoja.`,
                    })
                    : triLang(lang, {
                      ru: `Лига закрыла цель недели. Бонус уже готов: внутри монеты, усилители и редкие награды, которые выпадают отдельно для каждого игрока.`,
                      uk: `Ліга закрила ціль тижня. Бонус уже готовий: усередині монети, підсилювачі й рідкісні нагороди, що випадають окремо для кожного гравця.`,
                      es: `La liga completó la meta semanal. El bono ya está listo: monedas, boosts y recompensas raras para cada jugador.`,
                      'pt-BR': `A liga completou a meta semanal. O bônus já está pronto: moedas, boosts e recompensas raras para cada jogador.`,
                      vi: `Giải đấu đã hoàn thành mục tiêu tuần. Phần thưởng đã sẵn sàng: xu, boost và phần thưởng hiếm cho từng người chơi.`,
                      id: `Liga menyelesaikan target mingguan. Bonus sudah siap: koin, boost, dan hadiah langka untuk setiap pemain.`,
                      tr: `Lig haftalık hedefi tamamladı. Bonus hazır: her oyuncu için jetonlar, boostlar ve nadir ödüller var.`,
                      pl: `Liga ukończyła cel tygodnia. Bonus jest gotowy: monety, boosty i rzadkie nagrody dla każdego gracza.`,
                    })}
                </Text>
                <View style={[styles.meta, { borderColor: modalTheme.metaBorder, backgroundColor: modalTheme.metaBg }]}>
                  <Ionicons name="podium-outline" size={18} color={modalTheme.eyebrow} />
                  <Text style={[styles.metaText, { color: t.textSecond }]}>
                    {triLang(lang, { ru: `Корона: ${crownName}`, uk: `Корона: ${crownName}`, es: `Corona: ${crownName}`, 'pt-BR': `Coroa: ${crownName}`, vi: `Vương miện: ${crownName}`, id: `Mahkota: ${crownName}`, tr: `Taç: ${crownName}`, pl: `Korona: ${crownName}` })}
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => {
                    hapticTap();
                    onOpenLeague();
                  }}
                  style={styles.primaryBtn}
                >
                  <LinearGradient colors={modalTheme.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                  <Text style={[styles.primaryText, { color: modalTheme.primaryText }]}>{buttonLabel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    hapticTap();
                    onClose();
                  }}
                  style={styles.laterBtn}
                >
                  <Text style={[styles.laterText, { color: t.textMuted }]}>{triLang(lang, { ru: 'Позже', uk: 'Пізніше', es: 'Más tarde', 'pt-BR': 'Mais tarde', vi: 'Để sau', id: 'Nanti', tr: 'Daha sonra', pl: 'Później' })}</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

export default memo(LeagueBonusAvailableModal);

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  shell: { width: '100%', maxWidth: 370 },
  frame: {
    borderRadius: 26,
    padding: 1.5,
    shadowColor: '#000',
    shadowOpacity: 0.38,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    elevation: 16,
  },
  card: {
    borderRadius: 24,
    borderWidth: 0,
    overflow: 'hidden',
    padding: 20,
    alignItems: 'center',
  },
  topRail: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 1,
  },
  ribbon: {
    position: 'absolute',
    top: 28,
    right: -72,
    width: 230,
    height: 42,
    transform: [{ rotate: '-22deg' }],
  },
  ribbonAlt: {
    position: 'absolute',
    bottom: -18,
    left: -58,
    width: 230,
    height: 46,
    transform: [{ rotate: '-18deg' }],
  },
  halo: {
    position: 'absolute',
    top: -54,
    width: 208,
    height: 208,
    borderRadius: 104,
    borderWidth: 0,
  },
  iconWrap: {
    width: 136,
    height: 136,
    borderRadius: 68,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  crownImage: {
    width: 78,
    height: 78,
  },
  leagueGiftImage: {
    width: 154,
    height: 154,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  title: {
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
  },
  body: {
    textAlign: 'center',
    lineHeight: 21,
    fontWeight: '700',
  },
  meta: {
    width: '100%',
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  primaryBtn: {
    width: '100%',
    minHeight: 52,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  primaryText: {
    fontSize: 15,
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
});
