import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { triLang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import type { LeagueBonusAvailability } from '../app/services/league_chest_rewards';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';

type Props = {
  visible: boolean;
  availability: LeagueBonusAvailability | null;
  onClose: () => void;
  onOpenLeague: () => void;
};

const LEAGUE_CROWN_ICON = require('../assets/images/league/league_crown.png');

export default function LeagueBonusAvailableModal({
  visible,
  availability,
  onClose,
  onOpenLeague,
}: Props) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

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
      Animated.spring(scale, { toValue: 1, friction: 8, tension: 95, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      glowLoop,
    ]).start();
    return () => glowLoop.stop();
  }, [glow, opacity, scale, visible]);

  if (!visible || !availability) return null;

  const crownName = availability.crownName || triLang(lang, { ru: 'лидер недели', uk: 'лідер тижня', es: 'líder semanal', 'pt-BR': 'líder da semana', vi: 'người dẫn đầu tuần', id: 'pemimpin minggu ini', tr: 'haftanın lideri', pl: 'lider tygodnia' });
  const buttonLabel = availability.isCrownWinner
    ? triLang(lang, { ru: 'Забрать корону', uk: 'Забрати корону', es: 'Recoger la corona', 'pt-BR': 'Resgatar a coroa', vi: 'Nhận vương miện', id: 'Klaim mahkota', tr: 'Tacını al', pl: 'Odbierz koronę' })
    : triLang(lang, { ru: 'Забрать бонус лиги', uk: 'Забрати бонус ліги', es: 'Recoger bono de liga', 'pt-BR': 'Resgatar bônus da liga', vi: 'Nhận thưởng giải đấu', id: 'Klaim bonus liga', tr: 'Lig bonusunu al', pl: 'Odbierz bonus ligi' });

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.72)' }]}
          onPress={() => {
            hapticTap();
            onClose();
          }}
        />
        <View style={styles.center} pointerEvents="box-none">
          <Animated.View style={[styles.shell, { opacity, transform: [{ scale }] }]}>
            <LinearGradient
              colors={['#F7E3A0', '#B88A2B', '#2B1A05']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.frame}
            >
              <View style={[styles.card, { backgroundColor: t.bgCard }]}>
                <LinearGradient
                  colors={['rgba(247,227,160,0.18)', 'rgba(0,0,0,0)', 'rgba(184,138,43,0.12)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.halo,
                    {
                      opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.46] }),
                      transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.05] }) }],
                    },
                  ]}
                />
                <View style={styles.iconWrap}>
                  {availability.isCrownWinner ? (
                    <Image source={LEAGUE_CROWN_ICON} resizeMode="contain" style={styles.crownImage} />
                  ) : (
                    <Ionicons name="gift" size={42} color="#FFE7A2" />
                  )}
                </View>
                <Text style={[styles.eyebrow, { color: '#D7AD56' }]}>
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
                      ru: `Лига закрыла цель недели. Бонус уже готов: внутри осколки, усилители и редкие награды, которые выпадают отдельно для каждого игрока.`,
                      uk: `Ліга закрила ціль тижня. Бонус уже готовий: усередині уламки, підсилювачі й рідкісні нагороди, що випадають окремо для кожного гравця.`,
                      es: `La liga completó la meta semanal. El bono ya está listo: fragmentos, boosts y recompensas raras para cada jugador.`,
                      'pt-BR': `A liga completou a meta semanal. O bônus já está pronto: fragmentos, boosts e recompensas raras para cada jogador.`,
                      vi: `Giải đấu đã hoàn thành mục tiêu tuần. Phần thưởng đã sẵn sàng: mảnh, boost và phần thưởng hiếm cho từng người chơi.`,
                      id: `Liga menyelesaikan target mingguan. Bonus sudah siap: pecahan, boost, dan hadiah langka untuk setiap pemain.`,
                      tr: `Lig haftalık hedefi tamamladı. Bonus hazır: her oyuncu için parçalar, boostlar ve nadir ödüller var.`,
                      pl: `Liga ukończyła cel tygodnia. Bonus jest gotowy: odłamki, boosty i rzadkie nagrody dla każdego gracza.`,
                    })}
                </Text>
                <View style={[styles.meta, { borderColor: 'rgba(215,173,86,0.34)', backgroundColor: 'rgba(215,173,86,0.10)' }]}>
                  <Ionicons name="podium-outline" size={18} color="#D7AD56" />
                  <Text style={[styles.metaText, { color: t.textSecond }]} numberOfLines={1}>
                    {triLang(lang, { ru: `Корона недели: ${crownName}`, uk: `Корона тижня: ${crownName}`, es: `Corona semanal: ${crownName}`, 'pt-BR': `Coroa da semana: ${crownName}`, vi: `Vương miện tuần: ${crownName}`, id: `Mahkota minggu ini: ${crownName}`, tr: `Haftanın tacı: ${crownName}`, pl: `Korona tygodnia: ${crownName}` })}
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
                  <LinearGradient colors={['#FFF1B8', '#D7AD56', '#8D6826']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                  <Text style={styles.primaryText}>{buttonLabel}</Text>
                </TouchableOpacity>
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
    overflow: 'hidden',
    padding: 20,
    alignItems: 'center',
  },
  halo: {
    position: 'absolute',
    top: -42,
    width: 168,
    height: 168,
    borderRadius: 84,
    backgroundColor: '#D7AD56',
  },
  iconWrap: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 1,
    borderColor: 'rgba(255,231,162,0.54)',
    backgroundColor: 'rgba(215,173,86,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  crownImage: {
    width: 62,
    height: 62,
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
    borderWidth: 0.5,
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
    color: '#120D04',
    fontSize: 15,
    fontWeight: '900',
  },
});
