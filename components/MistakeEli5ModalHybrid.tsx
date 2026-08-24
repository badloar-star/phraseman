/**
 * MistakeEli5ModalHybrid — гибрид «Световод + Чекан» для «Объясни как для
 * пятилетнего». Каркас HybridSheetShell (подъём из света, без отскока),
 * заголовок/скелетон/готовый текст — каскад LUM.ladder. Тело не переоткрывает
 * содержимое каждый рендер: скелетон уступает готовым блокам одной
 * анимацией, без повторного каскада при смене text/state.
 *
 * зачем: владелец (2026-08-15) — переезд семьи на гибрид, подключается ТОЛЬКО
 * через MistakeEli5Modal.motionVariant='hybrid'.
 */
import React, { memo, useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LUM } from '../constants/motionHybrid';
import { hapticTap } from '../hooks/use-haptics';
import SkeletonBlock from './SkeletonShimmer';
import { triLang, type Lang } from '../constants/i18n';
import LearningSemanticBlock from './LearningSemanticBlock';
import { buildMistakeExplanationBlocks } from '../app/explanation_presentation';
import HybridSheetShell from './modal_fx/HybridSheetShell';
import { useTheme } from './ThemeContext';
import AiBadge from './AiBadge';
import type { MistakeEli5State } from './MistakeEli5Modal';
import { useReduceMotion } from '../hooks/use_reduce_motion';

interface Props {
  visible: boolean;
  onClose: () => void;
  lang: Lang;
  state: MistakeEli5State;
  text: string | null;
}

function CascadeItem({ index, style, children }: { index: number; style?: object; children: React.ReactNode }) {
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const y = useSharedValue(reduceMotion ? 0 : 14);
  const delay = LUM.ladder[Math.min(index, LUM.ladder.length - 1)];

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      y.value = 0;
      return;
    }
    opacity.value = withDelay(delay, withTiming(1, { duration: LUM.resolveMs, easing: Easing.out(Easing.cubic) }));
    y.value = withDelay(delay, withSpring(0, LUM.settle));
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(y);
    };
  }, [delay, opacity, reduceMotion, y]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));

  return <Animated.View style={[style, animStyle]}>{children}</Animated.View>;
}

function MistakeEli5ModalHybrid({ visible, onClose, lang, state, text }: Props) {
  const { theme: t, f } = useTheme();
  const { height: viewportHeight } = useWindowDimensions();

  const closeLabel = triLang(lang, {
    ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij',
  });
  const title = triLang(lang, {
    ru: 'Объясни проще', uk: 'Поясни простіше', es: 'Explícalo más fácil', 'pt-BR': 'Explica mais fácil', vi: 'Giải thích dễ hơn', id: 'Jelaskan lebih mudah', tr: 'Daha basit anlat', pl: 'Wytłumacz prościej',
  });
  const loadingLine = triLang(lang, {
    ru: 'Объясняю простыми словами…', uk: 'Пояснюю простими словами…', es: 'Explicando con palabras simples…', 'pt-BR': 'Explicando com palavras simples…', vi: 'Đang giải thích đơn giản…', id: 'Menjelaskan dengan kata sederhana…', tr: 'Basit kelimelerle anlatıyorum…', pl: 'Tłumaczę prostymi słowami…',
  });

  const handleClose = () => {
    hapticTap();
    onClose();
  };

  const showSkeleton = state !== 'ready' || !text;
  const readyBlocks = React.useMemo(
    () => buildMistakeExplanationBlocks({ lang, explanation: text }),
    [lang, text],
  );

  return (
    <HybridSheetShell visible={visible} onClose={handleClose} closeLabel={closeLabel} testID="mistake-eli5-sheet">
      <CascadeItem index={0} style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h3 }]}>{title}</Text>
          <AiBadge />
        </View>
        <Pressable
          onPress={handleClose}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          style={({ pressed }) => [styles.closeBtn, { backgroundColor: t.bgSurface2 }, pressed && styles.pressed]}
        >
          <Ionicons name="close" size={20} color={t.textMuted} />
        </Pressable>
      </CascadeItem>

      <CascadeItem index={1}>
        <ScrollView
          style={[styles.bodyScroll, { maxHeight: viewportHeight * 0.5 }]}
          contentContainerStyle={styles.bodyScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {showSkeleton ? (
            <View style={styles.skeleton}>
              <Text style={[styles.skeletonText, { color: t.textSecond, fontSize: f.body }]}>{loadingLine}</Text>
              <SkeletonBlock width="92%" height={14} borderRadius={7} />
              <SkeletonBlock width="78%" height={14} borderRadius={7} />
              <SkeletonBlock width="85%" height={14} borderRadius={7} />
              <SkeletonBlock width="64%" height={14} borderRadius={7} />
            </View>
          ) : (
            <View style={styles.semanticBlocks}>
              {readyBlocks.map((block, idx) => (
                <LearningSemanticBlock key={`${block.tone}-${idx}`} block={block} />
              ))}
            </View>
          )}
        </ScrollView>
      </CascadeItem>
    </HybridSheetShell>
  );
}

export default memo(MistakeEli5ModalHybrid);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 12,
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    fontWeight: '700',
    lineHeight: 28,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.78,
  },
  bodyScroll: {
    maxHeight: 420,
  },
  bodyScrollContent: {
    paddingBottom: 12,
  },
  semanticBlocks: {
    gap: 8,
  },
  skeleton: {
    gap: 12,
    paddingVertical: 12,
  },
  skeletonText: {
    fontWeight: '700',
  },
});
