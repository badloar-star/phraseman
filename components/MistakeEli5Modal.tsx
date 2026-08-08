import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
/**
 * MistakeEli5Modal — bottom-sheet «Объяснить как для пятилетнего».
 *
 * Открывается кнопкой «Объяснить» в футере разбора ошибки урока. Показывает ОТДЕЛЬНЫЙ,
 * упрощённый текст (variant='eli5'), который генерит/кэширует тот же CF explainMistake.
 * Родитель (lesson1.tsx) владеет запросом и передаёт сюда state/text/onRetry — модал
 * только рисует. Шторка интерактивная (единый стандарт): reanimated +
 * drag-to-dismiss по паттерну RegistrationPromptModal — тяга вниз 1:1, вверх
 * резина ×0.12, закрытие по 88px/velocity 900, подложка слабеет при тяге.
 */
import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing as REasing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from './SafeLinearGradient';
import SkeletonBlock from './SkeletonShimmer';
import { useTheme } from './ThemeContext';
import { triLang, type Lang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import LearningSemanticBlock from './LearningSemanticBlock';
import { buildMistakeExplanationBlocks } from '../app/explanation_presentation';
import TonalSurface from './TonalSurface';
import AiBadge from './AiBadge';

export type MistakeEli5State = 'idle' | 'loading' | 'ready';

interface Props {
  visible: boolean;
  onClose: () => void;
  lang: Lang;
  state: MistakeEli5State;
  text: string | null;
  onRetry: () => void;
}

const SHEET_HIDDEN = 320; // стартовая позиция листа под экраном (выезд/уезд)

function MistakeEli5Modal({ visible, onClose, lang, state, text }: Props) {
  const { theme: t, f } = useTheme();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const { height: viewportHeight } = useWindowDimensions();

  // ── Интерактивная шторка (reanimated, паттерн RegistrationPromptModal) ────
  const backdropO = useSharedValue(0);
  const sheetY = useSharedValue(SHEET_HIDDEN);
  const sheetOpacity = useSharedValue(0);
  const dragTranslateY = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    // Вход: подложка + лист выезжает снизу.
    dragTranslateY.value = 0;
    backdropO.value = withTiming(1, { duration: 200, easing: REasing.out(REasing.cubic) });
    sheetY.value = SHEET_HIDDEN;
    sheetOpacity.value = withTiming(1, { duration: 220 });
    sheetY.value = withTiming(0, { duration: 380, easing: REasing.bezier(0.32, 0.72, 0, 1) });
  }, [visible, backdropO, sheetY, sheetOpacity, dragTranslateY]);

  const handleClose = () => {
    hapticTap();
    onClose();
  };

  const handleCloseRef = useRef(handleClose);
  handleCloseRef.current = handleClose;

  // Анимированное закрытие (крестик/фон/системная «назад»): лист уезжает вниз +
  // подложка тает, затем общий путь handleClose.
  const dismissSheet = useCallback(() => {
    backdropO.value = withTiming(0, { duration: 200 });
    sheetOpacity.value = withTiming(0, { duration: 180 });
    sheetY.value = withTiming(SHEET_HIDDEN, { duration: 240, easing: REasing.out(REasing.cubic) }, (finished) => {
      if (finished) runOnJS(handleCloseRef.current)();
    });
  }, [backdropO, sheetOpacity, sheetY]);

  const closeAfterSwipe = useCallback(() => {
    handleCloseRef.current();
  }, []);

  const swipeOffDistance = useMemo(() => Math.max(480, viewportHeight * 0.6), [viewportHeight]);

  // Интерактивный лист: тянешь вниз 1:1, вверх — резиновое сопротивление (×0.12);
  // отпустил — spring обратно или уезд вниз + закрытие (порог 88px / velocityY 900).
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(10)
        .failOffsetX([-32, 32])
        .onUpdate((e) => {
          'worklet';
          const ty = e.translationY;
          dragTranslateY.value = ty < 0 ? ty * 0.12 : ty;
        })
        .onEnd((e) => {
          'worklet';
          const shouldClose = dragTranslateY.value > 88 || e.velocityY > 900;
          if (shouldClose) {
            dragTranslateY.value = withTiming(swipeOffDistance, { duration: 260 }, (finished) => {
              if (finished) {
                runOnJS(closeAfterSwipe)();
              }
            });
          } else {
            dragTranslateY.value = withSpring(0, { damping: 22, stiffness: 300 });
          }
        }),
    [closeAfterSwipe, dragTranslateY, swipeOffDistance],
  );

  // Подложка: затемнение по backdropO, посветление при оттягивании листа вниз.
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropO.value * (1 - Math.min(Math.max(dragTranslateY.value, 0) / 600, 0.5)),
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: sheetOpacity.value,
    transform: [{ translateY: sheetY.value + dragTranslateY.value }],
  }));

  const closeLabel = triLang(lang, {
    ru: 'Закрыть',
    uk: 'Закрити',
    es: 'Cerrar',
    'pt-BR': 'Fechar',
    vi: 'Đóng',
    id: 'Tutup',
    tr: 'Kapat',
    pl: 'Zamknij',
  });

  const title = triLang(lang, {
    ru: 'Объясни проще',
    uk: 'Поясни простіше',
    es: 'Explícalo más fácil',
    'pt-BR': 'Explica mais fácil',
    vi: 'Giải thích dễ hơn',
    id: 'Jelaskan lebih mudah',
    tr: 'Daha basit anlat',
    pl: 'Wytłumacz prościej',
  });

  const loadingLine = triLang(lang, {
    ru: 'Объясняю простыми словами…',
    uk: 'Пояснюю простими словами…',
    es: 'Explicando con palabras simples…',
    'pt-BR': 'Explicando com palavras simples…',
    vi: 'Đang giải thích đơn giản…',
    id: 'Menjelaskan dengan kata sederhana…',
    tr: 'Basit kelimelerle anlatıyorum…',
    pl: 'Tłumaczę prostymi słowami…',
  });

  const showSkeleton = state !== 'ready' || !text;
  const readyBlocks = React.useMemo(
    () => buildMistakeExplanationBlocks({ lang, explanation: text }),
    [lang, text],
  );

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={dismissSheet}>
      <GestureHandlerRootView style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismissSheet} accessibilityLabel={closeLabel}>
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </Pressable>

        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: t.bgCard,
                borderColor: t.border,
                shadowColor: t.accent,
                paddingBottom: 20 + bottomInset,
              },
              sheetStyle,
            ]}
          >
          <TonalSurface pointerEvents="none" radius={24} tone="raised" style={StyleSheet.absoluteFillObject} />
          <LinearGradient
            colors={[`${t.accent}1F`, 'transparent']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.5 }}
            style={styles.sheetGlow}
            pointerEvents="none"
          />

          <View style={styles.grabber} pointerEvents="none">
            <View style={[styles.grabberPill, { backgroundColor: t.border }]} />
          </View>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h3 }]}>
                {title}
              </Text>
              <AiBadge />
            </View>
            <Pressable
              onPress={dismissSheet}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={closeLabel}
              style={({ pressed }) => [styles.closeBtn, { backgroundColor: t.bgSurface2 }, pressed && styles.pressed]}
            >
              <Ionicons name="close" size={20} color={t.textMuted} />
            </Pressable>
          </View>

          <ScrollView
            style={[styles.bodyScroll, { maxHeight: viewportHeight * 0.5 }]}
            contentContainerStyle={styles.bodyScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {showSkeleton ? (
              <View style={styles.skeleton}>
                <Text style={[styles.skeletonText, { color: t.textSecond, fontSize: f.body }]}>
                  {loadingLine}
                </Text>
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
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

export default memo(MistakeEli5Modal);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  sheet: {
    width: '100%',
    maxHeight: '86%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 0,
    overflow: 'hidden',
    paddingHorizontal: 18,
    paddingTop: 8,
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 18,
  },
  sheetGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  grabber: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  grabberPill: {
    width: 44,
    height: 5,
    borderRadius: 3,
    opacity: 0.9,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 12,
  },
  title: {
    flex: 1,
    fontWeight: '900',
    lineHeight: 28,
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    maxHeight: 420, // базовый потолок; реальный — inline viewportHeight * 0.5
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
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    borderRadius: 12,
    borderWidth: 0,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 6,
  },
  retryLabel: {
    fontWeight: '800',
  },
});
