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
          ru: 'Повторяй фразы вслух и говори увереннее без пауз.',
          uk: 'Повторюй фрази вголос і говори впевненіше без пауз.',
          en: 'Repeat phrases aloud and speak more confidently without pauses.',
          es: 'Repite frases en voz alta y habla con más confianza y sin pausas.',
          'pt-BR': 'Repita frases em voz alta e fale com mais confiança, sem pausas.',
          vi: 'Lặp lại các cụm từ thành tiếng và nói tự tin hơn, không ngập ngừng.',
          id: 'Ulangi frasa dengan suara dan berbicaralah lebih percaya diri tanpa jeda.',
          tr: 'Cümleleri sesli tekrarla ve duraksamadan daha güvenli konuş.',
          pl: 'Powtarzaj zwroty na głos i mów pewniej bez przerw.',
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
        mode: 'listening',
        icon: 'headset-outline',
        title: triLang(lang, {
          ru: 'Слушать', uk: 'Слухати', en: 'Listening', es: 'Escuchar', 'pt-BR': 'Ouvir',
          vi: 'Nghe', id: 'Mendengarkan', tr: 'Dinleme', pl: 'Słuchanie',
        }),
        description: triLang(lang, {
          ru: 'Слушай фразы подряд и понимай их без подсказки.',
          uk: 'Слухай фрази поспіль і розумій їх без підказки.',
          en: 'Listen to phrases in sequence and understand them without a hint.',
          es: 'Escucha frases seguidas y entiéndelas sin pistas.',
          'pt-BR': 'Ouça frases em sequência e entenda sem dicas.',
          vi: 'Nghe các cụm từ liên tiếp và hiểu mà không cần gợi ý.',
          id: 'Dengarkan frasa berurutan dan pahami tanpa petunjuk.',
          tr: 'Cümleleri art arda dinle ve ipucu olmadan anla.',
          pl: 'Słuchaj zwrotów po kolei i rozumiej je bez podpowiedzi.',
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
          {rows.map((row, rowIndex) => (
            <Pressable
              ref={rowIndex === 0 ? firstRowRef : undefined}
              key={row.mode}
              testID={`fc-training-mode-${row.mode}`}
              accessibilityRole="button"
              accessibilityLabel={`${row.title}. ${row.description}`}
              onPress={() => onSelect(row.mode)}
              style={({ pressed }) => [styles.row, { backgroundColor: t.bgSurface, opacity: pressed ? 0.82 : 1 }]}
            >
              <View style={[styles.icon, { backgroundColor: `${t.accent}1F` }]}>
                <Ionicons name={row.icon} size={22} color={t.accent} />
              </View>
              <View style={styles.copy}>
                <Text style={[styles.rowTitle, { color: t.textPrimary, fontSize: f.bodyLg }]}>{row.title}</Text>
                <Text style={[
                  styles.description,
                  { color: t.textSecond, fontSize: f.sub, lineHeight: Math.round(f.sub * 1.4) },
                ]}>{row.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={t.textMuted} />
            </Pressable>
          ))}
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
  rowTitle: { fontWeight: '900' },
  description: { marginTop: 4, fontWeight: '600' },
});
