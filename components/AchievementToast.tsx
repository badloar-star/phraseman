import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Animated, TouchableOpacity, StyleSheet, Modal, Pressable, Dimensions, Image, PanResponder,
} from 'react-native';
import Svg from 'react-native-svg';
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
import type { ShareCardLang } from './share_cards/streakCardCopy';
import AchievementShareCardSvg from './share_cards/AchievementShareCardSvg';
import { shareCardFromSvgRef } from './share_cards/shareCardPng';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { MOTION_DURATION, MOTION_SPRING } from '../constants/motion';
import { triLang } from '../constants/i18n';

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
  const bottomOffset = useGlobalBottomOverlayOffset();
  const toastAchShareRef = useRef<InstanceType<typeof Svg> | null>(null);
  const toastCardLang: ShareCardLang = REPORT_SCREENS_RUSSIAN_ONLY
    ? 'ru'
    : lang === 'uk'
      ? 'uk'
      : lang === 'es'
        ? 'es'
        : 'ru';

  const translateY    = useRef(new Animated.Value(160)).current;
  const swipeDy       = useRef(new Animated.Value(0)).current;
  const swipeDx       = useRef(new Animated.Value(0)).current;
  const opacity       = useRef(new Animated.Value(0)).current;
  const scale         = useRef(new Animated.Value(0.88)).current;
  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDragging    = useRef(false);
  const animateOutRef = useRef<() => void>(() => {});
  /** rAF-id для отложенного in-анима. Под Fabric нельзя стартовать
   *  Animated.start() в той же синхронной паузе с маунтом <Animated.View>:
   *  native ещё не закоммитил view-тег, connectAnimatedNodeToView кидает
   *  JSApplicationIllegalArgumentException. */
  const rafInRef      = useRef<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [displayedToast, setDisplayedToast] = useState<typeof currentToast>(null);

  const SWIPE_THRESHOLD = 30;

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
            swipeDy.setValue(0);
            swipeDx.setValue(0);
            dismissCurrent();
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
    if (!currentToast) {
      // Toast was dismissed externally — ensure we hide
      if (timerRef.current) clearTimeout(timerRef.current);
      if (rafInRef.current != null) {
        cancelAnimationFrame(rafInRef.current);
        rafInRef.current = null;
      }
      Animated.parallel([
        Animated.timing(translateY, { toValue: 160, duration: MOTION_DURATION.normal, useNativeDriver: true }),
        Animated.timing(opacity,    { toValue: 0,   duration: MOTION_DURATION.fast, useNativeDriver: true }),
      ]).start(() => setDisplayedToast(null));
      return;
    }
    if (currentToast) {
      // Сбросить таймер предыдущего
      if (timerRef.current) clearTimeout(timerRef.current);
      if (rafInRef.current != null) cancelAnimationFrame(rafInRef.current);
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
    };
  }, [currentToast, translateY, opacity, scale, swipeDx, swipeDy, dismissCurrent]);

  const animateOut = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 160, duration: MOTION_DURATION.slow, useNativeDriver: true }),
      Animated.timing(opacity,    { toValue: 0,   duration: MOTION_DURATION.normal, useNativeDriver: true }),
    ]).start(() => {
      dismissCurrent();
    });
  };
  // Держим ref актуальным чтобы panResponder мог вызвать animateOut без stale closure
  animateOutRef.current = animateOut;

  const handlePress = () => {
    hapticTap();
    if (timerRef.current) clearTimeout(timerRef.current);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    hapticTap();
    setModalVisible(false);
    animateOut();
  };

  if (!displayedToast) return null;

  const name = triLang(lang, {
    uk: displayedToast.nameUk,
    ru: displayedToast.nameRu,
    es: displayedToast.nameEs ?? displayedToast.nameRu,
  });
  const desc = triLang(lang, {
    uk: displayedToast.descUk,
    ru: displayedToast.descRu,
    es: displayedToast.descEs ?? displayedToast.descRu,
  });
  const label = triLang(lang, {
    uk: 'Досягнення розблоковано!',
    ru: 'Достижение разблокировано!',
    es: '¡Logro desbloqueado!',
  });
  const iconName = ACHIEVEMENT_ICON[displayedToast.id] ?? 'star';
  const color = CAT_COLOR[displayedToast.category] ?? '#888';

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
            <Pressable onPress={e => e.stopPropagation()}>
              <View style={[s.modalCard, { backgroundColor: t.bgCard }]}>
                <View
                  pointerEvents="none"
                  collapsable={false}
                  style={{ position: 'absolute', width: 1, height: 1, opacity: 0, left: 0, top: 0, overflow: 'hidden' }}
                >
                  <AchievementShareCardSvg
                    ref={toastAchShareRef}
                    title={name}
                    lang={toastCardLang}
                    layoutSize={1080}
                  />
                </View>
                <BadgeShield
                  unlocked={true}
                  inProgress={false}
                  color={color}
                  iconName={iconName}
                  size={88}
                  achievementId={displayedToast.id}
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
                    await shareCardFromSvgRef(toastAchShareRef, {
                      fileNamePrefix: 'phraseman-achievement',
                      textFallback: msg,
                    });
                  }}
                >
                  <Ionicons name="share-outline" size={16} color={t.textSecond} />
                  <Text style={{ color: t.textSecond, fontSize: f.sub }}>
                    {lang === 'uk' ? 'Поділитися' : lang === 'es' ? 'Compartir' : 'Поделиться'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleModalClose}
                  style={[s.closeBtn, { backgroundColor: t.bgSurface2 }]}
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
