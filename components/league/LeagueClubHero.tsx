import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Reanimated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { Lang } from '../../constants/i18n';
import { triLang } from '../../constants/i18n';
import { formatLeagueChatUnreadBadge } from '../../app/league_chat_unread';
import type { LeagueClubHeroModel } from '../../app/league_club_hub_model';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import type { LeagueHubPalette } from './leagueHubPalette';

export interface LeagueClubHeroProps {
  model: LeagueClubHeroModel;
  leagueName: string;
  leagueTag: string;
  leagueColor: string;
  leagueIcon: React.ReactNode;
  lang: Lang;
  palette: LeagueHubPalette;
  onOpenChat: () => void;
}

function LeagueClubHeroComponent({
  model,
  leagueName,
  leagueTag,
  leagueColor,
  leagueIcon,
  lang,
  palette,
  onOpenChat,
}: LeagueClubHeroProps) {
  const reduceMotion = useReduceMotion();
  const actionLabel = triLang(lang, { ru: 'Чат Лиги', uk: 'Чат Ліги', es: 'Chat de liga', 'pt-BR': 'Chat da liga', vi: 'Chat giải đấu', id: 'Chat liga', tr: 'Lig sohbeti', pl: 'Czat ligi' });
  const unreadBadge = formatLeagueChatUnreadBadge(model.unreadCount);

  return (
    <Reanimated.View
      entering={reduceMotion ? undefined : FadeInUp.duration(220)}
      style={[styles.shell, { backgroundColor: palette.surface }]}
      testID="league-club-hero"
    >
      <View pointerEvents="none" style={[styles.colorOrb, { backgroundColor: leagueColor }]} />
      <View style={styles.headingRow}>
        <View style={[styles.iconSlot, { backgroundColor: palette.elevated }]}>{leagueIcon}</View>
        <View style={styles.headingText}>
          <Text style={[styles.eyebrow, { color: palette.muted }]}>{leagueTag}</Text>
          <Text style={[styles.title, { color: palette.text }]}>{leagueName}</Text>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: palette.text }]}>#{Math.max(0, model.rank)}</Text>
          <Text style={[styles.metricLabel, { color: palette.muted }]}>{triLang(lang, { ru: `из ${model.participantCount}`, uk: `з ${model.participantCount}`, es: `de ${model.participantCount}`, 'pt-BR': `de ${model.participantCount}`, vi: `trên ${model.participantCount}`, id: `dari ${model.participantCount}`, tr: `${model.participantCount} içinde`, pl: `z ${model.participantCount}` })}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: palette.text }]}>{model.weeklyXp.toLocaleString()} XP</Text>
          <Text style={[styles.metricLabel, { color: palette.muted }]}>{triLang(lang, { ru: 'за неделю', uk: 'за тиждень', es: 'esta semana', 'pt-BR': 'esta semana', vi: 'tuần này', id: 'minggu ini', tr: 'bu hafta', pl: 'w tym tygodniu' })}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: palette.text }]}>{model.bonusPercent}%</Text>
          <Text style={[styles.metricLabel, { color: palette.muted }]}>{triLang(lang, { ru: 'общая цель', uk: 'спільна ціль', es: 'meta común', 'pt-BR': 'meta comum', vi: 'mục tiêu chung', id: 'target bersama', tr: 'ortak hedef', pl: 'wspólny cel' })}</Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        accessibilityHint={triLang(lang, { ru: 'Открывает общий чат участников Лиги', uk: 'Відкриває спільний чат учасників Ліги', es: 'Abre el chat de la liga', 'pt-BR': 'Abre o chat da liga', vi: 'Mở chat giải đấu', id: 'Membuka chat liga', tr: 'Lig sohbetini açar', pl: 'Otwiera czat ligi' })}
        onPress={onOpenChat}
        style={({ pressed }) => [styles.cta, { backgroundColor: palette.accent, opacity: pressed ? 0.86 : 1 }]}
        testID="league-club-chat-action"
      >
        <Ionicons name="chatbubbles" size={20} color={palette.accentText} />
        <Text style={[styles.ctaText, { color: palette.accentText }]}>{actionLabel}</Text>
        {model.unreadCount > 0 ? <View testID="club-chat-unread-badge" style={[styles.ctaBadge, { backgroundColor: palette.accentText }]}><Text style={[styles.ctaBadgeText, { color: palette.accent }]}>{unreadBadge}</Text></View> : null}
      </Pressable>
    </Reanimated.View>
  );
}

export const LeagueClubHero = memo(LeagueClubHeroComponent);

const styles = StyleSheet.create({
  shell: { borderRadius: 22, padding: 16, overflow: 'hidden', gap: 12 },
  colorOrb: { position: 'absolute', width: 180, height: 180, borderRadius: 90, opacity: 0.17, right: -72, top: -82 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconSlot: { width: 66, height: 66, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headingText: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { fontSize: 25, lineHeight: 30, fontWeight: '900' },
  metricsRow: { flexDirection: 'row', gap: 8 },
  metric: { flex: 1, minWidth: 0 },
  metricValue: { fontSize: 17, fontWeight: '900' },
  metricLabel: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  cta: { minHeight: 48, paddingHorizontal: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  ctaText: { fontSize: 16, fontWeight: '900' },
  ctaBadge: { minWidth: 24, height: 24, borderRadius: 12, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  ctaBadgeText: { fontSize: 11, fontWeight: '900' },
});
