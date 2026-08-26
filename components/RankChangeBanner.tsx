import React, { memo, useEffect, useRef } from 'react';
import { Animated, Pressable, Text, TextInput, View } from 'react-native';
import Reanimated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  runOnJS,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { triLang, type Lang } from '../constants/i18n';
import { useTheme } from './ThemeContext';
import { LUM, TOAST } from '../constants/motionHybrid';
import { hapticSoftImpact } from '../hooks/use-haptics';
import { useReduceMotion } from '../hooks/use_reduce_motion';

// зачем: animatedProps (useAnimatedProps worklet) типизирован только у
// Reanimated.createAnimatedComponent — RN Animated.createAnimatedComponent
// не знает про это поле (TS2322), хотя рантайм у обоих RN Animated одинаковый.
const AnimatedTextInput = Reanimated.createAnimatedComponent(TextInput);

interface Props {
  /** prev_rank - new_rank. >0 = поднялся, <0 = опустился. */
  delta: number;
  passedName?: string | null;
  lostToName?: string | null;
  lang: Lang;
  /** auto-dismiss через ms (default 5000). 0 — не скрывать сам. */
  duration?: number;
  onClose: () => void;
  /** Production default — hybrid; explicit `classic` is the rollback/QA path. */
  motionVariant?: 'classic' | 'hybrid';
}

/**
 * зачем: гибрид «Световод» («шаг ранга» из макета T3-семьи — персистентный
 * статус-баннер) — вход из света (y -12→0, LUM.settle, без отскока), блик
 * пробегает по числу дельты, само число тикает через AnimatedTextInput на
 * useAnimatedProps (закон №6: никогда setState на каждый тик), выход короче
 * входа (TOAST.exitMs).
 */
function RankChangeHybridCard({
  isUp,
  absN,
  title,
  subtitle,
  accent,
  cardBg,
  textColor,
  duration,
  onDismiss,
}: {
  isUp: boolean;
  absN: number;
  title: string;
  subtitle: string;
  accent: string;
  cardBg: string;
  textColor: string;
  duration: number;
  onDismiss: () => void;
}) {
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(0);
  const y = useSharedValue(-12);
  const sweep = useSharedValue(-1);
  const numProgress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      y.value = 0;
      sweep.value = -1;
      numProgress.value = 1;
      void hapticSoftImpact();
      if (duration <= 0) return;
      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    }
    opacity.value = withTiming(1, { duration: TOAST.enterMs, easing: Easing.out(Easing.cubic) });
    y.value = withSpring(0, LUM.settle);
    sweep.value = withDelay(TOAST.enterMs, withTiming(2, { duration: TOAST.sweepMs, easing: Easing.out(Easing.cubic) }));
    numProgress.value = withDelay(TOAST.enterMs, withTiming(1, { duration: TOAST.countMs, easing: Easing.out(Easing.cubic) }));
    void hapticSoftImpact();
    let exitTimer: ReturnType<typeof setTimeout> | null = null;
    if (duration > 0) {
      exitTimer = setTimeout(() => {
        opacity.value = withTiming(0, { duration: TOAST.exitMs, easing: Easing.out(Easing.cubic) });
        y.value = withTiming(-10, { duration: TOAST.exitMs, easing: Easing.out(Easing.cubic) }, (finished) => {
          if (finished) runOnJS(onDismiss)();
        });
      }, duration);
    }
    return () => {
      if (exitTimer) clearTimeout(exitTimer);
      cancelAnimation(opacity);
      cancelAnimation(y);
      cancelAnimation(sweep);
      cancelAnimation(numProgress);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, reduceMotion]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));
  const sweepStyle = useAnimatedStyle(() => ({
    opacity: sweep.value > -1 && sweep.value < 2 ? 1 : 0,
    transform: [{ translateX: sweep.value * 90 }, { skewX: '-18deg' }],
  }));
  const numAnimatedProps = useAnimatedProps(() => ({
    text: `${isUp ? '+' : '−'}${Math.round(absN * numProgress.value)}`,
    defaultValue: `${isUp ? '+' : '−'}0`,
  }));

  const handlePress = () => {
    if (reduceMotion) {
      onDismiss();
      return;
    }
    opacity.value = withTiming(0, { duration: TOAST.exitMs, easing: Easing.out(Easing.cubic) });
    y.value = withTiming(-10, { duration: TOAST.exitMs, easing: Easing.out(Easing.cubic) }, (finished) => {
      if (finished) runOnJS(onDismiss)();
    });
  };

  return (
    <Reanimated.View style={[{ marginBottom: 12, overflow: 'hidden', borderRadius: 14 }, cardStyle]}>
      <Pressable
        onPress={handlePress}
        accessibilityRole="alert"
        accessibilityLabel={`${title}. ${subtitle}`}
        style={{ backgroundColor: cardBg, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, overflow: 'hidden' }}
      >
        <Reanimated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', top: 0, bottom: 0, width: 40, backgroundColor: accent + '33' },
            sweepStyle,
          ]}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
            <Ionicons name={isUp ? 'trending-up' : 'trending-down'} size={18} color={accent} />
            <AnimatedTextInput
              editable={false}
              pointerEvents="none"
              animatedProps={numAnimatedProps as never}
              style={{ color: accent, fontSize: 17, fontWeight: '700', minWidth: 44 }}
            />
            <Text style={{ color: accent, fontSize: 15, fontWeight: '700', flexShrink: 1 }}>
              {title}
            </Text>
          </View>
          <Ionicons name="close" size={16} color={textColor} style={{ opacity: 0.5 }} />
        </View>
        <Text style={{ color: textColor, fontSize: 12.5, marginTop: 4, fontWeight: '400', opacity: 0.82 }} /* guard-ok: не расшифровка заголовка — основной текст баннера (кого обогнал), роль как message in ActionToast */>
          {subtitle}
        </Text>
      </Pressable>
    </Reanimated.View>
  );
}

function RankChangeBanner({
  delta,
  passedName,
  lostToName,
  lang,
  duration = 5000,
  onClose,
  motionVariant = 'hybrid',
}: Props) {
  const { f, theme: t } = useTheme();
  const isHybrid = motionVariant === 'hybrid';
  const anim = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const animationKey = `${delta}:${passedName?.trim() ?? ''}:${lostToName?.trim() ?? ''}`;

  useEffect(() => {
    if (isHybrid) return;
    anim.setValue(0);
    const seq: Animated.CompositeAnimation[] = [
      Animated.timing(anim, { toValue: 1, duration: 280, useNativeDriver: true }),
    ];
    if (duration > 0) {
      seq.push(Animated.delay(duration));
      seq.push(Animated.timing(anim, { toValue: 0, duration: 240, useNativeDriver: true }));
    }
    const a = Animated.sequence(seq);
    a.start(({ finished }) => {
      if (finished && duration > 0) onCloseRef.current();
    });
    return () => a.stop();
  }, [anim, duration, animationKey, isHybrid]);

  const isUp = delta > 0;
  const absN = Math.abs(delta);
  const positions = triLang(lang, {
    ru: absN === 1 ? 'позицию' : 'позиций',
    uk: absN === 1 ? 'позицію' : 'позиції',
    en: absN === 1 ? 'spot' : 'spots',
    es: absN === 1 ? 'puesto' : 'puestos',
    'pt-BR': absN === 1 ? 'posição' : 'posições',
    vi: 'hạng',
    id: 'posisi',
    tr: 'sıra',
    pl: absN === 1 ? 'pozycję' : 'pozycji',
  });
  const upDir = triLang(lang, {
    ru: 'вверх',
    uk: 'вгору',
    en: 'up',
    es: 'arriba',
    'pt-BR': 'para cima',
    vi: 'lên',
    id: 'naik',
    tr: 'yukarı',
    pl: 'w górę',
  });
  const downDir = triLang(lang, {
    ru: 'вниз',
    uk: 'вниз',
    en: 'down',
    es: 'abajo',
    'pt-BR': 'para baixo',
    vi: 'xuống',
    id: 'turun',
    tr: 'aşağı',
    pl: 'w dół',
  });

  // зачем: аудит 2026-08-17 — реальные эмодзи в тексте тоста (запрет владельца,
  // правило 4). Направление уже показано иконкой trending-up/down рядом со
  // счётчиком (см. RankChangeHybridCard) — эмодзи только дублировали её текстом.
  let title: string;
  if (isUp) {
    title = `+${absN} ${positions} ${upDir}`;
  } else {
    title = `−${absN} ${positions} ${downDir}`;
  }

  let subtitle: string;
  if (isUp) {
    if (passedName && passedName.trim()) {
      subtitle = triLang(lang, {
        ru: `Обогнал ${passedName.trim()}`,
        uk: `Обігнав ${passedName.trim()}`,
        en: `Passed ${passedName.trim()}`,
        es: `Has adelantado a ${passedName.trim()}`,
        'pt-BR': `Você passou ${passedName.trim()}`,
        vi: `Bạn đã vượt qua ${passedName.trim()}`,
        id: `Kamu melewati ${passedName.trim()}`,
        tr: `${passedName.trim()} kişisini geçtin`,
        pl: `Wyprzedzasz ${passedName.trim()}`,
      });
    } else {
      subtitle = triLang(lang, {
        ru: 'Ты молодец — стал выше в списке!',
        uk: 'Молодець — став вище у списку!',
        en: "Nice work — you moved up the list!",
        es: '¡Muy bien: has subido en la lista!',
        'pt-BR': 'Muito bem: você subiu na lista!',
        vi: 'Tốt lắm: bạn đã lên hạng trong danh sách!',
        id: 'Bagus: kamu naik di daftar!',
        tr: 'Harika: listede yükseldin!',
        pl: 'Brawo: jesteś wyżej na liście!',
      });
    }
  } else {
    if (lostToName && lostToName.trim()) {
      subtitle = triLang(lang, {
        ru: `Уступил ${lostToName.trim()}. Не сдавайся!`,
        uk: `Поступився ${lostToName.trim()}. Не здавайся!`,
        en: `${lostToName.trim()} passed you. Don't give up!`,
        es: `${lostToName.trim()} te adelantó. ¡No te rindas!`,
        'pt-BR': `${lostToName.trim()} passou você. Não desista!`,
        vi: `${lostToName.trim()} đã vượt qua bạn. Đừng bỏ cuộc!`,
        id: `${lostToName.trim()} melewatimu. Jangan menyerah!`,
        tr: `${lostToName.trim()} seni geçti. Pes etme!`,
        pl: `${lostToName.trim()} Cię wyprzedza. Nie poddawaj się!`,
      });
    } else {
      subtitle = triLang(lang, {
        ru: 'Ничего страшного — соберись и наверстаешь.',
        uk: 'Нічого страшного — зберись та наздоженеш.',
        en: "It's fine — pull it together and catch up.",
        es: 'No pasa nada — puedes recuperarlo.',
        'pt-BR': 'Tudo bem — você pode recuperar.',
        vi: 'Không sao — bạn có thể lấy lại.',
        id: 'Tidak apa-apa — kamu bisa mengejarnya.',
        tr: 'Sorun değil — toparlayıp geri alabilirsin.',
        pl: 'Nic się nie stało — możesz to odrobić.',
      });
    }
  }

  const bg = isUp ? '#10381e' : '#3a2a14';
  const border = isUp ? '#34d399' : '#f59e0b';
  const titleColor = isUp ? '#34d399' : '#fbbf24';
  const bodyColor = isUp ? '#D8FBE8' : '#FFE9B5';
  const closeColor = 'rgba(255,255,255,0.68)';

  if (isHybrid) {
    return (
      <RankChangeHybridCard
        isUp={isUp}
        absN={absN}
        title={title}
        subtitle={subtitle}
        accent={isUp ? t.correct : t.gold}
        cardBg={t.bgCard}
        textColor={t.textPrimary}
        duration={duration}
        onDismiss={onClose}
      />
    );
  }

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
        marginBottom: 12,
      }}
    >
      <Pressable
        onPress={() => {
          Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onCloseRef.current());
        }}
        style={{
          backgroundColor: bg,
          borderColor: border,
          borderWidth: 0,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <Text style={{ color: titleColor, fontSize: f.bodyLg, fontWeight: '800', flexShrink: 1 }}>
            {title}
          </Text>
          <Text style={{ color: closeColor, fontSize: f.caption }}>×</Text>
        </View>
        <Text style={{ color: bodyColor, fontSize: f.sub, marginTop: 4, fontWeight: '600' }}>
          {subtitle}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export default memo(RankChangeBanner);
