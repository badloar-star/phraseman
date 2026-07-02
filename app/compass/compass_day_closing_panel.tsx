/**
 * Компас — панель вечернего ритуала внутри модалки брифинга.
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
import { hapticCelebrate } from '../../hooks/use-haptics';
import { useStudyTarget } from '../../components/StudyTargetContext';
import type { DayClosingRitual } from './day_closing_ritual';
import { awardDayClosingOnce, loadDayClosingStreak } from './day_closing_reward';
import {
  computeDayClosingRewardXp,
  nextDayClosingStreak,
  type DayClosingStreak,
} from './day_closing_reward_rules';
import {
  COMPASS_DAY_COMMENT,
  COMPASS_DAY_CLOSING_TODAY,
  COMPASS_DAY_CLOSING_TOMORROW,
  COMPASS_DAY_CLOSING_CLOSE,
  COMPASS_DAY_CLOSING_CLOSE_REWARD,
  COMPASS_DAY_CLOSING_DONE,
  COMPASS_DAY_CLOSING_STREAK,
  COMPASS_DAY_CLOSING_HIGHLIGHT_LABEL,
  COMPASS_DAY_CLOSING_REPEAT,
  COMPASS_DAY_CLOSING_PREMIUM_TITLE,
  COMPASS_DAY_CLOSING_PREMIUM_BODY,
  COMPASS_OPEN_ACCESS,
  COMPASS_LATER,
  type CompassText,
} from './compass_copy';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_SIZE = 84;
const RING_RADIUS = 34;
const RING_STROKE = 6;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
/** Длительность анимации закрытия дня до автозакрытия модалки. */
const CELEBRATION_MS = 1700;

/** Человеческие подписи категорий фокуса (8 языков UI). */
const FOCUS_CATEGORY_LABEL: Record<string, CompassText> = {
  verb: { ru: 'глаголы', uk: 'дієслова', es: 'verbos', 'pt-BR': 'verbos', vi: 'động từ', id: 'kata kerja', tr: 'fiiller', pl: 'czasowniki' },
  noun: { ru: 'существительные', uk: 'іменники', es: 'sustantivos', 'pt-BR': 'substantivos', vi: 'danh từ', id: 'kata benda', tr: 'isimler', pl: 'rzeczowniki' },
  pronoun: { ru: 'местоимения', uk: 'займенники', es: 'pronombres', 'pt-BR': 'pronomes', vi: 'đại từ', id: 'kata ganti', tr: 'zamirler', pl: 'zaimki' },
  adjective: { ru: 'прилагательные', uk: 'прикметники', es: 'adjetivos', 'pt-BR': 'adjetivos', vi: 'tính từ', id: 'kata sifat', tr: 'sıfatlar', pl: 'przymiotniki' },
  adverb: { ru: 'наречия', uk: 'прислівники', es: 'adverbios', 'pt-BR': 'advérbios', vi: 'trạng từ', id: 'kata keterangan', tr: 'zarflar', pl: 'przysłówki' },
  preposition: { ru: 'предлоги', uk: 'прийменники', es: 'preposiciones', 'pt-BR': 'preposições', vi: 'giới từ', id: 'preposisi', tr: 'edatlar', pl: 'przyimki' },
  syntax: { ru: 'порядок слов', uk: 'порядок слів', es: 'orden de palabras', 'pt-BR': 'ordem das palavras', vi: 'trật tự từ', id: 'urutan kata', tr: 'kelime sırası', pl: 'szyk zdania' },
  article: { ru: 'артикли', uk: 'артиклі', es: 'artículos', 'pt-BR': 'artigos', vi: 'mạo từ', id: 'artikel', tr: 'artikeller', pl: 'przedimki' },
  existential: { ru: 'there is / there are', uk: 'there is / there are', es: 'there is / there are', 'pt-BR': 'there is / there are', vi: 'there is / there are', id: 'there is / there are', tr: 'there is / there are', pl: 'there is / there are' },
  'to-be': { ru: 'глагол to be', uk: 'дієслово to be', es: 'el verbo to be', 'pt-BR': 'o verbo to be', vi: 'động từ to be', id: 'kata kerja to be', tr: 'to be fiili', pl: 'czasownik to be' },
  conjunction: { ru: 'союзы', uk: 'сполучники', es: 'conjunciones', 'pt-BR': 'conjunções', vi: 'liên từ', id: 'konjungsi', tr: 'bağlaçlar', pl: 'spójniki' },
  modal: { ru: 'модальные глаголы', uk: 'модальні дієслова', es: 'verbos modales', 'pt-BR': 'verbos modais', vi: 'động từ khuyết thiếu', id: 'kata kerja modal', tr: 'modal fiiller', pl: 'czasowniki modalne' },
  phrasal_particle: { ru: 'частицы phrasal verbs', uk: 'частки phrasal verbs', es: 'partículas de phrasal verbs', 'pt-BR': 'partículas de phrasal verbs', vi: 'tiểu từ phrasal verbs', id: 'partikel phrasal verbs', tr: 'phrasal verb ekleri', pl: 'partykuły phrasal verbs' },
  modifier: { ru: 'уточняющие слова', uk: 'уточнювальні слова', es: 'palabras modificadoras', 'pt-BR': 'palavras modificadoras', vi: 'từ bổ nghĩa', id: 'kata pewatas', tr: 'niteleyiciler', pl: 'określniki' },
  determiner: { ru: 'указатели (determiners)', uk: 'вказівники (determiners)', es: 'determinantes', 'pt-BR': 'determinantes', vi: 'từ hạn định', id: 'determiner', tr: 'belirteçler', pl: 'określniki (determiners)' },
};

function focusCategoryLabel(category: string | undefined, lang: Lang): string {
  if (!category) return '';
  const known = FOCUS_CATEGORY_LABEL[category];
  if (known) return triLang(lang, known);
  return category.replace(/_/g, ' ');
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
  /** Dev-лаборатория: играть анимацию, но НЕ начислять XP и не писать серию. */
  preview?: boolean;
}

export default function DayClosingPanel({ dayClosing, onClose, onUpgrade, onLater, preview = false }: DayClosingPanelProps) {
  const { theme: t } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const locked = !!dayClosing.locked;
  const rewardXp = useMemo(() => computeDayClosingRewardXp(dayClosing), [dayClosing]);

  const [streak, setStreak] = useState<DayClosingStreak>({ count: 0, lastDateKey: null });
  const [phase, setPhase] = useState<'idle' | 'closing'>('idle');
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Анимации награды — все одноразовые, стартуют только по нажатию кнопки.
  const overlayFade = useRef(new Animated.Value(0)).current;
  const ringProgress = useRef(new Animated.Value(0)).current; // JS-driver: SVG strokeDashoffset
  const needleTurn = useRef(new Animated.Value(0)).current;
  const xpFly = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    void loadDayClosingStreak().then((s) => {
      if (!cancelled) setStreak(s);
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
      void awardDayClosingOnce({ studyTarget, ritual: dayClosing, lang }).catch(() => {});
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
  const streakShown = phase === 'closing' ? closedStreak : streak.count;
  const streakBadge = streakShown > 0
    ? triLang(lang, COMPASS_DAY_CLOSING_STREAK).replace('{days}', String(streakShown))
    : null;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.comment, { color: t.textSecond }]}>
        {triLang(lang, COMPASS_DAY_COMMENT.day_closing)}
      </Text>

      <View style={[styles.panel, { borderColor: t.border, backgroundColor: t.bgSurface }]}>
        <View style={styles.sectionHead}>
          <Ionicons name="checkmark-circle-outline" size={15} color={t.accent} />
          <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>
            {triLang(lang, COMPASS_DAY_CLOSING_TODAY)}
          </Text>
          {streakBadge && (
            <View style={[styles.streakPill, { backgroundColor: t.accent + '14', borderColor: t.accent + '3a' }]}>
              <Ionicons name="flame-outline" size={11} color={t.accent} />
              <Text style={[styles.streakPillText, { color: t.accent }]} numberOfLines={1}>
                {streakBadge}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.grid}>
          {dayClosing.highlights.map((item, i) => (
            <View
              key={item.kind}
              style={[
                styles.metric,
                i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: t.border },
              ]}
            >
              {locked ? (
                <View style={[styles.metricMask, { backgroundColor: t.border }]} />
              ) : (
                <Text style={[styles.metricValue, { color: t.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.76}>
                  {item.value}
                </Text>
              )}
              <Text style={[styles.metricLabel, { color: t.textMuted }]} numberOfLines={2}>
                {triLang(lang, COMPASS_DAY_CLOSING_HIGHLIGHT_LABEL[item.kind])}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.divider, { backgroundColor: t.border }]} />

        <View style={styles.focusRow}>
          <View style={[styles.focusIcon, { backgroundColor: t.accent + '14' }]}>
            <Ionicons name={locked ? 'lock-closed-outline' : 'repeat-outline'} size={16} color={t.accent} />
          </View>
          <View style={styles.focusText}>
            <Text style={[styles.focusTitle, { color: t.accent }]}>
              {triLang(lang, COMPASS_DAY_CLOSING_TOMORROW)}
            </Text>
            <Text style={[styles.focusBody, { color: t.textPrimary }]} numberOfLines={2}>
              {locked ? dayClosingLockedTeaser(dayClosing, lang) : dayClosingFocusText(dayClosing, lang)}
            </Text>
            <Text style={[styles.focusNote, { color: t.textMuted }]} numberOfLines={2}>
              {locked
                ? triLang(lang, COMPASS_DAY_CLOSING_PREMIUM_BODY)
                : dayClosingFocusNote(dayClosing, lang)}
            </Text>
          </View>
        </View>
      </View>

      {locked ? (
        <View style={styles.lockedFooter}>
          <Text style={[styles.lockedTitle, { color: t.textPrimary }]}>
            {triLang(lang, COMPASS_DAY_CLOSING_PREMIUM_TITLE)}
          </Text>
          {onUpgrade && (
            <PremiumGoldButton
              f={{ body: 14.5 }}
              customLabel={triLang(lang, COMPASS_OPEN_ACCESS)}
              onPress={onUpgrade}
            />
          )}
          <TouchableOpacity activeOpacity={0.7} onPress={onLater} style={styles.later}>
            <Text style={[styles.laterText, { color: t.textMuted }]}>{triLang(lang, COMPASS_LATER)}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          testID="compass-day-closing-close"
          activeOpacity={0.85}
          disabled={phase !== 'idle'}
          onPress={handleClosePress}
          style={[styles.cta, { backgroundColor: t.accent, opacity: phase === 'idle' ? 1 : 0.55 }]}
        >
          <Text style={styles.ctaText}>
            {phase === 'idle'
              ? triLang(lang, COMPASS_DAY_CLOSING_CLOSE_REWARD).replace('{xp}', String(rewardXp))
              : triLang(lang, COMPASS_DAY_CLOSING_CLOSE)}
          </Text>
        </TouchableOpacity>
      )}

      {/* Оверлей награды: появляется поверх панели ровно на время празднования. */}
      {phase === 'closing' && (
        <Animated.View
          pointerEvents="none"
          style={[styles.celebration, { backgroundColor: t.bgCard + 'F2', opacity: overlayFade }]}
        >
          <View style={styles.ringWrap}>
            <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                stroke={t.border}
                strokeWidth={RING_STROKE}
                fill="none"
              />
              <AnimatedCircle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                stroke={t.accent}
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                strokeDasharray={`${RING_CIRCUMFERENCE}`}
                strokeDashoffset={ringOffset}
                fill="none"
                transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
              />
            </Svg>
            <Animated.View style={[styles.needle, { transform: [{ rotate: needleRotate }] }]}>
              <Ionicons name="navigate" size={26} color={t.accent} />
            </Animated.View>
            <Animated.Text
              style={[
                styles.xpFly,
                { color: t.accent, opacity: xpOpacity, transform: [{ translateY: xpTranslate }] },
              ]}
            >
              +{rewardXp} XP
            </Animated.Text>
          </View>
          <Text style={[styles.doneText, { color: t.textPrimary }]}>
            {triLang(lang, COMPASS_DAY_CLOSING_DONE)}
          </Text>
          {closedStreak > 1 && (
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
  wrap: { gap: 12 },
  comment: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  panel: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 11 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  sectionTitle: { flexShrink: 1, fontSize: 14, lineHeight: 18, fontWeight: '900' },
  streakPill: { marginLeft: 'auto', maxWidth: 165, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 9, paddingHorizontal: 7, paddingVertical: 3 },
  streakPillText: { flexShrink: 1, fontSize: 10.5, lineHeight: 13, fontWeight: '800' },
  grid: { flexDirection: 'row' },
  metric: { flex: 1, minHeight: 58, paddingHorizontal: 6, paddingVertical: 6, justifyContent: 'center' },
  metricValue: { fontSize: 21, lineHeight: 24, fontWeight: '900', textAlign: 'center' },
  metricMask: { width: 26, height: 17, borderRadius: 5, alignSelf: 'center', opacity: 0.9 },
  metricLabel: { marginTop: 3, fontSize: 11, lineHeight: 14, fontWeight: '700', textAlign: 'center' },
  divider: { height: StyleSheet.hairlineWidth, opacity: 0.85 },
  focusRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10 },
  focusIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  focusText: { flex: 1, minWidth: 0 },
  focusTitle: { fontSize: 11, lineHeight: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.4 },
  focusBody: { marginTop: 2, fontSize: 14, lineHeight: 19, fontWeight: '800' },
  focusNote: { marginTop: 3, fontSize: 12, lineHeight: 16, fontWeight: '600' },
  lockedFooter: { gap: 8 },
  lockedTitle: { fontSize: 14.5, lineHeight: 19, fontWeight: '800', textAlign: 'center' },
  later: { paddingVertical: 6, alignItems: 'center' },
  laterText: { fontSize: 13, fontWeight: '600' },
  cta: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  ctaText: { fontSize: 16, fontWeight: '800', color: '#10131b' },
  celebration: { ...StyleSheet.absoluteFillObject, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 8 },
  ringWrap: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  needle: { position: 'absolute' },
  xpFly: { position: 'absolute', top: -6, fontSize: 15, fontWeight: '900' },
  doneText: { fontSize: 14.5, fontWeight: '800', textAlign: 'center' },
  doneStreak: { fontSize: 12.5, fontWeight: '600', textAlign: 'center' },
});
