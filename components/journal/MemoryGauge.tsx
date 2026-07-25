import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { triLang, type Lang } from '../../constants/i18n';
import type { Theme, ThemeMode } from '../../constants/theme';
import type { Fonts } from '../ThemeContext';
import { statsAccent, statsSoftBg } from '../../constants/statsThemeChrome';
import { GOLD_RICH } from '../../constants/goldTheme';

export interface MemoryGaugeProps {
  t: Theme;
  f: Fonts;
  lang: Lang;
  themeMode: ThemeMode;
  isGoldTheme: boolean;
  /** Учтённых в тренажёре фраз+слов всего (архив «выучено» + активная ротация). */
  totalTracked: number;
  /** Из total — уже подошедших к повтору сегодня («под риском» забыть). */
  dueToday: number;
}

const GAUGE_SIZE = 128;
const GAUGE_HEIGHT = GAUGE_SIZE / 2 + 12;
const STROKE_WIDTH = 12;
/** Секунд на освежение одной фразы в тренажёре — грубая, но честная оценка. */
const SECONDS_PER_PHRASE_REFRESH = 12;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 180) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

/** Дуга полукруга (180°→0°, слева направо) от 0 до `pct` (0..1). */
function describeArc(cx: number, cy: number, r: number, pct: number): string {
  const clamped = Math.max(0, Math.min(1, pct));
  if (clamped <= 0) return '';
  const endAngle = 180 * clamped;
  const start = polarToCartesian(cx, cy, r, 0);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = endAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function formatRefreshMinutes(dueCount: number): number {
  if (dueCount <= 0) return 0;
  const seconds = dueCount * SECONDS_PER_PHRASE_REFRESH;
  return Math.max(1, Math.round(seconds / 60));
}

/**
 * «Прочность памяти» — полукруглая SVG-шкала retention.
 *
 * Формула (честная, из уже загруженных локальных данных тренажёра, без сети):
 *   retention = 1 - dueToday / totalTracked   (если totalTracked > 0, иначе 100%)
 * totalTracked = все фразы/слова в тренажёре (архив «выучено» + активная ротация),
 * dueToday = сколько из них уже подошли к повтору сегодня — то, что реально
 * «под риском» забыться без освежения. Это самая честная метрика retention,
 * доступная без интервального SM2-скоринга по каждой карточке.
 *
 * Первый кадр = финальная геометрия: дуга рисуется сразу с итоговым процентом,
 * без анимации 0→N (правило владельца, layout-stability contract).
 */
function MemoryGauge({ t, f, lang, themeMode, isGoldTheme, totalTracked, dueToday }: MemoryGaugeProps) {
  const safeTotal = Math.max(0, Math.floor(totalTracked));
  const safeDue = Math.max(0, Math.min(safeTotal, Math.floor(dueToday)));
  const retentionPct = safeTotal > 0 ? Math.round(((safeTotal - safeDue) / safeTotal) * 100) : 100;

  const accent = isGoldTheme ? GOLD_RICH.metalGold : t.correct;
  const trackColor = isGoldTheme ? GOLD_RICH.bronzeWash : statsSoftBg(themeMode, 'practiceBalance', 'quiet');

  const cx = GAUGE_SIZE / 2;
  const cy = GAUGE_SIZE / 2;
  const radius = GAUGE_SIZE / 2 - STROKE_WIDTH / 2 - 2;

  const trackPath = useMemo(() => describeArc(cx, cy, radius, 1), [cx, cy, radius]);
  const fillPath = useMemo(
    () => describeArc(cx, cy, radius, retentionPct / 100),
    [cx, cy, radius, retentionPct],
  );

  const refreshMinutes = formatRefreshMinutes(safeDue);

  const riskLine = safeDue <= 0
    ? triLang(lang, {
        ru: 'Всё освежено — риска нет',
        uk: 'Усе освіжено — ризику немає',
        es: 'Todo repasado — sin riesgo',
        'pt-BR': 'Tudo revisado — sem risco',
        vi: 'Đã ôn hết — không rủi ro',
        id: 'Semua sudah diulas — tanpa risiko',
        tr: 'Her şey tazelendi — risk yok',
        pl: 'Wszystko odświeżone — brak ryzyka',
      })
    : triLang(lang, {
        ru: `${safeDue} ${pluralPhrasesRu(safeDue)} под риском — освежи за ~${refreshMinutes} мин`,
        uk: `${safeDue} ${pluralPhrasesUk(safeDue)} під ризиком — освіж за ~${refreshMinutes} хв`,
        es: `${safeDue} frases en riesgo — repásalas en ~${refreshMinutes} min`,
        'pt-BR': `${safeDue} frases em risco — revise em ~${refreshMinutes} min`,
        vi: `${safeDue} cụm từ có nguy cơ quên — ôn lại trong ~${refreshMinutes} phút`,
        id: `${safeDue} frasa berisiko — segarkan dalam ~${refreshMinutes} menit`,
        tr: `${safeDue} ifade risk altında — ~${refreshMinutes} dk'da tazele`,
        pl: `${safeDue} fraz zagrożonych — odśwież w ~${refreshMinutes} min`,
      });

  const title = triLang(lang, {
    ru: 'Прочность памяти',
    uk: 'Міцність пам’яті',
    es: 'Fuerza de tu memoria',
    'pt-BR': 'Força da memória',
    vi: 'Độ bền trí nhớ',
    id: 'Kekuatan ingatan',
    tr: 'Hafıza gücü',
    pl: 'Siła pamięci',
  });

  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 4 }}>
        {title}
      </Text>
      <View style={{ width: GAUGE_SIZE, height: GAUGE_HEIGHT }}>
        <Svg width={GAUGE_SIZE} height={GAUGE_HEIGHT} viewBox={`0 0 ${GAUGE_SIZE} ${GAUGE_HEIGHT}`}>
          <Path d={trackPath} stroke={trackColor} strokeWidth={STROKE_WIDTH} strokeLinecap="round" fill="none" />
          {fillPath ? (
            <Path d={fillPath} stroke={accent} strokeWidth={STROKE_WIDTH} strokeLinecap="round" fill="none" />
          ) : null}
        </Svg>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 4, alignItems: 'center' }}>
          <Text style={{ color: t.textPrimary, fontSize: f.numLg + 2, fontWeight: '900', lineHeight: (f.numLg + 2) * 1.05 }} numberOfLines={1}>
            {`${retentionPct}%`}
          </Text>
        </View>
      </View>
      <Text style={{ color: safeDue > 0 ? t.textMuted : t.correct, fontSize: f.caption, fontWeight: '700', textAlign: 'center', marginTop: 2 }} numberOfLines={2}>
        {riskLine}
      </Text>
    </View>
  );
}

function pluralPhrasesRu(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'фраза';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'фразы';
  return 'фраз';
}

function pluralPhrasesUk(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'фраза';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'фрази';
  return 'фраз';
}

export default React.memo(MemoryGauge);
