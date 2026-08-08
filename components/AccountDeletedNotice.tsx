// ════════════════════════════════════════════════════════════════════════════
// AccountDeletedNotice.tsx — короткая плашка «Вы удалили все свои данные»
// вверху первого экрана онбординга.
//
// зачем: подтверждение удаления аккаунта нельзя показывать алертом — алерт это
// нативный <Modal>, а он презентуется в тот же кадр, в котором закрывается
// модалка подтверждения; на iOS это ломает стек презентаций (настройки
// остаются на месте, тапы мертвы, онбординг не появляется). Плашка живёт
// ВНУТРИ уже смонтированного онбординга, поэтому никакого present/dismiss нет.
//
// Не перекрывает управление: absolute + pointerEvents="none", тап проходит
// насквозь к кнопкам онбординга под ней.
// ════════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { FlowText } from './text-integrity/FlowText';
import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { ACCOUNT_DELETED_NOTICE_DURATION_MS } from '../app/account_deleted_notice';

/** Тайминги: быстрый вход, спокойный уход — экспоненциальный ease-out, без bounce. */
const ENTER_MS = 260;
const EXIT_MS = 340;

type Props = {
  /** Текст уже локализован вызывающей стороной. */
  message: string;
  /** Плашка отыграла и снялась — родитель может забыть про неё. */
  onDone: () => void;
  /** Светлый вариант онбординга. */
  light?: boolean;
};

function AccountDeletedNotice({ message, onDone, light = false }: Props) {
  const insets = useStableSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const anim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(true);
  // зачем: onDone приходит из родителя и может меняться между рендерами.
  // Держим его в ref, чтобы эффект анимации не перезапускался из-за новой
  // ссылки — иначе плашка проигрывала бы вход заново и никогда не уходила.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (reduceMotion) {
      // Без движения: просто показать и снять по таймеру.
      anim.setValue(1);
      const timer = setTimeout(() => {
        setMounted(false);
        onDoneRef.current();
      }, ACCOUNT_DELETED_NOTICE_DURATION_MS);
      return () => clearTimeout(timer);
    }

    let exitTimer: ReturnType<typeof setTimeout> | null = null;
    const enter = Animated.timing(anim, {
      toValue: 1,
      duration: ENTER_MS,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    });
    enter.start(({ finished }) => {
      if (!finished) return;
      exitTimer = setTimeout(() => {
        Animated.timing(anim, {
          toValue: 0,
          duration: EXIT_MS,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }).start(({ finished: exitFinished }) => {
          if (!exitFinished) return;
          setMounted(false);
          onDoneRef.current();
        });
      }, ACCOUNT_DELETED_NOTICE_DURATION_MS);
    });

    return () => {
      enter.stop();
      anim.stopAnimation();
      if (exitTimer) clearTimeout(exitTimer);
    };
  }, [anim, reduceMotion]);

  if (!mounted) return null;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[
        styles.wrap,
        { top: insets.top + 10 },
        {
          opacity: anim,
          transform: [{
            translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }),
          }],
        },
      ]}
    >
      <View style={[styles.pill, light && styles.pillLight]}>
        {/* зачем: text-integrity — длинная локаль переносится, пилюля растёт
            по паддингам; усечение numberOfLines запрещено. */}
        <FlowText testID="account-deleted-notice-text" provenance="authored" style={[styles.text, light && styles.textLight]}>
          {message}
        </FlowText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    // Выше контента онбординга, ниже любых нативных модалок.
    zIndex: 40,
    alignItems: 'center',
  },
  pill: {
    // Разделение тоном, без обводки (правило владельца).
    backgroundColor: 'rgba(255,255,255,0.13)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  pillLight: {
    backgroundColor: 'rgba(19,31,56,0.10)',
  },
  text: {
    // #E8ECF5 на фоне онбординга даёт контраст заметно выше 4.5:1.
    color: '#E8ECF5',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    textAlign: 'center',
  },
  textLight: {
    color: '#101828',
  },
});

export default memo(AccountDeletedNotice);
