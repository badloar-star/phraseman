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
          ru: 'Произноси фразы вслух и практикуй разговорную речь. Можно остановиться и попробовать ещё раз.',
          uk: 'Промовляй фрази вголос і тренуй розмовне мовлення. Можна зупинитися та спробувати ще раз.',
          en: 'Say phrases aloud and practise speaking. You can pause and try again.',
          es: 'Di frases en voz alta y practica la conversación. Puedes parar e intentarlo de nuevo.',
          'pt-BR': 'Diga frases em voz alta e pratique a fala. Você pode parar e tentar novamente.',
          vi: 'Đọc các câu thành tiếng và luyện nói. Bạn có thể dừng lại và thử lần nữa.',
          id: 'Ucapkan frasa dan latih percakapan. Kamu bisa berhenti dan mencoba lagi.',
          tr: 'Cümleleri sesli söyle ve konuşma pratiği yap. Durup tekrar deneyebilirsin.',
          pl: 'Wypowiadaj frazy na głos i ćwicz mówienie. Możesz się zatrzymać i spróbować ponownie.',
        }),
      },
      {
        mode: 'truefalse',
        icon: 'checkmark-done-outline',
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
        icon: 'create-outline',
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
    ru: 'Выбери режим тренировки', uk: 'Обери режим тренування', en: 'Choose a training mode',
    es: 'Elige un modo de práctica', 'pt-BR': 'Escolha um modo de treino', vi: 'Chọn chế độ luyện tập',
    id: 'Pilih mode latihan', tr: 'Çalışma modu seç', pl: 'Wybierz tryb ćwiczeń',
  });
  const subtitle = triLang(lang, {
    ru: 'Один набор — много способов учиться', uk: 'Один набір — багато способів учитися',
    en: 'One pack — many ways to learn', es: 'Un pack, muchas formas de aprender',
    'pt-BR': 'Um pacote, muitas formas de aprender', vi: 'Một bộ thẻ, nhiều cách học',
    id: 'Satu paket, banyak cara belajar', tr: 'Bir paket, öğrenmenin birçok yolu',
    pl: 'Jeden zestaw, wiele sposobów nauki',
  });

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose} onDismiss={finishDismiss}>
      <View style={[styles.modalRoot, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
        <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={onClose} accessibilityRole="button" accessibilityLabel={triLang(lang, { ru: 'Отмена', uk: 'Скасувати', en: 'Cancel', es: 'Cancelar', 'pt-BR': 'Cancelar', vi: 'Hủy', id: 'Batal', tr: 'İptal', pl: 'Anuluj' })} />
        <View testID="fc-training-mode-sheet" accessibilityViewIsModal style={[styles.dialog, { maxHeight: screenHeight - insets.top - insets.bottom - 24, backgroundColor: g.opaqueSheet }]}>
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <LinearGradient
              pointerEvents="none"
              colors={[g.opaqueSheet, g.opaqueSheet, g.opaqueSheet]}
              locations={[0, 0.48, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={[StyleSheet.absoluteFill, styles.dialogWash]}
            />
            <LinearGradient colors={[g.selected, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
            <View style={[styles.rim, { backgroundColor: g.glassEdge }]} />
          </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        <View style={styles.headingBlock}>
          <Text accessibilityRole="header" style={[styles.heading, { color: g.text }]}>{heading}</Text>
          <Text style={[styles.headingSubtitle, { color: g.secondary }]}>{subtitle}</Text>
        </View>
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
              style={({ pressed }) => [styles.row, { backgroundColor: g.card, opacity: disabled ? 0.48 : pressed ? 0.82 : 1 }]}
            >
              <View style={[styles.icon, { backgroundColor: g.opaqueControl }]}>
                <Ionicons name={row.icon} size={24} color={g.lightTint} />
              </View>
              <View style={styles.copy}>
                <View style={styles.titleLine}>
                  <Text style={[styles.rowTitle, { color: g.text }]}>{row.title}</Text>
                </View>
                <Text style={[styles.description, { color: g.secondary }]}>{row.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={g.secondary} />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
          <Pressable testID="fc-training-mode-cancel" accessibilityRole="button" onPress={onClose} style={({ pressed }) => [styles.cancelButton, { backgroundColor: g.card, opacity: pressed ? 0.82 : 1 }]}>
            <Text style={[styles.cancelText, { color: g.text }]}>{triLang(lang, { ru: 'Отмена', uk: 'Скасувати', en: 'Cancel', es: 'Cancelar', 'pt-BR': 'Cancelar', vi: 'Hủy', id: 'Batal', tr: 'İptal', pl: 'Anuluj' })}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  backdrop: { backgroundColor: '#000000AA' },
  dialog: { width: '100%', maxWidth: 420, borderRadius: 24, flexShrink: 1, overflow: 'hidden', paddingHorizontal: 12, paddingTop: 22, paddingBottom: 12 },
  dialogWash: { opacity: 1 },
  rim: { height: 1, marginHorizontal: 1 },
  scroll: { flexGrow: 0, flexShrink: 1, minHeight: 0 },
  content: { paddingHorizontal: 0, paddingBottom: 12 },
  headingBlock: { alignItems: 'center', paddingHorizontal: 4 },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '700', textAlign: 'center' },
  headingSubtitle: { fontSize: 12, lineHeight: 17, marginTop: 4, textAlign: 'center' },
  list: { marginTop: 14, gap: 6 },
  row: { minHeight: 56, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 13, flexDirection: 'row', alignItems: 'center', gap: 10, overflow: 'hidden' },
  icon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowTitle: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
  description: { fontSize: 10, lineHeight: 13, marginTop: 2 },
  cancelButton: { minHeight: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 12, lineHeight: 17, fontWeight: '700' },
});
