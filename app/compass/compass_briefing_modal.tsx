/**
 * Компас — модал брифинга дня. ОБОЛОЧКА, Волна 2.3.
 *
 * Один тёплый экран при входе: голос Компаса (комментарий по типу дня) + список
 * задач дня + кнопка «Начать день». ВСЕ тексты — через triLang из compass_copy
 * (канон Библии). Никакой собственной логики выбора дня — получает готовый
 * CompassDay из мозга.
 *
 * ИЗОЛЯЦИЯ: компонент рендерит null, если Компас выключен или дня нет. Вызывающий
 * экран (home) монтирует его за флагом — при off ничего не появляется.
 */
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../components/ThemeContext';
import { useLang } from '../../components/LangContext';
import { triLang } from '../../constants/i18n';
import { compassOn } from './compass_flags';
import type { CompassDay, CompassTaskKind } from './compass_brain';
import {
  COMPASS_BRIEFING_TITLE,
  COMPASS_START_DAY,
  COMPASS_LATER,
  COMPASS_DAY_COMMENT,
  COMPASS_TASK_TITLE,
} from './compass_copy';

const TASK_ICON: Record<CompassTaskKind, React.ComponentProps<typeof Ionicons>['name']> = {
  lesson_dive: 'book-outline',
  mistake_repair: 'bandage-outline',
  flashcards_review: 'albums-outline',
  pronunciation: 'mic-outline',
  plan_continue: 'navigate-outline',
};

interface CompassBriefingModalProps {
  visible: boolean;
  day: CompassDay | null;
  onStart: () => void;
  onLater: () => void;
}

export default function CompassBriefingModal({ visible, day, onStart, onLater }: CompassBriefingModalProps) {
  const { theme: t } = useTheme();
  const { lang } = useLang();

  if (!compassOn() || !day) return null;

  const title = triLang(lang, COMPASS_BRIEFING_TITLE);
  const dayLabel = day.planDayIndex ? `${title} · ${dayWord(lang)} ${day.planDayIndex}` : title;
  const comment = triLang(lang, COMPASS_DAY_COMMENT[day.type]);

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onLater}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: t.bgCard, borderColor: t.accent + '44' }]}>
          <View style={styles.header}>
            <View style={[styles.badge, { backgroundColor: t.accent + '1A', borderColor: t.accent + '55' }]}>
              <Ionicons name="compass-outline" size={20} color={t.accent} />
            </View>
            <Text style={[styles.title, { color: t.textPrimary }]} numberOfLines={1}>
              {dayLabel}
            </Text>
          </View>

          <Text style={[styles.comment, { color: t.textSecond }]}>{comment}</Text>

          <View style={styles.tasks}>
            {day.tasks.map((task, i) => (
              <View key={`${task.kind}-${i}`} style={[styles.task, { borderColor: t.border }]}>
                <View style={[styles.taskIcon, { backgroundColor: t.accent + '14' }]}>
                  <Ionicons name={TASK_ICON[task.kind]} size={16} color={t.accent} />
                </View>
                <Text style={[styles.taskText, { color: t.textPrimary }]} numberOfLines={1}>
                  {triLang(lang, COMPASS_TASK_TITLE[task.kind])}
                </Text>
                <Text style={[styles.taskMin, { color: t.textMuted }]}>{task.minutes} мин</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity activeOpacity={0.85} onPress={onStart} style={[styles.cta, { backgroundColor: t.accent }]}>
            <Text style={styles.ctaText}>{triLang(lang, COMPASS_START_DAY)}</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} onPress={onLater} style={styles.later}>
            <Text style={[styles.laterText, { color: t.textMuted }]}>{triLang(lang, COMPASS_LATER)}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function dayWord(lang: string): string {
  return triLang(lang as never, {
    ru: 'День',
    uk: 'День',
    es: 'Día',
    'pt-BR': 'Dia',
    vi: 'Ngày',
    id: 'Hari',
    tr: 'Gün',
    pl: 'Dzień',
  });
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 12, paddingBottom: 18, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { width: '100%', maxWidth: 520, alignSelf: 'center', borderRadius: 22, borderWidth: 1, padding: 18, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 17, fontWeight: '800' },
  comment: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  tasks: { gap: 8 },
  task: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
  taskIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  taskText: { flex: 1, fontSize: 13.5, fontWeight: '600' },
  taskMin: { fontSize: 11, fontWeight: '600' },
  cta: { marginTop: 4, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  ctaText: { fontSize: 16, fontWeight: '800', color: '#10131b' },
  later: { paddingVertical: 8, alignItems: 'center' },
  laterText: { fontSize: 13, fontWeight: '600' },
});
