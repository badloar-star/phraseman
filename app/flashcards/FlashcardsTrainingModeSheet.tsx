import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  InteractionManager,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import HybridSheetShell from '../../components/modal_fx/HybridSheetShell';
import PlusBadge from '../../components/PlusBadge';
import { useTheme } from '../../components/ThemeContext';
import { triLang, type Lang } from '../../constants/i18n';
import type { Theme } from '../../constants/theme';
import { onAppEvent } from '../events';
import { isSpeakingEnabled } from '../remote_flags';
import type { CardsTrainingMode } from './training_entry';

type Props = {
  visible: boolean;
  lang: Lang;
  t: Theme;
  onClose: () => void;
  onDismissed: () => void;
  onSelect: (mode: CardsTrainingMode) => void;
  lockedModes?: Partial<Record<CardsTrainingMode, boolean>>;
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
  t,
  onClose,
  onDismissed,
  onSelect,
  lockedModes = {},
}: Props) {
  const { f } = useTheme();
  const [speakingEnabled, setSpeakingEnabled] = useState(() => isSpeakingEnabled());
  const firstRowRef = useRef<View>(null);

  useEffect(() => {
    const refresh = () => setSpeakingEnabled(isSpeakingEnabled());
    refresh();
    const sub = onAppEvent('remote_config_changed', refresh);
    return () => sub.remove();
  }, []);

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
    return speakingEnabled
      ? allRows
      : allRows.filter((row) => row.mode !== 'speaking');
  }, [lang, speakingEnabled]);

  return (
    <HybridSheetShell
      visible={visible}
      onClose={onClose}
      onDismissed={onDismissed}
      closeLabel={triLang(lang, {
        ru: 'Закрыть выбор режима', uk: 'Закрити вибір режиму', en: 'Close mode selection',
        es: 'Cerrar selección de modo', 'pt-BR': 'Fechar seleção de modo',
        vi: 'Đóng chọn chế độ', id: 'Tutup pilihan mode', tr: 'Mod seçimini kapat',
        pl: 'Zamknij wybór trybu',
      })}
      testID="fc-training-mode-sheet"
      glowColor={t.accent}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        <View style={styles.list}>
          {rows.map((row, rowIndex) => {
            const locked = lockedModes[row.mode] === true;
            return (
              <Pressable
              ref={rowIndex === 0 ? firstRowRef : undefined}
              key={row.mode}
              testID={`fc-training-mode-${row.mode}`}
              accessibilityRole="button"
              accessibilityLabel={`${row.title}${locked ? '. Plus' : ''}. ${row.description}`}
              onPress={() => onSelect(row.mode)}
              style={({ pressed }) => [styles.row, { backgroundColor: t.bgSurface, opacity: pressed ? 0.82 : 1 }]}
            >
              <View style={[styles.icon, { backgroundColor: `${t.accent}1F` }]}>
                <Ionicons name={row.icon} size={22} color={t.accent} />
              </View>
              <View style={styles.copy}>
                <View style={styles.titleLine}>
                  <Text style={[styles.rowTitle, { color: t.textPrimary, fontSize: f.bodyLg }]}>{row.title}</Text>
                  {locked ? <PlusBadge themeMode="dark" size="xs" showIcon={false} /> : null}
                </View>
                <Text style={[
                  styles.description,
                  { color: t.textSecond, fontSize: f.sub, lineHeight: Math.round(f.sub * 1.4) },
                ]}>{row.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={t.textMuted} />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </HybridSheetShell>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  content: { paddingHorizontal: 0, paddingTop: 2, paddingBottom: 8 },
  list: { marginTop: 2, gap: 10 },
  row: { minHeight: 88, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowTitle: { fontWeight: '900' },
  description: { marginTop: 4, fontWeight: '600' },
});
