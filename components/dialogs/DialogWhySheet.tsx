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
  /**
   * ⛔ Проп `onUseSuggestion` УДАЛЁН насовсем (владелец 2026-09-17): готовые
   * ответы со вставкой в поле ввода отменены во всём разделе — человек
   * формулирует сам. Не возвращать даже опциональным: мёртвый опциональный
   * проп это приглашение вернуть отменённую механику «по образцу».
   *
   * Замок оплаты, наоборот, ЖИВЁТ ЗДЕСЬ (владелец 2026-09-18: «я говорил про
   * вот эту кнопку „почему так“ — она 3 бесплатно в день»). Платим именно за
   * разбор чужой реплики: он стоит вызова модели. Лампочка-подсказка при этом
   * бесплатна — она показывает шаг сценария из бандла.
   *
   * Не передан — шторка открыта (режим тьютора, где оплаты нет).
   */
  gate?: {
    /** Уже открыта: бесплатной за сегодня или оплаченной рунами. */
    revealed: boolean;
    /** Остаток бесплатных на сегодня. */
    freeLeft: number;
    /** Сколько бесплатных даётся в день — знаменатель строки «2 из 3». */
    freePerDay: number;
    priceRunes: number;
    /** Причина последнего отказа — видимая, не только звук. */
    denied: 'no_runes' | 'error' | null;
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
  gate = null,
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

              {/* Остаток бесплатных разборов — ДО решения, а не после списания.
                  зачем (владелец 2026-09-18, «давай»): лимит 3 в день тратился
                  молча, и человек узнавал о нём только когда бесплатные уже
                  кончились. Это читается как «внезапно стало платно», хотя
                  правило действовало с самого начала.

                  Это НЕ подпись-расшифровка заголовка (запрет владельца): не
                  поясняет слова «Почему так», а сообщает состояние счёта —
                  как остаток на карте рядом с ценой.

                  Нет `gate` (режим тьютора, оплаты там нет) → строки нет:
                  счётчик соврал бы. Кончились → строку заменяет экран с ценой
                  ниже, дублировать ноль незачем. */}
              {gate && gate.freeLeft > 0 ? (
                <Text
                  style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '700', marginBottom: 10 }}
                  maxFontSizeMultiplier={1.2}
                >
                  {triLang(lang, {
                    ru: `Бесплатно сегодня: ${gate.freeLeft} из ${gate.freePerDay}`,
                    uk: `Безкоштовно сьогодні: ${gate.freeLeft} з ${gate.freePerDay}`,
                    en: `Free today: ${gate.freeLeft} of ${gate.freePerDay}`,
                    es: `Gratis hoy: ${gate.freeLeft} de ${gate.freePerDay}`,
                    'pt-BR': `Grátis hoje: ${gate.freeLeft} de ${gate.freePerDay}`,
                    vi: `Miễn phí hôm nay: ${gate.freeLeft}/${gate.freePerDay}`,
                    id: `Gratis hari ini: ${gate.freeLeft} dari ${gate.freePerDay}`,
                    tr: `Bugün ücretsiz: ${gate.freePerDay} hakkından ${gate.freeLeft}`,
                    pl: `Dziś za darmo: ${gate.freeLeft} z ${gate.freePerDay}`,
                  })}
                </Text>
              ) : null}

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

                {/* ЗАМОК: разбор скрыт, пока за него не заплачено. Владелец
                    2026-09-18: «почему так — она 3 бесплатно в день».
                    Первые три за сутки открываются сами (buyHint списывает из
                    дневного остатка, руны не трогает), дальше — кнопка с ценой.
                    `gate` не передан (тьютор) → показываем сразу. */}
                {gate && !gate.revealed ? (
                  <>
                    <Text
                      style={{ color: t.textSecond, fontSize: f.body, lineHeight: Math.round(f.body * 1.45), marginTop: 14 }}
                      maxFontSizeMultiplier={1.2}
                    >
                      {triLang(lang, {
                        ru: 'Бесплатные разборы на сегодня закончились.',
                        uk: 'Безкоштовні розбори на сьогодні скінчилися.',
                        en: 'You have used all your free explanations for today.',
                        es: 'Se acabaron las explicaciones gratuitas de hoy.',
                        'pt-BR': 'As explicações grátis de hoje acabaram.',
                        vi: 'Bạn đã dùng hết lượt giải thích miễn phí hôm nay.',
                        id: 'Penjelasan gratis hari ini sudah habis.',
                        tr: 'Bugünkü ücretsiz açıklamaların bitti.',
                        pl: 'Darmowe wyjaśnienia na dziś się skończyły.',
                      })}
                    </Text>
                    <Pressable
                      onPress={gate.onUnlock}
                      accessibilityRole="button"
                      accessibilityLabel={`${triLang(lang, {
                        ru: 'Показать разбор', uk: 'Показати розбір', en: 'Show the explanation',
                        es: 'Ver la explicación', 'pt-BR': 'Ver a explicação', vi: 'Xem giải thích',
                        id: 'Lihat penjelasan', tr: 'Açıklamayı göster', pl: 'Pokaż wyjaśnienie',
                      })}, ${gate.priceRunes}`}
                      style={({ pressed }) => [
                        styles.unlockBtn,
                        { backgroundColor: t.goldBg, opacity: pressed ? 0.9 : 1 },
                      ]}
                      testID="ai-dialog-why-unlock"
                    >
                      <Text style={{ color: t.gold, fontSize: f.bodyLg, fontWeight: '900' }} maxFontSizeMultiplier={1.2}>
                        {`ᚱ ${gate.priceRunes}`}
                      </Text>
                      <Text style={{ color: t.gold, fontSize: f.bodyLg, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>
                        {`· ${triLang(lang, {
                          ru: 'Показать разбор', uk: 'Показати розбір', en: 'Show the explanation',
                          es: 'Ver la explicación', 'pt-BR': 'Ver a explicação', vi: 'Xem giải thích',
                          id: 'Lihat penjelasan', tr: 'Açıklamayı göster', pl: 'Pokaż wyjaśnienie',
                        })}`}
                      </Text>
                    </Pressable>
                    {/* Причина отказа видна, а не только слышна: молчаливый
                        отказ человек читает как поломку. */}
                    {gate.denied ? (
                      <Text
                        style={{ color: t.gold, fontSize: f.sub, fontWeight: '700', textAlign: 'center', marginTop: 10 }}
                        maxFontSizeMultiplier={1.2}
                      >
                        {gate.denied === 'no_runes'
                          ? triLang(lang, {
                              ru: 'Не хватает рун', uk: 'Не вистачає рун', en: 'Not enough runes',
                              es: 'Faltan runas', 'pt-BR': 'Faltam runas', vi: 'Không đủ rune',
                              id: 'Rune tidak cukup', tr: 'Rün yetersiz', pl: 'Za mało run',
                            })
                          : triLang(lang, {
                              ru: 'Не получилось. Попробуйте ещё раз.',
                              uk: 'Не вийшло. Спробуйте ще раз.',
                              en: 'That did not work. Try again.',
                              es: 'No funcionó. Inténtalo de nuevo.',
                              'pt-BR': 'Não deu certo. Tente de novo.',
                              vi: 'Không thành công. Thử lại nhé.',
                              id: 'Gagal. Coba lagi.',
                              tr: 'Olmadı. Tekrar dene.',
                              pl: 'Nie udało się. Spróbuj ponownie.',
                            })}
                      </Text>
                    ) : null}
                  </>
                ) : null}

                {(!gate || gate.revealed) && coach.note ? (
                  <Text
                    style={{ color: t.textSecond, fontSize: f.body, lineHeight: Math.round(f.body * 1.45), marginTop: 14 }}
                    maxFontSizeMultiplier={1.2}
                  >
                    {coach.note}
                  </Text>
                ) : null}

                {(!gate || gate.revealed) && coach.translation ? (
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

                {/* ⛔ ГОТОВЫХ ОТВЕТОВ ЗДЕСЬ БОЛЬШЕ НЕТ (владелец 2026-09-17,
                    повторено 2026-09-18: «убери вот эти подсказки типа
                    конкретные фразы которые можно нажать и они вставятся в поле
                    ввода… сама вот эта лампочка это и есть подсказка»).

                    Здесь жили два готовых ответа со вставкой в поле ввода и
                    платный замок (80 рун из того же лимита подсказок). Когда
                    строку-помощника убрали из ленты, эта копия осталась — то
                    есть отменённая механика продолжала брать деньги, и лимит
                    подсказок тратили ДВА места сразу.

                    Теперь платит только лампочка, а шторка бесплатна целиком:
                    «почему так» и перевод — это понимание ЧУЖОЙ речи. */}
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
  unlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    borderRadius: 16,
    marginTop: 12,
  },
  // зачем стилей `suggestions`/`suggestion` здесь больше нет: они обслуживали
  // блок готовых ответов, удалённый 2026-09-18 вместе с платным замком.
});
