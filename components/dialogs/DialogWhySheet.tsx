/**
 * DialogWhySheet — шторка «Почему так» под репликой собеседника.
 *
 * зачем (владелец 2026-09-14, редизайн раздела «Диалоги»): «почему так
 * пожалуйста пусть открывается модал лист анимированный снизу вверх и
 * пожалуйста пусть не будет долгой генерации, а будет всё сразу мгновенно».
 * Поэтому содержимое (объяснение, перевод, готовые ответы) приезжает ВМЕСТЕ с
 * репликой в поле `coach` того же вызова (app/ai_dialog_coach.ts) — здесь
 * только показ, ни одного сетевого запроса и ни одного спиннера.
 *
 * Каркас (выезд снизу, вуаль, drag-to-dismiss 88px/velocityY 900) — тот же, что
 * у шторок раздела рефералов, чтобы жест ощущался одинаково по всему приложению.
 *
 * Токены темы, fontWeight только 400/700, без обводок контейнеров.
 */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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
import { useTheme } from '../ThemeContext';
import TonalSurface from '../TonalSurface';
import { triLang, type Lang } from '../../constants/i18n';
import type { DialogCoachTurn } from '../../app/ai_dialog_coach';

const SHEET_HIDDEN = 420;

interface DialogWhySheetProps {
  visible: boolean;
  onClose: () => void;
  lang: Lang;
  /** Реплика собеседника без [[маркеров]] — цитата в шапке шторки. */
  quote: string;
  coach: DialogCoachTurn;
  /** Тап по готовому ответу: вставляет его в поле ввода (не отправляет). */
  onUseSuggestion: (text: string) => void;
  /**
   * Экономика готовых ответов (владелец 2026-09-17, экран 4 макета): 3 в день
   * бесплатно, дальше 80 рун. Не передана — ответы открыты, как раньше.
   *
   * ⚠️ Платные ТОЛЬКО готовые ответы. Перевод и «почему так» бесплатны всегда:
   * за понимание чужой речи плату не берём.
   */
  hintEconomy?: {
    /** Показаны ли ответы прямо сейчас (бесплатная или уже оплаченная). */
    revealed: boolean;
    /** Остаток бесплатных на сегодня. */
    freeLeft: number;
    priceRunes: number;
    balanceRunes: number;
    onUnlock: () => void;
  } | null;
  testID?: string;
}

export default function DialogWhySheet({
  visible,
  onClose,
  lang,
  quote,
  coach,
  onUseSuggestion,
  hintEconomy = null,
  testID,
}: DialogWhySheetProps) {
  const { theme: t, f } = useTheme();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const { height: viewportHeight } = useWindowDimensions();
  const reduceMotion = useReducedMotion();

  const backdropO = useSharedValue(0);
  const sheetY = useSharedValue(SHEET_HIDDEN);
  const dragTranslateY = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    dragTranslateY.value = 0;
    if (reduceMotion) {
      backdropO.value = 1;
      sheetY.value = 0;
      return;
    }
    backdropO.value = withTiming(1, { duration: 200, easing: REasing.out(REasing.cubic) });
    sheetY.value = SHEET_HIDDEN;
    // Кривая iOS-шторки (Ionic drawer): быстрый старт, мягкая посадка.
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
    // Страховка: коллбэк Reanimated при отмене приходит с finished=false, и
    // шторка «зависала открытой» невидимо — JS-таймер закрывает всегда.
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
          // Вниз 1:1, вверх резина ×0.12 — стандарт шторок приложения.
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
                { backgroundColor: t.bgCard, paddingBottom: 20 + bottomInset, maxHeight: viewportHeight * 0.82 },
                sheetStyle,
              ]}
            >
              <TonalSurface pointerEvents="none" radius={24} tone="raised" style={StyleSheet.absoluteFillObject} />
              <View style={styles.grabber} pointerEvents="none">
                <View style={[styles.grabberPill, { backgroundColor: t.border }]} />
              </View>

              <View style={styles.header}>
                <Ionicons name="bulb" size={22} color={t.accent} />
                <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', flex: 1 }} maxFontSizeMultiplier={1.2}>
                  {triLang(lang, {
                    ru: 'Почему так', uk: 'Чому так', en: 'Why it sounds like this', es: 'Por qué se dice así',
                    'pt-BR': 'Por que se diz assim', vi: 'Vì sao nói vậy', id: 'Kenapa begitu',
                    tr: 'Neden böyle', pl: 'Dlaczego tak',
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

              <ScrollView
                style={{ flexGrow: 0 }}
                contentContainerStyle={{ paddingBottom: 4 }}
                showsVerticalScrollIndicator={false}
              >
                {/* Цитата реплики: человек видит, о чём речь, не листая чат. */}
                <View style={[styles.quote, { backgroundColor: t.accentBg }]}>
                  <Text
                    style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700', lineHeight: Math.round(f.bodyLg * 1.35) }}
                    maxFontSizeMultiplier={1.2}
                  >
                    {quote}
                  </Text>
                </View>

                {coach.note ? (
                  <Text
                    style={{ color: t.textSecond, fontSize: f.body, lineHeight: Math.round(f.body * 1.45), marginTop: 14 }}
                    maxFontSizeMultiplier={1.2}
                  >
                    {coach.note}
                  </Text>
                ) : null}

                {coach.translation ? (
                  <>
                    <View style={styles.sectionHead}>
                      <Ionicons name="language-outline" size={16} color={t.accent} />
                      <Text style={{ color: t.accent, fontSize: f.sub, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>
                        {triLang(lang, {
                          ru: 'Перевод', uk: 'Переклад', en: 'Translation', es: 'Traducción', 'pt-BR': 'Tradução',
                          vi: 'Bản dịch', id: 'Terjemahan', tr: 'Çeviri', pl: 'Tłumaczenie',
                        })}
                      </Text>
                    </View>
                    <Text
                      style={{ color: t.textSecond, fontSize: f.body, lineHeight: Math.round(f.body * 1.45), marginTop: 6 }}
                      maxFontSizeMultiplier={1.2}
                    >
                      {coach.translation}
                    </Text>
                  </>
                ) : null}

                {coach.suggestions.length > 0 ? (
                  <>
                    <View style={styles.sectionHead}>
                      <Ionicons name="sparkles-outline" size={16} color={t.accent} />
                      <Text style={{ color: t.accent, fontSize: f.sub, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>
                        {triLang(lang, {
                          ru: 'Как ответить', uk: 'Як відповісти', en: 'How to answer', es: 'Cómo responder',
                          'pt-BR': 'Como responder', vi: 'Trả lời thế nào', id: 'Cara menjawab',
                          tr: 'Nasıl yanıtlamalı', pl: 'Jak odpowiedzieć',
                        })}
                      </Text>
                    </View>
                    {/* Ответы закрыты (бесплатные кончились) — вместо них
                        кнопка покупки. Текст УЖЕ загружен, поэтому после тапа
                        он появляется мгновенно: ожидания здесь быть не может. */}
                    {hintEconomy && !hintEconomy.revealed ? (
                      <>
                        <Pressable
                          onPress={() => {
                            if (hintEconomy.balanceRunes < hintEconomy.priceRunes) return;
                            hapticTap();
                            hintEconomy.onUnlock();
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={triLang(lang, {
                            ru: `Показать два ответа за ${hintEconomy.priceRunes} рун`,
                            uk: `Показати дві відповіді за ${hintEconomy.priceRunes} рун`,
                            en: `Show two answers for ${hintEconomy.priceRunes} runes`,
                            es: `Mostrar dos respuestas por ${hintEconomy.priceRunes} runas`,
                            'pt-BR': `Mostrar duas respostas por ${hintEconomy.priceRunes} runas`,
                            vi: `Hiện hai câu trả lời với ${hintEconomy.priceRunes} rune`,
                            id: `Tampilkan dua jawaban seharga ${hintEconomy.priceRunes} rune`,
                            tr: `${hintEconomy.priceRunes} rün karşılığında iki yanıt göster`,
                            pl: `Pokaż dwie odpowiedzi za ${hintEconomy.priceRunes} run`,
                          })}
                          testID="dialog-why-unlock-hints"
                          style={({ pressed }) => [
                            styles.suggestion,
                            {
                              // Золото = платное, как везде. Границы тоном, не обводкой.
                              backgroundColor: t.goldBg,
                              marginTop: 8,
                              justifyContent: 'center',
                              opacity: hintEconomy.balanceRunes < hintEconomy.priceRunes ? 0.55 : pressed ? 0.9 : 1,
                              transform: [{ scale: pressed ? 0.97 : 1 }],
                            },
                          ]}
                        >
                          <Text style={{ color: t.gold, fontSize: f.body, fontWeight: '900' }} maxFontSizeMultiplier={1.2}>
                            ᚱ {hintEconomy.priceRunes}
                          </Text>
                          <Text style={{ color: t.gold, fontSize: f.body, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>
                            · {triLang(lang, {
                              ru: 'Показать два ответа', uk: 'Показати дві відповіді', en: 'Show two answers',
                              es: 'Ver dos respuestas', 'pt-BR': 'Ver duas respostas', vi: 'Xem hai câu trả lời',
                              id: 'Lihat dua jawaban', tr: 'İki yanıtı göster', pl: 'Pokaż dwie odpowiedzi',
                            })}
                          </Text>
                        </Pressable>
                        <Text
                          style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '700', marginTop: 10, textAlign: 'center' }}
                          maxFontSizeMultiplier={1.2}
                        >
                          {hintEconomy.balanceRunes < hintEconomy.priceRunes
                            ? triLang(lang, {
                                ru: 'Не хватает рун', uk: 'Не вистачає рун', en: 'Not enough runes',
                                es: 'Faltan runas', 'pt-BR': 'Faltam runas', vi: 'Không đủ rune',
                                id: 'Rune tidak cukup', tr: 'Rün yetersiz', pl: 'Za mało run',
                              })
                            : triLang(lang, {
                                ru: 'Бесплатные подсказки вернутся завтра',
                                uk: 'Безкоштовні підказки повернуться завтра',
                                en: 'Free hints come back tomorrow',
                                es: 'Las pistas gratis vuelven mañana',
                                'pt-BR': 'As dicas grátis voltam amanhã',
                                vi: 'Gợi ý miễn phí trở lại vào ngày mai',
                                id: 'Petunjuk gratis kembali besok',
                                tr: 'Ücretsiz ipuçları yarın döner',
                                pl: 'Darmowe podpowiedzi wrócą jutro',
                              })}
                        </Text>
                      </>
                    ) : (
                      <>
                        <View style={styles.suggestions}>
                          {coach.suggestions.map((suggestion, index) => (
                            <Pressable
                              key={`${index}:${suggestion}`}
                              onPress={() => {
                                hapticTap();
                                onUseSuggestion(suggestion);
                                dismissSheet();
                              }}
                              accessibilityRole="button"
                              accessibilityLabel={suggestion}
                              style={({ pressed }) => [
                                styles.suggestion,
                                { backgroundColor: t.bgSurface2, transform: [{ scale: pressed ? 0.97 : 1 }] },
                              ]}
                            >
                              <Text
                                style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', flex: 1 }}
                                maxFontSizeMultiplier={1.2}
                              >
                                {suggestion}
                              </Text>
                              <Ionicons name="arrow-up-circle" size={22} color={t.accent} />
                            </Pressable>
                          ))}
                        </View>
                        <Text
                          style={{ color: t.textMuted, fontSize: f.caption, marginTop: 10, textAlign: 'center' }}
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
                        {/* Остаток бесплатных — человек узнаёт про лимит заранее,
                            а не упирается в него на четвёртой подсказке. */}
                        {hintEconomy && hintEconomy.freeLeft > 0 ? (
                          <Text
                            style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '700', marginTop: 8, textAlign: 'center' }}
                            maxFontSizeMultiplier={1.2}
                          >
                            {triLang(lang, {
                              ru: `Осталось ${hintEconomy.freeLeft} подсказки сегодня`,
                              uk: `Залишилось ${hintEconomy.freeLeft} підказки сьогодні`,
                              en: `${hintEconomy.freeLeft} hints left today`,
                              es: `Quedan ${hintEconomy.freeLeft} pistas hoy`,
                              'pt-BR': `Restam ${hintEconomy.freeLeft} dicas hoje`,
                              vi: `Còn ${hintEconomy.freeLeft} gợi ý hôm nay`,
                              id: `Sisa ${hintEconomy.freeLeft} petunjuk hari ini`,
                              tr: `Bugün ${hintEconomy.freeLeft} ipucu kaldı`,
                              pl: `Zostało ${hintEconomy.freeLeft} podpowiedzi dziś`,
                            })}
                          </Text>
                        ) : null}
                      </>
                    )}
                  </>
                ) : null}
              </ScrollView>
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
  quote: { borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 18 },
  suggestions: { gap: 8, marginTop: 8 },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    paddingHorizontal: 16,
    minHeight: 54,
    paddingVertical: 10,
  },
});
