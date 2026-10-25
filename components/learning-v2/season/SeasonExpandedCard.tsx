// ════════════════════════════════════════════════════════════════════════════
// SeasonExpandedCard.tsx — раскрытая карта эпизода или экзамена поверх экрана (эталон course-hybrid-1-4.html `.h2zoom` + `c4front`, chapter-exam-season.html `zoomX`).
//
// зачем (владелец 21.10): тап по центральной карте карусели раскрывает её крупно: метка «Эпизод N», справа число заданий (у закрытого — «просмотр» и крестик),
// крупная фраза, перевод, название эпизода, слова чипами, у закрытого — строка «Откроется после эпизода N» и кнопки «К эпизоду N» / «Открыть экзаменом главы».
// Действие экзамена («Открыть экзаменом главы», «Сдать экзамен») показывается ТОЛЬКО при включённом флаге SEASON_CHAPTER_EXAM_ENABLED: логики экзамена в коде
// ещё нет (её сделает Learning V2), а карта не должна вести в пустоту. Закрытие мгновенное (тап по затемнению, крестик); вход — один спокойный ease-out 220 мс.
// ════════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import V2Pressable from '../../v2/V2Pressable';
import Ionicons from '@expo/vector-icons/Ionicons';

import { LinearGradient } from '../../SafeLinearGradient';
import type { SeasonArt } from './season_art';
import { SEASON_MODAL_MARGIN, seasonModalInside, seasonModalMaxWidth, seasonModalShift } from './season_modal_bounds';
import { episodeModalLog, seasonLayoutLog } from './season_modal_log';

/** Вход обязан закончиться: если за это время колбэк анимации не пришёл, карта принудительно полностью видна (зачем: полупрозрачное окно, сквозь которое видна карусель). */
const ENTER_WATCHDOG_MS = 600;
/** Когда после входа сверять положение карты с окном (мс от конца входа): сразу, после возможного движения пейджера и с запасом. */
const RECHECK_MS = [0, 250, 700, 1500] as const;

type IonName = React.ComponentProps<typeof Ionicons>['name'];

const WHITE = '#FFFFFF'; // theme-exempt: текст на градиентной карте белый в обеих темах (эталон `.c4card { color: #fff }`)
const WHITE_SOFT = 'rgba(255,255,255,0.86)'; // theme-exempt: вторичный текст на карте, эталон `.c4card .ru`
const GLASS = 'rgba(255,255,255,0.16)'; // theme-exempt: стеклянные чипы и кнопки на карте, эталон `.qchip.glass`
const INK = '#121318'; // theme-exempt: текст белой кнопки, эталон `.qbtn.white`
const DIM_LIGHT = 'rgba(23,24,30,0.38)'; // theme-exempt: затемнение экрана под раскрытой картой, эталон `--dimc` (Сумерки)
const DIM_DARK = 'rgba(0,0,0,0.5)'; // theme-exempt: затемнение экрана под раскрытой картой, эталон `--dimc` (Океан)
const ENERGY_PILL = 'rgba(18,19,24,0.08)'; // theme-exempt: цена ⚡1 на белой кнопке, эталон `.xen`
const SHADOW = '0 26px 50px -22px rgba(0,0,0,0.6)'; // theme-exempt: тень раскрытой карты, эталон `--sh2`

/** Окно перед стартом экзамена (chapter-exam-season.html `zoomX`): факты, цена ⚡1 для Free, строка для Plus. */
export type SeasonExamPanel = Readonly<{ facts: readonly string[]; energyBadge: boolean; plusLine: string | null }>;

// зачем (эталон chapter-exam-season.html, zoomX): «Позже» — стеклянная кнопка без значка, поэтому значок необязателен
export type SeasonExpandedAction = Readonly<{ label: string; icon?: IonName; onPress: () => void }>;

export type SeasonExpandedCardProps = Readonly<{
  kind: 'episode' | 'exam';
  dark: boolean;
  art: SeasonArt;
  glyph: IonName;
  /** Метка в левом верхнем углу: «Эпизод 14» или «Экзамен главы». */
  chipLabel: string;
  /** Справа сверху: «20 заданий». */
  rightLabel: string | null;
  /** Крупная фраза (эпизод) или название экзамена. */
  phrase: string;
  translation: string | null;
  title: string | null;
  words: readonly string[];
  primary: SeasonExpandedAction | null;
  secondary: SeasonExpandedAction | null;
  /** Только у карты экзамена. */
  exam?: SeasonExamPanel | null;
  closeLabel: string;
  onClose: () => void;
  reducedMotion: boolean;
  /** Для журнала [SEASON-LAYOUT]: урок и занятие/глава окна (в вёрстку не влияет). */
  logMeta?: Readonly<{ lesson: number; session: number }>;
}>;

function SeasonExpandedCard(p: SeasonExpandedCardProps) {
  const enter = useRef(new Animated.Value(p.reducedMotion ? 1 : 0)).current;
  const win = useWindowDimensions();
  const rootRef = useRef<View>(null);
  const cardRef = useRef<View>(null);
  const openedAt = useRef(Date.now());
  const settledRef = useRef(false);
  // зачем (жалоба владельца, iPhone 2.0.2: окно эпизода съехало вправо, правый край и кнопка обрезаны, низ просвечивал): сдвиг, возвращающий карту в окно
  const [shiftX, setShiftX] = useState(0);
  const shiftRef = useRef(0);

  // СПЕРВА ЛОГИ: положение корня и карты В ОКНЕ (измеряем только когда вход закончен — во время входа масштаб 0,94 искажает рамку)
  const checkFit = useCallback((why: string) => {
    const root = rootRef.current; const card = cardRef.current;
    if (!root || !card) { episodeModalLog('info', 'measure_skipped: ' + why, JSON.stringify({ root: !!root, card: !!card })); return; } // guard-ok: ранний выход с причиной
    root.measureInWindow((rx, ry, rw, rh) => {
      card.measureInWindow((cx, cy, cw, ch) => {
        const inside = seasonModalInside({ x: cx, width: cw }, win.width);
        const dx = seasonModalShift({ x: cx, width: cw }, win.width);
        episodeModalLog('info', 'measure: ' + why, JSON.stringify({ sinceOpenMs: Date.now() - openedAt.current, window: { w: Math.round(win.width), h: Math.round(win.height), scale: win.scale, fontScale: win.fontScale }, root: { x: Math.round(rx), y: Math.round(ry), w: Math.round(rw), h: Math.round(rh) }, card: { x: Math.round(cx), y: Math.round(cy), w: Math.round(cw), h: Math.round(ch) }, inside, shiftNow: shiftRef.current, needShift: Math.round(dx), reducedMotion: p.reducedMotion }), why.endsWith('+0ms') || why.endsWith('+700ms')); // guard-ok: все числа раскладки окна эпизода (в журнал устройства — на входе и через 0,7 с)
        if (why.endsWith('+0ms')) {
          // [SEASON-LAYOUT] открытие окна: где карточка и корень (Ревизор по поручению координатора)
          const rootBad = Math.round(rx) !== 0 || Math.round(rw - win.width) !== 0;
          seasonLayoutLog(rootBad || !inside ? 'warn' : 'info', JSON.stringify({ at: 'expanded_open', kind: p.kind, lesson: p.logMeta?.lesson ?? null, session: p.logMeta?.session ?? null, cardX: Math.round(cx), cardWidth: Math.round(cw), windowW: Math.round(win.width), rootWinX: Math.round(rx), rootWidth: Math.round(rw), diffW: Math.round(rw - win.width), inside })); // guard-ok: числа раскладки окна эпизода
        }
        if (dx !== 0) {
          shiftRef.current += dx;
          episodeModalLog('warn', 'outside_screen_restoring', JSON.stringify({ why, dx: Math.round(dx), shiftTotal: Math.round(shiftRef.current), cardX: Math.round(cx), cardW: Math.round(cw), windowW: Math.round(win.width) }), true); // guard-ok: ветка и значения, которые её решили
          setShiftX(shiftRef.current);
        }
      });
    });
  }, [p.reducedMotion, win.fontScale, win.height, win.scale, win.width]);

  const onRootLayout = (e: LayoutChangeEvent) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    episodeModalLog('info', 'root_layout', JSON.stringify({ x: Math.round(x), y: Math.round(y), w: Math.round(width), h: Math.round(height), windowW: Math.round(win.width), diffW: Math.round(width - win.width) })); // guard-ok: ширина корня против ширины окна — главное подозрение
  };
  const onCardLayout = (e: LayoutChangeEvent) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    episodeModalLog('info', 'card_layout', JSON.stringify({ x: Math.round(x), y: Math.round(y), w: Math.round(width), h: Math.round(height), maxW: seasonModalMaxWidth(win.width), kind: p.kind })); // guard-ok: числа раскладки карты
  };

  useEffect(() => {
    episodeModalLog('info', 'open', JSON.stringify({ platform: Platform.OS, osVersion: String(Platform.Version), screenW: Math.round(Dimensions.get('screen').width), maxWidth: seasonModalMaxWidth(win.width), margin: SEASON_MODAL_MARGIN, clip: { overflow: 'hidden', borderRadius: 32, layer: 'inner_static' }, enterTransform: { scaleFrom: 0.94, scaleTo: 1, translateX: 0 }, kind: p.kind, chip: p.chipLabel, reducedMotion: p.reducedMotion, from: { opacity: 0, scale: 0.94 }, to: { opacity: 1, scale: 1 }, durationMs: 220, windowW: Math.round(win.width), windowH: Math.round(win.height) }), true); // guard-ok: вход и начальная точка анимации
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: журнал открытия — один раз на показ карты
  }, []);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    settledRef.current = false;
    let alive = true; // зачем: после закрытия карты (и повторного запуска эффекта в dev) поздний колбэк анимации ничего не делает
    const finish = (how: string, finished: boolean) => {
      if (!alive || settledRef.current) return;
      settledRef.current = true;
      enter.setValue(1); // зачем: колбэк не пришёл (заморозка страницы, обрыв) или анимацию прервали — карта всё равно полностью видна и в масштабе 1
      episodeModalLog('info', 'enter_done', JSON.stringify({ how, finished, sinceOpenMs: Date.now() - openedAt.current, finalValue: { opacity: 1, scale: 1, translateX: 0 } }), true); // guard-ok: итог анимации
      RECHECK_MS.forEach((ms) => timers.push(setTimeout(() => checkFit(`after_enter +${ms}ms`), ms)));
    };
    if (p.reducedMotion) { enter.setValue(1); finish('reduced_motion', true); return () => { alive = false; timers.forEach(clearTimeout); }; }
    Animated.timing(enter, { toValue: 1, duration: 220, easing: Easing.bezier(0.23, 1, 0.32, 1), useNativeDriver: true }).start(({ finished }) => finish('animation_callback', finished));
    timers.push(setTimeout(() => { if (!settledRef.current) episodeModalLog('warn', 'watchdog', 'enter did not finish in ' + ENTER_WATCHDOG_MS + ' ms, forcing opacity and scale to 1', true); finish('watchdog', false); }, ENTER_WATCHDOG_MS)); // guard-ok: причина принудительного завершения
    return () => { alive = false; timers.forEach(clearTimeout); enter.stopAnimation(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: окно win.width нужно только внутри замера; пересоздание таймеров на повороте не нужно
  }, [enter, p.reducedMotion]);

  const cardStyle = { opacity: enter, transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] };
  return (
    <View ref={rootRef} onLayout={onRootLayout} style={styles.root} testID="season-expanded">
      <Pressable style={[styles.dim, { backgroundColor: p.dark ? DIM_DARK : DIM_LIGHT }]} onPress={p.onClose} accessibilityRole="button" accessibilityLabel={p.closeLabel} />
      {/* зачем (iOS, жалоба владельца: окно уже, чем нужно, правая часть срезана, правое поле больше левого): ширина окна — ОТ ОКНА (window − 2×24), а не от родителя (left/right) и не из onLayout во время входа;
          внешний слой (положение, тень, масштаб/прозрачность входа на нативном драйвере) БЕЗ overflow:hidden, обрезка по радиусу 32 — на внутреннем слое без анимации: на iOS clip по слою, который масштабировался при входе, мог остаться по старой рамке.
          shiftX — возврат в экран, если родитель на миг смещён (left, а не transform: он занят входом) */}
      <Animated.View ref={cardRef as React.Ref<never>} onLayout={onCardLayout} style={[styles.card, { width: seasonModalMaxWidth(win.width), left: SEASON_MODAL_MARGIN + shiftX }, cardStyle]}>
        <View style={styles.cardClip}>
        {p.kind === 'exam' ? (
          <LinearGradient colors={[p.art.from, p.art.to]} start={{ x: 0.33, y: 0 }} end={{ x: 0.67, y: 1 }} style={StyleSheet.absoluteFill} />
        ) : (
          <>
            <LinearGradient colors={[p.art.from, p.art.to]} start={{ x: 0.33, y: 0 }} end={{ x: 0.67, y: 1 }} style={StyleSheet.absoluteFill} />
            <LinearGradient colors={[p.art.glow, 'transparent']} start={{ x: 1, y: 0 }} end={{ x: 0.35, y: 0.6 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
          </>
        )}
        <View style={styles.top}>
          {p.kind === 'exam' ? <View style={styles.seal}><Ionicons name="trophy" size={24} color={WHITE} /></View> : (
            <View style={styles.chip}>
              <Text style={styles.chipText}>{p.chipLabel}</Text>
            </View>
          )}
          <View style={styles.flex} />
          {p.rightLabel ? <Text style={styles.right}>{p.rightLabel}</Text> : null}
          {/* зачем (эталон chapter-exam-season.html, zoomX: стеклянный круг 34 со значком ✕ в правом верхнем углу; в коде его не было — закрыть можно было только по подложке) */}
          {p.kind === 'exam' ? (
            <V2Pressable onPress={p.onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel={p.closeLabel} style={styles.closeBtn} testID="season-expanded-close">
              <Ionicons name="close" size={16} color={WHITE} />
            </V2Pressable>
          ) : null}
        </View>
        <Text style={styles.big} numberOfLines={4}>{p.phrase}</Text>
        {p.translation ? <Text style={styles.sub}>{p.translation}</Text> : null}
        {p.title ? <Text style={styles.title}>{p.title}</Text> : null}
        {p.exam && p.exam.facts.length > 0 ? (
          <View style={styles.facts} testID="season-exam-facts">{p.exam.facts.map((f) => <View key={f} style={styles.fact}><Text style={styles.factText}>{f}</Text></View>)}</View>
        ) : null}
        {p.words.length > 0 ? (
          <View style={styles.chips}>{p.words.map((w) => <View key={w} style={styles.wordChip}><Text style={styles.wordText}>{w}</Text></View>)}</View>
        ) : null}
        {p.primary ? (
          <V2Pressable hitSlop={6} accessibilityRole="button" onPress={p.primary.onPress} style={styles.primary} testID="season-expanded-primary">
            {p.primary.icon ? <Ionicons name={p.primary.icon} size={18} color={INK} /> : null}
            <Text style={styles.primaryText}>{p.primary.label}</Text>
            {p.exam?.energyBadge ? (
              <View style={styles.energy} testID="season-exam-energy"><Ionicons name="flash" size={13} color={INK} /><Text style={styles.energyText}>1</Text></View>
            ) : null}
          </V2Pressable>
        ) : null}
        {p.primary && p.exam?.plusLine ? <Text style={styles.plusLine} testID="season-exam-plus">{p.exam.plusLine}</Text> : null}
        {p.secondary ? (
          <V2Pressable hitSlop={6} accessibilityRole="button" onPress={p.secondary.onPress} style={styles.secondary} testID="season-expanded-secondary">
            {p.secondary.icon ? <Ionicons name={p.secondary.icon} size={18} color={WHITE} /> : null}
            <Text style={styles.secondaryText}>{p.secondary.label}</Text>
          </V2Pressable>
        ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { ...StyleSheet.absoluteFillObject, zIndex: 40 },
  dim: { ...StyleSheet.absoluteFillObject },
  card: { position: 'absolute', left: 24, top: 128, borderRadius: 32, boxShadow: SHADOW },
  cardClip: { maxHeight: 560, minHeight: 440, borderRadius: 32, overflow: 'hidden', padding: 18 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: GLASS, alignItems: 'center', justifyContent: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: GLASS },
  chipText: { fontSize: 16, lineHeight: 21, fontWeight: '700', color: WHITE },
  seal: { width: 46, height: 46, borderRadius: 14, backgroundColor: GLASS, alignItems: 'center', justifyContent: 'center' },
  right: { fontSize: 13, lineHeight: 17, color: WHITE_SOFT },
  big: { marginTop: 40, fontSize: 36, lineHeight: 40, fontWeight: '700', letterSpacing: -0.6, color: WHITE },
  sub: { marginTop: 6, fontSize: 16, lineHeight: 21, color: WHITE_SOFT },
  title: { marginTop: 14, fontSize: 19, lineHeight: 24, fontWeight: '700', color: WHITE },
  chips: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  wordChip: { height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: GLASS, alignItems: 'center', justifyContent: 'center' },
  wordText: { fontSize: 16, lineHeight: 21, fontWeight: '700', color: WHITE },
  facts: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fact: { height: 30, paddingHorizontal: 9, borderRadius: 15, backgroundColor: GLASS, alignItems: 'center', justifyContent: 'center' },
  factText: { fontSize: 13, lineHeight: 17, fontWeight: '700', color: WHITE },
  energy: { height: 26, paddingHorizontal: 9, borderRadius: 13, marginLeft: 6, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: ENERGY_PILL },
  energyText: { fontSize: 13, lineHeight: 17, fontWeight: '700', color: INK },
  plusLine: { marginTop: 10, textAlign: 'center', fontSize: 13, lineHeight: 17, color: WHITE_SOFT },
  primary: { marginTop: 16, height: 54, borderRadius: 27, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: WHITE },
  primaryText: { fontSize: 16, lineHeight: 21, fontWeight: '700', color: INK },
  secondary: { marginTop: 12, height: 50, borderRadius: 25, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: GLASS },
  secondaryText: { fontSize: 16, lineHeight: 21, fontWeight: '600', color: WHITE },
});

export default memo(SeasonExpandedCard);
