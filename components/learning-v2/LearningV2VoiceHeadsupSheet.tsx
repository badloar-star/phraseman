/**
 * Шторка «Голоса на всё занятие не хватит» при старте занятия V2 (решение — app/learning_v2_voice_headsup_v1.ts).
 *
 * зачем (владелец 17.10, вариант 1 «шторка снизу»; макет Макетов 700ad5788, docs/design/v2-app/voice-limit-session-start.html#sheet):
 * Free с остатком голосовых попыток меньше числа голосовых заданий узнаёт об этом ДО первого задания, мягко, без стены:
 * микрофон с цифрой остатка, заголовок, текст на «ты», счётчик «Голос на сегодня · K из 3», главная «Попробовать Plus»,
 * тихая «Начать всё равно»; свайп вниз = «Начать всё равно». Цвета — токены темы (useLv2Glass), стиль «Тень»: без обводок.
 * Движение (emil-design-eng): шторка выезжает снизу кривой «ящика» (0.32, 0.72, 0, 1) за 320 мс, затемнение — 220 мс; уход быстрее,
 * 200 мс; быстрый взмах вниз закрывает даже без большого сдвига. «Меньше движения» — только прозрачность.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Modal, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import { triLang, type Lang } from '../../constants/i18n';
import { pluralFormFor, type PluralForms } from '../../constants/plural';
import { hapticTap } from '../../hooks/use-haptics';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { Lv2Cta, useLv2Glass } from './LearningV2Glass';

type Props = Readonly<{
  visible: boolean;
  lang: Lang;
  /** Осталось голосовых попыток на сегодня (0…limit). */
  remaining: number;
  /** Дневной лимит Free (общий счётчик D196). */
  limit: number;
  onTryPlus: () => void;
  onStartAnyway: () => void;
}>;

const DRAWER_EASE = Easing.bezier(0.32, 0.72, 0, 1);
const ENTER_MS = 320;
const SCRIM_MS = 220;
const EXIT_MS = 200;
/** Взмах вниз: сдвиг больше этого или скорость больше DISMISS_VELOCITY — закрыть. */
const DISMISS_DISTANCE = 90;
const DISMISS_VELOCITY = 0.5;
const SCRIM_COLOR = 'rgba(0,0,0,0.42)'; // theme-exempt: затемнение под шторкой — тёмное в любой теме (макет: ink .38 / marine .55)

/** «2 попытки» с правильным окончанием; число всегда цифрой (как на значке микрофона). */
function attemptsPhrase(lang: Lang, n: number): string {
  const slavic = (one: string, few: string, many: string) => {
    const m10 = n % 10;
    const m100 = n % 100;
    const word = m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
    return `${n} ${word}`;
  };
  return triLang(lang, {
    ru: slavic('попытка', 'попытки', 'попыток'),
    uk: slavic('спроба', 'спроби', 'спроб'),
    en: `${n} ${n === 1 ? 'attempt' : 'attempts'}`,
    es: `${n} ${n === 1 ? 'intento' : 'intentos'}`,
    'pt-BR': `${n} ${n === 1 ? 'tentativa' : 'tentativas'}`,
    vi: `${n} lượt`,
    id: `${n} percobaan`,
    tr: `${n} ses hakkın`,
    pl: n === 1 ? '1 próba' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? `${n} próby` : `${n} prób`,
  });
}

type HeadsupCopy = Readonly<{
  title: string;
  lead: string;
  /** Вступление по форме числа, где глагол согласуется с K: «осталась 1 попытка» / «осталось 2 попытки». */
  leadByForm?: PluralForms;
  tail: string;
  today: string;
  of: string;
  plus: string;
  start: string;
}>;

// тексты — по макету (владелец 17.10, «на ты»); вычитаны Переводчиком 17.10
// зачем (переводчик 17.10): K ∈ {0, 1, 2}; при K = 1 (и при 0 в pl) глагол вступления меняется вместе со словом, иначе «осталось 1 попытка»
const copyFor = (lang: Lang): HeadsupCopy => triLang(lang, {
  ru: { title: 'Голоса на всё занятие не хватит', lead: 'В этом занятии есть задания с голосом, а на сегодня у тебя осталось ', leadByForm: { one: 'В этом занятии есть задания с голосом, а на сегодня у тебя осталась ', few: 'В этом занятии есть задания с голосом, а на сегодня у тебя осталось ', many: 'В этом занятии есть задания с голосом, а на сегодня у тебя осталось ' }, tail: ' — закончить не получится. С Plus лимита на голос нет.', today: 'Голос на сегодня', of: 'из', plus: 'Попробовать Plus', start: 'Начать всё равно' },
  uk: { title: 'Голосу на все заняття не вистачить', lead: 'У цьому занятті є завдання з голосом, а на сьогодні в тебе залишилося ', leadByForm: { one: 'У цьому занятті є завдання з голосом, а на сьогодні в тебе залишилася ', few: 'У цьому занятті є завдання з голосом, а на сьогодні в тебе залишилося ', many: 'У цьому занятті є завдання з голосом, а на сьогодні в тебе залишилося ' }, tail: ' — завершити не вийде. З Plus ліміту на голос немає.', today: 'Голос на сьогодні', of: 'з', plus: 'Спробувати Plus', start: 'Почати все одно' },
  en: { title: 'Not enough voice attempts for this session', lead: 'This session has voice tasks, and you have ', tail: ' left today — not enough to finish. Plus has no voice limit.', today: 'Voice today', of: 'of', plus: 'Try Plus', start: 'Start anyway' },
  es: { title: 'Te faltan intentos de voz para esta sesión', lead: 'Esta sesión tiene tareas de voz y hoy te quedan ', leadByForm: { one: 'Esta sesión tiene tareas de voz y hoy te queda ', few: 'Esta sesión tiene tareas de voz y hoy te quedan ', many: 'Esta sesión tiene tareas de voz y hoy te quedan ' }, tail: ': no podrás terminarla. Con Plus no hay límite de voz.', today: 'Voz hoy', of: 'de', plus: 'Probar Plus', start: 'Empezar igualmente' },
  'pt-BR': { title: 'Faltam tentativas de voz para esta sessão', lead: 'Esta sessão tem tarefas de voz e hoje você tem ', tail: ' — não dá para terminar. Com o Plus não há limite de voz.', today: 'Voz hoje', of: 'de', plus: 'Experimentar o Plus', start: 'Começar mesmo assim' },
  vi: { title: 'Không đủ lượt nói cho cả buổi học', lead: 'Buổi học này có bài nói, nhưng hôm nay bạn chỉ còn ', tail: ' — không đủ để học hết. Với Plus, nói không giới hạn.', today: 'Lượt nói hôm nay', of: '/', plus: 'Dùng thử Plus', start: 'Vẫn bắt đầu' },
  id: { title: 'Percobaan suara tak cukup untuk sesi ini', lead: 'Sesi ini punya tugas suara, dan hari ini kamu punya ', tail: ' — tidak cukup sampai selesai. Dengan Plus, suara tanpa batas.', today: 'Suara hari ini', of: 'dari', plus: 'Coba Plus', start: 'Tetap mulai' },
  tr: { title: 'Ses hakkın bu derse yetmeyecek', lead: 'Bu derste sesli görevler var, bugün ise ', tail: ' kaldı — bitirmeye yetmez. Plus ile ses sınırı yok.', today: 'Bugünkü ses', of: '/', plus: "Plus'ı dene", start: 'Yine de başla' },
  pl: { title: 'Głosu nie starczy na całą lekcję', lead: 'W tej lekcji są zadania głosowe, a na dziś zostało ci ', leadByForm: { one: 'W tej lekcji są zadania głosowe, a na dziś została ci ', few: 'W tej lekcji są zadania głosowe, a na dziś zostały ci ', many: 'W tej lekcji są zadania głosowe, a na dziś zostało ci ' }, tail: ' — nie dasz rady skończyć. Z Plus nie ma limitu głosu.', today: 'Głos na dziś', of: 'z', plus: 'Wypróbuj Plus', start: 'Zacznij mimo to' },
});

/** Вступление с глаголом в нужной форме для K. */
const leadFor = (lang: Lang, copy: HeadsupCopy, n: number): string => copy.leadByForm?.[pluralFormFor(lang, n)] ?? copy.lead;

function LearningV2VoiceHeadsupSheet({ visible, lang, remaining, limit, onTryPlus, onStartAnyway }: Props) {
  const g = useLv2Glass();
  const insets = useStableSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const copy = useMemo(() => copyFor(lang), [lang]);
  const attempts = attemptsPhrase(lang, remaining);
  const sheetY = useRef(new Animated.Value(1)).current; // 0 — на месте, 1 — за нижним краем (доля высоты)
  const dragY = useRef(new Animated.Value(0)).current;
  const scrim = useRef(new Animated.Value(0)).current;
  const sheetHeightRef = useRef(420);
  const closingRef = useRef(false);

  useEffect(() => {
    if (!visible) return;
    closingRef.current = false;
    dragY.setValue(0);
    if (reduceMotion) {
      sheetY.setValue(0);
      scrim.setValue(0);
      Animated.timing(scrim, { toValue: 1, duration: SCRIM_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
      return;
    }
    sheetY.setValue(1);
    scrim.setValue(0);
    Animated.parallel([
      Animated.timing(sheetY, { toValue: 0, duration: ENTER_MS, easing: DRAWER_EASE, useNativeDriver: true }),
      Animated.timing(scrim, { toValue: 1, duration: SCRIM_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [dragY, reduceMotion, scrim, sheetY, visible]);

  // уход: шторка вниз и затемнение гаснут быстрее входа, затем решение уходит наверх
  const closeThen = useCallback((after: () => void) => {
    if (closingRef.current) return;
    closingRef.current = true;
    Animated.parallel([
      reduceMotion
        ? Animated.timing(sheetY, { toValue: 0, duration: 0, useNativeDriver: true })
        : Animated.timing(sheetY, { toValue: 1, duration: EXIT_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(scrim, { toValue: 0, duration: EXIT_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start(() => after());
  }, [reduceMotion, scrim, sheetY]);

  const startAnyway = useCallback(() => closeThen(onStartAnyway), [closeThen, onStartAnyway]);
  const tryPlus = useCallback(() => closeThen(onTryPlus), [closeThen, onTryPlus]);
  const startAnywayRef = useRef(startAnyway);
  startAnywayRef.current = startAnyway;

  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_e, gs) => gs.dy > 6 && Math.abs(gs.dy) > Math.abs(gs.dx),
    onPanResponderMove: (_e, gs) => {
      // вверх — с сопротивлением, вниз — за пальцем
      dragY.setValue(gs.dy > 0 ? gs.dy : gs.dy / 4);
    },
    onPanResponderRelease: (_e, gs) => {
      if (gs.dy > DISMISS_DISTANCE || gs.vy > DISMISS_VELOCITY) {
        console.log('[VOICE-HEADSUP] swipe down → Начать всё равно', JSON.stringify({ dy: Math.round(gs.dy), vy: Number(gs.vy.toFixed(2)) })); // guard-ok: одна строка на жест
        startAnywayRef.current();
        return;
      }
      Animated.timing(dragY, { toValue: 0, duration: EXIT_MS, easing: DRAWER_EASE, useNativeDriver: true }).start();
    },
    onPanResponderTerminate: () => {
      Animated.timing(dragY, { toValue: 0, duration: EXIT_MS, easing: DRAWER_EASE, useNativeDriver: true }).start();
    },
  }), [dragY]);

  const translateY = Animated.add(
    sheetY.interpolate({ inputRange: [0, 1], outputRange: [0, sheetHeightRef.current + 40] }),
    dragY,
  );
  const dots = Array.from({ length: Math.max(0, limit) }, (_unused, index) => index < remaining);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={startAnyway} statusBarTranslucent>
      <View style={styles.root} testID="learning-v2-voice-headsup">
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: SCRIM_COLOR, opacity: scrim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={startAnyway} accessibilityLabel={copy.start} testID="learning-v2-voice-headsup-scrim" />
        </Animated.View>
        <Animated.View
          {...pan.panHandlers}
          onLayout={(event) => { sheetHeightRef.current = event.nativeEvent.layout.height; }}
          style={[
            styles.sheet,
            {
              backgroundColor: g.opaqueCard,
              paddingBottom: 30 + insets.bottom,
              transform: [{ translateY }],
              opacity: reduceMotion ? scrim : 1,
            },
          ]}
          accessibilityViewIsModal
        >
          <View style={[styles.grabber, { backgroundColor: g.opaqueControl }]} />
          <View style={[styles.mic, { backgroundColor: g.accentSoft }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Ionicons name="mic-outline" size={30} color={g.accent} />
            <View style={[styles.badge, { backgroundColor: g.accent, boxShadow: `0 0 0 2.5px ${g.opaqueCard}` }]}>
              <Text style={[styles.badgeText, { color: g.accentInk }]} maxFontSizeMultiplier={1.2}>{remaining}</Text>
            </View>
          </View>
          <Text style={[styles.title, { color: g.text }]} maxFontSizeMultiplier={1.4} accessibilityRole="header">{copy.title}</Text>
          <Text style={[styles.body, { color: g.secondary }]} maxFontSizeMultiplier={1.4}>
            {leadFor(lang, copy, remaining)}
            <Text style={[styles.bodyEm, { color: g.text }]}>{attempts}</Text>
            {copy.tail}
          </Text>
          <View style={[styles.counter, { backgroundColor: g.opaqueControl }]} accessibilityLabel={`${copy.today} · ${remaining} ${copy.of} ${limit}`}>
            {dots.map((on, index) => (
              <View key={index} /* guard-ok: постоянный ряд из limit точек, не сортируется */ style={[styles.dot, on ? { backgroundColor: g.accent } : { backgroundColor: g.secondary, opacity: 0.35 }]} />
            ))}
            <Text style={[styles.counterText, { color: g.text }]} maxFontSizeMultiplier={1.3}>{`${copy.today} · ${remaining} ${copy.of} ${limit}`}</Text>
          </View>
          <Lv2Cta onPress={tryPlus} style={styles.cta} testID="learning-v2-voice-headsup-plus">{copy.plus}</Lv2Cta>
          <Pressable
            onPress={() => { void hapticTap(); startAnyway(); }}
            accessibilityRole="button"
            style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
            testID="learning-v2-voice-headsup-start"
          >
            <Text style={[styles.ghostText, { color: g.secondary }]} maxFontSizeMultiplier={1.3}>{copy.start}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default memo(LearningV2VoiceHeadsupSheet);

// размеры — 1:1 по макету #sheet: радиус 30, отступы 10/22/30, ручка 38×5, микрофон 64 (r 20) со значком 24, заголовок 22/27,
// текст 16/22, счётчик 32 (r 16) с точками 7, главная кнопка 54 (через Lv2Cta), тихая 44
const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 10, paddingHorizontal: 22, alignItems: 'center',
    boxShadow: '0 -18px 40px -18px rgba(0,0,0,0.35)', // theme-exempt: тень шторки — тёмная в любой теме (стиль «Тень»)
  },
  grabber: { width: 38, height: 5, borderRadius: 3, marginBottom: 18 },
  mic: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute', right: -5, top: -5, minWidth: 24, height: 24, paddingHorizontal: 5, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', // кольцо цвета шторки — тенью-разлётом (макет: box-shadow 0 0 0 2.5px raised), без обводки
  },
  badgeText: { fontSize: 13, lineHeight: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  title: { marginTop: 16, fontSize: 22, lineHeight: 27, fontWeight: '800', letterSpacing: -0.2, textAlign: 'center' },
  body: { marginTop: 8, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  bodyEm: { fontWeight: '700' },
  counter: { marginTop: 14, height: 32, paddingHorizontal: 14, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  counterText: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  cta: { marginTop: 20, alignSelf: 'stretch' },
  ghost: { height: 44, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  ghostText: { fontSize: 16, fontWeight: '600' },
  pressed: { transform: [{ scale: 0.97 }] },
});
