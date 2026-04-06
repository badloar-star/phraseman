import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Animated, TouchableOpacity, StyleSheet, Modal, Pressable, Share, Dimensions, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAchievement } from './AchievementContext';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { markAchievementsNotified } from '../app/achievements';
import { ACHIEVEMENT_ICON, ACHIEVEMENT_IMAGE, CAT_COLOR, BadgeShield } from '../app/achievements_screen';
import { STORE_URL } from '../app/config';
import * as Haptics from 'expo-haptics';

const AUTO_DISMISS_MS = 3800;
const { width: SW } = Dimensions.get('window');

/**
 * Тост-баннер в нижней части экрана.
 * Монтируется один раз в корне приложения (_layout.tsx), поверх всего.
 * Работает с очередью из AchievementContext.
 */
export default function AchievementToast() {
  const { currentToast, dismissCurrent } = useAchievement();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const isUK = lang === 'uk';

  const translateY = useRef(new Animated.Value(160)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const scale      = useRef(new Animated.Value(0.88)).current;
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (currentToast) {
      // Сбросить таймер предыдущего
      if (timerRef.current) clearTimeout(timerRef.current);
      setModalVisible(false);

      // Вибрация
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}

      // Пометить как notified
      markAchievementsNotified([currentToast.id]);

      // Slide up + fade in + scale
      translateY.setValue(160);
      opacity.setValue(0);
      scale.setValue(0.88);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0,   useNativeDriver: true, tension: 65, friction: 9 }),
        Animated.timing(opacity,    { toValue: 1,   duration: 250, useNativeDriver: true }),
        Animated.spring(scale,      { toValue: 1.0, useNativeDriver: true, tension: 65, friction: 9 }),
      ]).start();

      // Автодисмисс
      timerRef.current = setTimeout(() => {
        animateOut();
      }, AUTO_DISMISS_MS);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentToast?.id]);

  const animateOut = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 160, duration: 300, useNativeDriver: true }),
      Animated.timing(opacity,    { toValue: 0,   duration: 250, useNativeDriver: true }),
    ]).start(() => {
      dismissCurrent();
    });
  };

  const handlePress = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    animateOut();
  };

  if (!currentToast) return null;

  const name = isUK ? currentToast.nameUk : currentToast.nameRu;
  const desc = isUK ? currentToast.descUk : currentToast.descRu;
  const label = isUK ? 'Досягнення розблоковано!' : 'Достижение разблокировано!';
  const iconName = ACHIEVEMENT_ICON[currentToast.id] ?? 'star';
  const color = CAT_COLOR[currentToast.category] ?? '#888';

  return (
    <>
      <Animated.View
        pointerEvents="box-none"
        style={[
          s.container,
          {
            transform: [{ translateY }, { scale }],
            opacity,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={handlePress}
          style={[
            s.card,
            {
              backgroundColor: t.bgCard,
              borderColor: t.textSecond,
              shadowColor: t.textSecond,
            },
          ]}
        >
          {/* Иконка */}
          <View style={[s.iconWrap, { backgroundColor: color + '22', borderColor: color + '55' }]}>
            {ACHIEVEMENT_IMAGE[currentToast.id]
              ? <Image source={ACHIEVEMENT_IMAGE[currentToast.id]} style={{ width: 36, height: 36 }} resizeMode="contain" />
              : <Ionicons name={iconName} size={28} color={color} />
            }
          </View>

          {/* Текст */}
          <View style={s.textWrap}>
            <Text style={[s.label, { color: t.textSecond }]}>{label}</Text>
            <Text style={[s.name, { color: t.textPrimary, fontSize: f.bodyLg }]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[s.desc, { color: t.textMuted, fontSize: f.sub }]} numberOfLines={1}>
              {desc}
            </Text>
          </View>

          {/* Мерцающий индикатор */}
          <Text style={s.sparks}>✦</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Модал при тапе */}
      {modalVisible && (
        <Modal transparent animationType="fade" onRequestClose={handleModalClose}>
          <Pressable
            style={s.modalOverlay}
            onPress={handleModalClose}
          >
            <Pressable onPress={e => e.stopPropagation()}>
              <View style={[s.modalCard, { backgroundColor: t.bgCard }]}>
                <BadgeShield
                  unlocked={true}
                  inProgress={false}
                  color={color}
                  iconName={iconName}
                  size={88}
                  achievementId={currentToast.id}
                />

                <Text style={[s.modalName, { color, fontSize: f.h2 }]}>
                  {name}
                </Text>

                <Text style={[s.modalDesc, { color: t.textMuted, fontSize: f.body }]}>
                  {desc}
                </Text>

                <TouchableOpacity
                  style={s.shareRow}
                  onPress={async () => {
                    const msg = isUK
                      ? `Здобув досягнення «${name}» у Phraseman! 🏅\n${STORE_URL}`
                      : `Получил достижение «${name}» в Phraseman! 🏅\n${STORE_URL}`;
                    try { await Share.share({ message: msg }); } catch {}
                  }}
                >
                  <Ionicons name="share-outline" size={16} color={t.textSecond} />
                  <Text style={{ color: t.textSecond, fontSize: f.sub }}>
                    {isUK ? 'Поділитися' : 'Поделиться'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleModalClose}
                  style={[s.closeBtn, { backgroundColor: t.bgSurface2 }]}
                >
                  <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                    {isUK ? 'Закрити' : 'Закрыть'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

const s = StyleSheet.create({
  container: {
    position:  'absolute',
    bottom:    88,
    left:      14,
    right:     14,
    zIndex:    9999,
  },
  card: {
    flexDirection:  'row',
    alignItems:     'center',
    borderRadius:   20,
    borderWidth:    1.5,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap:            12,
    shadowOffset:   { width: 0, height: 4 },
    shadowOpacity:  0.25,
    shadowRadius:   12,
    elevation:      10,
  },
  iconWrap: {
    width:         54,
    height:        54,
    borderRadius:  14,
    borderWidth:   1,
    justifyContent: 'center',
    alignItems:    'center',
  },
  textWrap: {
    flex: 1,
    gap:  2,
  },
  label: {
    fontSize:    11,
    fontWeight:  '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  name: {
    fontWeight: '700',
    lineHeight: 20,
  },
  desc: {
    lineHeight: 17,
  },
  sparks: {
    fontSize: 20,
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: SW - 48,
    gap: 12,
  },
  modalName: {
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 4,
  },
  modalDesc: {
    textAlign: 'center',
    lineHeight: 22,
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  closeBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginTop: 4,
  },
});
