import React, { useEffect } from 'react';
import DuoPressable from '../components/DuoPressable';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Reanimated, {
  FadeInDown,
  useSharedValue,
  useAnimatedProps,
  withDelay,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { buttonForegroundForBackground } from '../constants/color_contrast';
import { lightenHex } from '../components/GradientProgressBar';

type TrainerReportQueue = 'words' | 'phrases' | 'arena';

interface TrainerSessionReportProps {
  queue: TrainerReportQueue;
  correct: number;
  wrong: number;
  total: number;
  accent: string;
  onDone: () => void;
  onPracticeMore?: () => void;
  /** Цепочка микса: «Дальше: Слова · n» — переход в следующую непустую очередь. */
  nextLabel?: string;
  onNext?: () => void;
  /** Длительность сессии (мс) — показываем в мини-стате «время», если передали. */
  durationMs?: number;
}

const AnimatedCircle = Reanimated.createAnimatedComponent(Circle);

/** Единое славянское правило множественного числа (ru/uk/pl): 1 — one, 2-4 — few, остальные — many. */
function pluralSlavic(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (last === 1 && abs !== 11) return one;
  if (last >= 2 && last <= 4 && (abs < 12 || abs > 14)) return few;
  return many;
}

/** «N ошибки вернутся завтра» — честная SRS-формулировка со склонениями. */
function wrongReturnsText(wrong: number, lang: Lang): string {
  switch (lang) {
    case 'uk': return pluralSlavic(wrong, 'помилка повернеться завтра', 'помилки повернуться завтра', 'помилок повернуться завтра');
    case 'es': return wrong === 1 ? '1 error vuelve mañana' : `${wrong} errores vuelven mañana`;
    case 'pt-BR': return wrong === 1 ? '1 erro volta amanhã' : `${wrong} erros voltam amanhã`;
    case 'vi': return `${wrong} lỗi sẽ quay lại ngày mai`;
    case 'id': return `${wrong} kesalahan kembali besok`;
    case 'tr': return `${wrong} hata yarın geri döner`;
    case 'pl': return pluralSlavic(wrong, 'błąd wróci jutro', 'błędy wrócą jutro', 'błędów wróci jutro');
    default: return pluralSlavic(wrong, 'ошибка вернётся завтра', 'ошибки вернутся завтра', 'ошибок вернутся завтра');
  }
}

function reportTitle(queue: TrainerReportQueue, attempted: number, wrong: number, lang: Lang): string {
  if (attempted === 0) {
    return triLang(lang, {
      ru: 'Очередь чистая',
      uk: 'Черга чиста',
      es: 'Cola limpia',
      'pt-BR': 'Fila limpa',
      vi: 'Hàng đợi đã trống',
      id: 'Antrean bersih',
      tr: 'Kuyruk temiz',
      pl: 'Kolejka czysta',
    });
  }
  if (wrong === 0) {
    return triLang(lang, {
      ru: 'Закрыто без ошибок',
      uk: 'Закрито без помилок',
      es: 'Cerrado sin errores',
      'pt-BR': 'Fechado sem erros',
      vi: 'Hoàn thành không lỗi',
      id: 'Selesai tanpa kesalahan',
      tr: 'Hatasız kapatıldı',
      pl: 'Zamknięte bez błędów',
    });
  }
  if (queue === 'words') {
    return triLang(lang, {
      ru: 'Слова пройдены',
      uk: 'Слова пройдено',
      es: 'Palabras completadas',
      'pt-BR': 'Palavras concluídas',
      vi: 'Đã xong từ vựng',
      id: 'Kata selesai',
      tr: 'Kelimeler tamam',
      pl: 'Słowa ukończone',
    });
  }
  return triLang(lang, {
    ru: 'Фразы пройдены',
    uk: 'Фрази пройдено',
    es: 'Frases completadas',
    'pt-BR': 'Frases concluídas',
    vi: 'Đã xong cụm từ',
    id: 'Frasa selesai',
    tr: 'İfadeler tamam',
    pl: 'Frazy ukończone',
  });
}

/**
 * Кольцо результата. viewBox намеренно больше диаметра + толщины stroke +
 * круглых linecap (r=52, stroke=10, запас до края 66): дуга и её круглые
 * концы НЕ обрезаются по краям — требование макета.
 * Дуга дорисовывается ~1.2 с одним конечным прогоном (без циклов).
 */
function ReportRing({ attempted, correct, accent, trackColor, textColor, subColor, lang }: {
  attempted: number;
  correct: number;
  accent: string;
  trackColor: string;
  textColor: string;
  subColor: string;
  lang: Lang;
}) {
  const size = 132;
  const strokeWidth = 10;
  const radius = 52;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = attempted > 0 ? Math.max(0, Math.min(1, correct / attempted)) : 0;

  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = 0;
    fill.value = withDelay(300, withTiming(pct, { duration: 1200, easing: Easing.out(Easing.cubic) }));
    return () => cancelAnimation(fill);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pct]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - fill.value),
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="reportRingGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={lightenHex(accent, 0.28)} />
            <Stop offset="1" stopColor={accent} />
          </LinearGradient>
        </Defs>
        <Circle cx={center} cy={center} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke="url(#reportRingGrad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: textColor, fontSize: 30, fontWeight: '900', fontVariant: ['tabular-nums'] }}>
          {correct}/{attempted}
        </Text>
        <Text style={{ color: subColor, fontSize: 10, fontWeight: '700', marginTop: 2 }}>
          {triLang(lang, {
            ru: 'верно',
            uk: 'вірно',
            es: 'bien',
            'pt-BR': 'certas',
            vi: 'đúng',
            id: 'benar',
            tr: 'doğru',
            pl: 'dobrze',
          })}
        </Text>
      </View>
    </View>
  );
}

export default function TrainerSessionReport({
  queue,
  correct,
  wrong,
  total,
  accent,
  onDone,
  onPracticeMore,
  nextLabel,
  onNext,
  durationMs,
}: TrainerSessionReportProps) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const attempted = Math.max(total, correct + wrong);
  const isEmpty = attempted === 0;
  const hasChain = Boolean(onNext && nextLabel);
  const primaryTextColor = buttonForegroundForBackground(accent);
  const minutes = durationMs != null ? Math.max(1, Math.round(durationMs / 60000)) : null;
  const minuteWord = triLang(lang, { ru: 'мин', uk: 'хв', es: 'min', 'pt-BR': 'min', vi: 'phút', id: 'mnt', tr: 'dk', pl: 'min' });

  const stats: { value: string; color: string; label: string }[] = [
    {
      value: String(correct),
      color: t.correct,
      label: triLang(lang, { ru: 'верно', uk: 'вірно', es: 'bien', 'pt-BR': 'certas', vi: 'đúng', id: 'benar', tr: 'doğru', pl: 'dobrze' }),
    },
    {
      value: String(wrong),
      color: t.wrong,
      label: triLang(lang, { ru: 'ошибки', uk: 'помилки', es: 'errores', 'pt-BR': 'erros', vi: 'lỗi', id: 'salah', tr: 'hata', pl: 'błędy' }),
    },
  ];
  if (minutes != null) {
    stats.push({
      value: `${minutes} ${minuteWord}`,
      color: t.textPrimary,
      label: triLang(lang, { ru: 'время', uk: 'час', es: 'tiempo', 'pt-BR': 'tempo', vi: 'thời gian', id: 'waktu', tr: 'süre', pl: 'czas' }),
    });
  }

  return (
    // зачем 2026-08-02 (владелец: «на маленьких экранах кнопки Готово нет»):
    // корень был View c flex:1 + justifyContent:'center'. Пока отчёт помещался,
    // всё выглядело верно, но на низком экране центрированный контент
    // обрезается СВЕРХУ И СНИЗУ — «Готово» уходило за границу, и доскроллить до
    // него было нечем. ScrollView с flexGrow:1 + justifyContent:'center'
    // сохраняет прежний вид на больших экранах и даёт прокрутку на маленьких.
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.root}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <View style={styles.center}>
        <ReportRing
          attempted={attempted}
          correct={correct}
          accent={accent}
          trackColor={t.bgSurface}
          textColor={t.textPrimary}
          subColor={t.textMuted}
          lang={lang}
        />

        <Reanimated.View entering={FadeInDown.delay(400).duration(320)} style={{ alignItems: 'center' }}>
          <Text style={{ color: t.textPrimary, fontSize: f.h1, fontWeight: '900', marginTop: 14, textAlign: 'center' }}>
            {reportTitle(queue, attempted, wrong, lang)}
          </Text>
        </Reanimated.View>

        {wrong > 0 ? (
          <Reanimated.View entering={FadeInDown.delay(540).duration(320)} style={{ alignItems: 'center' }}>
            <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '600', marginTop: 6, textAlign: 'center' }}>
              {wrongReturnsText(wrong, lang)}
            </Text>
          </Reanimated.View>
        ) : null}

        {!isEmpty ? (
          <Reanimated.View entering={FadeInDown.delay(680).duration(320)} style={styles.statsRow}>
            {stats.map((stat) => (
              <View key={stat.label} style={[styles.stat, { backgroundColor: t.bgCard }]}>
                <Text style={{ color: stat.color, fontSize: f.bodyLg, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{stat.value}</Text>
                <Text style={{ color: t.textGhost, fontSize: f.label - 1, fontWeight: '800', marginTop: 3 }}>{stat.label}</Text>
              </View>
            ))}
          </Reanimated.View>
        ) : null}
      </View>

      <Reanimated.View entering={FadeInDown.delay(820).duration(320)} style={{ gap: 10 }}>
        {hasChain ? (
          <DuoPressable onPress={() => onNext?.()} wrapStyle={{ width: '100%' }} style={[styles.primaryBtn, { backgroundColor: accent }]}>
            <Text style={{ color: primaryTextColor, fontSize: f.bodyLg, fontWeight: '900' }}>{nextLabel}</Text>
          </DuoPressable>
        ) : (
          <DuoPressable onPress={onDone} wrapStyle={{ width: '100%' }} style={[styles.primaryBtn, { backgroundColor: accent }]}>
            <Text style={{ color: primaryTextColor, fontSize: f.bodyLg, fontWeight: '900' }}>
              {triLang(lang, {
                ru: 'Готово',
                uk: 'Готово',
                es: 'Listo',
                'pt-BR': 'Pronto',
                vi: 'Xong',
                id: 'Selesai',
                tr: 'Bitti',
                pl: 'Gotowe',
              })}
            </Text>
          </DuoPressable>
        )}
        {hasChain ? (
          <DuoPressable onPress={onDone} wrapStyle={{ width: '100%' }} style={[styles.ghostBtn, { backgroundColor: t.bgSurface }]}>
            <Text style={{ color: t.textMuted, fontSize: f.body, fontWeight: '800' }}>
              {triLang(lang, {
                ru: 'Завершить практику',
                uk: 'Завершити практику',
                es: 'Terminar práctica',
                'pt-BR': 'Encerrar prática',
                vi: 'Kết thúc luyện tập',
                id: 'Akhiri latihan',
                tr: 'Pratiği bitir',
                pl: 'Zakończ praktykę',
              })}
            </Text>
          </DuoPressable>
        ) : onPracticeMore && !isEmpty ? (
          <DuoPressable onPress={onPracticeMore} wrapStyle={{ width: '100%' }} style={[styles.ghostBtn, { backgroundColor: t.bgSurface }]}>
            <Text style={{ color: t.textMuted, fontSize: f.body, fontWeight: '800' }}>
              {triLang(lang, {
                ru: 'Ещё слабые',
                uk: 'Ще слабкі',
                es: 'Más débiles',
                'pt-BR': 'Mais fracas',
                vi: 'Phần còn yếu',
                id: 'Yang masih lemah',
                tr: 'Zayıf kalanlar',
                pl: 'Jeszcze słabe',
              })}
            </Text>
          </DuoPressable>
        ) : null}
      </Reanimated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  root: {
    // зачем: flexGrow (а не flex) — в contentContainerStyle это единственный
    // способ сказать «растянись на всю высоту, если контента мало, но дай
    // прокрутку, если много». Центрирование сохранено для больших экранов.
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    gap: 18,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 18,
  },
  stat: {
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  primaryBtn: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  ghostBtn: {
    minHeight: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
});
