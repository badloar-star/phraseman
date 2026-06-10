/**
 * ExplainSheet — bottom-sheet «Объясни как для 5-летнего» (план 04, Фаза 5).
 *
 * Стиль строго по дому: RN Modal + legacy Animated (translateY-пружина снизу + fade
 * бэкдропа) + LinearGradient из ./SafeLinearGradient + useTheme()/useLang() + triLang.
 * Эталон слайд-апа и затемнения — components/NoEnergyModal.tsx. Reanimated НЕ
 * используем (правило проекта: модалки на legacy Animated).
 *
 * v1 НЕ стримит: cache MISS → скелетон «готовлю объяснение…», по приходу — полный
 * текст; cache HIT → текст сразу. Текст приходит с сервера и рендерится КАК ЕСТЬ
 * (никакой клиентской валидации качества). На сетевой ошибке — мягкий fallback из
 * resolveExplainDisplay, не сырой стек.
 *
 * Внизу — тонкая кнопка-репорт (ExplainReportButton), шлёт phraseEn (сервер хэширует).
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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from './SafeLinearGradient';
import { MOTION_SPRING_LEGACY } from '../constants/motion';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { trackEvent } from '../app/analytics';
import {
  useExplainRequest,
  resolveExplainDisplay,
  loadingLineForLang,
  asLang,
  type ExplainRequestStatus,
} from '../app/explain_phrase_request';
import ExplainReportButton from './ExplainReportButton';

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
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

function ExplainSheet({ visible, onClose, phraseEn, phraseMeaning, lang, onResolved }: Props) {
  const { theme: t, f } = useTheme();
  const { lang: ctxLang } = useLang();
  const effLang = lang || ctxLang;
  const insets = useSafeAreaInsets();

  // Запрос стартует только когда шторка видима (cache-read бесплатен и быстр).
  const state = useExplainRequest({ phraseEn, phraseMeaning, lang: effLang }, visible);
  const display = resolveExplainDisplay(state, effLang, phraseMeaning);

  // ── Слайд снизу + fade бэкдропа (legacy Animated, как в NoEnergyModal) ─────
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

  // Открытие шторки трекает ExplainButton (on tap). Здесь — досылаем cache-флаг,
  // как только пришёл ответ: это и есть health-check кэш-хитов (fromCache).
  const loggedResultRef = useRef(false);
  useEffect(() => {
    if (!visible || state.loading) {
      if (!visible) loggedResultRef.current = false;
      return;
    }
    if (loggedResultRef.current) return;
    loggedResultRef.current = true;
    void trackEvent('explain_sheet_opened', {
      lang: effLang,
      fromCache: state.fromCache,
      status: state.status,
      phase: 'resolved',
    });
    // Сообщаем вызывающему результат РОВНО раз — он решает, списывать ли дневной кредит
    // (только реальная генерация: cache MISS, без ошибки).
    onResolved?.({ fromCache: state.fromCache, status: state.status, error: state.error });
  }, [visible, state.loading, state.fromCache, state.status, state.error, effLang, onResolved]);

  const handleClose = () => {
    hapticTap();
    void trackEvent('explain_sheet_closed', { lang: effLang, fromCache: state.fromCache });
    onClose();
  };

  const title = triLang(asLang(effLang), {
    ru: 'Простыми словами',
    uk: 'Простими словами',
    es: 'En palabras simples',
    'pt-BR': 'Em palavras simples',
    vi: 'Nói đơn giản',
    id: 'Dengan kata sederhana',
    tr: 'Basit kelimelerle',
    pl: 'Prościej mówiąc',
  });

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
              paddingBottom: 20 + insets.bottom,
              transform: [{ translateY }],
            },
          ]}
        >
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
            <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h3 }]} numberOfLines={2}>
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

          {/* Сама фраза */}
          <View style={[styles.phraseBlock, { backgroundColor: t.bgSurface2, borderColor: t.border }]}>
            <Text style={[styles.phraseText, { color: t.textPrimary, fontSize: f.bodyLg || f.body }]}>
              {phraseEn}
            </Text>
          </View>

          {/* Тело: скелетон во время генерации, иначе полный текст */}
          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.bodyScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {display.showSkeleton ? (
              <View style={styles.skeleton}>
                <ActivityIndicator color={t.accent} />
                <Text style={[styles.skeletonText, { color: t.textSecond, fontSize: f.body }]}>
                  {loadingLineForLang(effLang)}
                </Text>
                <View style={[styles.skeletonBar, { backgroundColor: t.bgSurface2, width: '92%' }]} />
                <View style={[styles.skeletonBar, { backgroundColor: t.bgSurface2, width: '78%' }]} />
                <View style={[styles.skeletonBar, { backgroundColor: t.bgSurface2, width: '85%' }]} />
              </View>
            ) : (
              <Text style={[styles.bodyText, { color: t.textPrimary, fontSize: f.body }]}>
                {display.text}
              </Text>
            )}
          </ScrollView>

          {/* Футер: «Непонятно объяснили» */}
          <View style={[styles.footer, { borderTopColor: t.border }]}>
            <ExplainReportButton phraseEn={phraseEn} />
          </View>
        </Animated.View>
      </View>
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
    borderWidth: 1,
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
    borderWidth: 1,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  phraseText: {
    fontWeight: '800',
    lineHeight: 26,
  },
  bodyScroll: {
    maxHeight: 320,
  },
  bodyScrollContent: {
    paddingBottom: 8,
  },
  bodyText: {
    fontWeight: '500',
    lineHeight: 24,
  },
  skeleton: {
    gap: 12,
    paddingVertical: 8,
    alignItems: 'flex-start',
  },
  skeletonText: {
    fontWeight: '700',
  },
  skeletonBar: {
    height: 14,
    borderRadius: 7,
    opacity: 0.7,
  },
  footer: {
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
});
