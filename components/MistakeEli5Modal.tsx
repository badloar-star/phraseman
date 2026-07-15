import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
/**
 * MistakeEli5Modal — bottom-sheet «Объяснить как для пятилетнего».
 *
 * Открывается кнопкой «Объяснить» в футере разбора ошибки урока. Показывает ОТДЕЛЬНЫЙ,
 * упрощённый текст (variant='eli5'), который генерит/кэширует тот же CF explainMistake.
 * Родитель (lesson1.tsx) владеет запросом и передаёт сюда state/text/onRetry — модал
 * только рисует. Стиль строго по дому: RN Modal + legacy Animated слайд снизу + fade,
 * как в ExplainSheet/NoEnergyModal. Reanimated не используем.
 */
import React, { memo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from './SafeLinearGradient';
import SkeletonBlock from './SkeletonShimmer';
import { MOTION_SPRING_LEGACY } from '../constants/motion';
import { useTheme } from './ThemeContext';
import { triLang, type Lang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import LearningSemanticBlock from './LearningSemanticBlock';
import { buildMistakeExplanationBlocks } from '../app/explanation_presentation';
import TonalSurface from './TonalSurface';

export type MistakeEli5State = 'idle' | 'loading' | 'ready' | 'error';

interface Props {
  visible: boolean;
  onClose: () => void;
  lang: Lang;
  state: MistakeEli5State;
  text: string | null;
  onRetry: () => void;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

function MistakeEli5Modal({ visible, onClose, lang, state, text, onRetry }: Props) {
  const { theme: t, f } = useTheme();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      translateY.setValue(SCREEN_HEIGHT);
      backdropOp.setValue(0);
      return;
    }
    const intro = Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        tension: MOTION_SPRING_LEGACY.panel.tension,
        friction: MOTION_SPRING_LEGACY.panel.friction,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOp, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]);
    intro.start();
    return () => intro.stop();
  }, [visible, translateY, backdropOp]);

  const handleClose = () => {
    hapticTap();
    onClose();
  };

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

  const errorLine = triLang(lang, {
    ru: 'Не получилось. Попробуй ещё раз.',
    uk: 'Не вдалося. Спробуй ще раз.',
    es: 'No funcionó. Inténtalo de nuevo.',
    'pt-BR': 'Não deu. Tente de novo.',
    vi: 'Chưa được. Thử lại nhé.',
    id: 'Gagal. Coba lagi.',
    tr: 'Olmadı. Tekrar dene.',
    pl: 'Nie wyszło. Spróbuj ponownie.',
  });

  const retryLabel = triLang(lang, {
    ru: 'Попробовать ещё раз',
    uk: 'Спробувати ще раз',
    es: 'Intentar de nuevo',
    'pt-BR': 'Tentar de novo',
    vi: 'Thử lại',
    id: 'Coba lagi',
    tr: 'Tekrar dene',
    pl: 'Spróbuj ponownie',
  });

  const showSkeleton = state === 'loading' || state === 'idle';
  const readyBlocks = React.useMemo(
    () => buildMistakeExplanationBlocks({ lang, explanation: text }),
    [lang, text],
  );

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={handleClose}>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: backdropOp }]}>
          <Pressable style={styles.backdrop} onPress={handleClose} accessibilityLabel="Close" />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: t.bgCard,
              borderColor: t.border,
              shadowColor: t.accent,
              paddingBottom: 20 + bottomInset,
              transform: [{ translateY }],
            },
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
            <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h3 }]}>
              {title}
            </Text>
            <Pressable
              onPress={handleClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={({ pressed }) => [styles.closeBtn, { backgroundColor: t.bgSurface2 }, pressed && styles.pressed]}
            >
              <Ionicons name="close" size={20} color={t.textMuted} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.bodyScroll}
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
            ) : state === 'error' ? (
              <View style={styles.skeleton}>
                <Text style={[styles.skeletonText, { color: t.textSecond, fontSize: f.body }]}>
                  {errorLine}
                </Text>
                <Pressable
                  onPress={() => { hapticTap(); onRetry(); }}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.retryBtn,
                    { backgroundColor: t.bgSurface2, borderColor: t.border },
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons name="refresh" size={16} color={t.accent} />
                  <Text style={[styles.retryLabel, { color: t.textPrimary, fontSize: f.sub || f.body }]}>
                    {retryLabel}
                  </Text>
                </Pressable>
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
      </View>
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
    maxHeight: SCREEN_HEIGHT * 0.5,
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
