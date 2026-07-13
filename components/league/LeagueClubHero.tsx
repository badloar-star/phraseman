import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Reanimated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { Lang } from '../../constants/i18n';
import { triLang } from '../../constants/i18n';
import { formatLeagueChatUnreadBadge } from '../../app/league_chat_unread';
import type { LeagueClubHeroModel, LeagueHubPrimaryAction } from '../../app/league_club_hub_model';
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
  onPrimaryAction: (action: LeagueHubPrimaryAction) => void;
}

function primaryActionLabel(action: LeagueHubPrimaryAction, lang: Lang): string {
  if (action === 'open_chat') return triLang(lang, { ru: 'Открыть чат', uk: 'Відкрити чат', es: 'Abrir chat', 'pt-BR': 'Abrir chat', vi: 'Mở trò chuyện', id: 'Buka chat', tr: 'Sohbeti aç', pl: 'Otwórz czat' });
  if (action === 'claim_chest') return triLang(lang, { ru: 'Забрать награду', uk: 'Забрати нагороду', es: 'Recoger premio', 'pt-BR': 'Coletar prêmio', vi: 'Nhận phần thưởng', id: 'Ambil hadiah', tr: 'Ödülü al', pl: 'Odbierz nagrodę' });
  if (action === 'help_club') return triLang(lang, { ru: 'Помочь клубу', uk: 'Допомогти клубу', es: 'Ayudar al club', 'pt-BR': 'Ajudar o clube', vi: 'Giúp câu lạc bộ', id: 'Bantu klub', tr: 'Kulübe yardım et', pl: 'Pomóż klubowi' });
  return triLang(lang, { ru: 'Смотреть рейтинг', uk: 'Дивитися рейтинг', es: 'Ver clasificación', 'pt-BR': 'Ver ranking', vi: 'Xem xếp hạng', id: 'Lihat peringkat', tr: 'Sıralamayı gör', pl: 'Zobacz ranking' });
}

function LeagueClubHeroComponent({
  model,
  leagueName,
  leagueTag,
  leagueColor,
  leagueIcon,
  lang,
  palette,
  onPrimaryAction,
}: LeagueClubHeroProps) {
  const reduceMotion = useReduceMotion();
  const actionLabel = primaryActionLabel(model.primaryAction, lang);
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
        {model.unreadCount > 0 ? (
          <View style={[styles.unreadPill, { backgroundColor: palette.accent }]}>
            <Ionicons name="chatbubble" size={14} color={palette.accentText} />
            <Text style={[styles.unreadText, { color: palette.accentText }]}>{unreadBadge}</Text>
          </View>
        ) : null}
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

      {(model.boostLabel || model.crownHolderName) ? (
        <View style={styles.liveRow}>
          {model.boostLabel ? <View style={[styles.liveChip, { backgroundColor: palette.elevated }]}><Ionicons name="flash" size={15} color={palette.warning} /><Text style={[styles.liveText, { color: palette.text }]}>{model.boostLabel}</Text></View> : null}
          {model.crownHolderName ? <View style={[styles.liveChip, { backgroundColor: palette.elevated }]}><Ionicons name="trophy" size={15} color={palette.warning} /><Text style={[styles.liveText, { color: palette.text }]}>{model.crownHolderName}</Text></View> : null}
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        accessibilityHint={triLang(lang, { ru: 'Открывает главное действие клуба', uk: 'Відкриває головну дію клубу', es: 'Abre la acción principal del club', 'pt-BR': 'Abre a ação principal do clube', vi: 'Mở hành động chính của câu lạc bộ', id: 'Membuka aksi utama klub', tr: 'Kulübün ana eylemini açar', pl: 'Otwiera główne działanie klubu' })}
        onPress={() => onPrimaryAction(model.primaryAction)}
        style={({ pressed }) => [styles.cta, { backgroundColor: palette.accent, opacity: pressed ? 0.86 : 1 }]}
        testID="league-club-hero-primary-action"
      >
        <Text style={[styles.ctaText, { color: palette.accentText }]}>{actionLabel}</Text>
        <Ionicons name="arrow-forward" size={19} color={palette.accentText} />
      </Pressable>
    </Reanimated.View>
  );
}

export const LeagueClubHero = memo(LeagueClubHeroComponent);

const styles = StyleSheet.create({
  shell: { borderRadius: 26, padding: 18, overflow: 'hidden', gap: 16 },
  colorOrb: { position: 'absolute', width: 180, height: 180, borderRadius: 90, opacity: 0.17, right: -72, top: -82 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconSlot: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headingText: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { fontSize: 25, lineHeight: 30, fontWeight: '900' },
  unreadPill: { minWidth: 44, height: 34, paddingHorizontal: 10, borderRadius: 17, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center' },
  unreadText: { fontWeight: '900', fontSize: 13 },
  metricsRow: { flexDirection: 'row', gap: 8 },
  metric: { flex: 1, minWidth: 0 },
  metricValue: { fontSize: 17, fontWeight: '900' },
  metricLabel: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  liveRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  liveChip: { minHeight: 34, maxWidth: '100%', borderRadius: 17, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveText: { flexShrink: 1, fontSize: 12, fontWeight: '800' },
  cta: { minHeight: 50, paddingHorizontal: 16, borderRadius: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  ctaText: { fontSize: 16, fontWeight: '900' },
});
