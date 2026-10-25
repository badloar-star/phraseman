// PlacementResultView.tsx — итог теста «Открыто до урока N» (макет chapter-exam-season.html, раздел 6, «Итог»).
// зачем (координатор 24.10, «1 в 1»): плитка школы 55 по центру, «Открыто до урока N» 34/40, абзац по центру, список уроков с пометками «открыт» (зелёная галочка)
// и «начнём здесь»; внизу «Начать урок N». Макета нет для двух краёв (см. docs/work/tasks/placement-test-ui-2026-10-24.md, вопросы 1–2): они помечены и ждут слова владельца.
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { semanticInk } from '../../../constants/liquidGlassSemanticInk';
import { useLv2Glass } from '../LearningV2Glass';
import { lv2TaskAnswerLineShadow } from '../learning_v2_task_theme_tokens';
import { PlacementFooter, PlacementLessonTile, PlacementTopBar } from './PlacementChrome';
import { placementCopy } from './placement_copy';
import type { PlacementResultView as PlacementResultModel } from './placement_view_model';

type Props = Readonly<{
  lang: string;
  topInset: number;
  bottomInset: number;
  result: PlacementResultModel;
  /** Название темы урока по номеру (источник — Learning V2). */
  lessonTitle: (lessonOrdinal: number) => string;
  onStartLesson: () => void;
  onClose: () => void;
  closeLabel: string;
}>;

export function PlacementResultView({ lang, topInset, bottomInset, result, lessonTitle, onStartLesson, onClose, closeLabel }: Props) {
  const g = useLv2Glass();
  const start = result.startLessonOrdinal;
  // зачем (4 · ТЕМЫ 24.10, храповик raw_good_bad_text_ratchet): «открыт» зелёным — чернила темы goodText (в светлых темах сырой g.good даёт 3,75–3,90 < 4,5)
  // зачем: край «засчитаны все уроки» макета не имеет — пока тот же вид, номер урока для кнопки берётся за последним открытым
  const lastOpened = result.openedLessonOrdinals[result.openedLessonOrdinals.length - 1] ?? 0;
  const ctaLesson = start ?? lastOpened + 1;
  const bodyText = start === null
    ? ''
    : result.openedLessonOrdinals.length === 0
      ? ''
      : placementCopy(lang, result.openedLessonOrdinals.length === 1 ? 'resultBodyOne' : 'resultBody', { range: result.openedRange, n: start, title: lessonTitle(start) });
  return (
    <View testID="placement-result" style={styles.root}>
      <PlacementTopBar closeLabel={closeLabel} onClose={onClose} topInset={topInset} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={[styles.tile, { backgroundColor: `${g.text}17` }]}>
          <Ionicons name="school-outline" size={26} color={g.text} />
        </View>
        <Text accessibilityRole="header" testID="placement-result-title" style={[styles.big, { color: g.text }]}>{placementCopy(lang, 'resultTitle', { n: ctaLesson })}</Text>
        {bodyText ? <Text testID="placement-result-body" style={[styles.p, { color: g.secondary }]}>{bodyText}</Text> : null}
        <View style={styles.rows}>
          {result.rows.map((row) => (
            <View key={`lesson-${row.lessonOrdinal}`} testID={`placement-row-${row.kind}`} style={[styles.row, { boxShadow: lv2TaskAnswerLineShadow(g) as never }]}>
              <PlacementLessonTile lessonOrdinal={row.lessonOrdinal} />
              <Text style={[styles.rowTitle, { color: g.text }]}>{lessonTitle(row.lessonOrdinal)}</Text>
              {row.kind === 'opened' ? (
                <View style={styles.status}>
                  <Ionicons name="checkmark" size={16} color={semanticInk(g).goodText} />
                  <Text style={[styles.statusText, { color: semanticInk(g).goodText }]}>{placementCopy(lang, 'opened')}</Text>
                </View>
              ) : (
                <Text style={[styles.statusText, { color: g.text }]}>{placementCopy(lang, 'here')}</Text>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
      <PlacementFooter primaryLabel={placementCopy(lang, 'startLesson', { n: ctaLesson })} onPrimary={onStartLesson} bottomInset={bottomInset} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // `.res { padding-top: 26 }`, поля экрана 20
  body: { paddingTop: 26, paddingHorizontal: 20, paddingBottom: 24 },
  tile: { width: 55, height: 55, borderRadius: 14, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  // `.res .big` в итоге теста: 34/40 800, −1, по центру, отступ 16
  big: { marginTop: 16, textAlign: 'center', fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -1 },
  // `.res .p`: 16/22, по центру, отступ 10
  p: { marginTop: 10, textAlign: 'center', fontSize: 16, lineHeight: 22 },
  rows: { marginTop: 18 },
  // `.lrow3`: padding 10 0, gap 12, нижняя линия `--edge`
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rowTitle: { flex: 1, fontSize: 16, lineHeight: 21, fontWeight: '600' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusText: { fontSize: 13, lineHeight: 18, fontWeight: '700' }, // зачем (шкала владельца D145: обычный текст 16/13, прогон Ревизора 25.10): было 14
});
