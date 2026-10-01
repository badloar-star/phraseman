import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useRef } from 'react';
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
import { useTheme } from '../../components/ThemeContext';
import { LinearGradient } from '../../components/SafeLinearGradient';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { triLang, type Lang } from '../../constants/i18n';
import { useStableSafeAreaInsets } from '../stable_safe_area_metrics';
import type { CardsTrainingMode } from './training_entry';

type Props = {
  visible: boolean;
  lang: Lang;
  onClose: () => void;
  onDismissed: () => void;
  onSelect: (mode: CardsTrainingMode) => void;
};

type ModeRow = {
  mode: CardsTrainingMode;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
};

export default function FlashcardsTrainingModeSheet({
  visible,
  lang,
  onClose,
  onDismissed,
  onSelect,
}: Props) {
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const insets = useStableSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const speakingEnabled = true;
  const firstRowRef = useRef<View>(null);
  const hadVisibleRef = useRef(visible);
  const didDismissRef = useRef(false);
  const onDismissedRef = useRef(onDismissed);
  onDismissedRef.current = onDismissed;

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
    const timer = setTimeout(finishDismiss, Platform.OS === 'ios' ? 400 : 100);
    return () => clearTimeout(timer);
  }, [visible]);

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
        description: triLang(lang, {
          ru: 'За 60 секунд находи верные переводы и вспоминай быстрее.',
          uk: 'За 60 секунд знаходь правильні переклади й згадуй швидше.',
          en: 'Find the right translations for 60 seconds and recall them faster.',
          es: 'Encuentra las traducciones correctas en 60 segundos y recuérdalas más rápido.',
          'pt-BR': 'Encontre as traduções certas em 60 segundos e lembre-se mais rápido.',
          vi: 'Tìm bản dịch đúng trong 60 giây và nhớ lại nhanh hơn.',
          id: 'Temukan terjemahan yang tepat dalam 60 detik dan ingat lebih cepat.',
          tr: '60 saniyede doğru çevirileri bul ve daha hızlı hatırla.',
          pl: 'Znajduj poprawne tłumaczenia przez 60 sekund i szybciej je przywołuj.',
        }),
      },
      {
        mode: 'speaking',
        icon: 'mic-outline',
        title: triLang(lang, {
          ru: 'Устно', uk: 'Усно', en: 'Speaking', es: 'Oral', 'pt-BR': 'Falando',
          vi: 'Nói', id: 'Lisan', tr: 'Sözlü', pl: 'Ustnie',
        }),
        description: triLang(lang, {
          ru: 'Произноси фразы вслух и тренируй разговорную речь.',
          uk: 'Промовляй фрази вголос і тренуй розмовне мовлення.',
          en: 'Say phrases aloud and practise speaking.',
          es: 'Di frases en voz alta y practica la conversación.',
          'pt-BR': 'Diga frases em voz alta e pratique a fala.',
          vi: 'Đọc các câu thành tiếng và luyện nói.',
          id: 'Ucapkan frasa dan latih percakapan.',
          tr: 'Cümleleri sesli söyle ve konuşma pratiği yap.',
          pl: 'Wypowiadaj frazy na głos i ćwicz mówienie.',
        }),
      },
      {
        mode: 'truefalse',
        icon: 'checkmark-circle-outline',
        title: triLang(lang, {
          ru: 'Правда / ложь', uk: 'Правда / неправда', en: 'True / false', es: 'Verdadero / falso',
          'pt-BR': 'Verdadeiro / falso', vi: 'Đúng / sai', id: 'Benar / salah',
          tr: 'Doğru / yanlış', pl: 'Prawda / fałsz',
        }),
        description: triLang(lang, {
          ru: 'Сверяй фразу с переводом и сразу проверяй память.',
          uk: 'Звіряй фразу з перекладом і відразу перевіряй пам’ять.',
          en: 'Match each phrase with its translation and check your memory instantly.',
          es: 'Compara cada frase con su traducción y comprueba tu memoria al instante.',
          'pt-BR': 'Compare cada frase com a tradução e teste sua memória na hora.',
          vi: 'Đối chiếu cụm từ với bản dịch và kiểm tra trí nhớ ngay lập tức.',
          id: 'Cocokkan frasa dengan terjemahannya dan langsung uji ingatanmu.',
          tr: 'Cümleyi çevirisiyle eşleştir ve hafızanı hemen sına.',
          pl: 'Porównuj zwrot z tłumaczeniem i od razu sprawdzaj pamięć.',
        }),
      },
      {
        mode: 'recall',
        icon: 'pencil-outline',
        title: triLang(lang, {
          ru: 'Вспомни и напиши', uk: 'Згадай і напиши', en: 'Recall and write', es: 'Recuerda y escribe',
          'pt-BR': 'Lembre e escreva', vi: 'Nhớ và viết', id: 'Ingat dan tulis',
          tr: 'Hatırla ve yaz', pl: 'Przypomnij i napisz',
        }),
        description: triLang(lang, {
          ru: 'Вводи фразу на изучаемом языке целиком по памяти.',
          uk: 'Вводь фразу мовою, яку вивчаєш, повністю з пам’яті.',
          en: 'Type the complete phrase in the language you are learning.',
          es: 'Escribe de memoria la frase completa en el idioma que estudias.',
          'pt-BR': 'Digite de memória a frase completa no idioma que você está aprendendo.',
          vi: 'Nhập toàn bộ cụm từ bằng ngôn ngữ bạn đang học.',
          id: 'Ketik seluruh frasa dalam bahasa yang sedang kamu pelajari.',
          tr: 'İfadeyi öğrendiğin dilde tamamen hafızandan yaz.',
          pl: 'Wpisz z pamięci całe wyrażenie w języku, którego się uczysz.',
        }),
      },
    ];
    return allRows;
  }, [lang]);

  const heading = triLang(lang, {
    ru: 'Тренироваться с карточками', uk: 'Тренуватися з картками', en: 'Practise with cards',
    es: 'Practicar con tarjetas', 'pt-BR': 'Treinar com cartões', vi: 'Luyện tập với thẻ',
    id: 'Latihan dengan kartu', tr: 'Kartlarla çalış', pl: 'Ćwicz z kartami',
  });
  const subtitle = triLang(lang, {
    ru: 'Выбери формат тренировки', uk: 'Обери формат тренування',
    en: 'Choose how to practise', es: 'Elige el formato de práctica',
    'pt-BR': 'Escolha o formato do treino', vi: 'Chọn hình thức luyện tập',
    id: 'Pilih format latihan', tr: 'Çalışma biçimini seç',
    pl: 'Wybierz formę ćwiczeń',
  });

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose} onDismiss={finishDismiss}>
      {/* зачем (владелец 01.10, скрин «Тренироваться с карточками»): шторка снизу с ручкой,
          заголовок слева в две строки, подпись, круглая ×; крупные строки «значок в квадрате ·
          название · описание · ›». Цвета — наши токены liquid glass. */}
      <View style={styles.modalRoot}>
        <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={onClose} accessibilityRole="button" accessibilityLabel={triLang(lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' })} />
        <View testID="fc-training-mode-sheet" accessibilityViewIsModal style={[styles.sheet, { maxHeight: screenHeight - insets.top - 24, paddingBottom: insets.bottom + 16, backgroundColor: g.opaqueSheet }]}>
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <LinearGradient colors={[g.selected, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
            <View style={[styles.rim, { backgroundColor: g.glassEdge }]} />
          </View>
          <View style={[styles.grabber, { backgroundColor: g.glassEdge }]} />
          <View style={styles.headRow}>
            <View style={styles.headCopy}>
              <Text accessibilityRole="header" style={[styles.heading, { color: g.text }]}>{heading}</Text>
              <Text style={[styles.headingSubtitle, { color: g.secondary }]}>{subtitle}</Text>
            </View>
            <Pressable testID="fc-training-mode-cancel" accessibilityRole="button" accessibilityLabel={triLang(lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' })} hitSlop={6} onPress={onClose} style={({ pressed }) => [styles.close, { backgroundColor: g.opaqueControl, opacity: pressed ? 0.8 : 1 }]}>
              <Ionicons name="close" size={22} color={g.text} />
            </Pressable>
          </View>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} nestedScrollEnabled>
            <View style={styles.list}>
              {rows.map((row, rowIndex) => {
                const disabled = row.mode === 'speaking' && !speakingEnabled;
                return (
                  <Pressable
                    ref={rowIndex === 0 ? firstRowRef : undefined}
                    key={row.mode}
                    testID={`fc-training-mode-${row.mode}`}
                    accessibilityRole="button"
                    accessibilityLabel={`${row.title}. ${row.description}`}
                    accessibilityState={{ disabled }}
                    disabled={disabled}
                    onPress={() => onSelect(row.mode)}
                    style={({ pressed }) => [styles.row, { backgroundColor: g.card, borderColor: g.glassEdge, opacity: disabled ? 0.48 : pressed ? 0.82 : 1 }]}
                  >
                    <View style={[styles.icon, { backgroundColor: g.opaqueControl, borderColor: g.glassEdge }]}>
                      <Ionicons name={row.icon} size={24} color={g.text} />
                    </View>
                    <View style={styles.copy}>
                      <Text style={[styles.rowTitle, { color: g.text }]}>{row.title}</Text>
                      <Text style={[styles.description, { color: g.secondary }]}>{row.description}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={g.secondary} />
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: '#000000AA' },
  sheet: { width: '100%', borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden', paddingHorizontal: 16, paddingTop: 10 },
  rim: { height: 1, marginHorizontal: 1 },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginBottom: 14 },
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 6 },
  headCopy: { flex: 1, minWidth: 0 },
  heading: { fontSize: 26, lineHeight: 31, fontWeight: '700', letterSpacing: -0.4 },
  headingSubtitle: { fontSize: 15, lineHeight: 20, marginTop: 6 },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  scroll: { flexGrow: 0, flexShrink: 1, minHeight: 0 },
  content: { paddingTop: 18, paddingBottom: 4 },
  list: { gap: 10 },
  row: { minHeight: 76, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 14 }, // guard-ok: D43 — тонкая рамка как на скрине владельца
  icon: { width: 48, height: 48, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' }, // guard-ok: D43
  copy: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
  description: { fontSize: 14, lineHeight: 19, marginTop: 3 },
});
