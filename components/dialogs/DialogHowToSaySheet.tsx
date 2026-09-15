/**
 * DialogHowToSaySheet — шторка «Как сказать…»: человек пишет мысль на родном
 * языке и получает готовые варианты на изучаемом.
 *
 * зачем (владелец 2026-09-14, утверждённый макет, экран «Помощник»): застрявший
 * ученик знает, ЧТО хочет сказать, но не знает КАК. Обычный перевод в диалоге
 * работает в обратную сторону (реплика собеседника → родной язык), поэтому
 * здесь отдельный режим `direction: 'to_study'` того же переводчика.
 *
 * Тап по варианту ВСТАВЛЯЕТ его в поле ввода, но не отправляет: реплика должна
 * остаться авторством ученика, иначе это не практика, а нажатие кнопки.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing as REasing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { normalizeSafeAreaBottomInset } from '../../hooks/use-screen';
import { hapticTap } from '../../hooks/use-haptics';
import { useKeyboardBottomInset } from '../keyboardAvoidance';
import { useTheme } from '../ThemeContext';
import TonalSurface from '../TonalSurface';
import SkeletonBlock from '../SkeletonShimmer';
import { triLang, type Lang } from '../../constants/i18n';
import {
  callPremiumDialogTranslate,
  type PremiumDialogHowToSayVariant,
} from '../../app/ai_dialog_client';
import { DebugLogger } from '../../app/debug-logger';

const SHEET_HIDDEN = 420;

interface DialogHowToSaySheetProps {
  visible: boolean;
  onClose: () => void;
  lang: Lang;
  studyTarget: string;
  cefr: string;
  scenarioId: string;
  /** Вставить выбранный вариант в поле ввода диалога. */
  onUse: (text: string) => void;
  testID?: string;
}

export default function DialogHowToSaySheet({
  visible,
  onClose,
  lang,
  studyTarget,
  cefr,
  scenarioId,
  onUse,
  testID,
}: DialogHowToSaySheetProps) {
  const { theme: t, f } = useTheme();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const { height: viewportHeight } = useWindowDimensions();
  const keyboardBottomInset = useKeyboardBottomInset(visible);
  const reduceMotion = useReducedMotion();

  const [draft, setDraft] = useState('');
  const [variants, setVariants] = useState<PremiumDialogHowToSayVariant[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  // Поздний ответ не должен затирать свежий запрос: сравниваем поколение.
  const requestGenerationRef = useRef(0);

  const backdropO = useSharedValue(0);
  const sheetY = useSharedValue(SHEET_HIDDEN);
  const dragTranslateY = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      // Закрыли — чистим состояние, чтобы следующий вход начинался с нуля.
      setDraft('');
      setVariants([]);
      setStatus('idle');
      return;
    }
    dragTranslateY.value = 0;
    if (reduceMotion) {
      backdropO.value = 1;
      sheetY.value = 0;
      return;
    }
    backdropO.value = withTiming(1, { duration: 200, easing: REasing.out(REasing.cubic) });
    sheetY.value = SHEET_HIDDEN;
    sheetY.value = withTiming(0, { duration: 340, easing: REasing.bezier(0.32, 0.72, 0, 1) });
  }, [visible, backdropO, sheetY, dragTranslateY, reduceMotion]);

  const handleCloseRef = useRef(onClose);
  handleCloseRef.current = onClose;
  const dismissFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (dismissFallbackRef.current) clearTimeout(dismissFallbackRef.current);
  }, []);

  const dismissSheet = useCallback(() => {
    hapticTap();
    if (reduceMotion) {
      handleCloseRef.current();
      return;
    }
    backdropO.value = withTiming(0, { duration: 180 });
    if (dismissFallbackRef.current) clearTimeout(dismissFallbackRef.current);
    dismissFallbackRef.current = setTimeout(() => {
      dismissFallbackRef.current = null;
      handleCloseRef.current();
    }, 300);
    sheetY.value = withTiming(SHEET_HIDDEN, { duration: 220, easing: REasing.out(REasing.cubic) }, (finished) => {
      if (finished) runOnJS(handleCloseRef.current)();
    });
  }, [backdropO, sheetY, reduceMotion]);

  const closeAfterSwipe = useCallback(() => {
    handleCloseRef.current();
  }, []);

  const swipeOffDistance = useMemo(() => Math.max(480, viewportHeight * 0.6), [viewportHeight]);

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
            dragTranslateY.value = withTiming(swipeOffDistance, { duration: 240 }, (finished) => {
              if (finished) runOnJS(closeAfterSwipe)();
            });
          } else {
            dragTranslateY.value = withSpring(0, { damping: 22, stiffness: 300 });
          }
        }),
    [closeAfterSwipe, dragTranslateY, swipeOffDistance],
  );

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropO.value * (1 - Math.min(Math.max(dragTranslateY.value, 0) / 600, 0.5)),
  }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value + dragTranslateY.value }],
  }));

  const ask = useCallback(async () => {
    const value = draft.trim();
    if (!value || status === 'loading') return;
    hapticTap();
    const generation = ++requestGenerationRef.current;
    setStatus('loading');
    setVariants([]);
    const startedAtMs = Date.now();
    try {
      const res = await callPremiumDialogTranslate({
        text: value,
        targetLang: lang,
        scenarioId,
        studyTarget,
        direction: 'to_study',
        cefr,
      });
      // Пока ждали, человек мог спросить другое — старый ответ выбрасываем.
      if (generation !== requestGenerationRef.current) {
        DebugLogger.info('[DIALOG-HOWTO] stale response dropped', JSON.stringify({ generation }));
        return;
      }
      const list = Array.isArray(res.variants) ? res.variants : [];
      if (list.length === 0) {
        DebugLogger.warn('[DIALOG-HOWTO] empty variants', `chars=${value.length}`);
        setStatus('error');
        return;
      }
      setVariants(list);
      setStatus('idle');
      DebugLogger.info('[DIALOG-HOWTO] ok', JSON.stringify({
        ms: Date.now() - startedAtMs,
        variants: list.length,
        cached: res.cached === true,
      }));
    } catch (e) {
      if (generation !== requestGenerationRef.current) return;
      setStatus('error');
      DebugLogger.warn(
        '[DIALOG-HOWTO] failed',
        `${Date.now() - startedAtMs}ms: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }, [draft, status, lang, scenarioId, studyTarget, cefr]);

  const closeLabel = triLang(lang, {
    ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar',
    vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij',
  });

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={dismissSheet}>
      <GestureHandlerRootView style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismissSheet} accessibilityLabel={closeLabel}>
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </Pressable>

        <View style={styles.avoider} pointerEvents="box-none">
          <GestureDetector gesture={panGesture}>
            <Animated.View
              testID={testID}
              style={[
                styles.sheet,
                {
                  backgroundColor: t.bgCard,
                  paddingBottom: 20 + Math.max(bottomInset, keyboardBottomInset),
                  maxHeight: viewportHeight * 0.8,
                },
                sheetStyle,
              ]}
            >
              <TonalSurface pointerEvents="none" radius={24} tone="raised" style={StyleSheet.absoluteFillObject} />
              <View style={styles.grabber} pointerEvents="none">
                <View style={[styles.grabberPill, { backgroundColor: t.border }]} />
              </View>

              <View style={styles.header}>
                <Ionicons name="language" size={22} color={t.accent} />
                <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', flex: 1 }} maxFontSizeMultiplier={1.2}>
                  {triLang(lang, {
                    ru: 'Как сказать…', uk: 'Як сказати…', en: 'How to say…', es: 'Cómo decir…',
                    'pt-BR': 'Como dizer…', vi: 'Nói thế nào…', id: 'Bagaimana bilang…',
                    tr: 'Nasıl denir…', pl: 'Jak powiedzieć…',
                  })}
                </Text>
                <Pressable
                  onPress={dismissSheet}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={closeLabel}
                  style={({ pressed }) => [styles.closeBtn, { backgroundColor: t.bgSurface2, opacity: pressed ? 0.7 : 1 }]}
                >
                  <Ionicons name="close" size={20} color={t.textMuted} />
                </Pressable>
              </View>

              <View style={styles.inputRow}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder={triLang(lang, {
                    ru: 'Напиши мысль своими словами',
                    uk: 'Напиши думку своїми словами',
                    en: 'Write your idea in your own words',
                    es: 'Escribe tu idea con tus palabras',
                    'pt-BR': 'Escreva sua ideia com suas palavras',
                    vi: 'Viết ý của bạn bằng lời của bạn',
                    id: 'Tulis idemu dengan kata-katamu',
                    tr: 'Düşünceni kendi sözlerinle yaz',
                    pl: 'Napisz myśl swoimi słowami',
                  })}
                  placeholderTextColor={t.textMuted}
                  returnKeyType="search"
                  onSubmitEditing={() => void ask()}
                  autoFocus
                  accessibilityLabel={triLang(lang, {
                    ru: 'Что ты хочешь сказать', uk: 'Що ти хочеш сказати', en: 'What you want to say',
                    es: 'Qué quieres decir', 'pt-BR': 'O que você quer dizer', vi: 'Bạn muốn nói gì',
                    id: 'Apa yang ingin kamu katakan', tr: 'Ne demek istiyorsun', pl: 'Co chcesz powiedzieć',
                  })}
                  style={{
                    flex: 1,
                    minHeight: 52,
                    borderRadius: 16,
                    paddingHorizontal: 16,
                    backgroundColor: t.bgSurface2,
                    color: t.textPrimary,
                    fontSize: f.body,
                  }}
                  maxFontSizeMultiplier={1.2}
                />
                <Pressable
                  onPress={() => void ask()}
                  disabled={!draft.trim() || status === 'loading'}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !draft.trim() || status === 'loading', busy: status === 'loading' }}
                  accessibilityLabel={triLang(lang, {
                    ru: 'Подобрать варианты', uk: 'Підібрати варіанти', en: 'Get options',
                    es: 'Buscar opciones', 'pt-BR': 'Buscar opções', vi: 'Tìm cách nói',
                    id: 'Cari pilihan', tr: 'Seçenekleri getir', pl: 'Znajdź warianty',
                  })}
                  style={({ pressed }) => [
                    styles.askBtn,
                    {
                      backgroundColor: draft.trim() ? t.accent : t.bgSurface2,
                      opacity: !draft.trim() || status === 'loading' ? 0.6 : pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  {status === 'loading' ? (
                    <ActivityIndicator size="small" color={t.correctText} />
                  ) : (
                    <Ionicons name="arrow-forward" size={22} color={draft.trim() ? t.correctText : t.textMuted} />
                  )}
                </Pressable>
              </View>

              {status === 'loading' ? (
                // Скелетон вместо пустоты: геометрия та же, что у готовых вариантов.
                <View style={{ marginTop: 14, gap: 8 }}>
                  <SkeletonBlock width={260} height={52} borderRadius={16} />
                  <SkeletonBlock width={220} height={52} borderRadius={16} />
                </View>
              ) : null}

              {status === 'error' ? (
                <Pressable
                  onPress={() => void ask()}
                  accessibilityRole="button"
                  style={styles.errorRow}
                  accessibilityLabel={triLang(lang, {
                    ru: 'Не получилось. Повторить', uk: 'Не вийшло. Повторити', en: 'Failed. Try again',
                    es: 'No salió. Reintentar', 'pt-BR': 'Não deu. Tentar de novo', vi: 'Không được. Thử lại',
                    id: 'Gagal. Coba lagi', tr: 'Olmadı. Tekrar dene', pl: 'Nie wyszło. Ponów',
                  })}
                >
                  <Ionicons name="refresh" size={17} color={t.textMuted} />
                  <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>
                    {triLang(lang, {
                      ru: 'Не получилось · Повторить', uk: 'Не вийшло · Повторити', en: 'Failed · Try again',
                      es: 'No salió · Reintentar', 'pt-BR': 'Não deu · Tentar de novo', vi: 'Không được · Thử lại',
                      id: 'Gagal · Coba lagi', tr: 'Olmadı · Tekrar dene', pl: 'Nie wyszło · Ponów',
                    })}
                  </Text>
                </Pressable>
              ) : null}

              {variants.length > 0 ? (
                <View style={{ marginTop: 14, gap: 8 }}>
                  {variants.map((variant, index) => (
                    <Pressable
                      key={`${index}:${variant.text}`}
                      onPress={() => {
                        hapticTap();
                        onUse(variant.text);
                        dismissSheet();
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={variant.text}
                      style={({ pressed }) => [
                        styles.variant,
                        { backgroundColor: t.bgSurface2, transform: [{ scale: pressed ? 0.97 : 1 }] },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}
                          maxFontSizeMultiplier={1.2}
                        >
                          {variant.text}
                        </Text>
                        {variant.hint ? (
                          <Text
                            style={{ color: t.textMuted, fontSize: f.sub, marginTop: 3 }}
                            maxFontSizeMultiplier={1.2}
                          >
                            {variant.hint}
                          </Text>
                        ) : null}
                      </View>
                      <Ionicons name="arrow-up-circle" size={22} color={t.accent} />
                    </Pressable>
                  ))}
                  <Text
                    style={{ color: t.textMuted, fontSize: f.caption, marginTop: 4, textAlign: 'center' }}
                    maxFontSizeMultiplier={1.2}
                  >
                    {triLang(lang, {
                      ru: 'Вставится в поле, отправишь сам',
                      uk: 'Вставиться в поле, надішлеш сам',
                      en: 'It goes into the field; you send it yourself',
                      es: 'Se pone en el campo; tú lo envías',
                      'pt-BR': 'Vai para o campo; você envia',
                      vi: 'Sẽ điền vào ô nhập, bạn tự gửi',
                      id: 'Masuk ke kolom, kamu yang kirim',
                      tr: 'Alana eklenir, gönderme sende',
                      pl: 'Wstawi się w pole, wyślesz sam',
                    })}
                  </Text>
                </View>
              ) : null}
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  avoider: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    overflow: 'hidden',
  },
  grabber: { alignItems: 'center', paddingVertical: 6 },
  grabberPill: { width: 38, height: 4, borderRadius: 2 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2, marginBottom: 12 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  askBtn: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 14, alignSelf: 'center' },
  variant: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
});
