import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  InteractionManager,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { cancelAnimation, Easing as REasing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useScaledTextStyles } from '../../hooks/useLineScale';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import PressableHybrid from '../../components/PressableHybrid';
import { KIT_MOTION, LUM } from '../../constants/motionHybrid';
import { useTheme } from '../../components/ThemeContext';
import { LinearGradient } from '../../components/SafeLinearGradient';
import { iconTileColors, mixDark, themePair } from '../../components/mistakes-panel/panelPaint';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { triLang, type Lang } from '../../constants/i18n';
import { useStableSafeAreaInsets } from '../stable_safe_area_metrics';
import type { CardsTrainingMode } from './training_entry';
import { speechUnavailableOnDeviceText, useSpeechUnavailableOnDevice } from '../speech_device_availability';

type Props = {
  visible: boolean;
  lang: Lang;
  onClose: () => void;
  onDismissed: () => void;
  onSelect: (mode: CardsTrainingMode) => void;
  /**
   * зачем (координатор §90, 02.10): ранний тап «Тренироваться» открывает окно СРАЗУ, пока квота
   * ещё читается ('waiting' — на слабом устройстве несколько секунд очереди AsyncStorage).
   * 'waiting' — режимы приглушены, строка «Готовим тренировку…»; 'failed' — потолок вышел,
   * «Не получилось подготовить тренировку» + «Повторить». null — обычное окно.
   */
  preparing?: 'waiting' | 'failed' | null;
  onRetry?: () => void;
  /** Остаток тренировок месяца («24/30») — пилюля справа от заголовка; null — пилюли нет. */
  limitLabel?: string | null;
};

type ModeRow = {
  mode: CardsTrainingMode;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
};

const SHEET_EASE = REasing.bezier(...KIT_MOTION.sheetEase);

export default function FlashcardsTrainingModeSheet({
  visible,
  lang,
  onClose,
  onDismissed,
  onSelect,
  preparing = null,
  onRetry,
  limitLabel = null,
}: Props) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом (при 1.0 тот же объект стилей — вид прежний)
  const styles = useScaledTextStyles(baseStyles);
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const insets = useStableSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  // зачем (§SPEECH-NA, владелец 04.10): на устройстве без распознавателя «Устно»
  // остаётся в списке, но отключено: перечёркнутый микрофон и вместо описания —
  // «Распознавание речи не работает на этом устройстве». Вход в режим (и трата
  // энергии) с такого устройства невозможен.
  const speechNa = useSpeechUnavailableOnDevice();
  const speakingEnabled = !speechNa;
  const firstRowRef = useRef<View>(null);
  const hadVisibleRef = useRef(visible);
  const didDismissRef = useRef(false);
  const onDismissedRef = useRef(onDismissed);
  onDismissedRef.current = onDismissed;
  // зачем (координатор 05.10, Motion п.8; kit.css `.sheet`/`.dim`): шторка едет 440 мс cubic-bezier(.2,1,.3,1) в обе стороны,
  // затемнение 260 мс — вместо системного animationType="slide". Modal держим смонтированным, пока шторка не доиграла уход.
  const reduceMotion = useReduceMotion();
  const [presented, setPresented] = useState(visible);
  const presentedRef = useRef(visible);
  const backdropO = useSharedValue(0);
  const slide = useSharedValue(visible ? 0 : 1); // 1 — за нижним краем, 0 — на месте
  const exitMs = reduceMotion ? LUM.instantMs : KIT_MOTION.sheetMs;

  const finishDismiss = () => {
    if (didDismissRef.current) return;
    didDismissRef.current = true;
    onDismissedRef.current();
  };

  useEffect(() => {
    if (visible) {
      hadVisibleRef.current = true;
      didDismissRef.current = false;
      return undefined;
    }
    if (!hadVisibleRef.current) return undefined;
    hadVisibleRef.current = false;
    // Android has no reliable Modal.onDismiss; leave a native-close barrier before navigation.
    // зачем: барьер считается от конца анимации ухода, иначе переход на экран тренировки пойдёт под ещё уезжающей шторкой
    const timer = setTimeout(finishDismiss, exitMs + (Platform.OS === 'ios' ? 400 : 100));
    return () => clearTimeout(timer);
  }, [visible]);

  useEffect(() => {
    const setShown = (value: boolean) => { presentedRef.current = value; setPresented(value); };
    if (visible) {
      if (!presentedRef.current) slide.value = 1;
      setShown(true);
      backdropO.value = withTiming(1, { duration: reduceMotion ? LUM.instantMs : KIT_MOTION.dimMs });
      slide.value = withTiming(0, { duration: reduceMotion ? LUM.instantMs : KIT_MOTION.sheetMs, easing: SHEET_EASE });
      return () => { cancelAnimation(slide); cancelAnimation(backdropO); };
    }
    backdropO.value = withTiming(0, { duration: reduceMotion ? LUM.instantMs : KIT_MOTION.dimMs });
    slide.value = withTiming(1, { duration: reduceMotion ? LUM.instantMs : KIT_MOTION.sheetMs, easing: SHEET_EASE }, (finished) => {
      if (finished) runOnJS(setShown)(false);
    });
    return () => { cancelAnimation(slide); cancelAnimation(backdropO); };
  }, [visible, reduceMotion, backdropO, slide]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropO.value }));
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: slide.value * screenHeight }] }));

  useEffect(() => {
    if (!visible) return undefined;
    const task = InteractionManager.runAfterInteractions(() => {
      const node = findNodeHandle(firstRowRef.current);
      if (node != null) AccessibilityInfo.setAccessibilityFocus(node);
    });
    return () => task.cancel();
  }, [visible]);

  const rows = useMemo<ModeRow[]>(() => {
    const allRows: ModeRow[] = [
      {
        mode: 'blitz',
        icon: 'flash-outline',
        title: triLang(lang, {
          ru: 'Блиц', uk: 'Бліц', en: 'Blitz', es: 'Blitz', 'pt-BR': 'Blitz',
          vi: 'Blitz', id: 'Blitz', tr: 'Blitz', pl: 'Blitz',
        }),
        description: triLang(lang, { ru: 'Минута на скорость', uk: 'Хвилина на швидкість', en: 'A minute for speed', es: 'Un minuto de velocidad', 'pt-BR': 'Um minuto de velocidade', vi: 'Một phút tốc độ', id: 'Satu menit kilat', tr: 'Hız için bir dakika', pl: 'Minuta na szybkość' }),
      },
      {
        mode: 'speaking',
        icon: 'mic-outline',
        title: triLang(lang, {
          ru: 'Устно', uk: 'Усно', en: 'Speaking', es: 'Oral', 'pt-BR': 'Falando',
          vi: 'Nói', id: 'Lisan', tr: 'Sözlü', pl: 'Ustnie',
        }),
        description: triLang(lang, { ru: 'Говори вслух', uk: 'Говори вголос', en: 'Speak out loud', es: 'Habla en voz alta', 'pt-BR': 'Fale em voz alta', vi: 'Nói thành tiếng', id: 'Ucapkan keras-keras', tr: 'Yüksek sesle söyle', pl: 'Mów na głos' }),
      },
      {
        mode: 'truefalse',
        // зачем (Сверка cards-section-032, макет icon('check')): галочка без круга.
        icon: 'checkmark',
        title: triLang(lang, {
          ru: 'Правда / ложь', uk: 'Правда / неправда', en: 'True / false', es: 'Verdadero / falso',
          'pt-BR': 'Verdadeiro / falso', vi: 'Đúng / sai', id: 'Benar / salah',
          tr: 'Doğru / yanlış', pl: 'Prawda / fałsz',
        }),
        description: triLang(lang, { ru: 'Верен ли перевод', uk: 'Чи правильний переклад', en: 'Is the translation right', es: '¿Es correcta la traducción?', 'pt-BR': 'A tradução está certa?', vi: 'Bản dịch có đúng không', id: 'Apakah terjemahannya benar', tr: 'Çeviri doğru mu', pl: 'Czy tłumaczenie jest poprawne' }),
      },
      {
        mode: 'recall',
        // зачем (Сверка cards-section-032, макет icon('edit')): карандаш в квадрате.
        icon: 'create-outline',
        title: triLang(lang, {
          ru: 'Вспомни и напиши', uk: 'Згадай і напиши', en: 'Recall and write', es: 'Recuerda y escribe',
          'pt-BR': 'Lembre e escreva', vi: 'Nhớ và viết', id: 'Ingat dan tulis',
          tr: 'Hatırla ve yaz', pl: 'Przypomnij i napisz',
        }),
        description: triLang(lang, { ru: 'Пиши по памяти', uk: 'Пиши з пам’яті', en: 'Write from memory', es: 'Escribe de memoria', 'pt-BR': 'Escreva de memória', vi: 'Viết theo trí nhớ', id: 'Tulis dari ingatan', tr: 'Hafızadan yaz', pl: 'Pisz z pamięci' }),
      },
    ];
    return allRows;
  }, [lang]);

  // зачем (владелец: «любые различия с макетом запрещены», cards-section «Режим тренировки»): заголовок «Режим тренировки», справа пилюля остатка «24/30»
  const heading = triLang(lang, {
    ru: 'Режим тренировки', uk: 'Режим тренування', en: 'Practice mode',
    es: 'Modo de práctica', 'pt-BR': 'Modo de treino', vi: 'Chế độ luyện tập',
    id: 'Mode latihan', tr: 'Çalışma modu', pl: 'Tryb ćwiczeń',
  });
  const chooseSubtitle = triLang(lang, {
    ru: 'Выбери формат тренировки', uk: 'Обери формат тренування',
    en: 'Choose how to practise', es: 'Elige el formato de práctica',
    'pt-BR': 'Escolha o formato do treino', vi: 'Chọn hình thức luyện tập',
    id: 'Pilih format latihan', tr: 'Çalışma biçimini seç',
    pl: 'Wybierz formę ćwiczeń',
  });
  const preparingSubtitle = triLang(lang, {
    ru: 'Готовим тренировку…', uk: 'Готуємо тренування…', en: 'Getting your practice ready…',
    es: 'Preparando tu práctica…', 'pt-BR': 'Preparando seu treino…', vi: 'Đang chuẩn bị bài luyện tập…',
    id: 'Menyiapkan latihan…', tr: 'Çalışma hazırlanıyor…', pl: 'Przygotowujemy ćwiczenia…',
  });
  const failedSubtitle = triLang(lang, {
    ru: 'Не получилось подготовить тренировку', uk: 'Не вдалося підготувати тренування',
    en: "Couldn't get your practice ready", es: 'No pudimos preparar tu práctica',
    'pt-BR': 'Não foi possível preparar seu treino', vi: 'Không thể chuẩn bị bài luyện tập',
    id: 'Latihan belum bisa disiapkan', tr: 'Çalışma hazırlanamadı', pl: 'Nie udało się przygotować ćwiczeń',
  });
  const retryLabel = triLang(lang, {
    ru: 'Повторить', uk: 'Повторити', en: 'Try again', es: 'Reintentar', 'pt-BR': 'Tentar de novo',
    vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Spróbuj ponownie',
  });
  const subtitle = preparing === 'waiting' ? preparingSubtitle : preparing === 'failed' ? failedSubtitle : chooseSubtitle;

  const [ga, gb] = themePair(g);
  return (
    <Modal visible={presented} transparent animationType="none" statusBarTranslucent onRequestClose={onClose} onDismiss={finishDismiss}>
      <View style={styles.modalRoot}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel={triLang(lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' })}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />
        </Pressable>
        <Animated.View testID="fc-training-mode-sheet" accessibilityViewIsModal style={[styles.sheet, { backgroundColor: g.opaqueSheet, maxHeight: screenHeight - insets.top - 24, paddingBottom: Math.max(40, insets.bottom + 8) }, sheetStyle]}>
          {/* зачем (Сверка cards-section-032, правило «стекло 2.0 = непрозрачное»): сквозь шторку читались плитки хаба.
              Заливка плотная: cards-glass.css `.sheet` 160° — цвет темы 16 % → подложка шторки темы (opaqueSheet) на 55 % → второй цвет темы 14 %, без альфы.
              Замечание владельца 10.10: подложка и блики — токены выбранной темы, не литералы под «Аврору». */}
          <LinearGradient pointerEvents="none" colors={[mixDark(ga, g.opaqueSheet, 0.16), g.opaqueSheet, mixDark(gb, g.opaqueSheet, 0.14)]} locations={[0, 0.55, 1]} start={{ x: 0.33, y: 0.03 }} end={{ x: 0.67, y: 0.97 }} style={[StyleSheet.absoluteFill, styles.sheetFill]} />
          <View style={[styles.grabber, { backgroundColor: `${g.text}40` }]} />
          <View style={styles.headRow}>
            <View style={styles.headCopy}>
              <Text accessibilityRole="header" style={[styles.heading, { color: g.text }]}>{heading}</Text>
              {preparing ? (
                <Text
                  testID="fc-training-mode-subtitle"
                  accessibilityLiveRegion="polite"
                  style={[styles.headingSubtitle, { color: g.secondary }]}
                >
                  {subtitle}
                </Text>
              ) : null}
              {preparing === 'failed' && onRetry ? (
                // зачем (Motion п.4): действие — клавиша PressableHybrid, а не плоское затемнение opacity: pressed
                <PressableHybrid
                  testID="fc-training-mode-retry"
                  accessibilityRole="button"
                  accessibilityLabel={retryLabel}
                  hitSlop={8}
                  onPress={onRetry}
                  variant="chip"
                  style={styles.retry}
                  // зачем: текст внутри PressableHybrid лежит в анимируемом слое — без contentStyle он
                  // не центрируется и прыгает при нажатии (сторож hybrid_button_layout).
                  contentStyle={{ alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={[styles.headingSubtitle, styles.retryText, { color: g.text }]}>{retryLabel}</Text>
                </PressableHybrid>
              ) : null}
            </View>
            {limitLabel ? (
              <View style={[styles.limitPill, { backgroundColor: g.hairlineSoft }]}>
                <Ionicons name="copy-outline" size={16} color={g.text} />
                <Text style={[styles.limitText, { color: g.text }]}>{limitLabel}</Text>
              </View>
            ) : null}
            {/* зачем: закрытие — тап по затемнению и системный «назад»; кнопка осталась невидимой для тестов и читалок экрана */}
            <Pressable testID="fc-training-mode-cancel" accessibilityRole="button" accessibilityLabel={triLang(lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' })} onPress={onClose} style={styles.closeHidden} />
          </View>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} nestedScrollEnabled>
            <View>
              {rows.map((row, rowIndex) => {
                const speakingBlocked = row.mode === 'speaking' && !speakingEnabled;
                const disabled = speakingBlocked || preparing !== null;
                const rowDescription = speakingBlocked ? speechUnavailableOnDeviceText(lang) : row.description;
                const rowIcon = speakingBlocked ? 'mic-off-outline' : row.icon;
                return (
                  <Pressable
                    ref={rowIndex === 0 ? firstRowRef : undefined}
                    key={row.mode}
                    testID={`fc-training-mode-${row.mode}`}
                    accessibilityRole="button"
                    accessibilityLabel={`${row.title}. ${rowDescription}`}
                    accessibilityState={{ disabled }}
                    disabled={disabled}
                    onPress={() => onSelect(row.mode)}
                    style={({ pressed }) => [styles.row, rowIndex > 0 && [styles.rowLine, { borderTopColor: g.line }], { opacity: disabled ? 0.48 : pressed ? 0.82 : 1 }]}
                  >
                    <View style={styles.icon}>
                      <LinearGradient pointerEvents="none" colors={iconTileColors(g, ga, gb)} start={{ x: 0.21, y: 0.09 }} end={{ x: 0.79, y: 0.91 }} style={StyleSheet.absoluteFill} />
                      <Ionicons name={rowIcon} size={24} color={g.text} />
                      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 14, boxShadow: [{ inset: true, offsetX: 1, offsetY: 1.5, blurRadius: 0, spreadDistance: -0.2, color: g.bevelHi }, { inset: true, offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 0.5, color: g.hairlineSoft }] }]} />
                    </View>
                    <View style={styles.copy}>
                      <Text style={[styles.rowTitle, { color: g.text }]}>{row.title}</Text>
                      <Text style={[styles.description, { color: g.secondary }]}>{rowDescription}</Text>
                    </View>
                    {speakingBlocked ? <View style={{ width: 20 }} /> : <Ionicons name="chevron-forward" size={20} color={g.text} />}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.sheetFill, { boxShadow: [{ inset: true, offsetX: 0, offsetY: 1.5, blurRadius: 0, spreadDistance: -0.2, color: g.bevelHi }, { inset: true, offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 1, color: g.hairlineSoft }] }]} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const baseStyles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  // зачем (Сверка cards-section-032): в макете хаб под шторкой приглушён до .3 и накрыт `.dim` rgba(2,2,4,.62) —
  // итог ≈ .88 чёрного; прежние .6 оставляли хаб почти ярким.
  backdrop: { backgroundColor: 'rgba(2,2,4,0.88)' }, // theme-exempt: затемнение под шторкой — тёмный скрим в любой теме (kit `.dim`)
  sheet: { width: '100%', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', paddingHorizontal: 18, paddingTop: 12 },
  sheetFill: { borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  // зачем (Сверка cards-section-032, kit.css `.sheet` поля 12/18/40 и `.grab` 44×5 + 26): шторка была ~15 px выше макета —
  // лишние нижние поля (системный отступ + 16 + 4). Теперь низ 40 (системная полоса ложится поверх, как в макете), под хватателем 26.
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, marginBottom: 26 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 },
  headCopy: { flex: 1, minWidth: 0 },
  heading: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  headingSubtitle: { fontSize: 16, lineHeight: 21, marginTop: 4 },
  limitPill: { minHeight: 30, borderRadius: 18, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 7 },
  limitText: { fontSize: 16, lineHeight: 20, fontWeight: '700' },
  closeHidden: { width: 1, height: 1, opacity: 0 },
  scroll: { flexGrow: 0, flexShrink: 1, minHeight: 0 },
  content: { paddingTop: 10, paddingBottom: 0 },
  // cards-section `mode()`: поля 16/4, промежуток 20 — высота строки 16 + 57 + 16.
  row: { minHeight: 89, paddingVertical: 16, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', gap: 20 },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth }, // guard-ok: разделитель строк меню (макет «Режим тренировки»), не контейнер
  icon: { width: 57, height: 57, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  copy: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 16, lineHeight: 23, fontWeight: '700' },
  retry: { alignSelf: 'flex-start', marginTop: 4 },
  retryText: { marginTop: 0, fontWeight: '700' },
  description: { fontSize: 16, lineHeight: 20, marginTop: 3 },
});
