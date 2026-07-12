/**
 * Компас — панель вечернего ритуала внутри модалки брифинга. Волна «плоский лист».
 *
 * ЕДИНЫЙ дизайн-язык (compass_sheet_kit): метрики крупно БЕЗ сетки-в-рамке, фокус
 * на завтра — плоская строка с иконкой, всё делит воздух и hairline (не рамки).
 *
 * Два режима:
 *  - ПОЛНЫЙ (премиум / первый бесплатный раз): итог дня + фокус на завтра +
 *    кнопка «Закрыть день · +XP». Нажатие играет ОДНОРАЗОВУЮ анимацию награды
 *    (кольцо + стрелка + вылет XP + серия), начисляет XP идемпотентно и
 *    закрывает модалку. Праздничная вибрация — hapticCelebrate.
 *  - ЗАПЕРТЫЙ (бесплатный после первого раза): те же секции, но цифры спрятаны,
 *    фокус-тизер обрезан на самом интересном, снизу мост к полному доступу.
 *
 * ПЕРФ-КАНОН: без бесконечных циклов анимации — всё одноразовое по событию
 * (кнопка). Единственный перелив — внутри PremiumGoldButton (его цикл живёт
 * только пока открыта модалка, паттерн одобрен в NoEnergyModal).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import PremiumGoldButton from '../../components/PremiumGoldButton';
import { useTheme } from '../../components/ThemeContext';
import { useLang } from '../../components/LangContext';
import { triLang, type Lang } from '../../constants/i18n';
import { hapticCelebrate, hapticTap } from '../../hooks/use-haptics';
import { useStudyTarget } from '../../components/StudyTargetContext';
import { CompassEyebrow, CompassStreakPill, CompassVoice, CompassPrimaryButton, CompassLaterLink } from './compass_sheet_kit';
import type { DayClosingRitual } from './day_closing_ritual';
import { awardDayClosingOnce, loadDayClosingStreak } from './day_closing_reward';
import {
  computeDayClosingRewardXp,
  nextDayClosingStreak,
  type DayClosingStreak,
} from './day_closing_reward_rules';
import {
  COMPASS_DAY_CLOSING_TITLE,
  COMPASS_DAY_CLOSING_TOMORROW,
  COMPASS_DAY_CLOSING_CLOSE,
  COMPASS_DAY_CLOSING_CLOSE_REWARD,
  COMPASS_DAY_CLOSING_COMMENTS,
  COMPASS_DAY_CLOSING_DONE_VARIANTS,
  COMPASS_DAY_CLOSING_STREAK,
  COMPASS_DAY_CLOSING_HIGHLIGHT_LABEL,
  COMPASS_DAY_CLOSING_REPEAT,
  COMPASS_DAY_CLOSING_PREMIUM_TITLE,
  COMPASS_DAY_CLOSING_PREMIUM_BODY,
  COMPASS_OPEN_ACCESS,
  COMPASS_LATER,
  compassFocusCategoryLabel,
  pickCompassDailyVariant,
} from './compass_copy';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_SIZE = 84;
const RING_RADIUS = 34;
const RING_STROKE = 6;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
/**
 * Длительность празднования до автозакрытия модалки. Было 1700мс — человек не
 * успевал прочитать «День закрыт…» и серию; кульминация обрезалась.
 */
const CELEBRATION_MS = 2600;

function focusCategoryLabel(category: string | undefined, lang: Lang): string {
  return compassFocusCategoryLabel(category, lang);
}

/** Полный текст фокуса на завтра (что именно повторить). */
export function dayClosingFocusText(dayClosing: DayClosingRitual, lang: Lang): string {
  const focus = dayClosing.focus;
  const count = focus.value || (focus.rawCount ? String(focus.rawCount) : '');
  switch (focus.kind) {
    case 'due':
      return triLang(lang, {
        ru: `${count} фраз ждут повторения.`,
        uk: `${count} фраз чекають повторення.`,
        es: `${count} frases esperan repaso.`,
        'pt-BR': `${count} frases esperam revisão.`,
        vi: `${count} câu đang chờ ôn.`,
        id: `${count} frasa menunggu ulang.`,
        tr: `${count} ifade tekrar bekliyor.`,
        pl: `${count} fraz czeka na powtórkę.`,
      });
    case 'weak_phrase':
      return triLang(lang, {
        ru: `Разобрать: "${focus.phrase ?? ''}".`,
        uk: `Розібрати: "${focus.phrase ?? ''}".`,
        es: `Revisar: "${focus.phrase ?? ''}".`,
        'pt-BR': `Revisar: "${focus.phrase ?? ''}".`,
        vi: `Xem lại: "${focus.phrase ?? ''}".`,
        id: `Ulas: "${focus.phrase ?? ''}".`,
        tr: `İncele: "${focus.phrase ?? ''}".`,
        pl: `Przejrzyj: "${focus.phrase ?? ''}".`,
      });
    case 'weak_area': {
      const label = focusCategoryLabel(focus.category, lang);
      return triLang(lang, {
        ru: `Слабое место: ${label}.`,
        uk: `Слабке місце: ${label}.`,
        es: `Punto débil: ${label}.`,
        'pt-BR': `Ponto fraco: ${label}.`,
        vi: `Điểm yếu: ${label}.`,
        id: `Titik lemah: ${label}.`,
        tr: `Zayıf nokta: ${label}.`,
        pl: `Słaby punkt: ${label}.`,
      });
    }
    case 'targeted_review':
      return triLang(lang, {
        ru: `Повторить завтра: ${count} фраз.`,
        uk: `Повторити завтра: ${count} фраз.`,
        es: `Repasar mañana: ${count} frases.`,
        'pt-BR': `Revisar amanhã: ${count} frases.`,
        vi: `Ôn ngày mai: ${count} câu.`,
        id: `Ulang besok: ${count} frasa.`,
        tr: `Yarın tekrar: ${count} ifade.`,
        pl: `Powtórz jutro: ${count} fraz.`,
      });
    default:
      return triLang(lang, COMPASS_DAY_CLOSING_REPEAT[dayClosing.repeatKind]);
  }
}

/** Пояснение под фокусом (почему именно это). */
export function dayClosingFocusNote(dayClosing: DayClosingRitual, lang: Lang): string {
  switch (dayClosing.focus.kind) {
    case 'due':
      return triLang(lang, {
        ru: 'Лучше закрепить, пока фразы рядом.',
        uk: 'Краще закріпити, поки фрази поруч.',
        es: 'Mejor fijarlas mientras están cerca.',
        'pt-BR': 'Melhor fixar enquanto estão perto.',
        vi: 'Nên giữ lại khi còn gần.',
        id: 'Lebih baik kuatkan saat masih dekat.',
        tr: 'Yakınken pekiştirmek daha iyi.',
        pl: 'Najlepiej utrwalić, póki są blisko.',
      });
    case 'weak_phrase':
      return triLang(lang, {
        ru: 'Эта фраза чаще всего просила разбора.',
        uk: 'Ця фраза найчастіше просила розбору.',
        es: 'Esa frase pidió más repaso.',
        'pt-BR': 'Essa frase pediu mais revisão.',
        vi: 'Câu này cần xem lại nhiều hơn.',
        id: 'Frasa ini paling perlu diulas.',
        tr: 'Bu ifade daha çok inceleme istedi.',
        pl: 'Ta fraza najczęściej prosiła o przegląd.',
      });
    case 'weak_area':
      return triLang(lang, {
        ru: 'Компас видит повторяющийся паттерн.',
        uk: 'Компас бачить повторюваний патерн.',
        es: 'Brújula ve un patrón repetido.',
        'pt-BR': 'A Bússola vê um padrão repetido.',
        vi: 'La bàn thấy mẫu lặp lại.',
        id: 'Kompas melihat pola berulang.',
        tr: 'Pusula tekrar eden deseni görüyor.',
        pl: 'Kompas widzi powtarzający się wzór.',
      });
    case 'targeted_review':
      return triLang(lang, {
        ru: 'Короткая сессия: повторы, новые фразы и слабые места.',
        uk: 'Коротка сесія: повторення, нові фрази й слабкі місця.',
        es: 'Sesión corta: repaso, frases nuevas y puntos débiles.',
        'pt-BR': 'Sessão curta: revisão, frases novas e pontos fracos.',
        vi: 'Phiên ngắn: ôn tập, câu mới và điểm yếu.',
        id: 'Sesi singkat: ulangan, frasa baru, titik lemah.',
        tr: 'Kısa oturum: tekrar, yeni ifadeler, zayıf noktalar.',
        pl: 'Krótka sesja: powtórka, nowe frazy i słabe punkty.',
      });
    default:
      return triLang(lang, {
        ru: 'Первый шаг уже выбран.',
        uk: 'Перший крок уже вибраний.',
        es: 'El primer paso ya está elegido.',
        'pt-BR': 'O primeiro passo já foi escolhido.',
        vi: 'Bước đầu đã được chọn.',
        id: 'Langkah pertama sudah dipilih.',
        tr: 'İlk adım seçildi.',
        pl: 'Pierwszy krok jest wybrany.',
      });
  }
}

/**
 * Тизер запертого фокуса: персональный, но обрезан на самом интересном месте.
 * Юзер видит, ЧТО Компас про него знает, но не видит плана — мост к доступу.
 */
function dayClosingLockedTeaser(dayClosing: DayClosingRitual, lang: Lang): string {
  const focus = dayClosing.focus;
  switch (focus.kind) {
    case 'weak_phrase':
      return triLang(lang, {
        ru: 'Вижу фразу, что просит разбора…',
        uk: 'Бачу фразу, що просить розбору…',
        es: 'Veo una frase que pide repaso…',
        'pt-BR': 'Vejo uma frase pedindo revisão…',
        vi: 'Thấy một câu cần xem lại…',
        id: 'Ada frasa yang minta diulas…',
        tr: 'İnceleme isteyen bir ifade var…',
        pl: 'Widzę frazę, która prosi o przegląd…',
      });
    case 'weak_area': {
      const label = focusCategoryLabel(focus.category, lang);
      return triLang(lang, {
        ru: `Вижу слабое место: ${label}…`,
        uk: `Бачу слабке місце: ${label}…`,
        es: `Veo un punto débil: ${label}…`,
        'pt-BR': `Vejo um ponto fraco: ${label}…`,
        vi: `Thấy điểm yếu: ${label}…`,
        id: `Ada titik lemah: ${label}…`,
        tr: `Zayıf nokta görüyorum: ${label}…`,
        pl: `Widzę słaby punkt: ${label}…`,
      });
    }
    case 'due':
      return triLang(lang, {
        ru: 'Несколько фраз ждут повторения…',
        uk: 'Кілька фраз чекають повторення…',
        es: 'Varias frases esperan repaso…',
        'pt-BR': 'Várias frases esperam revisão…',
        vi: 'Vài câu đang chờ ôn…',
        id: 'Beberapa frasa menunggu ulang…',
        tr: 'Birkaç ifade tekrar bekliyor…',
        pl: 'Kilka fraz czeka na powtórkę…',
      });
    default:
      return triLang(lang, {
        ru: 'Первый шаг на завтра уже выбран…',
        uk: 'Перший крок на завтра вже вибраний…',
        es: 'El primer paso de mañana ya está listo…',
        'pt-BR': 'O primeiro passo de amanhã já está pronto…',
        vi: 'Bước đầu ngày mai đã được chọn…',
        id: 'Langkah pertama besok sudah dipilih…',
        tr: 'Yarının ilk adımı seçildi…',
        pl: 'Pierwszy krok na jutro jest wybrany…',
      });
  }
}

export interface DayClosingPanelProps {
  dayClosing: DayClosingRitual;
  /** Финал закрытия (после анимации награды): пометить день и закрыть модалку. */
  onClose: () => void;
  /** Мост к полному доступу с запертой витрины. */
  onUpgrade?: () => void;
  /** «Позже» на запертой витрине (день всё равно помечается показанным). */
  onLater: () => void;
  /** Тап по «Фокусу на завтра» (полный режим): открыть экран этого шага. */
  onFocusPress?: () => void;
  /** Dev-лаборатория: играть анимацию, но НЕ начислять XP и не писать серию. */
  preview?: boolean;
}

export default function DayClosingPanel({ dayClosing, onClose, onUpgrade, onLater, onFocusPress, preview = false }: DayClosingPanelProps) {
  const { theme: t } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const accent = t.accent;
  const locked = !!dayClosing.locked;
  const rewardXp = useMemo(() => computeDayClosingRewardXp(dayClosing), [dayClosing]);

  const [streak, setStreak] = useState<DayClosingStreak>({ count: 0, lastDateKey: null });
  // Пока серия не прочитана из хранилища, бейдж не показываем: иначе гонка
  // рисовала «Дней подряд: 1» человеку с реальной серией.
  const [streakLoaded, setStreakLoaded] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'closing'>('idle');
  // Начисление сорвалось → не рисуем вылет «+XP» (честность празднования).
  const [xpAwardFailed, setXpAwardFailed] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Анимации награды — все одноразовые, стартуют только по нажатию кнопки.
  const overlayFade = useRef(new Animated.Value(0)).current;
  const ringProgress = useRef(new Animated.Value(0)).current; // JS-driver: SVG strokeDashoffset
  const needleTurn = useRef(new Animated.Value(0)).current;
  const xpFly = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    void loadDayClosingStreak().then((s) => {
      if (cancelled) return;
      setStreak(s);
      setStreakLoaded(true);
    });
    return () => {
      cancelled = true;
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  // Серия ПОСЛЕ закрытия сегодняшнего дня (оптимистично, чистыми правилами).
  const closedStreak = useMemo(
    () => nextDayClosingStreak(streak, dayClosing.dateKey).count,
    [streak, dayClosing.dateKey],
  );

  const handleClosePress = () => {
    if (phase !== 'idle') return;
    setPhase('closing');
    void hapticCelebrate();
    if (!preview) {
      // Начисление локальное и быстрое; если всё же сорвалось — гасим «+XP»
      // (вылет стартует на 650мс, ответ успевает раньше), чтобы праздник не врал.
      void awardDayClosingOnce({ studyTarget, ritual: dayClosing, lang }).catch(() => {
        setXpAwardFailed(true);
      });
    }
    Animated.parallel([
      Animated.timing(overlayFade, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(ringProgress, {
        toValue: 1,
        duration: 1050,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(needleTurn, {
        toValue: 1,
        duration: 1050,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(650),
        Animated.timing(xpFly, { toValue: 1, duration: 850, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
    ]).start();
    closeTimerRef.current = setTimeout(onClose, CELEBRATION_MS);
  };

  const ringOffset = ringProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [RING_CIRCUMFERENCE, 0],
  });
  const needleRotate = needleTurn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '315deg'] });
  const xpTranslate = xpFly.interpolate({ inputRange: [0, 1], outputRange: [0, -44] });
  const xpOpacity = xpFly.interpolate({ inputRange: [0, 0.15, 0.75, 1], outputRange: [0, 1, 1, 0] });

  // До закрытия — текущая серия; во время празднования — уже с сегодняшним днём.
  // Бейдж: только когда серия прочитана И больше одного дня — вечное «Дней
  // подряд: 1» демотивирует, а не радует.
  const streakShown = phase === 'closing' ? closedStreak : streak.count;
  const streakBadge = streakLoaded && streakShown > 1
    ? triLang(lang, COMPASS_DAY_CLOSING_STREAK).replace('{days}', String(streakShown))
    : null;

  const title = triLang(lang, COMPASS_DAY_CLOSING_TITLE);
  // Голос и финальная строка — ротация по дню (не одна вечная фраза).
  const voiceComment = triLang(lang, pickCompassDailyVariant(COMPASS_DAY_CLOSING_COMMENTS, dayClosing.dateKey));
  const doneText = triLang(lang, pickCompassDailyVariant(COMPASS_DAY_CLOSING_DONE_VARIANTS, dayClosing.dateKey));
  const focusTappable = !locked && phase === 'idle' && !!onFocusPress;

  return (
    <View style={styles.wrap}>
      {/* Надзаголовок «Итог дня» + пилюля серии в правом слоте (не в рамке). */}
      <CompassEyebrow
        t={t}
        icon="moon-outline"
        text={title}
        accent={accent}
        right={streakBadge ? <CompassStreakPill t={t} accent={accent} text={streakBadge} /> : undefined}
      />

      {/* Голос Компаса — крупный заголовок-герой (ротация по дню, не одна фраза). */}
      <CompassVoice t={t}>{voiceComment}</CompassVoice>

      {/* Метрики итога — крупно, в мягкой подложке БЕЗ обводки (смена фона), */}
      {/* колонки делит вертикальная линия. */}
      <View style={[styles.metrics, { backgroundColor: accent + '14' }]}>
        {dayClosing.highlights.map((item, i) => (
          <View
            key={item.kind}
            style={[styles.metric, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: t.border }]}
          >
            {locked ? (
              <View style={[styles.metricMask, { backgroundColor: t.textMuted + '33' }]} />
            ) : (
              <Text style={[styles.metricValue, { color: accent }]}>
                {item.value}
              </Text>
            )}
            <Text style={[styles.metricLabel, { color: t.textMuted }]}>
              {triLang(lang, COMPASS_DAY_CLOSING_HIGHLIGHT_LABEL[item.kind])}
            </Text>
          </View>
        ))}
      </View>

      {/* Фокус на завтра — строка с иконкой в мягкой подложке БЕЗ обводки (смена фона). */}
      {/* Полный режим: строка НАЖИМАЕТСЯ — «первый шаг уже выбран» получает ручку */}
      {/* (открыть экран шага прямо сейчас), а не остаётся обещанием без действия. */}
      <TouchableOpacity
        activeOpacity={focusTappable ? 0.78 : 1}
        disabled={!focusTappable}
        onPressIn={focusTappable ? () => hapticTap() : undefined}
        onPress={focusTappable ? onFocusPress : undefined}
        style={[styles.focus, { backgroundColor: accent + '14' }]}
      >
        <View style={[styles.focusIcon, { backgroundColor: accent + '1F' }]}>
          <Ionicons name={locked ? 'lock-closed-outline' : 'repeat-outline'} size={17} color={accent} />
        </View>
        <View style={styles.focusText}>
          <Text style={[styles.focusTitle, { color: accent }]}>{triLang(lang, COMPASS_DAY_CLOSING_TOMORROW)}</Text>
          <Text style={[styles.focusBody, { color: t.textPrimary }]}>
            {locked ? dayClosingLockedTeaser(dayClosing, lang) : dayClosingFocusText(dayClosing, lang)}
          </Text>
          <Text style={[styles.focusNote, { color: t.textMuted }]}>
            {locked ? triLang(lang, COMPASS_DAY_CLOSING_PREMIUM_BODY) : dayClosingFocusNote(dayClosing, lang)}
          </Text>
        </View>
        {focusTappable ? <Ionicons name="chevron-forward" size={17} color={t.textMuted} style={styles.focusChevron} /> : null}
      </TouchableOpacity>

      {locked ? (
        <View style={[styles.lockedFooter, { borderTopColor: t.border }]}>
          <Text style={[styles.lockedTitle, { color: t.textPrimary }]}>
            {triLang(lang, COMPASS_DAY_CLOSING_PREMIUM_TITLE)}
          </Text>
          {onUpgrade && (
            <PremiumGoldButton active f={{ body: 14.5 }} customLabel={triLang(lang, COMPASS_OPEN_ACCESS)} onPress={onUpgrade} />
          )}
          <CompassLaterLink t={t} label={triLang(lang, COMPASS_LATER)} onPress={onLater} />
        </View>
      ) : (
        <CompassPrimaryButton
          t={t}
          accent={accent}
          testID="compass-day-closing-close"
          disabled={phase !== 'idle'}
          onPress={handleClosePress}
          label={
            phase === 'idle'
              ? triLang(lang, COMPASS_DAY_CLOSING_CLOSE_REWARD).replace('{xp}', String(rewardXp))
              : triLang(lang, COMPASS_DAY_CLOSING_CLOSE)
          }
        />
      )}

      {/* Оверлей награды: появляется поверх панели ровно на время празднования. */}
      {phase === 'closing' && (
        <Animated.View
          pointerEvents="none"
          style={[styles.celebration, { backgroundColor: t.bgCard + 'F2', opacity: overlayFade }]}
        >
          <View style={styles.ringWrap}>
            <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
              <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} stroke={t.border} strokeWidth={RING_STROKE} fill="none" />
              <AnimatedCircle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                stroke={accent}
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                strokeDasharray={`${RING_CIRCUMFERENCE}`}
                strokeDashoffset={ringOffset}
                fill="none"
                transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
              />
            </Svg>
            <Animated.View style={[styles.needle, { transform: [{ rotate: needleRotate }] }]}>
              <Ionicons name="navigate" size={26} color={accent} />
            </Animated.View>
            {!xpAwardFailed && (
              <Animated.Text
                style={[styles.xpFly, { color: accent, opacity: xpOpacity, transform: [{ translateY: xpTranslate }] }]}
              >
                +{rewardXp} XP
              </Animated.Text>
            )}
          </View>
          <Text style={[styles.doneText, { color: t.textPrimary }]}>{doneText}</Text>
          {streakLoaded && closedStreak > 1 && (
            <Text style={[styles.doneStreak, { color: t.textSecond }]}>
              {triLang(lang, COMPASS_DAY_CLOSING_STREAK).replace('{days}', String(closedStreak))}
            </Text>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  metrics: { flexDirection: 'row', marginTop: 24, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 4 },
  metric: { flex: 1, minHeight: 58, paddingHorizontal: 8, justifyContent: 'center' },
  metricValue: { fontSize: 33, lineHeight: 36, fontWeight: '900', letterSpacing: -0.5 },
  metricMask: { width: 34, height: 20, borderRadius: 6, opacity: 0.9 },
  metricLabel: { marginTop: 8, fontSize: 12.5, lineHeight: 15, fontWeight: '600' },
  focus: { marginTop: 16, padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 13 },
  focusIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  focusText: { flex: 1, minWidth: 0 },
  focusChevron: { alignSelf: 'center' },
  focusTitle: { fontSize: 12, lineHeight: 15, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  focusBody: { marginTop: 7, fontSize: 17, lineHeight: 23, fontWeight: '800' },
  focusNote: { marginTop: 6, fontSize: 13.5, lineHeight: 18, fontWeight: '600' },
  lockedFooter: { marginTop: 24, paddingTop: 20, borderTopWidth: StyleSheet.hairlineWidth, gap: 10, alignItems: 'stretch' },
  lockedTitle: { fontSize: 16, lineHeight: 21, fontWeight: '800', textAlign: 'center' },
  celebration: { ...StyleSheet.absoluteFillObject, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 8 },
  ringWrap: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  needle: { position: 'absolute' },
  xpFly: { position: 'absolute', top: -6, fontSize: 15, fontWeight: '900' },
  doneText: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  doneStreak: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
});
