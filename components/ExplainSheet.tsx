import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
/**
 * ExplainSheet — bottom-sheet «Объясни как для 5-летнего» (план 04, Фаза 5).
 *
 * Стиль строго по дому: RN Modal + LinearGradient из ./SafeLinearGradient +
 * useTheme()/useLang() + triLang. Шторка интерактивная (единый стандарт):
 * reanimated + drag-to-dismiss по паттерну RegistrationPromptModal — тяга вниз
 * 1:1, вверх резина ×0.12, закрытие по 88px/velocity 900, подложка слабеет при тяге.
 *
 * v1 НЕ стримит: cache MISS → скелетон «готовлю объяснение…», по приходу — полный
 * текст; cache HIT → текст сразу. Текст приходит с сервера и рендерится КАК ЕСТЬ
 * (никакой клиентской валидации качества). На сетевой ошибке — мягкий fallback из
 * resolveExplainDisplay, не сырой стек.
 *
 * Внизу — тонкая кнопка-репорт (ExplainReportButton), шлёт phraseEn (сервер хэширует).
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
import { useLang } from './LangContext';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { triLang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { trackEvent } from '../app/analytics';
import {
  useExplainRequest,
  resolveExplainDisplay,
  loadingLineForLang,
  asLang,
  splitExplainParagraphs,
  splitExplainSegments,
  type ExplainRequestStatus,
} from '../app/explain_phrase_request';
import ExplainReportButton from './ExplainReportButton';
import { useStudyTarget } from './StudyTargetContext';
import TonalSurface from './TonalSurface';
import ExplainSheetHybrid from './ExplainSheetHybrid';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Английская фраза, как показана пользователю (сервер её хэширует). */
  phraseEn: string;
  /** Родной перевод/смысл фразы — передаётся серверу как ПОДСКАЗКА для генерации (не выводится). */
  phraseMeaning: string;
  /** Язык интерфейса пользователя. */
  lang: string;
  /**
   * Вызывается РОВНО ОДИН РАЗ за открытие, когда запрос зарезолвился (после скелетона).
   * Нужен, чтобы вызывающий мог списать дневной кредит ТОЛЬКО на реальной генерации
   * (cache MISS), а не на бесплатном кэш-хите/ошибке. Необязателен (после ответа лимита нет).
   */
  onResolved?: (info: { fromCache: boolean; status: ExplainRequestStatus; error: boolean }) => void;
  /**
   * зачем: гибрид «Световод + Чекан» (макет .motion-mockups/phraseman-hybrid.html,
   * сцена M2 «Шторка (bottom sheet)») живёт РЯДОМ со старой версией под флагом.
   * Боевой дефолт — 'classic', ничего не меняется без явного включения.
   */
  motionVariant?: 'classic' | 'hybrid';
}

const SHEET_HIDDEN = 320; // стартовая позиция листа под экраном (выезд/уезд)

function ExplainSheet({ visible, onClose, phraseEn, phraseMeaning, lang, onResolved, motionVariant = 'classic' }: Props) {
  if (motionVariant === 'hybrid') {
    return (
      <ExplainSheetHybrid
        visible={visible}
        onClose={onClose}
        phraseEn={phraseEn}
        phraseMeaning={phraseMeaning}
        lang={lang}
        onResolved={onResolved}
      />
    );
  }
  return (
    <ExplainSheetClassic
      visible={visible}
      onClose={onClose}
      phraseEn={phraseEn}
      phraseMeaning={phraseMeaning}
      lang={lang}
      onResolved={onResolved}
    />
  );
}

function ExplainSheetClassic({ visible, onClose, phraseEn, phraseMeaning, lang, onResolved }: Omit<Props, 'motionVariant'>) {
  const { theme: t, f } = useTheme();
  const { lang: ctxLang } = useLang();
  const { studyTarget } = useStudyTarget();
  const effLang = lang || ctxLang;
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const { height: viewportHeight } = useWindowDimensions();

  // Запрос стартует только когда шторка видима (cache-read бесплатен и быстр).
  const state = useExplainRequest({ phraseEn, phraseMeaning, lang: effLang, studyTarget }, visible);
  const display = resolveExplainDisplay(state, effLang, phraseMeaning);

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

  // Открытие шторки трекает ExplainButton (on tap). Здесь — досылаем cache-флаг,
  // как только пришёл ответ: это и есть health-check кэш-хитов (fromCache).
  const loggedResultKeyRef = useRef('');
  useEffect(() => {
    if (!visible || state.loading || state.status !== 'ok' || !state.text.trim()) return;
    const resultKey = `${phraseEn}\u0000${effLang}\u0000${state.text}`;
    if (loggedResultKeyRef.current === resultKey) return;
    loggedResultKeyRef.current = resultKey;
    void trackEvent('explain_sheet_opened', {
      lang: effLang,
      fromCache: state.fromCache,
      status: state.status,
      phase: 'resolved',
    });
    // Сообщаем вызывающему результат РОВНО раз — он решает, списывать ли дневной кредит
    // (только реальная генерация: cache MISS, без ошибки).
    onResolved?.({ fromCache: state.fromCache, status: state.status, error: state.error });
  }, [visible, phraseEn, state.loading, state.text, state.fromCache, state.status, state.error, effLang, onResolved]);

  const handleClose = () => {
    hapticTap();
    void trackEvent('explain_sheet_closed', { lang: effLang, fromCache: state.fromCache });
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

  const closeLabel = triLang(asLang(effLang), {
    ru: 'Закрыть',
    uk: 'Закрити',
    en: 'Close',
    es: 'Cerrar',
    'pt-BR': 'Fechar',
    vi: 'Đóng',
    id: 'Tutup',
    tr: 'Kapat',
    pl: 'Zamknij',
  });

  const title = triLang(asLang(effLang), {
    ru: 'Простыми словами',
    uk: 'Простими словами',
    en: 'In simple words',
    es: 'En palabras simples',
    'pt-BR': 'Em palavras simples',
    vi: 'Nói đơn giản',
    id: 'Dengan kata sederhana',
    tr: 'Basit kelimelerle',
    pl: 'Prościej mówiąc',
  });

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

          {/* Грабер + заголовок + крест */}
          <View style={styles.grabber} pointerEvents="none">
            <View style={[styles.grabberPill, { backgroundColor: t.border }]} />
          </View>
          <View style={styles.header}>
            <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h3 }]}>
              {title}
            </Text>
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

          {/* Сама фраза */}
          <View style={[styles.phraseBlock, { backgroundColor: t.bgSurface2, borderColor: t.border }]}>
            <Text style={[styles.phraseText, { color: t.textPrimary, fontSize: f.bodyLg || f.body }]}>
              {phraseEn}
            </Text>
          </View>

          {/* Тело: скелетон во время генерации, иначе обычное простое объяснение. */}
          <ScrollView decelerationRate="fast"
            style={styles.bodyScroll}
            contentContainerStyle={styles.bodyScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {display.showSkeleton ? (
              <View style={styles.skeleton}>
                <Text style={[styles.skeletonText, { color: t.textSecond, fontSize: f.body }]}>
                  {loadingLineForLang(effLang)}
                </Text>
                <SkeletonBlock width="92%" height={14} borderRadius={7} />
                <SkeletonBlock width="78%" height={14} borderRadius={7} />
                <SkeletonBlock width="85%" height={14} borderRadius={7} />
                <SkeletonBlock width="64%" height={14} borderRadius={7} />
              </View>
            ) : (
              <>
                {splitExplainParagraphs(display.text).map((paragraph, pIdx) => (
                  <Text
                    key={`p-${pIdx}`}
                    style={[styles.bodyText, { color: t.textPrimary, fontSize: f.body }]}
                  >
                    {splitExplainSegments(paragraph).map((seg, sIdx) => (
                      seg.en ? (
                        <Text key={`s-${sIdx}`} style={[styles.bodyEn, { color: t.accent }]}>
                          {seg.text}
                        </Text>
                      ) : (
                        <Text key={`s-${sIdx}`}>{seg.text}</Text>
                      )
                    ))}
                  </Text>
                ))}
              </>
            )}
          </ScrollView>

          {/* Футер: «Непонятно объяснили» */}
          {!display.showSkeleton ? (
          <View style={[styles.footer, { borderTopColor: t.border }]}>
            <ExplainReportButton phraseEn={phraseEn} lang={effLang} />
          </View>
          ) : null}
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

export default memo(ExplainSheet);

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
  phraseBlock: {
    borderRadius: 16,
    borderWidth: 0,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  phraseText: {
    fontWeight: '800',
    lineHeight: 26,
  },
  bodyScroll: {
    maxHeight: 400,
  },
  bodyScrollContent: {
    paddingBottom: 8,
  },
  bodyText: {
    fontWeight: '500',
    lineHeight: 26,
    marginBottom: 12,
  },
  bodyEn: {
    fontWeight: '800',
  },
  retryBtn: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 0,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  retryLabel: {
    fontWeight: '700',
  },
  skeleton: {
    gap: 12,
    paddingVertical: 8,
    alignItems: 'flex-start',
  },
  skeletonText: {
    fontWeight: '700',
  },
  footer: {
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
});
