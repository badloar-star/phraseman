// Шторка «Пройденные фразы» урока (learn.html D9): read-only просмотр уже пройденных фраз.
// зачем: вынесено из инлайн-Modal app/lesson1.tsx, чтобы окно читало токены Liquid Glass через
// useTheme (в самом LessonContent темы приходят пропсами). Логику не меняем: очки не начисляются,
// текущий ответ не сбивается — это чистое чтение; все обработчики приходят от урока как раньше.
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import TapScale from './TapScale';
import { useTheme } from './ThemeContext';
import { triLang, type Lang } from '../constants/i18n';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { KitSheetModal } from './v2/KitSheetModal';
import BackGlyph from './v2/BackGlyph';

type Props = {
  visible: boolean;
  lang: Lang;
  index: number;
  count: number;
  current: { en?: string; meaning?: string } | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onPlay: (en: string) => void;
};

function LessonReviewSheet({ visible, lang, index, count, current, onClose, onPrev, onNext, onPlay }: Props) {
  const { liquidGlassThemeId, f } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const atStart = index <= 0;
  const atEnd = index >= count - 1;

  return (
    // зачем (Motion п.8, learn.html D9 — .sheet кита): шторка выезжает 440 мс (.2,1,.3,1) с ручкой и
    // перетаскиванием вниз, а не проявляется затуханием системного Modal.
    <KitSheetModal
      visible={visible}
      onRequestClose={onClose}
      closeLabel={triLang(lang, {
          ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar',
          vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij',
        })}
      testID="lesson-review-sheet"
      header={(
          <View style={styles.headerRow}>
            <Text accessibilityRole="header" style={[styles.title, { color: glass.text, fontSize: f.h2 }]}>
              {triLang(lang, {
                ru: 'Пройденные фразы',
                uk: 'Пройдені вислови',
                en: 'Completed phrases',
                es: 'Frases completadas',
                'pt-BR': 'Frases concluídas',
                vi: 'Câu đã hoàn thành',
                id: 'Frasa selesai',
                tr: 'Tamamlanan cümleler',
                pl: 'Ukończone frazy',
              })}
            </Text>
            <TapScale
              onPress={onClose}
              accessibilityLabel={triLang(lang, {
                ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar',
                vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij',
              })}
              style={[styles.round, { backgroundColor: glass.opaqueControl }]}
            >
              <Ionicons name="close" size={20} color={glass.text} />
            </TapScale>
          </View>
      )}
    >
          <View style={styles.cardRow}>
            <TapScale
              onPress={onPrev}
              disabled={atStart}
              accessibilityLabel={triLang(lang, {
                ru: 'Предыдущая фраза', uk: 'Попередній вислів', en: 'Previous phrase', es: 'Frase anterior', 'pt-BR': 'Frase anterior',
                vi: 'Câu trước', id: 'Frasa sebelumnya', tr: 'Önceki cümle', pl: 'Poprzednia fraza',
              })}
              style={[styles.arrow, { opacity: atStart ? 0.25 : 1 }]}
            >
              <BackGlyph size={28} color={glass.secondary} />
            </TapScale>

            <View style={styles.phraseBox}>
              <Text style={[styles.en, { color: glass.text, fontSize: f.numMd }]}>{current?.en ?? ''}</Text>
              <View style={[styles.divider, { backgroundColor: glass.line }]} />
              <Text style={[styles.meaning, { color: glass.secondary, fontSize: f.body }]}>{current?.meaning ?? ''}</Text>
              <TapScale
                onPress={() => { if (current?.en) onPlay(current.en); }}
                accessibilityLabel={triLang(lang, {
                  ru: 'Озвучить фразу', uk: 'Озвучити вислів', en: 'Play the phrase', es: 'Reproducir audio',
                  'pt-BR': 'Reproduzir audio', vi: 'Phát âm thanh', id: 'Putar audio',
                  tr: 'Sesi çal', pl: 'Odtwórz dźwięk',
                })}
                style={[styles.round, styles.play, { backgroundColor: glass.opaqueControl }]}
              >
                <Ionicons name="volume-high" size={20} color={glass.text} />
              </TapScale>
            </View>

            <TapScale
              onPress={onNext}
              disabled={atEnd}
              accessibilityLabel={triLang(lang, {
                ru: 'Следующая фраза', uk: 'Наступний вислів', en: 'Next phrase', es: 'Frase siguiente', 'pt-BR': 'Próxima frase',
                vi: 'Câu tiếp theo', id: 'Frasa berikutnya', tr: 'Sonraki cümle', pl: 'Następna fraza',
              })}
              style={[styles.arrow, { opacity: atEnd ? 0.25 : 1 }]}
            >
              <Ionicons name="chevron-forward" size={28} color={glass.secondary} />
            </TapScale>
          </View>

          <Text style={[styles.counter, { color: glass.secondary, fontSize: f.label }]}>
            {count > 0 ? `${index + 1} / ${count}` : ''}
          </Text>
    </KitSheetModal>
  );
}

export default memo(LessonReviewSheet);

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title: { flex: 1, fontWeight: '700', marginRight: 12 },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  arrow: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  phraseBox: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  en: { fontWeight: '600', textAlign: 'center', marginBottom: 12 },
  divider: { height: StyleSheet.hairlineWidth, width: '70%', marginBottom: 12 },
  meaning: { textAlign: 'center' },
  play: { marginTop: 18 },
  counter: { textAlign: 'center', marginTop: 10, fontWeight: '600' },
});
