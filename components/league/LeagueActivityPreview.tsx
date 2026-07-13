import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Reanimated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import type { Lang } from '../../constants/i18n';
import { triLang } from '../../constants/i18n';
import type { LeagueActivityEvent, LeagueActivityKind } from '../../app/league_activity_model';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import type { LeagueHubPalette } from './leagueHubPalette';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface LeagueActivityPreviewProps {
  events: readonly LeagueActivityEvent[];
  lang: Lang;
  palette: LeagueHubPalette;
  now: number;
  onAction: (event: LeagueActivityEvent) => void;
  onEmptyAction: () => void;
}

function eventIcon(kind: LeagueActivityKind): IoniconName {
  if (kind === 'compass') return 'compass';
  if (kind === 'chat') return 'chatbubble-ellipses';
  if (kind === 'boost') return 'flash';
  if (kind === 'crown') return 'trophy';
  if (kind === 'rank') return 'trending-up';
  if (kind === 'chest') return 'gift';
  return 'people';
}

function relativeTime(createdAt: number, now: number, lang: Lang): string {
  const minutes = Math.max(0, Math.floor((now - createdAt) / 60000));
  if (minutes < 1) return triLang(lang, { ru: 'сейчас', uk: 'зараз', es: 'ahora', 'pt-BR': 'agora', vi: 'bây giờ', id: 'sekarang', tr: 'şimdi', pl: 'teraz' });
  if (minutes < 60) return `${minutes} ${triLang(lang, { ru: 'мин', uk: 'хв', es: 'min', 'pt-BR': 'min', vi: 'phút', id: 'mnt', tr: 'dk', pl: 'min' })}`;
  const hours = Math.floor(minutes / 60);
  return `${hours} ${triLang(lang, { ru: 'ч', uk: 'год', es: 'h', 'pt-BR': 'h', vi: 'giờ', id: 'j', tr: 'sa', pl: 'g.' })}`;
}

function eventPrefix(event: LeagueActivityEvent, lang: Lang): string {
  if (event.kind === 'boost') return triLang(lang, { ru: 'Включил буст для всех', uk: 'Увімкнув буст для всіх', es: 'Activó un boost para todos', 'pt-BR': 'Ativou um boost para todos', vi: 'Đã bật tăng tốc cho mọi người', id: 'Mengaktifkan boost untuk semua', tr: 'Herkes için boost açtı', pl: 'Włączył boost dla wszystkich' });
  if (event.kind === 'crown') return triLang(lang, { ru: 'Сейчас держит корону', uk: 'Зараз тримає корону', es: 'Tiene la corona', 'pt-BR': 'Está com a coroa', vi: 'Đang giữ vương miện', id: 'Sedang memegang mahkota', tr: 'Tacın sahibi', pl: 'Ma teraz koronę' });
  if (event.kind === 'rank') return Number(event.text) > 0
    ? triLang(lang, { ru: 'Вы поднялись в рейтинге', uk: 'Ви піднялися в рейтингу', es: 'Subiste en la clasificación', 'pt-BR': 'Você subiu no ranking', vi: 'Bạn đã tăng hạng', id: 'Peringkatmu naik', tr: 'Sıralamada yükseldin', pl: 'Awansujesz w rankingu' })
    : triLang(lang, { ru: 'В рейтинге новое движение', uk: 'У рейтингу новий рух', es: 'Hay movimiento en la clasificación', 'pt-BR': 'O ranking mudou', vi: 'Bảng xếp hạng vừa thay đổi', id: 'Peringkat baru berubah', tr: 'Sıralama değişti', pl: 'Ranking się zmienił' });
  if (event.kind === 'chest') return triLang(lang, { ru: 'Сундук лиги готов', uk: 'Скриня ліги готова', es: 'El cofre de liga está listo', 'pt-BR': 'O baú da liga está pronto', vi: 'Rương giải đấu đã sẵn sàng', id: 'Peti liga sudah siap', tr: 'Lig sandığı hazır', pl: 'Skrzynia ligi jest gotowa' });
  if (event.kind === 'bonus') return triLang(lang, { ru: 'Клуб идёт к общей цели', uk: 'Клуб іде до спільної цілі', es: 'El club avanza hacia la meta', 'pt-BR': 'O clube avança para a meta', vi: 'Câu lạc bộ đang tiến tới mục tiêu', id: 'Klub menuju target bersama', tr: 'Kulüp ortak hedefe ilerliyor', pl: 'Klub zbliża się do celu' });
  return event.text;
}

function LeagueActivityPreviewComponent({ events, lang, palette, now, onAction, onEmptyAction }: LeagueActivityPreviewProps) {
  const reduceMotion = useReduceMotion();
  const visibleEvents = events.slice(0, 5);

  return (
    <Reanimated.View entering={reduceMotion ? undefined : FadeInUp.delay(80).duration(240)} style={[styles.shell, { backgroundColor: palette.surface }]} testID="league-activity-preview">
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: palette.elevated }]}><Ionicons name="pulse" size={18} color={palette.positive} /></View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: palette.text }]}>{triLang(lang, { ru: 'Что происходит', uk: 'Що відбувається', es: 'Qué está pasando', 'pt-BR': 'O que está acontecendo', vi: 'Đang diễn ra', id: 'Yang sedang terjadi', tr: 'Neler oluyor', pl: 'Co się dzieje' })}</Text>
          <Text style={[styles.subtitle, { color: palette.muted }]}>{triLang(lang, { ru: 'Жизнь клуба прямо сейчас', uk: 'Життя клубу просто зараз', es: 'La vida del club ahora', 'pt-BR': 'A vida do clube agora', vi: 'Hoạt động của câu lạc bộ', id: 'Aktivitas klub saat ini', tr: 'Kulübün canlı akışı', pl: 'Życie klubu teraz' })}</Text>
        </View>
      </View>

      {visibleEvents.length === 0 ? (
        <Pressable accessibilityRole="button" accessibilityLabel={triLang(lang, { ru: 'Начать разговор в клубе', uk: 'Почати розмову в клубі', es: 'Iniciar una conversación', 'pt-BR': 'Iniciar uma conversa', vi: 'Bắt đầu trò chuyện', id: 'Mulai percakapan', tr: 'Sohbet başlat', pl: 'Rozpocznij rozmowę' })} onPress={onEmptyAction} style={({ pressed }) => [styles.empty, { backgroundColor: palette.elevated, opacity: pressed ? 0.82 : 1 }]}>
          <Ionicons name="chatbubbles" size={22} color={palette.accent} />
          <Text style={[styles.emptyText, { color: palette.text }]}>{triLang(lang, { ru: 'Будьте первым — напишите клубу', uk: 'Будьте першим — напишіть клубу', es: 'Sé el primero en escribir', 'pt-BR': 'Seja o primeiro a escrever', vi: 'Hãy là người đầu tiên lên tiếng', id: 'Jadilah yang pertama menulis', tr: 'İlk mesajı sen yaz', pl: 'Napisz jako pierwszy' })}</Text>
        </Pressable>
      ) : visibleEvents.map((event) => (
        <Pressable
          key={event.id}
          accessibilityRole="button"
          accessibilityLabel={`${event.authorName ? `${event.authorName}. ` : ''}${eventPrefix(event, lang)}`}
          onPress={() => onAction(event)}
          style={({ pressed }) => [styles.event, { backgroundColor: palette.elevated, opacity: pressed ? 0.82 : 1 }]}
        >
          <View style={[styles.eventIcon, { backgroundColor: palette.surface }]}><Ionicons name={eventIcon(event.kind)} size={18} color={event.kind === 'chest' ? palette.warning : palette.accent} /></View>
          <View style={styles.eventBody}>
            <View style={styles.eventMeta}>
              <Text style={[styles.author, { color: palette.text }]}>{event.authorName || eventPrefix(event, lang)}</Text>
              <Text style={[styles.time, { color: palette.muted }]}>{relativeTime(event.createdAt, now, lang)}</Text>
            </View>
            <Text style={[styles.eventText, { color: palette.muted }]}>{eventPrefix(event, lang)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={palette.muted} />
        </Pressable>
      ))}
    </Reanimated.View>
  );
}

export const LeagueActivityPreview = memo(LeagueActivityPreviewComponent);

const styles = StyleSheet.create({
  shell: { borderRadius: 24, padding: 16, gap: 9 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 3 },
  headerIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, minWidth: 0 },
  title: { fontSize: 19, fontWeight: '900' },
  subtitle: { fontSize: 12, fontWeight: '600', marginTop: 1 },
  event: { minHeight: 64, borderRadius: 17, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  eventIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  eventBody: { flex: 1, minWidth: 0 },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  author: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: '900' },
  time: { fontSize: 11, fontWeight: '700' },
  eventText: { fontSize: 12, lineHeight: 16, fontWeight: '600', marginTop: 2 },
  empty: { minHeight: 70, borderRadius: 17, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  emptyText: { flex: 1, fontSize: 14, lineHeight: 19, fontWeight: '800' },
});
