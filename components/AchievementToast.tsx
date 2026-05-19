import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Animated, TouchableOpacity, StyleSheet, Modal, Pressable, Dimensions, Image, PanResponder, Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useGlobalBottomOverlayOffset } from '../hooks/use-global-bottom-overlay-offset';
import { Ionicons } from '@expo/vector-icons';
import { useAchievement } from './AchievementContext';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { markAchievementsNotified } from '../app/achievements';
import { ACHIEVEMENT_ICON, ACHIEVEMENT_IMAGE, CAT_COLOR, BadgeShield } from '../app/achievements_screen';
import { STORE_URL } from '../app/config';
import { buildAchievementShareMessage } from '../app/achievement_share';
import { REPORT_SCREENS_RUSSIAN_ONLY } from '../constants/report_ui_ru';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { MOTION_DURATION, MOTION_SPRING } from '../constants/motion';
import { triLang } from '../constants/i18n';
import { useOverlayVisible } from './OverlayArbiter';
import {
  cancelScheduledAnimatedStateUpdates,
  scheduleTrackedAnimatedStateUpdate,
  type ScheduledAnimatedStateUpdate,
} from './animationScheduling';
import {
  RewardModalBackdrop,
  rewardModalAccentColor,
  rewardModalPanelBorder,
  rewardModalPanelColors,
  rewardModalSoftSurface,
} from './RewardModalBackdrop';

const AUTO_DISMISS_MS = 3800;
const { width: SW } = Dimensions.get('window');

/**
 * Тост-баннер в нижней части экрана.
 * Монтируется один раз в корне приложения (_layout.tsx), поверх всего.
 * Работает с очередью из AchievementContext.
 */
export default function AchievementToast() {
  const { currentToast, dismissCurrent } = useAchievement();
  const { theme: t, f, isDark, themeMode } = useTheme();
  const { lang } = useLang();
  const bottomOffset = useGlobalBottomOverlayOffset();
  const toastOverlayVisible = useOverlayVisible('achievementToast', currentToast != null);

  const translateY    = useRef(new Animated.Value(160)).current;
  const swipeDy       = useRef(new Animated.Value(0)).current;
  const swipeDx       = useRef(new Animated.Value(0)).current;
  const opacity       = useRef(new Animated.Value(0)).current;
  const scale         = useRef(new Animated.Value(0.88)).current;
  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDragging    = useRef(false);
  const animateOutRef = useRef<() => void>(() => {});
  const modalVisibleRef = useRef(false);
  /** rAF-id для отложенного in-анима. Под Fabric нельзя стартовать
   *  Animated.start() в той же синхронной паузе с маунтом <Animated.View>:
   *  native ещё не закоммитил view-тег, connectAnimatedNodeToView кидает
   *  JSApplicationIllegalArgumentException. */
  const rafInRef      = useRef<number | null>(null);
  const scheduledStateUpdatesRef = useRef<ScheduledAnimatedStateUpdate[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [displayedToast, setDisplayedToast] = useState<typeof currentToast>(null);

  const SWIPE_THRESHOLD = 30;

  useEffect(() => () => {
    cancelScheduledAnimatedStateUpdates(scheduledStateUpdatesRef);
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 || Math.abs(g.dy) > 8,
      onPanResponderGrant: () => {
        isDragging.current = true;
        if (timerRef.current) clearTimeout(timerRef.current);
      },
      onPanResponderMove: (_, g) => {
        swipeDy.setValue(g.dy);
        swipeDx.setValue(g.dx);
      },
      onPanResponderRelease: (_, g) => {
        isDragging.current = false;
        const farEnough = Math.abs(g.dx) > SWIPE_THRESHOLD || Math.abs(g.dy) > SWIPE_THRESHOLD;
        const fastEnough = Math.abs(g.vx) > 0.5 || Math.abs(g.vy) > 0.5;
        if (farEnough || fastEnough) {
          // Улетаем в направлении свайпа
          const toX = g.dx * 3;
          const toY = Math.abs(g.dy) > Math.abs(g.dx) ? (g.dy > 0 ? 200 : -200) : 0;
          Animated.parallel([
            Animated.timing(swipeDx, { toValue: toX, duration: 180, useNativeDriver: true }),
            Animated.timing(swipeDy, { toValue: toY, duration: 180, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0,   duration: 180, useNativeDriver: true }),
          ]).start(() => {
            scheduleTrackedAnimatedStateUpdate(scheduledStateUpdatesRef, () => {
              swipeDy.setValue(0);
              swipeDx.setValue(0);
              dismissCurrent();
            });
          });
        } else {
          // Возвращаем
          Animated.parallel([
            Animated.spring(swipeDy, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
            Animated.spring(swipeDx, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
          ]).start();
          timerRef.current = setTimeout(() => animateOutRef.current(), AUTO_DISMISS_MS);
        }
      },
      onPanResponderTerminate: () => {
        isDragging.current = false;
        Animated.parallel([
          Animated.spring(swipeDy, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
          Animated.spring(swipeDx, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
        ]).start();
        // Restart auto-dismiss timer that was cleared in onPanResponderGrant
        timerRef.current = setTimeout(() => animateOutRef.current(), AUTO_DISMISS_MS);
      },
    })
  ).current;

  useEffect(() => {
    if (!currentToast || !toastOverlayVisible) {
      // Toast was dismissed externally — ensure we hide
      if (timerRef.current) clearTimeout(timerRef.current);
      if (rafInRef.current != null) {
        cancelAnimationFrame(rafInRef.current);
        rafInRef.current = null;
      }
      modalVisibleRef.current = false;
      setModalVisible(false);
      Animated.parallel([
        Animated.timing(translateY, { toValue: 160, duration: MOTION_DURATION.normal, useNativeDriver: true }),
        Animated.timing(opacity,    { toValue: 0,   duration: MOTION_DURATION.fast, useNativeDriver: true }),
      ]).start(() => {
        scheduleTrackedAnimatedStateUpdate(scheduledStateUpdatesRef, () => setDisplayedToast(null));
      });
      return;
    }
    if (currentToast) {
      // Сбросить таймер предыдущего
      if (timerRef.current) clearTimeout(timerRef.current);
      if (rafInRef.current != null) cancelAnimationFrame(rafInRef.current);
      cancelScheduledAnimatedStateUpdates(scheduledStateUpdatesRef);
      modalVisibleRef.current = false;
      setModalVisible(false);

      // Обновить отображаемый тост (без прохода через null — нет мигания)
      setDisplayedToast(currentToast);

      // Вибрация
      hapticSuccess();

      // Пометить как notified
      markAchievementsNotified([currentToast.id]);

      // Slide up + fade in + scale
      translateY.setValue(160);
      swipeDy.setValue(0);
      swipeDx.setValue(0);
      opacity.setValue(0);
      scale.setValue(0.88);
      /** Откладываем старт на следующий кадр: даём Fabric закоммитить
       *  Animated.View, иначе connectAnimatedNodeToView падает (RedBox в dev). */
      rafInRef.current = requestAnimationFrame(() => {
        rafInRef.current = null;
        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: MOTION_SPRING.toast.tension,
            friction: MOTION_SPRING.toast.friction,
          }),
          Animated.timing(opacity,    { toValue: 1, duration: MOTION_DURATION.normal, useNativeDriver: true }),
          Animated.spring(scale, {
            toValue: 1.0,
            useNativeDriver: true,
            tension: MOTION_SPRING.toast.tension,
            friction: MOTION_SPRING.toast.friction,
          }),
        ]).start();
      });

      // Автодисмисс
      timerRef.current = setTimeout(() => {
        animateOutRef.current();
      }, AUTO_DISMISS_MS);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (rafInRef.current != null) {
        cancelAnimationFrame(rafInRef.current);
        rafInRef.current = null;
      }
      cancelScheduledAnimatedStateUpdates(scheduledStateUpdatesRef);
    };
  }, [currentToast, toastOverlayVisible, translateY, opacity, scale, swipeDx, swipeDy, dismissCurrent]);

  const animateOut = (forceDismiss = false) => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 160, duration: MOTION_DURATION.slow, useNativeDriver: true }),
      Animated.timing(opacity,    { toValue: 0,   duration: MOTION_DURATION.normal, useNativeDriver: true }),
    ]).start(() => {
      if (!forceDismiss && modalVisibleRef.current) return;
      scheduleTrackedAnimatedStateUpdate(scheduledStateUpdatesRef, dismissCurrent);
    });
  };
  // Держим ref актуальным чтобы panResponder мог вызвать animateOut без stale closure
  animateOutRef.current = animateOut;

  const handlePress = () => {
    hapticTap();
    if (timerRef.current) clearTimeout(timerRef.current);
    cancelScheduledAnimatedStateUpdates(scheduledStateUpdatesRef);
    modalVisibleRef.current = true;
    setModalVisible(true);
  };

  const handleModalClose = () => {
    hapticTap();
    modalVisibleRef.current = false;
    setModalVisible(false);
    animateOut(true);
  };

  if (!displayedToast || !toastOverlayVisible) return null;

  const name = triLang(lang, {
    uk: displayedToast.nameUk,
    ru: displayedToast.nameRu,
    es: displayedToast.nameEs ?? displayedToast.nameRu,
    'pt-BR': 'Conquista desbloqueada',
    vi: 'Thành tích đã mở khóa',
    id: 'Pencapaian terbuka',
    tr: 'Başarım açıldı',
    pl: 'Osiągnięcie odblokowane',
  });
  const desc = triLang(lang, {
    uk: displayedToast.descUk,
    ru: displayedToast.descRu,
    es: displayedToast.descEs ?? displayedToast.descRu,
    'pt-BR': 'Você desbloqueou uma conquista no app.',
    vi: 'Bạn đã mở khóa một thành tích trong ứng dụng.',
    id: 'Kamu membuka pencapaian di aplikasi.',
    tr: 'Uygulamada bir başarım açtın.',
    pl: 'Odblokowano osiągnięcie w aplikacji.',
  });
  const label = triLang(lang, {
    uk: 'Досягнення розблоковано!',
    ru: 'Достижение разблокировано!',
    es: '¡Logro desbloqueado!',
    'pt-BR': 'Conquista desbloqueada!',
    vi: 'Đã mở khóa thành tích!',
    id: 'Pencapaian terbuka!',
    tr: 'Başarım açıldı!',
    pl: 'Osiągnięcie odblokowane!',
  });
  const iconName = ACHIEVEMENT_ICON[displayedToast.id] ?? 'star';
  const color = CAT_COLOR[displayedToast.category] ?? '#888';
  const modalAccent = rewardModalAccentColor(themeMode, t);
  const achievementBorderColor = color.startsWith('#') && color.length === 7 ? `${color}88` : color;

  return (
    <>
      <Animated.View
        style={[
          s.container,
          { bottom: bottomOffset },
          {
            transform: [
              { translateY: Animated.add(translateY, swipeDy) },
              { translateX: swipeDx },
              { scale },
            ],
            opacity,
          },
        ]}
        {...panResponder.panHandlers}
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
            {ACHIEVEMENT_IMAGE[displayedToast.id]
              ? <Image source={ACHIEVEMENT_IMAGE[displayedToast.id]} style={{ width: 36, height: 36 }} resizeMode="contain" />
              : <Ionicons name={iconName} size={28} color={color} />
            }
          </View>

          {/* Текст */}
          <View style={s.textWrap}>
            <Text style={[s.label, { color: t.textSecond, fontSize: f.label }]}>{label}</Text>
            <Text style={[s.name, { color: t.textPrimary, fontSize: f.bodyLg }]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[s.desc, { color: t.textMuted, fontSize: f.sub }]} numberOfLines={1}>
              {desc}
            </Text>
          </View>

          {/* Мерцающий индикатор */}
          <Text style={[s.sparks, { fontSize: f.numMd }]}>✦</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Модал при тапе */}
      {modalVisible && (
        <Modal transparent animationType="fade" onRequestClose={handleModalClose}>
          <Pressable
            style={s.modalOverlay}
            onPress={handleModalClose}
          >
            <RewardModalBackdrop themeMode={themeMode} intensity="strong" />
            <Pressable onPress={e => e.stopPropagation()}>
              <View
                style={[
                  s.modalCard,
                  {
                    backgroundColor: 'transparent',
                    borderColor: rewardModalPanelBorder(themeMode, t, achievementBorderColor),
                    shadowColor: color,
                  },
                ]}
              >
                <LinearGradient
                  colors={rewardModalPanelColors(themeMode, t)}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
                <View pointerEvents="none" style={[s.modalTopRail, { backgroundColor: color || modalAccent }]} />
                <BadgeShield
                  unlocked={true}
                  inProgress={false}
                  color={color}
                  iconName={iconName}
                  size={88}
                  achievementId={displayedToast.id}
                  isDark={isDark}
                  gold={t.gold}
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
                    const msg = buildAchievementShareMessage(REPORT_SCREENS_RUSSIAN_ONLY ? 'ru' : lang, name, STORE_URL);
                    await Share.share({ message: msg }).catch(() => {});
                  }}
                >
                  <Ionicons name="share-outline" size={16} color={modalAccent} />
                  <Text style={{ color: modalAccent, fontSize: f.sub, fontWeight: '700' }}>
                    {lang === 'uk' ? 'Поділитися' : lang === 'es' ? 'Compartir' : 'Поделиться'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleModalClose}
                  style={[
                    s.closeBtn,
                    {
                      backgroundColor: rewardModalSoftSurface(themeMode, t),
                      borderColor: rewardModalPanelBorder(themeMode, t),
                    },
                  ]}
                >
                  <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                    {lang === 'uk' ? 'Закрити' : lang === 'es' ? 'Cerrar' : 'Закрыть'}
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
    bottom:    0,
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
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    width: SW - 48,
    gap: 12,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.28,
    shadowRadius: 26,
    elevation: 18,
  },
  modalTopRail: {
    position: 'absolute',
    top: 0,
    left: 38,
    right: 38,
    height: 1,
    opacity: 0.78,
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
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginTop: 4,
  },
});
