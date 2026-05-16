import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  onClose: () => void;
  onShowLeaderboard?: () => void;
};

const REWARDS: { icon: RewardIcon; title: string; captionRu: string; captionUk: string; captionEs: string }[] = [
  { icon: 'diamond-outline', title: '+30', captionRu: 'осколков', captionUk: 'осколків', captionEs: 'fragmentos' },
  { icon: 'flash-outline', title: 'x2 XP', captionRu: '3 раза', captionUk: '3 рази', captionEs: '3 usos' },
  { icon: 'timer-outline', title: 'Энергия', captionRu: 'за 5 мин', captionUk: 'за 5 хв', captionEs: 'en 5 min' },
  { icon: 'shield-checkmark-outline', title: 'Щит серии', captionRu: '+1 день', captionUk: '+1 день', captionEs: '+1 día' },
];

function buildLeagueChestShareMessage(lang: string, crownName: string, isCrownWinner: boolean): string {
  if (lang === 'uk') {
    return isCrownWinner
      ? `Я відкрив бонус ліги в Phraseman і взяв корону тижня. Спробуєш наздогнати?`
      : `Моя кімната ліги відкрила бонус у Phraseman. Корона тижня у ${crownName}.`;
  }
  if (lang === 'es') {
    return isCrownWinner
      ? 'Abrí el bono de liga en Phraseman y tomé la corona semanal. ¿Puedes alcanzarme?'
      : `Mi sala de liga abrió el bono en Phraseman. La corona semanal es de ${crownName}.`;
  }
  return isCrownWinner
    ? 'Я открыл Бонус лиги в Phraseman и взял Корону недели. Сможешь догнать?'
    : `Моя комната лиги открыла Бонус лиги в Phraseman. Корона недели у ${crownName}.`;
}

export default function LeagueChestOpenModal({
  visible,
  crownName,
  isCrownWinner = false,
  onClose,
  onShowLeaderboard,
}: Props) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const scale = useRef(new Animated.Value(0.72)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const crownFloat = useRef(new Animated.Value(0)).current;
  const shine = useRef(new Animated.Value(0)).current;

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
        Animated.timing(crownFloat, { toValue: -8, duration: 900, useNativeDriver: true }),
        Animated.timing(crownFloat, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    const shineLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shine, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(shine, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(700),
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
  const crownDisplayName = crownName || triLang(lang, { ru: 'лидер недели', uk: 'лідер тижня', es: 'líder semanal' });
  const shareLeagueChest = async () => {
    hapticTap();
    const message = buildLeagueChestShareMessage(lang, crownDisplayName, isCrownWinner);
    await Share.share({ message }).catch(() => {});
  };

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
              colors={['#16B7D9', '#F7D774', '#A78BFA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.frame}
            >
              <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.border }]}>
                <LinearGradient
                  colors={['rgba(22,183,217,0.20)', 'rgba(247,215,116,0.10)', 'rgba(167,139,250,0.16)']}
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
                  {triLang(lang, { ru: 'Бонус лиги открыт', uk: 'Бонус ліги відкрито', es: 'Bono de liga abierto' })}
                </Text>

                <Animated.View style={{ alignItems: 'center', transform: [{ translateY: crownFloat }] }}>
                  <View style={[styles.crownHalo, { borderColor: '#16B7D955', backgroundColor: '#16B7D91A' }]}>
                    <Ionicons name="trophy" size={58} color="#F7D774" />
                  </View>
                </Animated.View>

                <Text style={[styles.title, { color: t.textPrimary, fontSize: Math.max(26, f.h1 + 2) }]}>
                  {isCrownWinner
                    ? triLang(lang, { ru: 'Ты взял корону', uk: 'Ти взяв корону', es: 'Tomaste la corona' })
                    : triLang(lang, { ru: 'Награды готовы', uk: 'Нагороди готові', es: 'Recompensas listas' })}
                </Text>
                <View style={{ alignItems: 'center', maxWidth: '100%' }}>
                  <LeagueCrownName text={crownDisplayName} fontSize={Math.max(16, f.body)} />
                </View>

                <View style={styles.rewardsGrid}>
                  {REWARDS.map((reward) => (
                    <View key={reward.icon} style={[styles.reward, { backgroundColor: t.bgSurface, borderColor: t.border }]}>
                      <Ionicons name={reward.icon} size={20} color="#16B7D9" />
                      <Text style={[styles.rewardTitle, { color: t.textPrimary }]} numberOfLines={1}>
                        {reward.title}
                      </Text>
                      <Text style={[styles.rewardCaption, { color: t.textMuted, fontSize: Math.max(10, f.caption - 1) }]} numberOfLines={1}>
                        {triLang(lang, { ru: reward.captionRu, uk: reward.captionUk, es: reward.captionEs })}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={styles.actions}>
                  <TouchableOpacity
                    activeOpacity={0.86}
                    onPress={() => {
                      void shareLeagueChest();
                    }}
                    style={[styles.secondaryBtn, { borderColor: '#16B7D955', backgroundColor: '#16B7D91A' }]}
                  >
                    <Ionicons name="share-social-outline" size={18} color="#16B7D9" />
                    <Text style={[styles.secondaryText, { color: t.textPrimary }]}>
                      {triLang(lang, { ru: 'Поделиться', uk: 'Поділитися', es: 'Compartir' })}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.86}
                    onPress={() => {
                      hapticTap();
                      onShowLeaderboard?.();
                    }}
                    style={[styles.secondaryBtn, { borderColor: t.border, backgroundColor: t.bgSurface }]}
                  >
                    <Ionicons name="podium-outline" size={18} color={t.textPrimary} />
                    <Text style={[styles.secondaryText, { color: t.textPrimary }]}>
                      {triLang(lang, { ru: 'Лидерборд', uk: 'Лідерборд', es: 'Ranking' })}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => {
                      hapticTap();
                      onClose();
                    }}
                    style={styles.primaryBtn}
                  >
                    <LinearGradient colors={['#16B7D9', '#0A8FB8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                    <Text style={styles.primaryText}>{triLang(lang, { ru: 'Забрать', uk: 'Забрати', es: 'Recoger' })}</Text>
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
  title: {
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  rewardsGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 18,
  },
  reward: {
    width: '48%',
    minHeight: 82,
    borderRadius: 12,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  rewardTitle: {
    fontSize: 17,
    fontWeight: '900',
    marginTop: 5,
  },
  rewardCaption: {
    fontWeight: '800',
    marginTop: 1,
  },
  actions: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  secondaryBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 0.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryText: {
    fontSize: 13,
    fontWeight: '900',
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
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});
