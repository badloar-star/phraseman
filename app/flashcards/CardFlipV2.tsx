/**
 * Переворачиваемая карточка «Карточек 2.0» — макет docs/design/v2-app/cards-v2.html, `.flip` / `flip()`.
 *
 * зачем (Карточки 2.0 12.10): одна и та же карточка нужна «Итогу» (секция «Ошибки», h132, переворот по тапу) и «Устно» (RU → EN, переворот
 * после верного ответа, h196). Макет: r20, лицо с подписью языка слева сверху (13/600), озвучка 36 справа сверху, слово 34/700 по центру,
 * оборот — перевод 30/700, значок «повернуть» справа снизу; поворот rotateY 560 мс cubic-bezier(.2,.8,.2,1), perspective 1200.
 * Стиль «Тень»: плашка без обводки (PlateFill + plateBoxShadow); исход «верно/неверно» — цветное кольцо-индикатор состояния.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing as REasing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useLineScale } from '../../hooks/useLineScale';
import { nestedBoxShadow, PlateFill, plateBoxShadow } from '../../components/v2/ShadowSurface';
import type { GlassTokens } from '../../constants/liquidGlassThemePalette';

/** `.flip .fl`: transform 560ms cubic-bezier(.2,.8,.2,1). */
export const CARD_FLIP_MS = 560;
const FLIP_EASE = REasing.bezier(0.2, 0.8, 0.2, 1);
const PERSPECTIVE = 1200;

export type CardFlipV2Props = Readonly<{
  g: GlassTokens;
  /** Лицо: слово/фраза (EN). */
  front: string;
  /** Оборот: перевод (RU). */
  back: string;
  frontLabel: string;
  backLabel: string;
  /** Необязательная строка под словом на обороте (пример). */
  backNote?: string;
  /** Высота карточки: 196 в шторке/«Устно», 132 в списке ошибок итога. */
  height?: number;
  /** Контролируемый разворот; без него — по тапу. */
  flipped?: boolean;
  onFlip?: (flipped: boolean) => void;
  /** Озвучка: кнопка 36 справа сверху на лице; нет — кнопки нет. */
  onSpeak?: () => void;
  speakLabel?: string;
  /** Цветное кольцо исхода (`.flip.ok` / `.flip.no`). */
  outcome?: 'ok' | 'no' | null;
  /** Без значка «повернуть» и без реакции на тап (когда разворотом управляет экран). */
  static?: boolean;
  /** Временно не реагировать на тап (например, пока идёт запись речи); значок «повернуть» остаётся. */
  disabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}>;

function CardFlipV2Impl({ g, front, back, frontLabel, backLabel, backNote, height = 196, flipped, onFlip, onSpeak, speakLabel, outcome = null, static: isStatic = false, disabled = false, accessibilityLabel, testID }: CardFlipV2Props) {
  const lh = useLineScale();
  const reduceMotion = useReduceMotion();
  const controlled = flipped !== undefined;
  const [innerFlipped, setInnerFlipped] = useState(false);
  const on = controlled ? flipped : innerFlipped;
  const turn = useSharedValue(on ? 1 : 0);

  useEffect(() => {
    turn.value = withTiming(on ? 1 : 0, { duration: reduceMotion ? 0 : CARD_FLIP_MS, easing: FLIP_EASE });
  }, [on, reduceMotion, turn]);

  // зачем: две грани в одном месте, каждая повёрнута на свой угол; невидимую обратную сторону прячет backfaceVisibility
  const frontStyle = useAnimatedStyle(() => ({ transform: [{ perspective: PERSPECTIVE }, { rotateY: `${turn.value * 180}deg` }] }));
  const backStyle = useAnimatedStyle(() => ({ transform: [{ perspective: PERSPECTIVE }, { rotateY: `${turn.value * 180 + 180}deg` }] }));

  const ring = outcome === 'ok' ? g.good : outcome === 'no' ? g.bad : null;
  // зачем: скрытая грань не должна ловить тапы (кнопка озвучки лица под перевёрнутой картой)
  const face = (children: React.ReactNode, animated: React.ComponentProps<typeof Animated.View>['style'], interactive: boolean) => (
    <Animated.View
      pointerEvents={interactive ? 'auto' : 'none'}
      style={[styles.face, { boxShadow: plateBoxShadow(g) }, animated]}
    >
      <PlateFill g={g} radius={20} />
      {ring ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.ring, { boxShadow: [{ inset: true, offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 1.5, color: `${ring}73` }] }]} /> : null /* shadow-ok: кольцо исхода ответа «верно/неверно» (состояние), не обводка контейнера */}
      {children}
    </Animated.View>
  );

  const turnHint = isStatic ? null : <Ionicons name="sync-outline" size={16} color={g.mutedText} style={styles.turn} />;

  return (
    <Pressable
      testID={testID}
      accessibilityRole={isStatic ? undefined : 'button'}
      accessibilityLabel={accessibilityLabel ?? `${front} — ${back}`}
      disabled={isStatic || disabled}
      accessibilityState={{ disabled: isStatic || disabled }}
      onPress={() => {
        const next = !on;
        if (!controlled) setInnerFlipped(next);
        onFlip?.(next);
      }}
      style={[styles.wrap, { height }]}
    >
      {face(
        <>
          <Text style={[styles.label, { color: g.secondary, lineHeight: lh(17) }]}>{frontLabel}</Text>
          {onSpeak ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={speakLabel ?? front}
              hitSlop={6}
              onPress={onSpeak}
              style={[styles.vol, { backgroundColor: g.buttonFill, boxShadow: nestedBoxShadow(g) }]}
            >
              <Ionicons name="volume-high-outline" size={18} color={g.text} />
            </Pressable>
          ) : null}
          <Text style={[styles.word, { color: g.text, lineHeight: lh(40) }]}>{front}</Text>
          {turnHint}
        </>,
        frontStyle,
        !on,
      )}
      {face(
        <>
          <Text style={[styles.label, { color: g.secondary, lineHeight: lh(17) }]}>{backLabel}</Text>
          <Text style={[styles.word, styles.wordBack, { color: g.text, lineHeight: lh(36) }]}>{back}</Text>
          {backNote ? <Text style={[styles.note, { color: g.secondary, lineHeight: lh(20) }]}>{backNote}</Text> : null}
          {turnHint}
        </>,
        backStyle,
        on,
      )}
    </Pressable>
  );
}

export const CardFlipV2 = memo(CardFlipV2Impl);
export default CardFlipV2;

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  // `.flip .fa/.fb`: r20, поля 20/30, по центру
  face: { ...StyleSheet.absoluteFillObject, borderRadius: 20, alignItems: 'center', justifyContent: 'center', paddingVertical: 20, paddingHorizontal: 30, backfaceVisibility: 'hidden' },
  ring: { borderRadius: 20 },
  label: { position: 'absolute', left: 20, top: 18, fontSize: 13, fontWeight: '600' },
  vol: { position: 'absolute', right: 14, top: 12, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  word: { fontSize: 34, fontWeight: '700', letterSpacing: -0.5, textAlign: 'center' },
  wordBack: { fontSize: 30 },
  note: { marginTop: 8, fontSize: 16, textAlign: 'center' },
  turn: { position: 'absolute', right: 16, bottom: 14 },
});
