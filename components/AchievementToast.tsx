import React, { memo, useEffect, useRef, useState } from 'react';
import {
  View, Text, Animated, TouchableOpacity, StyleSheet, Modal, Pressable, Dimensions, PanResponder, Share,
} from 'react-native';
import Reanimated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  Easing as ReanimatedEasing,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { LinearGradient } from './SafeLinearGradient';
import TapScale from './TapScale';
import { useGlobalBottomOverlayOffset } from '../hooks/use-global-bottom-overlay-offset';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image as ExpoImage } from 'expo-image';
import { useAchievement, isAchievementSummaryToast } from './AchievementContext';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { markAchievementsNotified } from '../app/achievements';
import { ACHIEVEMENT_ES } from '../app/achievements_es_locale';
import { ACHIEVEMENT_ICON, CAT_COLOR, BadgeShield } from '../app/achievements_screen';
import { achievementImageSource } from '../constants/achievementImageAssets';
import { STORE_URL } from '../app/config';
import { buildAchievementShareMessage } from '../app/achievement_share';
import { REPORT_SCREENS_RUSSIAN_ONLY } from '../constants/report_ui_ru';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { MOTION_DURATION, MOTION_SPRING_LEGACY as MOTION_SPRING } from '../constants/motion';
import { LUM, SUITE, TOAST } from '../constants/motionHybrid';
import { triLang } from '../constants/i18n';
import { noAndroidOutline } from '../constants/androidGlow';
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
import { soundDirector } from '../modules/audio/sound_director';
import { useReduceMotion } from '../hooks/use_reduce_motion';

const AUTO_DISMISS_MS = 3800;
const { width: SW } = Dimensions.get('window');
const TOAST_ICON_SLOT_SIZE = 64;
const TOAST_IMAGE_SIZE = 54;
const TOAST_VECTOR_ICON_SIZE = 38;

/**
 * Тост-баннер в нижней части экрана.
 * Монтируется один раз в корне приложения (_layout.tsx), поверх всего.
 * Работает с очередью из AchievementContext.
 *
 * зачем: после приёмки DEV Hub гибрид стал боевым дефолтом; явный `classic`
 * остаётся быстрым путём отката. Гибрид НЕ трогает боевую логику
 * drag-to-dismiss/PanResponder (владелец запретил переписывать рабочее) —
 * это отдельный Reanimated-слой поверх карточки: bloom-подложка из света
 * (LUM) + микро-пульс иконки (SUITE.pulse), синхронизированные с моментом
 * появления карточки.
 */
function AchievementToast({ motionVariant = 'hybrid' }: { motionVariant?: 'classic' | 'hybrid' }) {
  const { currentToast, dismissCurrent } = useAchievement();
  const { theme: t, f, isDark, themeMode } = useTheme();
  const { lang } = useLang();
  const bottomOffset = useGlobalBottomOverlayOffset();
  const toastOverlayVisible = useOverlayVisible('achievementToast', currentToast != null);
  const hybrid = motionVariant === 'hybrid';
  const reduceMotion = useReduceMotion();
  const bloom = useSharedValue(0);
  const iconPulse = useSharedValue(1);

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
  /** id тоста, для которого звук и вибрация уже отыграли.
   *
   *  зачем: владелец слышал, как один и тот же звук сам повторялся 4-5 раз с
   *  интервалом ~секунду, уже после закрытия окна. Причина: эффект ниже зависит
   *  от `toastOverlayVisible`, а слот арбитра у транзиентных тостов отбирается
   *  сторожем (isForceEvictable) в пользу ждущего actionToast и потом
   *  возвращается. Каждое возвращение видимости при ТОМ ЖЕ currentToast
   *  перезапускало эффект и просило звук заново; cooldown события (1.6-1.8с у
   *  reward/success) глушил часть попыток, а остальные пролезали — отсюда и
   *  «раз в секунду». Звук привязан к тосту, а не к видимости слота. */
  const cuedToastIdRef = useRef<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [displayedToast, setDisplayedToast] = useState<typeof currentToast>(null);
  const [toastImageFailed, setToastImageFailed] = useState(false);

  const SWIPE_THRESHOLD = 30;

  useEffect(() => () => {
    cancelScheduledAnimatedStateUpdates(scheduledStateUpdatesRef);
  }, []);

  useEffect(() => {
    setToastImageFailed(false);
  }, [displayedToast?.id]);

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

  // Тост ушёл из очереди — снимаем отметку «отклик уже отыграл». Сброс привязан
  // ИМЕННО к исчезновению тоста, а не к потере видимости: слот у тоста арбитр
  // отбирает и возвращает по ходу показа, и сброс по видимости вернул бы
  // повторяющийся звук. Сводный тост живёт под постоянным id — без этого сброса
  // его второй показ за сессию остался бы немым.
  useEffect(() => {
    if (!currentToast) cuedToastIdRef.current = null;
  }, [currentToast]);

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

      // Вибрация и звук — РОВНО один раз на тост. Повторный вход в эффект при
      // том же достижении (арбитр вернул слот после выселения) отклик не даёт:
      // иначе один звук сам собой отбивал серию с интервалом ~секунду.
      if (cuedToastIdRef.current !== currentToast.id) {
        cuedToastIdRef.current = currentToast.id;
        hapticSuccess();
        soundDirector.request('pm.reward.achievement', {
          scope: 'achievement-toast',
          dedupeKey: currentToast.id,
          deferAfterVoice: true,
        });
      }

      // Пометить как notified. У сводки гасим ВСЮ свёрнутую пачку разом — иначе
      // следующий flushPending поднял бы те же достижения снова и лента вернулась бы.
      markAchievementsNotified(
        isAchievementSummaryToast(currentToast) ? currentToast.summaryIds : [currentToast.id],
      );

      // Slide up + fade in + scale
      translateY.setValue(hybrid && reduceMotion ? 0 : 160);
      swipeDy.setValue(0);
      swipeDx.setValue(0);
      opacity.setValue(hybrid && reduceMotion ? 1 : 0);
      scale.setValue(hybrid && reduceMotion ? 1 : 0.88);
      /** Откладываем старт на следующий кадр: даём Fabric закоммитить
       *  Animated.View, иначе connectAnimatedNodeToView падает (RedBox в dev). */
      if (!(hybrid && reduceMotion)) rafInRef.current = requestAnimationFrame(() => {
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

      // Гибрид: bloom-подложка загорается следом за карточкой, потом иконка
      // получает микро-пульс (SUITE.pulse) — «удар» кульминации, но лёгкий
      // (это не единственный герой награды, тот случай — RewardImpactRings).
      if (hybrid && !reduceMotion) {
        bloom.value = 0;
        iconPulse.value = 1;
        bloom.value = withDelay(TOAST.enterMs * 0.4, withTiming(1, { duration: TOAST.enterMs, easing: ReanimatedEasing.out(ReanimatedEasing.cubic) }));
        iconPulse.value = withDelay(
          TOAST.enterMs + 40,
          withSequence(
            withSpring(1.14, SUITE.pulse),
            withSpring(1, SUITE.pulse),
          ),
        );
      }

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
      cancelAnimation(bloom);
      cancelAnimation(iconPulse);
    };
  }, [currentToast, toastOverlayVisible, translateY, opacity, scale, swipeDx, swipeDy, dismissCurrent, hybrid, reduceMotion, bloom, iconPulse]);

  // Гибрид: bloom-подложка (opacity 0→~0.5) и микро-пульс иконки — тот же
  // приём, что и в ActionToastHybridCard (components/ActionToast.tsx).
  const bloomStyle = useAnimatedStyle(() => ({ opacity: bloom.value * 0.5 }));
  const iconPulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: iconPulse.value }] }));

  const animateOut = (forceDismiss = false) => {
    if (hybrid && reduceMotion) {
      if (!forceDismiss && modalVisibleRef.current) return;
      scheduleTrackedAnimatedStateUpdate(scheduledStateUpdatesRef, dismissCurrent);
      return;
    }
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
    // зачем: у сводки нет одного «своего» достижения, поэтому детальная модалка ей
    // не подходит — по тапу ведём на экран достижений, где видна вся открытая пачка.
    // Тост убираем сразу (animateOut), чтобы он не висел поверх нового экрана.
    if (isAchievementSummaryToast(displayedToast)) {
      animateOut(true);
      router.push('/achievements_screen' as never);
      return;
    }
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

  // Сводка целой пачки: одна карточка «Открыто N достижений» вместо ленты тостов.
  const summary = isAchievementSummaryToast(displayedToast) ? displayedToast : null;

  const name = triLang(lang, {
    uk: displayedToast.nameUk,
    ru: displayedToast.nameRu,
    es: displayedToast.nameEs ?? ACHIEVEMENT_ES[displayedToast.id]?.nameEs ?? displayedToast.nameRu,
    'pt-BR': 'Conquista desbloqueada',
    vi: 'Thành tích đã mở khóa',
    id: 'Pencapaian terbuka',
    tr: 'Başarım açıldı',
    pl: 'Osiągnięcie odblokowane',
  });
  const desc = triLang(lang, {
    uk: displayedToast.descUk,
    ru: displayedToast.descRu,
    es: displayedToast.descEs ?? ACHIEVEMENT_ES[displayedToast.id]?.descEs ?? displayedToast.descRu,
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
  // Сводка: имя = счётчик, описание = приглашение открыть список. Славянская
  // плюрализация обязательна — «5 достижения» читается как брак.
  const n = summary?.summaryCount ?? 0;
  const slavicPlural = (one: string, few: string, many: string): string => {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
  };
  const summaryName = summary ? triLang(lang, {
    uk: `Відкрито ${n} ${slavicPlural('досягнення', 'досягнення', 'досягнень')}`,
    ru: `Открыто ${n} ${slavicPlural('достижение', 'достижения', 'достижений')}`,
    es: `${n} logros desbloqueados`,
    'pt-BR': `${n} conquistas desbloqueadas`,
    vi: `Đã mở khóa ${n} thành tích`,
    id: `${n} pencapaian terbuka`,
    tr: `${n} başarım açıldı`,
    pl: `Odblokowano ${n} ${slavicPlural('osiągnięcie', 'osiągnięcia', 'osiągnięć')}`,
  }) : '';
  const summaryLabel = triLang(lang, {
    uk: 'Нові досягнення',
    ru: 'Новые достижения',
    es: 'Nuevos logros',
    'pt-BR': 'Novas conquistas',
    vi: 'Thành tích mới',
    id: 'Pencapaian baru',
    tr: 'Yeni başarımlar',
    pl: 'Nowe osiągnięcia',
  });
  const summaryDesc = triLang(lang, {
    uk: 'Торкніться, щоб переглянути',
    ru: 'Нажмите, чтобы посмотреть',
    es: 'Toca para verlos',
    'pt-BR': 'Toque para ver',
    vi: 'Chạm để xem',
    id: 'Ketuk untuk melihat',
    tr: 'Görmek için dokun',
    pl: 'Dotknij, aby zobaczyć',
  });
  const shareLabel = triLang(lang, {
    uk: 'Поділитися',
    ru: 'Поделиться',
    es: 'Compartir',
    'pt-BR': 'Compartilhar',
    vi: 'Chia sẻ',
    id: 'Bagikan',
    tr: 'Paylaş',
    pl: 'Udostępnij',
  });
  const closeLabel = triLang(lang, {
    uk: 'Закрити',
    ru: 'Закрыть',
    es: 'Cerrar',
    'pt-BR': 'Fechar',
    vi: 'Đóng',
    id: 'Tutup',
    tr: 'Kapat',
    pl: 'Zamknij',
  });
  // У сводки нет собственного арта и категории — берём трофей и золото темы,
  // чтобы пачка читалась как отдельная сущность, а не как одно из достижений.
  const iconName = summary ? 'trophy' : (ACHIEVEMENT_ICON[displayedToast.id] ?? 'star');
  const color = summary ? t.gold : (CAT_COLOR[displayedToast.category] ?? '#888');
  const modalAccent = rewardModalAccentColor(themeMode, t);
  const achievementBorderColor = color.startsWith('#') && color.length === 7 ? `${color}88` : color;
  // зачем: арт «первых» достижений лежит в бандле (мгновенно, офлайн), остальной
  // стримится из Storage и берётся из прогретого дискового кэша. Пока картинки
  // нет — тост показывает векторную иконку категории, а не пустоту.
  const toastImageSource = summary ? null : achievementImageSource(displayedToast.id);

  return (
    <>
      <View style={[s.containerAnchor, { bottom: bottomOffset }]}>
        <Animated.View
          style={[
            s.containerMotion,
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
              shadowColor: '#000',
            },
          ]}
        >
          {hybrid && (
            <Reanimated.View
              pointerEvents="none"
              style={[StyleSheet.absoluteFillObject, { backgroundColor: color + '22' }, bloomStyle]}
            />
          )}
          {/* Иконка */}
          <Reanimated.View style={[s.iconWrap, { backgroundColor: color + '22', borderColor: color + '55' }, hybrid && iconPulseStyle]}>
            {toastImageSource && !toastImageFailed
              ? (
                <ExpoImage
                  source={toastImageSource}
                  style={s.toastAchievementImage}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                  transition={0}
                  onError={() => setToastImageFailed(true)}
                />
              )
              : <Ionicons name={iconName} size={TOAST_VECTOR_ICON_SIZE} color={color} />
            }
          </Reanimated.View>

          {/* Текст */}
          <View style={s.textWrap}>
            <Text style={[s.label, { color: t.textSecond, fontSize: f.label }]}>
              {summary ? summaryLabel : label}
            </Text>
            <Text style={[s.name, { color: t.textPrimary, fontSize: f.bodyLg }]} numberOfLines={1}>
              {summary ? summaryName : name}
            </Text>
            <Text style={[s.desc, { color: t.textMuted, fontSize: f.sub }]} numberOfLines={1}>
              {summary ? summaryDesc : desc}
            </Text>
          </View>

          {/* Мерцающий индикатор */}
          <Text style={[s.sparks, { fontSize: f.numMd }]}>✦</Text>
        </TouchableOpacity>
        </Animated.View>
      </View>

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
                    backgroundColor: rewardModalPanelColors(themeMode, t)[1],
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

                <TapScale
                  style={s.shareRow}
                  onPress={async () => {
                    const msg = buildAchievementShareMessage(REPORT_SCREENS_RUSSIAN_ONLY ? 'ru' : lang, name, STORE_URL);
                    await Share.share({ message: msg }).catch(() => {});
                  }}
                >
                  <Ionicons name="share-outline" size={16} color={modalAccent} />
                  <Text style={{ color: modalAccent, fontSize: f.sub, fontWeight: '700' }}>
                    {shareLabel}
                  </Text>
                </TapScale>

                <TapScale
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
                    {closeLabel}
                  </Text>
                </TapScale>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

export default memo(AchievementToast);

const s = StyleSheet.create({
  containerAnchor: {
    position:  'absolute',
    bottom:    0,
    left:      14,
    right:     14,
    zIndex:    9999,
  },
  containerMotion: {
    width: '100%',
  },
  card: {
    flexDirection:  'row',
    alignItems:     'center',
    borderRadius:   20,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap:            12,
    // зачем: фон плашки достижения приходит из темы — Android рисовал квадрат
    // вокруг скругления 20. На iOS тень остаётся как была.
    shadowOffset:   { width: 0, height: 4 },
    shadowOpacity:  0.18,
    shadowRadius:   8,
    ...noAndroidOutline,
  },
  iconWrap: {
    width:         TOAST_ICON_SLOT_SIZE,
    height:        TOAST_ICON_SLOT_SIZE,
    borderRadius:  16,
    borderWidth:   0,
    justifyContent: 'center',
    alignItems:    'center',
  },
  toastAchievementImage: {
    width: TOAST_IMAGE_SIZE,
    height: TOAST_IMAGE_SIZE,
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
    borderWidth: 0,
    padding: 24,
    alignItems: 'center',
    width: SW - 48,
    gap: 12,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.28,
    shadowRadius: 26,
    ...noAndroidOutline,
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
    borderWidth: 0,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginTop: 4,
  },
});
