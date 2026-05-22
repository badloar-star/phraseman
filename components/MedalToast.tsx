import React, { useMemo } from 'react';
import { Animated, Text, View, StyleSheet } from 'react-native';
import { LinearGradient } from './SafeLinearGradient';
import Svg, {
  Defs,
  RadialGradient,
  LinearGradient as SvgLinearGradient,
  Stop,
  Circle,
  Path,
  G,
} from 'react-native-svg';
import type { MedalTier } from '../app/medal_utils';
import { triLang, type Lang } from '../constants/i18n';

interface MedalPalette {
  primary: string;
  light: string;
  dark: string;
  glow: string;
  ribbonStart: string;
  ribbonEnd: string;
}

const TIER_PALETTES: Record<Exclude<MedalTier, 'none'>, MedalPalette> = {
  bronze: {
    primary: '#D08C4A',
    light: '#F4C28A',
    dark: '#7A4318',
    glow: 'rgba(208,140,74,0.45)',
    ribbonStart: '#A0522D',
    ribbonEnd: '#5C2C0F',
  },
  silver: {
    primary: '#D7D9DB',
    light: '#F5F6F7',
    dark: '#7A7B7E',
    glow: 'rgba(215,217,219,0.45)',
    ribbonStart: '#9AA0A4',
    ribbonEnd: '#4F5256',
  },
  gold: {
    primary: '#F2C44A',
    light: '#FFE89B',
    dark: '#8C6517',
    glow: 'rgba(242,196,74,0.55)',
    ribbonStart: '#C58A1A',
    ribbonEnd: '#6E460A',
  },
};

interface PremiumMedalProps {
  tier: Exclude<MedalTier, 'none'>;
  size?: number;
}

function PremiumMedal({ tier, size = 56 }: PremiumMedalProps) {
  const p = TIER_PALETTES[tier];
  const idSuffix = tier;
  return (
    <Svg width={size} height={size * 1.15} viewBox="0 0 56 64">
      <Defs>
        <SvgLinearGradient id={`ribbon-${idSuffix}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={p.ribbonStart} />
          <Stop offset="1" stopColor={p.ribbonEnd} />
        </SvgLinearGradient>
        <RadialGradient id={`disc-${idSuffix}`} cx="0.4" cy="0.35" rx="0.7" ry="0.7">
          <Stop offset="0" stopColor={p.light} />
          <Stop offset="0.55" stopColor={p.primary} />
          <Stop offset="1" stopColor={p.dark} />
        </RadialGradient>
        <SvgLinearGradient id={`rim-${idSuffix}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={p.light} stopOpacity={0.95} />
          <Stop offset="1" stopColor={p.dark} stopOpacity={0.8} />
        </SvgLinearGradient>
        <SvgLinearGradient id={`shine-${idSuffix}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.55} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </SvgLinearGradient>
      </Defs>

      {/* Лента */}
      <Path
        d="M14 4 L20 36 L28 44 L36 36 L42 4 Z"
        fill={`url(#ribbon-${idSuffix})`}
        opacity={0.92}
      />
      <Path
        d="M14 4 L20 36 L28 44 Z"
        fill="#000"
        opacity={0.18}
      />

      {/* Внешнее свечение под диском */}
      <Circle cx="28" cy="40" r="20" fill={p.glow} opacity={0.55} />

      {/* Внешний обод */}
      <Circle
        cx="28"
        cy="40"
        r="18"
        fill={`url(#rim-${idSuffix})`}
      />

      {/* Сам диск */}
      <Circle
        cx="28"
        cy="40"
        r="15.2"
        fill={`url(#disc-${idSuffix})`}
      />

      {/* Внутренний обод-канавка */}
      <Circle
        cx="28"
        cy="40"
        r="15.2"
        fill="none"
        stroke={p.dark}
        strokeOpacity={0.45}
        strokeWidth={0.6}
      />
      <Circle
        cx="28"
        cy="40"
        r="12"
        fill="none"
        stroke={p.light}
        strokeOpacity={0.55}
        strokeWidth={0.6}
      />

      {/* Звезда в центре */}
      <G transform="translate(28 40)">
        <Path
          d="M0 -8 L2 -2.5 L7.6 -2.5 L3.1 1 L4.7 6.5 L0 3.2 L-4.7 6.5 L-3.1 1 L-7.6 -2.5 L-2 -2.5 Z"
          fill={p.dark}
          opacity={0.85}
        />
        <Path
          d="M0 -7 L1.7 -2.2 L6.6 -2.2 L2.7 0.9 L4.1 5.6 L0 2.8 L-4.1 5.6 L-2.7 0.9 L-6.6 -2.2 L-1.7 -2.2 Z"
          fill={p.light}
        />
      </G>

      {/* Стеклянный блик */}
      <Path
        d="M16 32 Q22 26 32 26 Q26 30 22 38 Z"
        fill={`url(#shine-${idSuffix})`}
        opacity={0.7}
      />
    </Svg>
  );
}

interface MedalToastProps {
  tier: MedalTier;
  promoted: boolean;
  /** Animated value 0→1 controlling opacity, lift and scale */
  anim: Animated.Value;
  /** Theme background colour (used as a solid base under the gradient) */
  bg: string;
  /** Whether the active theme is light (drives text colors) */
  isLightTheme: boolean;
  /** Bottom offset in px */
  bottom?: number;
  lang: Lang;
  /** Whether spanish UI is active (lang==='es' & study target spanish) */
  spanishUiActive: boolean;
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

export default function MedalToast({
  tier,
  promoted,
  anim,
  bg,
  isLightTheme,
  bottom = 120,
  lang,
  spanishUiActive,
}: MedalToastProps) {
  const labels = useMemo(
    () => pickLabels(tier, promoted, lang, spanishUiActive),
    [tier, promoted, lang, spanishUiActive],
  );

  if (tier === 'none') return null;

  const palette = TIER_PALETTES[tier];

  // Цвета фона/текста под тему
  const cardBgStart = isLightTheme ? 'rgba(255,255,255,0.92)' : 'rgba(28,30,36,0.94)';
  const cardBgEnd   = isLightTheme ? 'rgba(248,250,252,0.92)' : 'rgba(20,22,28,0.96)';
  const titleColor  = isLightTheme ? '#1A1B1F' : '#FFFFFF';
  const subtitleColor = isLightTheme ? 'rgba(26,27,31,0.62)' : 'rgba(255,255,255,0.66)';
  const accent = promoted ? palette.primary : (isLightTheme ? palette.dark : palette.primary);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          bottom,
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) },
            { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
          ],
          shadowColor: palette.primary,
        },
      ]}
    >
      {/* Светящийся halo сзади */}
      <View
        pointerEvents="none"
        style={[
          styles.halo,
          { backgroundColor: palette.glow },
        ]}
      />

      <LinearGradient
        colors={[cardBgStart, cardBgEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.card,
          {
            borderColor: isLightTheme
              ? `${palette.dark}40`
              : `${palette.primary}55`,
            backgroundColor: bg,
          },
        ]}
      >
        {/* Тонкий хайлайт-полоска сверху */}
        <LinearGradient
          colors={[`${palette.light}00`, `${palette.light}AA`, `${palette.light}00`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.topShine}
          pointerEvents="none"
        />

        <View style={styles.medalSlot}>
          <PremiumMedal tier={tier} size={54} />
        </View>

        <View style={styles.textWrap}>
          <Text
            style={[styles.tierLabel, { color: accent }]}
            numberOfLines={1}
          >
            {tierBadgeText(tier, promoted, lang, spanishUiActive)}
          </Text>
          <Text
            style={[styles.title, { color: titleColor }]}
            numberOfLines={1}
          >
            {labels.title}
          </Text>
          <Text
            style={[styles.subtitle, { color: subtitleColor }]}
            numberOfLines={2}
          >
            {labels.subtitle}
          </Text>
        </View>
      </LinearGradient>
    </Animated.View>
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

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    shadowOpacity: 0.55,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 16,
  },
  halo: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 28,
    opacity: 0.35,
  },
  card: {
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    overflow: 'hidden',
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
    width: 54,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
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
