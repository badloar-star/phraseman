import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Lang } from '../../constants/i18n';
import { triLang } from '../../constants/i18n';
import type { GroupMember } from '../../app/league_engine';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import type { LeagueHubPalette } from './leagueHubPalette';

export type LeagueLeaderboardZone = 'promotion' | 'safe' | 'relegation';

interface LeagueLeaderboardRowProps {
  member: GroupMember;
  index: number;
  lang: Lang;
  palette: LeagueHubPalette;
  zone: LeagueLeaderboardZone;
  renderAvatar: (member: GroupMember, size: number) => React.ReactNode;
  renderName: (member: GroupMember) => React.ReactNode;
  hasCrown: boolean;
  xpPromotionBadgeTestID?: string;
  onOpenProfile: (member: GroupMember) => void;
}

function zoneColor(zone: LeagueLeaderboardZone, palette: LeagueHubPalette): string {
  if (zone === 'promotion') return palette.positive;
  if (zone === 'relegation') return palette.warning;
  return palette.muted;
}

function LeagueLeaderboardRowComponent({ member, index, lang, palette, zone, renderAvatar, renderName, hasCrown, xpPromotionBadgeTestID, onOpenProfile }: LeagueLeaderboardRowProps) {
  useReduceMotion();
  const place = index + 1;
  const label = `${place}. ${member.name}, ${member.points} XP${member.isMe ? `, ${triLang(lang, { ru: 'это вы', uk: 'це ви', es: 'eres tú', 'pt-BR': 'é você', vi: 'là bạn', id: 'ini kamu', tr: 'bu sensin', pl: 'to ty' })}` : ''}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={triLang(lang, { ru: 'Открывает профиль участника', uk: 'Відкриває профіль учасника', es: 'Abre el perfil', 'pt-BR': 'Abre o perfil', vi: 'Mở hồ sơ thành viên', id: 'Membuka profil anggota', tr: 'Üye profilini açar', pl: 'Otwiera profil uczestnika' })}
      onPress={() => onOpenProfile(member)}
      style={({ pressed }) => [styles.row, { backgroundColor: member.isMe ? palette.elevated : palette.surface, opacity: pressed ? 0.82 : 1 }]}
      testID={`league-leaderboard-row-${member.uid ?? member.botId ?? index}`}
    >
      <View style={styles.placeColumn}>
        <Text style={[styles.place, { color: zoneColor(zone, palette) }]}>{place}</Text>
        {zone !== 'safe' ? <Ionicons name={zone === 'promotion' ? 'arrow-up' : 'arrow-down'} size={12} color={zoneColor(zone, palette)} /> : null}
      </View>
      <View style={styles.avatar}>{renderAvatar(member, 50)}</View>
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <View style={styles.nameWrap}>{renderName(member)}</View>
          {member.isMe ? <View style={[styles.mePill, { backgroundColor: palette.accent }]}><Text style={[styles.meText, { color: palette.accentText }]}>{triLang(lang, { ru: 'Вы', uk: 'Ви', es: 'Tú', 'pt-BR': 'Você', vi: 'Bạn', id: 'Kamu', tr: 'Sen', pl: 'Ty' })}</Text></View> : null}
          {xpPromotionBadgeTestID ? (
            <View testID={xpPromotionBadgeTestID} style={[styles.promotionPill, { backgroundColor: `${palette.positive}22` }]}>
              <Text style={[styles.promotionText, { color: palette.positive }]}>{triLang(lang, { ru: 'Переход', uk: 'Перехід', es: 'Sube', 'pt-BR': 'Sobe', vi: 'Lên hạng', id: 'Naik', tr: 'Yükselir', pl: 'Awans' })}</Text>
            </View>
          ) : null}
          {hasCrown ? <Ionicons name="trophy" size={15} color={palette.warning} /> : null}
        </View>
        <View style={styles.metaRow}>
          {member.streak ? <Text style={[styles.meta, { color: palette.muted }]}>{member.streak} {triLang(lang, { ru: 'дн.', uk: 'дн.', es: 'días', 'pt-BR': 'dias', vi: 'ngày', id: 'hari', tr: 'gün', pl: 'dni' })}</Text> : null}
          {member.leagueBoostMultiplier && member.leagueBoostMultiplier > 1 ? <Text style={[styles.boost, { color: palette.warning }]}>×{member.leagueBoostMultiplier}</Text> : null}
        </View>
      </View>
      <View style={styles.score}>
        <Text style={[styles.points, { color: palette.text }]}>{member.points.toLocaleString()}</Text>
        <Text style={[styles.xp, { color: palette.muted }]}>XP</Text>
      </View>
    </Pressable>
  );
}

export const LeagueLeaderboardRow = memo(LeagueLeaderboardRowComponent);

const styles = StyleSheet.create({
  row: { minHeight: 78, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  placeColumn: { width: 27, alignItems: 'center', justifyContent: 'center' },
  place: { fontSize: 16, fontWeight: '900' },
  avatar: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nameWrap: { flexShrink: 1, minWidth: 0 },
  mePill: { minHeight: 22, borderRadius: 11, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center' },
  meText: { fontSize: 10, fontWeight: '900' },
  promotionPill: { minHeight: 22, borderRadius: 11, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center' },
  promotionText: { fontSize: 10, fontWeight: '900' },
  metaRow: { minHeight: 18, marginTop: 3, flexDirection: 'row', alignItems: 'center', gap: 8 },
  meta: { fontSize: 11, fontWeight: '700' },
  boost: { fontSize: 11, fontWeight: '900' },
  score: { alignItems: 'flex-end' },
  points: { fontSize: 16, fontWeight: '900' },
  xp: { fontSize: 10, fontWeight: '800', marginTop: 1 },
});
