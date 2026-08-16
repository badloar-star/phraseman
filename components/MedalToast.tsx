import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, PanResponder, Text, View, StyleSheet } from 'react-native';
import Reanimated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from './SafeLinearGradient';
import type { MedalTier } from '../app/medal_utils';
import { triLang, type Lang } from '../constants/i18n';
import type { ThemeMode } from '../constants/theme';
import { getMedalToastThemeStyle } from './medalToastThemeStyles';
import { noAndroidOutline } from '../constants/androidGlow';
import { LUM } from '../constants/motionHybrid';

interface MedalPalette {
  primary: string;
  glow: string;
}

const TIER_PALETTES: Record<Exclude<MedalTier, 'none'>, MedalPalette> = {
  bronze: {
    primary: '#D08C4A',
    glow: 'rgba(208,140,74,0.45)',
  },
  silver: {
    primary: '#72D8FF',
    glow: 'rgba(114,216,255,0.45)',
  },
  gold: {
    primary: '#F2C44A',
    glow: 'rgba(242,196,74,0.55)',
  },
};

const MEDAL_IMAGES: Record<Exclude<MedalTier, 'none'>, any> = {
  bronze: require('../assets/images/levels/bronza.webp'),
  silver: require('../assets/images/levels/serebro.webp'),
  gold: require('../assets/images/levels/zoloto.webp'),
};

interface MedalToastProps {
  tier: MedalTier;
  promoted: boolean;
  /** Animated value 0→1 controlling opacity, lift and scale */
  anim: Animated.Value;
  /** Theme background colour (used as a solid base under the gradient) */
  bg: string;
  /** Whether the active theme is light (drives text colors) */
  isLightTheme: boolean;
  /** Active app theme, used for theme-specific medal toast treatment */
  themeMode?: ThemeMode;
  /** Bottom offset in px */
  bottom?: number;
  lang: Lang;
  /** Whether spanish UI is active (lang==='es' & study target spanish) */
  spanishUiActive: boolean;
  /** Swipe left/right or upward to dismiss immediately. */
  onDismiss?: () => void;
  /** dev-only: витрина движения запускает гибрид «Световод» рядом с боевым видом. Default 'classic'. */
  motionVariant?: 'classic' | 'hybrid';
}

interface Labels {
  title: string;
  subtitle: string;
}

function pickLabels(
  tier: MedalTier,
  promoted: boolean,
  lang: Lang,
  spanishUiActive: boolean,
): Labels {
  if (tier === 'none') return { title: '', subtitle: '' };

  const RU: Record<Exclude<MedalTier, 'none'>, { up: Labels; down: Labels }> = {
    bronze: {
      up:   { title: 'Бронзовая медаль',    subtitle: 'Хорошее начало — продолжай в том же духе' },
      down: { title: 'Бронза потеряна',     subtitle: 'Несколько верных ответов — и она вернётся' },
    },
    silver: {
      up:   { title: 'Серебряная медаль',   subtitle: 'Отличный результат, ты почти у золота' },
      down: { title: 'Серебро потеряно',    subtitle: 'Чуть больше точности — и оно вернётся' },
    },
    gold: {
      up:   { title: 'Золотая медаль',      subtitle: 'Идеальный круг — урок пройден на отлично' },
      down: { title: 'Золото потеряно',     subtitle: 'Пройди ещё один круг без ошибок' },
    },
  };

  const UK: Record<Exclude<MedalTier, 'none'>, { up: Labels; down: Labels }> = {
    bronze: {
      up:   { title: 'Бронзова медаль',     subtitle: 'Гарний початок — продовжуй у тому ж дусі' },
      down: { title: 'Бронзу втрачено',     subtitle: 'Кілька правильних відповідей — і вона повернеться' },
    },
    silver: {
      up:   { title: 'Срібна медаль',       subtitle: 'Чудовий результат, ти майже біля золота' },
      down: { title: 'Срібло втрачено',     subtitle: 'Трохи більше точності — і воно повернеться' },
    },
    gold: {
      up:   { title: 'Золота медаль',       subtitle: 'Ідеальне коло — урок пройдено на відмінно' },
      down: { title: 'Золото втрачено',     subtitle: 'Пройди ще одне коло без помилок' },
    },
  };

  const ES: Record<Exclude<MedalTier, 'none'>, { up: Labels; down: Labels }> = {
    bronze: {
      up:   { title: 'Medalla de bronce',   subtitle: 'Buen comienzo — sigue así' },
      down: { title: 'Bronce perdido',      subtitle: 'Unos cuantos aciertos y la recuperas' },
    },
    silver: {
      up:   { title: 'Medalla de plata',    subtitle: 'Excelente resultado, casi tienes el oro' },
      down: { title: 'Plata perdida',       subtitle: 'Un poco más de precisión y vuelve' },
    },
    gold: {
      up:   { title: 'Medalla de oro',      subtitle: 'Ronda perfecta — lección impecable' },
      down: { title: 'Oro perdido',         subtitle: 'Completa otra ronda sin errores' },
    },
  };

  const PT_BR: Record<Exclude<MedalTier, 'none'>, { up: Labels; down: Labels }> = {
    bronze: {
      up:   { title: 'Medalha de bronze', subtitle: 'Bom começo, continue assim' },
      down: { title: 'Bronze perdido',    subtitle: 'Algumas respostas certas e ela volta' },
    },
    silver: {
      up:   { title: 'Medalha de prata',  subtitle: 'Ótimo resultado, você está quase no ouro' },
      down: { title: 'Prata perdida',     subtitle: 'Um pouco mais de precisão e ela volta' },
    },
    gold: {
      up:   { title: 'Medalha de ouro',   subtitle: 'Rodada perfeita, lição concluída muito bem' },
      down: { title: 'Ouro perdido',      subtitle: 'Complete outra rodada sem erros' },
    },
  };

  const VI: Record<Exclude<MedalTier, 'none'>, { up: Labels; down: Labels }> = {
    bronze: {
      up:   { title: 'Huy chương đồng', subtitle: 'Khởi đầu tốt, hãy tiếp tục như vậy' },
      down: { title: 'Mất huy chương đồng', subtitle: 'Trả lời đúng thêm vài câu là sẽ lấy lại' },
    },
    silver: {
      up:   { title: 'Huy chương bạc', subtitle: 'Kết quả rất tốt, bạn gần chạm tới vàng rồi' },
      down: { title: 'Mất huy chương bạc', subtitle: 'Chính xác hơn một chút là sẽ lấy lại' },
    },
    gold: {
      up:   { title: 'Huy chương vàng', subtitle: 'Một vòng hoàn hảo, bài học rất xuất sắc' },
      down: { title: 'Mất huy chương vàng', subtitle: 'Hoàn thành thêm một vòng không lỗi' },
    },
  };

  const ID: Record<Exclude<MedalTier, 'none'>, { up: Labels; down: Labels }> = {
    bronze: {
      up:   { title: 'Medali perunggu', subtitle: 'Awal yang bagus, teruskan seperti ini' },
      down: { title: 'Perunggu hilang', subtitle: 'Beberapa jawaban benar lagi dan medali ini kembali' },
    },
    silver: {
      up:   { title: 'Medali perak', subtitle: 'Hasil bagus, kamu hampir mencapai emas' },
      down: { title: 'Perak hilang', subtitle: 'Sedikit lebih akurat dan medali ini kembali' },
    },
    gold: {
      up:   { title: 'Medali emas', subtitle: 'Ronde sempurna, pelajaran diselesaikan dengan sangat baik' },
      down: { title: 'Emas hilang', subtitle: 'Selesaikan satu ronde lagi tanpa kesalahan' },
    },
  };

  const TR: Record<Exclude<MedalTier, 'none'>, { up: Labels; down: Labels }> = {
    bronze: {
      up:   { title: 'Bronz madalya', subtitle: 'Güzel başlangıç, böyle devam et' },
      down: { title: 'Bronz kaybedildi', subtitle: 'Birkaç doğru cevapla geri gelir' },
    },
    silver: {
      up:   { title: 'Gümüş madalya', subtitle: 'Harika sonuç, altına çok yaklaştın' },
      down: { title: 'Gümüş kaybedildi', subtitle: 'Biraz daha doğrulukla geri gelir' },
    },
    gold: {
      up:   { title: 'Altın madalya', subtitle: 'Kusursuz tur, dersi çok iyi tamamladın' },
      down: { title: 'Altın kaybedildi', subtitle: 'Bir turu daha hatasız tamamla' },
    },
  };

  const PL: Record<Exclude<MedalTier, 'none'>, { up: Labels; down: Labels }> = {
    bronze: {
      up:   { title: 'Brązowy medal', subtitle: 'Dobry początek, tak trzymaj' },
      down: { title: 'Utracono brąz', subtitle: 'Kilka poprawnych odpowiedzi i medal wróci' },
    },
    silver: {
      up:   { title: 'Srebrny medal', subtitle: 'Świetny wynik, jesteś prawie przy złocie' },
      down: { title: 'Utracono srebro', subtitle: 'Trochę więcej dokładności i medal wróci' },
    },
    gold: {
      up:   { title: 'Złoty medal', subtitle: 'Perfekcyjna runda, lekcja ukończona znakomicie' },
      down: { title: 'Utracono złoto', subtitle: 'Ukończ jeszcze jedną rundę bez błędów' },
    },
  };

  const displayLang: Lang = spanishUiActive ? 'es' : lang;
  const set = triLang(displayLang, {
    ru: RU,
    uk: UK,
    es: ES,
    'pt-BR': PT_BR,
    vi: VI,
    id: ID,
    tr: TR,
    pl: PL,
  });
  return promoted ? set[tier].up : set[tier].down;
}

function MedalToast({
  tier,
  promoted,
  anim,
  bg,
  isLightTheme,
  themeMode,
  bottom = 120,
  lang,
  spanishUiActive,
  onDismiss,
  motionVariant = 'classic',
}: MedalToastProps) {
  const isHybrid = motionVariant === 'hybrid';
  // зачем: гибрид «Световод» (закон Motion DNA) — вход из света БЕЗ отскока
  // (LUM.settle), в отличие от боевой пружины anim с перелётом scale 0.92→1.
  // Каждый sharedValue живёт независимо от boевого `anim`, поэтому классика
  // не трогается: боевой путь остаётся ровно тем же кодом, что и раньше.
  const hybridOpacity = useSharedValue(0);
  const hybridY = useSharedValue(14);
  useEffect(() => {
    if (!isHybrid) return;
    hybridOpacity.value = withTiming(1, { duration: LUM.resolveMs, easing: Easing.out(Easing.cubic) });
    hybridY.value = withSpring(0, LUM.settle);
    return () => {
      cancelAnimation(hybridOpacity);
      cancelAnimation(hybridY);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHybrid]);
  const hybridWrapStyle = useAnimatedStyle(() => ({
    opacity: hybridOpacity.value,
    transform: [{ translateY: hybridY.value }],
  }));

  const labels = useMemo(
    () => pickLabels(tier, promoted, lang, spanishUiActive),
    [tier, promoted, lang, spanishUiActive],
  );
  const dismissActionLabel = useMemo(() => triLang(spanishUiActive ? 'es' : lang, {
    ru: 'Закрыть уведомление',
    uk: 'Закрити сповіщення',
    es: 'Cerrar aviso',
    'pt-BR': 'Fechar aviso',
    vi: 'Đóng thông báo',
    id: 'Tutup pemberitahuan',
    tr: 'Bildirimi kapat',
    pl: 'Zamknij powiadomienie',
  }), [lang, spanishUiActive]);
  const drag = useRef(new Animated.ValueXY()).current;
  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => (
      Boolean(onDismiss)
      && (Math.abs(gesture.dx) > 7 || gesture.dy < -7)
    ),
    onPanResponderMove: Animated.event([null, { dx: drag.x, dy: drag.y }], {
      useNativeDriver: false,
    }),
    onPanResponderRelease: (_event, gesture) => {
      const shouldDismiss = Math.abs(gesture.dx) >= 50
        || gesture.dy <= -38
        || Math.abs(gesture.vx) >= 0.65
        || gesture.vy <= -0.65;
      if (!shouldDismiss || !onDismiss) {
        Animated.spring(drag, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        return;
      }
      Animated.parallel([
        Animated.timing(drag.x, {
          toValue: Math.abs(gesture.dx) >= 20 ? (gesture.dx < 0 ? -420 : 420) : 0,
          duration: 170,
          useNativeDriver: false,
        }),
        Animated.timing(drag.y, {
          toValue: gesture.dy < 0 ? -140 : gesture.dy,
          duration: 170,
          useNativeDriver: false,
        }),
      ]).start(({ finished }) => {
        if (finished) onDismiss();
      });
    },
    onPanResponderTerminate: () => {
      Animated.spring(drag, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
    },
  }), [drag, onDismiss]);

  if (tier === 'none') return null;

  const palette = TIER_PALETTES[tier];

  // Цвета фона/текста под тему
  const visualTheme = getMedalToastThemeStyle(themeMode ?? 'minimalDark');
  const tierAccent = visualTheme.tierAccents[tier] ?? palette.primary;
  const tierGlow = visualTheme.tierGlows[tier] ?? palette.glow;
  const accent = promoted ? tierAccent : visualTheme.badgeDownColor;

  // зачем: гибрид рендерит через Reanimated.View (LUM.settle, без отскока
  // scale) — боевой путь остаётся на Animated.Value с прежней пружиной anim.
  const WrapView = isHybrid ? Reanimated.View : Animated.View;
  const wrapStyle = isHybrid
    ? [styles.wrap, { bottom }, hybridWrapStyle]
    : [
        styles.wrap,
        {
          bottom,
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) },
            { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
          ],
        },
      ];

  return (
    <WrapView pointerEvents={onDismiss ? 'box-none' : 'none'} style={wrapStyle}>
      <Animated.View
        pointerEvents={onDismiss ? 'auto' : 'none'}
        {...(onDismiss ? panResponder.panHandlers : {})}
        accessible={Boolean(onDismiss)}
        accessibilityRole="alert"
        accessibilityLabel={`${labels.title}. ${labels.subtitle}`}
        accessibilityActions={onDismiss ? [{ name: 'dismiss', label: dismissActionLabel }] : undefined}
        onAccessibilityAction={onDismiss ? (event) => {
          if (event.nativeEvent.actionName === 'dismiss') onDismiss();
        } : undefined}
        style={{ transform: [{ translateX: drag.x }, { translateY: drag.y }] }}
      >
      {/* зачем: свечение вокруг тоста (halo + aura + цветная тень по акценту медали)
          выбивалось из дизайна — убрано. Плашка отделяется от фона тоном градиента
          и мягкой нейтральной тенью, без цветного ореола. */}
      <LinearGradient
        colors={visualTheme.cardBgColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.card,
          {
            borderColor: visualTheme.borderColor,
            backgroundColor: bg,
          },
        ]}
      >
        {/* Тонкий хайлайт-полоска сверху */}
        <View
          pointerEvents="none"
          style={[
            styles.texture,
            {
              backgroundColor: visualTheme.textureColor,
              opacity: visualTheme.textureOpacity,
            },
          ]}
        />
        <LinearGradient
          colors={visualTheme.topShineColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.topShine,
            { opacity: visualTheme.topShineOpacity },
          ]}
          pointerEvents="none"
        />

        {/* зачем: правило владельца — без обводок; кольцо рисуем тоном:
            внешний слой = цвет бывшей кромки, внутренний = плашка */}
        <View style={[styles.medalSlot, { backgroundColor: visualTheme.medalPlateBorder }]}>
          <View style={[styles.medalSlotInner, { backgroundColor: visualTheme.medalPlateBg }]}>
            <Image
              source={MEDAL_IMAGES[tier]}
              style={styles.medalImage}
              contentFit="contain"
            />
          </View>
        </View>

        <View style={styles.textWrap}>
          <Text
            style={[styles.tierLabel, { color: accent }]}
          >
            {tierBadgeText(tier, promoted, lang, spanishUiActive)}
          </Text>
          <Text
            style={[styles.title, { color: visualTheme.titleColor }]}
          >
            {labels.title}
          </Text>
          <Text
            style={[styles.subtitle, { color: visualTheme.subtitleColor }]}
          >
            {labels.subtitle}
          </Text>
        </View>
      </LinearGradient>
      </Animated.View>
    </WrapView>
  );
}

function tierBadgeText(
  tier: MedalTier,
  promoted: boolean,
  lang: Lang,
  spanishUiActive: boolean,
): string {
  if (tier === 'none') return '';
  const displayLang: Lang = spanishUiActive ? 'es' : lang;
  const set = triLang(displayLang, {
    ru: { up: 'НОВЫЙ РАНГ', down: 'РАНГ ПОНИЖЕН' },
    uk: { up: 'НОВИЙ РАНГ', down: 'РАНГ ЗНИЖЕНО' },
    es: { up: 'NUEVO RANGO', down: 'RANGO BAJADO' },
    'pt-BR': { up: 'NOVO RANK', down: 'RANK REDUZIDO' },
    vi: { up: 'HẠNG MỚI', down: 'GIẢM HẠNG' },
    id: { up: 'RANK BARU', down: 'RANK TURUN' },
    tr: { up: 'YENİ RÜTBE', down: 'RÜTBE DÜŞTÜ' },
    pl: { up: 'NOWA RANGA', down: 'RANGA OBNIŻONA' },
  });
  return promoted ? set.up : set.down;
}

export default memo(MedalToast);

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    // зачем: нейтральная мягкая тень вместо цветного свечения по акценту медали —
    // плашка остаётся приподнятой над фоном, но без ореола.
    // зачем: карточка внутри скруглена на 22 и с overflow:hidden, а фон даёт
    // тема — Android заливал квадрат вокруг плашки медали.
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    ...noAndroidOutline,
  },
  card: {
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 0,
    overflow: 'hidden',
  },
  texture: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    opacity: 0.9,
  },
  medalSlot: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalSlotInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalImage: {
    width: 70,
    height: 70,
  },
  textWrap: {
    flex: 1,
  },
  tierLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 3,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 12.5,
    fontWeight: '500',
    lineHeight: 16,
  },
});
