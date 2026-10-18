/**
 * Разворотная карточка — макет docs/design/v2-app/cards-v2.html, CSS `.flip` (196 высотой, r20, перспектива 1200, разворот 560 мс cubic-bezier(.2,.8,.2,1)).
 *
 * зачем (Карточки 2.0): одна и та же карточка нужна в шторке «Карточка открыта» и сверху экрана «Новая карточка» (живое превью: слово — лицо,
 * перевод и пример — оборот). Поэтому лицо и оборот живут здесь, а состояние «перевёрнута» держит вызывающий (управляемое свойство `flipped`).
 * Лицо: «EN», озвучка, слово 34/40, значок «перевернуть»; оборот: метка языка, перевод 30/36 и пример под ним. Высота растёт по тексту (правило владельца:
 * лечим вёрсткой, не сжатием шрифта). «Уменьшить движение» — разворот без анимации.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import type { GlassTokens } from '../../constants/liquidGlassThemePalette';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { PlateFill, nestedBoxShadow, plateBoxShadow } from '../v2/ShadowSurface';
import { useLineScale } from './useLineScale';

/** Разворот: 560 мс, cubic-bezier(.2,.8,.2,1) — `.flip .fl` макета. */
export const FLIP_MS = 560;
export const FLIP_EASE = Easing.bezier(0.2, 0.8, 0.2, 1);
/** Высота карточки по макету (системный шрифт 100%); при крупном шрифте карточка растёт по тексту, а не режет его. */
export const FLIP_CARD_MIN_H = 196;
export const FLIP_CARD_RADIUS = 20;
/** Вертикальный запас внутри грани: паддинги 20+20 и место под метку/значок. */
const FACE_PAD_V = 40;

type Props = Readonly<{
  g: GlassTokens;
  front: string;
  /** Транскрипция под словом на лице. */
  ipa?: string | null;
  back: string;
  example?: string | null;
  exampleTr?: string | null;
  /** Метка оборота (язык интерфейса, «RU»). */
  backTag: string;
  flipped: boolean;
  onFlip: () => void;
  onSpeak?: () => void;
  speakLabel?: string;
  flipLabel: string;
  testID?: string;
  /** Показывать значок озвучки на лице (в живом превью нового слова озвучки ещё нет — слово не сохранено). */
  showSpeak?: boolean;
  /** Gallery keeps its existing face artwork and fixed geometry, sharing this flip animation. */
  gallery?: Readonly<{ height: number; radius: number; front: React.ReactNode; back: React.ReactNode }>;
  onLongPress?: () => void;
}>;

function FlipCardInner({ g, front, ipa, back, example, exampleTr, backTag, flipped, onFlip, onSpeak, speakLabel, flipLabel, testID, showSpeak = true, gallery, onLongPress }: Props) {
  const reduceMotion = useReduceMotion();
  const lh = useLineScale();
  const flip = useSharedValue(flipped ? 1 : 0);
  // зачем: высота карточки = максимум из высоты макета и фактической высоты текста обеих сторон, измеренной onLayout.
  const [frontH, setFrontH] = useState(0);
  const [backH, setBackH] = useState(0);
  const cardH = gallery?.height ?? Math.max(FLIP_CARD_MIN_H, frontH + FACE_PAD_V, backH + FACE_PAD_V);

  useEffect(() => {
    flip.value = withTiming(flipped ? 1 : 0, { duration: reduceMotion ? 0 : FLIP_MS, easing: FLIP_EASE });
  }, [flip, flipped, reduceMotion]);

  const frontStyle = useAnimatedStyle(() => ({ transform: [{ perspective: 1200 }, { rotateY: `${flip.value * 180}deg` }] }));
  const backStyle = useAnimatedStyle(() => ({ transform: [{ perspective: 1200 }, { rotateY: `${flip.value * 180 - 180}deg` }] }));

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={gallery ? (flipped ? back : front) : `${flipLabel}: ${flipped ? back : front}`}
      onPress={onFlip}
      onLongPress={onLongPress}
      style={({ pressed }) => [gallery ? styles.galleryCard : styles.card, { height: cardH }, gallery && pressed && styles.galleryPressed]}>
      <Animated.View testID={testID ? `${testID}-front` : undefined} pointerEvents={flipped ? 'none' : 'auto'} accessibilityElementsHidden={flipped} importantForAccessibility={flipped ? 'no-hide-descendants' : 'auto'} style={[gallery ? styles.galleryFace : styles.face, { borderRadius: gallery?.radius ?? FLIP_CARD_RADIUS, boxShadow: plateBoxShadow(g) }, frontStyle]}>
        {gallery ? gallery.front : <>
        <PlateFill g={g} radius={FLIP_CARD_RADIUS} />
        <Text style={[styles.tag, { color: g.secondary, lineHeight: lh(16) }]}>EN</Text>
        {showSpeak && onSpeak ? (
          <Pressable accessibilityRole="button" accessibilityLabel={speakLabel} hitSlop={8} onPress={onSpeak} style={[styles.speak, { backgroundColor: g.dividerTone, boxShadow: nestedBoxShadow(g) }]}>
            <Ionicons name="volume-high" size={18} color={g.text} />
          </Pressable>
        ) : null}
        <View style={styles.faceText} onLayout={(e) => setFrontH(Math.ceil(e.nativeEvent.layout.height))}>
          <Text style={[styles.word, { color: g.text, lineHeight: lh(40) }]}>{front}</Text>
          {ipa ? <Text style={[styles.sub, { color: g.secondary, lineHeight: lh(20) }]}>{ipa}</Text> : null}
        </View>
        <Ionicons name="sync-outline" size={18} color={g.mutedText} style={styles.turn} />
        </>}
      </Animated.View>
      <Animated.View testID={testID ? `${testID}-back` : undefined} pointerEvents={flipped ? 'auto' : 'none'} accessibilityElementsHidden={!flipped} importantForAccessibility={flipped ? 'auto' : 'no-hide-descendants'} style={[gallery ? styles.galleryFace : styles.face, { borderRadius: gallery?.radius ?? FLIP_CARD_RADIUS, boxShadow: plateBoxShadow(g) }, backStyle]}>
        {gallery ? gallery.back : <>
        <PlateFill g={g} radius={FLIP_CARD_RADIUS} raised />
        <Text style={[styles.tag, { color: g.secondary, lineHeight: lh(16) }]}>{backTag}</Text>
        <View style={styles.faceText} onLayout={(e) => setBackH(Math.ceil(e.nativeEvent.layout.height))}>
          <Text style={[styles.wordBack, { color: g.text, lineHeight: lh(36) }]}>{back}</Text>
          {example ? <Text style={[styles.sub, { color: g.secondary, lineHeight: lh(20) }]}>{example}</Text> : null}
          {exampleTr ? <Text style={[styles.subTr, { color: g.mutedText, lineHeight: lh(20) }]}>{exampleTr}</Text> : null}
        </View>
        <Ionicons name="sync-outline" size={18} color={g.mutedText} style={styles.turn} />
        </>}
      </Animated.View>
    </Pressable>
  );
}

export const FlipCard = memo(FlipCardInner);

const styles = StyleSheet.create({
  card: { minHeight: FLIP_CARD_MIN_H },
  galleryCard: { flex: 1 },
  galleryPressed: { transform: [{ scale: 0.97 }] },
  galleryFace: { ...StyleSheet.absoluteFillObject, backfaceVisibility: 'hidden' },
  face: { ...StyleSheet.absoluteFillObject, paddingHorizontal: 30, paddingVertical: 20, alignItems: 'center', justifyContent: 'center', backfaceVisibility: 'hidden' },
  // текст граней на всю ширину грани, как в макете; высоту измеряем onLayout
  faceText: { alignSelf: 'stretch', alignItems: 'center' },
  tag: { position: 'absolute', left: 20, top: 18, fontSize: 13, fontWeight: '600' },
  speak: { position: 'absolute', right: 14, top: 12, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  word: { width: '100%', textAlign: 'center', fontSize: 34, fontWeight: '700', letterSpacing: -0.5 },
  wordBack: { width: '100%', textAlign: 'center', fontSize: 30, fontWeight: '700', letterSpacing: -0.5 },
  sub: { marginTop: 8, textAlign: 'center', fontSize: 16 },
  subTr: { marginTop: 4, textAlign: 'center', fontSize: 16 },
  turn: { position: 'absolute', right: 16, bottom: 14 },
});
