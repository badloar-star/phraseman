/**
 * Компас — блок «Твой Компас» в общий хаб результатов. ОБОЛОЧКА, Волна 4.2.
 *
 * Самодостаточный блок: серия с Компасом, дней закрыто, карта тем. Встраивается в
 * существующий стат-хаб ОДНОЙ строкой `<CompassStatsBlock />` — второй экран не
 * плодим, опираемся на общую статистику + добавляем своё зеркало.
 *
 * ИЗОЛЯЦИЯ: рендерит null, если Компас или крыло «Память» выключены. Сам грузит
 * снимок и строит карту тем (read-only). Тексты — по Библии («твой путь», «ведём сюда»).
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../components/ThemeContext';
import { useLang } from '../../components/LangContext';
import { useStudyTarget } from '../../components/StudyTargetContext';
import { triLang } from '../../constants/i18n';
import { compassTopicMapOn } from './compass_flags';
import { collectCompassSnapshot } from './signal_bus';
import { buildTopicMap, summarizeTopicMap, type TopicCard, type TopicStatus } from './compass_memory';
import {
  COMPASS_STATS_TITLE,
  COMPASS_STATS_DAYS,
  COMPASS_STATS_TOPICS,
  COMPASS_TOPIC_STATUS,
  COMPASS_TOPIC_LABEL,
} from './compass_copy';

const STATUS_COLOR: Record<TopicStatus, string> = {
  confident: '#3FD68C',
  growing: '#FFB454',
  guided: '#FF6E78',
};

/** Сколько тем показываем в блоке (слабые впереди). */
const MAX_ROWS = 5;

interface CompassStatsBlockProps {
  /** Дней закрыто с Компасом (из применяющего слоя; пока опционально). */
  daysClosed?: number;
  nowMs?: number;
}

export default function CompassStatsBlock({ daysClosed, nowMs }: CompassStatsBlockProps) {
  const { theme: t } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const [cards, setCards] = useState<TopicCard[]>([]);
  const now = nowMs ?? Date.now();

  useEffect(() => {
    if (!compassTopicMapOn()) return;
    let cancelled = false;
    void (async () => {
      const snapshot = await collectCompassSnapshot(studyTarget, now);
      if (cancelled || !snapshot) return;
      setCards(buildTopicMap(snapshot));
    })();
    return () => {
      cancelled = true;
    };
  }, [studyTarget, now]);

  if (!compassTopicMapOn()) return null;

  const summary = summarizeTopicMap(cards);
  const rows = cards.slice(0, MAX_ROWS);

  return (
    <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.border }]}>
      <Text style={[styles.title, { color: t.textPrimary }]}>{triLang(lang, COMPASS_STATS_TITLE)}</Text>

      <View style={styles.statsRow}>
        <Stat value={String(daysClosed ?? 0)} label={triLang(lang, COMPASS_STATS_DAYS)} color={t.accent} t={t} />
        <Stat value={String(summary.confident)} label={triLang(lang, COMPASS_STATS_TOPICS)} color="#3FD68C" t={t} />
      </View>

      <View style={styles.map}>
        {rows.map((card) => (
          <View key={card.topic} style={styles.mapRow}>
            <Text style={[styles.topicName, { color: t.textSecond }]} numberOfLines={1}>
              {COMPASS_TOPIC_LABEL[card.topic] ? triLang(lang, COMPASS_TOPIC_LABEL[card.topic]) : card.topic}
            </Text>
            <View style={[styles.track, { backgroundColor: t.bgSurface2 }]}>
              <View style={[styles.fill, { width: `${card.progressPct}%`, backgroundColor: STATUS_COLOR[card.status] }]} />
            </View>
            <Text style={[styles.status, { color: STATUS_COLOR[card.status] }]} numberOfLines={1}>
              {triLang(lang, COMPASS_TOPIC_STATUS[card.status])}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Stat({ value, label, color, t }: { value: string; label: string; color: string; t: { bgSurface2: string; textMuted: string } }) {
  return (
    <View style={[styles.stat, { backgroundColor: t.bgSurface2 }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: t.textMuted }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  title: { fontSize: 16, fontWeight: '800' },
  statsRow: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 12 },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  map: { gap: 8 },
  mapRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  topicName: { width: 130, fontSize: 12.5, fontWeight: '600' },
  track: { flex: 1, height: 14, borderRadius: 7, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 7 },
  status: { width: 84, fontSize: 11, fontWeight: '700', textAlign: 'right' },
});
