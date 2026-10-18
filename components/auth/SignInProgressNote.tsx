// ═══════════════════════════════════════════════════════════════════════════
// SignInProgressNote.tsx — спокойная строка «Входим…» и мягкая карточка сбоя входа.
//
// зачем (координатор 18.10, макет docs/design/v2-app/auth-states.html, блоки 3–4): вход занимает секунды, а ожидание без слов тревожит. Через 3 секунды —
// спокойная строка «Входим…» с тремя мягко мигающими точками (без «сервер», «ожидание ответа», процентов); через 8 секунд строка честно говорит «Вход занимает
// больше времени. Можно закрыть это окно — вход продолжится.». Сбой — не красный текст, а мягкая карточка тоном, без рамки: что случилось человеческими словами
// и «Попробовать ещё раз» (при «слишком много попыток» кнопки повтора нет). Коды ошибок на экран не попадают — только в журнал [AUTH-…] у вызывающего.
// Никакого полноэкранного спиннера. Размеры текста — шкала D145 (16/21 вместо 15 макета; сообщено Макетам). «Меньше движения» — точки статичны.
// Подключает Авторизация: <SignInStatusLine active={loadingProvider !== null} /> и <SignInFailureCard kind onRetry />.
// ═══════════════════════════════════════════════════════════════════════════
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { hapticTap } from '../../hooks/use-haptics';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';
import { actionBoxShadow, nestedBoxShadow } from '../v2/ShadowSurface';
import { signInCalmText, signInFailureBody, signInFailureTitle, signInLongText, signInRetryLabel, type SignInFailureKind } from './sign_in_progress_copy';

/** Когда появляется спокойная строка и когда она меняется на «занимает больше времени» (макет, блок 3). */
export const SIGN_IN_CALM_AFTER_MS = 3000;
export const SIGN_IN_LONG_AFTER_MS = 8000;

const LOG = '[AUTH-PROGRESS-UI]';

/** Мигающая точка: прозрачность .3 ↔ 1, цикл 1,2 с, сдвиг между точками .2 с (макет `dt`). */
function Dot({ delayMs, color, still }: Readonly<{ delayMs: number; color: string; still: boolean }>) {
  const opacity = useSharedValue(still ? 0.6 : 0.3);
  useEffect(() => {
    if (still) {
      cancelAnimation(opacity);
      opacity.value = 0.6;
      return undefined;
    }
    opacity.value = withDelay(delayMs, withRepeat(withSequence(withTiming(1, { duration: 420 }), withTiming(0.3, { duration: 780 })), -1, false));
    return () => cancelAnimation(opacity);
  }, [delayMs, opacity, still]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[s.dot, { backgroundColor: color }, style]} />;
}

export type SignInStatusLineProps = Readonly<{
  /** Идёт вход. Отсчёт 3 и 8 секунд начинается с active = true и сбрасывается при active = false. */
  active: boolean;
  /** Читалка объявляет смену строки (по умолчанию да). Окно входа с собственным объявлением ставит false, чтобы не читать дважды. */
  announce?: boolean;
  /** Строка стоит в слоте другой строки (окно входа: на месте «Данные на устройстве сохранятся») — без верхнего отступа. */
  flush?: boolean;
  /** Окно входа узнаёт фазу, чтобы скрыть строку, на место которой встаёт «Входим…» (Макеты A3.2). */
  onPhaseChange?: (phase: 'quiet' | 'calm' | 'long') => void;
  testID?: string;
}>;

function SignInStatusLineBase({ active, announce = true, flush = false, onPhaseChange, testID }: SignInStatusLineProps) {
  const { lang } = useLang();
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const reduceMotion = useReduceMotion();
  const [phase, setPhase] = useState<'quiet' | 'calm' | 'long'>('quiet');

  useEffect(() => {
    if (!active) {
      setPhase('quiet');
      return undefined;
    }
    const calm = setTimeout(() => { console.log(LOG, 'status', JSON.stringify({ phase: 'calm' })); setPhase('calm'); }, SIGN_IN_CALM_AFTER_MS); // guard-ok: смена строки входа
    const long = setTimeout(() => { console.log(LOG, 'status', JSON.stringify({ phase: 'long' })); setPhase('long'); }, SIGN_IN_LONG_AFTER_MS); // guard-ok: смена строки входа
    return () => { clearTimeout(calm); clearTimeout(long); };
  }, [active]);

  // зачем (Макеты A3.2): фаза уходит наружу после коммита, а не во время рендера
  useEffect(() => { onPhaseChange?.(active ? phase : 'quiet'); }, [active, phase, onPhaseChange]);

  if (!active || phase === 'quiet') return null;
  const text = phase === 'long' ? signInLongText(lang) : signInCalmText(lang);
  return (
    <View testID={testID ?? 'sign-in-status'} accessibilityRole="text" accessibilityLiveRegion={announce ? 'polite' : 'none'} accessibilityLabel={text} style={flush ? s.statusRowFlush : s.statusRow}>
      <Text maxFontSizeMultiplier={1.3} style={[s.statusText, { color: g.secondary }]}>{text}</Text>
      {phase === 'calm' ? (
        <View style={s.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Dot delayMs={0} color={g.secondary} still={reduceMotion} />
          <Dot delayMs={200} color={g.secondary} still={reduceMotion} />
          <Dot delayMs={400} color={g.secondary} still={reduceMotion} />
        </View>
      ) : null}
    </View>
  );
}
export const SignInStatusLine = memo(SignInStatusLineBase);

export type SignInFailureCardProps = Readonly<{
  kind: SignInFailureKind;
  /** Свой заголовок и причина (отказ с особой причиной: «Нужен прежний аккаунт», «Аккаунт восстановлен»…). Без них — тексты по виду сбоя. */
  title?: string;
  /** Пустая строка — причины нет, карточка из одного заголовка. */
  body?: string;
  /** «Попробовать ещё раз» — повторяет тот же способ входа. Без обработчика, как и при «много попыток», кнопки нет. */
  onRetry?: () => void;
  testID?: string;
}>;

function SignInFailureCardBase({ kind, title, body, onRetry, testID }: SignInFailureCardProps) {
  const { lang } = useLang();
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const retried = useRef(false);
  const canRetry = kind !== 'too_many' && !!onRetry;

  useEffect(() => {
    console.log(LOG, 'failure shown', JSON.stringify({ kind, canRetry, ownCopy: title !== undefined })); // guard-ok: показ сбоя; код ошибки на экран не попадает
  }, [kind, canRetry, title]);

  const retry = useCallback(() => {
    if (retried.current) {
      console.log(LOG, 'retry ignored', JSON.stringify({ reason: 'already_tapped' })); // guard-ok: ранний выход называет причину
      return;
    }
    retried.current = true; // двойной тап: повтор один; карточку при новой попытке снимает вызывающий
    hapticTap();
    console.log(LOG, 'retry', JSON.stringify({ kind })); // guard-ok: выбор
    onRetry?.();
  }, [kind, onRetry]);

  return (
    <View testID={testID ?? 'sign-in-failure'} accessibilityRole="alert" style={[s.card, { backgroundColor: g.buttonFill, boxShadow: nestedBoxShadow(g) }]}>
      <View style={s.cardRow}>
        {/* зачем: облако «нет связи» — только для сбоя сети; у отказов со своим текстом (прежний аккаунт, нет способа входа) значок нейтральный */}
        <Ionicons name={title === undefined ? 'cloud-offline-outline' : 'information-circle-outline'} size={20} color={g.text} style={s.cardIcon} accessibilityElementsHidden importantForAccessibility="no" />
        <View style={s.cardCopy}>
          <Text maxFontSizeMultiplier={1.3} style={[s.cardTitle, { color: g.text }]}>{title ?? signInFailureTitle(lang)}</Text>
          {/* зачем: secondary на buttonFill не проходит 4,5:1 во всех 138 сочетаниях тем (сторож blend_auth_1018) — причина основным цветом, различие с заголовком весом */}
          {body === '' ? null : <Text maxFontSizeMultiplier={1.3} style={[s.cardBody, { color: g.text }]}>{body ?? signInFailureBody(kind, lang)}</Text>}
        </View>
      </View>
      {canRetry ? (
        <Pressable
          testID="sign-in-retry"
          accessibilityRole="button"
          accessibilityLabel={signInRetryLabel(lang)}
          onPress={retry}
          style={({ pressed }) => [s.retry, { backgroundColor: g.ctaFill, boxShadow: actionBoxShadow(g) }, pressed ? s.pressed : null]}
        >
          <Ionicons name="refresh-outline" size={16} color={g.ctaFillInk} />
          <Text maxFontSizeMultiplier={1.3} style={[s.retryText, { color: g.ctaFillInk }]}>{signInRetryLabel(lang)}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
export const SignInFailureCard = memo(SignInFailureCardBase);

// макет: `.slow` 15/21 → 16/21 (D145), поля сверху 14, зазор 8; точки 5; `.oops` радиус 18, поля 14/14/14/16; `.retry` 40, радиус 20, поля слева 32 (под текст)
const s = StyleSheet.create({
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 },
  statusRowFlush: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  statusText: { fontSize: 16, lineHeight: 21, fontWeight: '600', textAlign: 'center', flexShrink: 1 },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  card: { marginTop: 16, borderRadius: 18, paddingTop: 14, paddingRight: 14, paddingBottom: 14, paddingLeft: 16 },
  cardRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  cardIcon: { marginTop: 1 },
  cardCopy: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  cardBody: { fontSize: 16, lineHeight: 21, marginTop: 2 },
  retry: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingHorizontal: 16, borderRadius: 20, marginTop: 12, marginLeft: 32 },
  retryText: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  pressed: { transform: [{ scale: 0.97 }] },
});
