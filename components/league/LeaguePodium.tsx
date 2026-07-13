import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Reanimated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { Lang } from '../../constants/i18n';
import { triLang } from '../../constants/i18n';
import type { LeaguePodiumMember } from '../../app/league_club_hub_model';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import type { LeagueHubPalette } from './leagueHubPalette';

interface LeaguePodiumProps {
  podium: readonly LeaguePodiumMember[];
  lang: Lang;
  palette: LeagueHubPalette;
  renderAvatar: (member: LeaguePodiumMember, size: number) => React.ReactNode;
  hasCrown: (uid?: string) => boolean;
  onOpenProfile: (member: LeaguePodiumMember) => void;
}

function LeaguePodiumComponent({ podium, lang, palette, renderAvatar, hasCrown, onOpenProfile }: LeaguePodiumProps) {
  const reduceMotion = useReduceMotion();
  const byPlace = new Map(podium.map((member) => [member.place, member]));
  const orderedPodium = [byPlace.get(2), byPlace.get(1), byPlace.get(3)].filter((member): member is LeaguePodiumMember => Boolean(member));

  if (orderedPodium.length === 0) return null;

  return (
    <Reanimated.View entering={reduceMotion ? undefined : FadeInUp.delay(160).duration(260)} style={[styles.shell, { backgroundColor: palette.surface }]} testID="league-podium">
      <View style={styles.heading}>
        <View>
          <Text style={[styles.title, { color: palette.text }]}>{triLang(lang, { ru: 'Гонка за корону', uk: 'Гонка за корону', es: 'Carrera por la corona', 'pt-BR': 'Corrida pela coroa', vi: 'Cuộc đua vương miện', id: 'Perebutan mahkota', tr: 'Taç yarışı', pl: 'Wyścig po koronę' })}</Text>
          <Text style={[styles.subtitle, { color: palette.muted }]}>{triLang(lang, { ru: 'Лидеры этой недели', uk: 'Лідери цього тижня', es: 'Líderes de esta semana', 'pt-BR': 'Líderes desta semana', vi: 'Dẫn đầu tuần này', id: 'Pemimpin minggu ini', tr: 'Bu haftanın liderleri', pl: 'Liderzy tego tygodnia' })}</Text>
        </View>
        <Ionicons name="trophy" size={24} color={palette.warning} />
      </View>

      <View style={styles.podiumRow}>
        {orderedPodium.map((member) => {
          const first = member.place === 1;
          return (
            <Pressable
              key={`${member.place}:${member.uid ?? member.name}`}
              accessibilityRole="button"
              accessibilityLabel={`${member.place}. ${member.name}, ${member.points} XP${member.isMe ? `, ${triLang(lang, { ru: 'это вы', uk: 'це ви', es: 'eres tú', 'pt-BR': 'é você', vi: 'là bạn', id: 'ini kamu', tr: 'bu sensin', pl: 'to ty' })}` : ''}`}
              onPress={() => onOpenProfile(member)}
              style={({ pressed }) => [styles.person, { opacity: pressed ? 0.82 : 1 }]}
            >
              <View style={[styles.placeBadge, { backgroundColor: first ? palette.accent : palette.elevated }]}>
                <Text style={[styles.placeText, { color: first ? palette.accentText : palette.text }]}>{member.place}</Text>
              </View>
              <View style={[styles.avatar, { borderColor: palette.outline }]}>
                {renderAvatar(member, 58)}
                {hasCrown(member.uid) ? <View style={[styles.crown, { backgroundColor: palette.warning }]}><Ionicons name="trophy" size={12} color="#07110A" /></View> : null}
              </View>
              <Text style={[styles.name, { color: palette.text }]}>{member.name}</Text>
              <Text style={[styles.points, { color: palette.muted }]}>{member.points.toLocaleString()} XP</Text>
              {member.isMe ? <View style={[styles.mePill, { backgroundColor: palette.accent }]}><Text style={[styles.meText, { color: palette.accentText }]}>{triLang(lang, { ru: 'Вы', uk: 'Ви', es: 'Tú', 'pt-BR': 'Você', vi: 'Bạn', id: 'Kamu', tr: 'Sen', pl: 'Ty' })}</Text></View> : null}
            </Pressable>
          );
        })}
      </View>
    </Reanimated.View>
  );
}

export const LeaguePodium = memo(LeaguePodiumComponent);

const styles = StyleSheet.create({
  shell: { borderRadius: 24, padding: 16, gap: 17 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 19, fontWeight: '900' },
  subtitle: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  podiumRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 8, minHeight: 154 },
  person: { flex: 1, minWidth: 0, alignItems: 'center' },
  placeBadge: { width: 27, height: 27, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: -8, zIndex: 2 },
  placeText: { fontSize: 13, fontWeight: '900' },
  avatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  crown: { position: 'absolute', right: -4, top: -4, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  name: { width: '100%', textAlign: 'center', fontSize: 13, fontWeight: '900', marginTop: 8 },
  points: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  mePill: { marginTop: 5, minHeight: 22, borderRadius: 11, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  meText: { fontSize: 10, fontWeight: '900' },
});
