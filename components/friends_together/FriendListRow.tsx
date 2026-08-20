import React, { memo } from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import AvatarView from '../AvatarView';
import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';
import { FlowText } from '../text-integrity';
import { type Lang, triLang } from '../../constants/i18n';

export interface FriendListRowProps {
  friendUid: string;
  friendName: string;
  avatar: string;
  totalXp: number;
  auraId?: string;
  daysTogether: number | null;
  onOpenProfile: () => void;
  onOpenDetails: () => void;
}

function slavicDayWord(days: number, singular: string, few: string, many: string): string {
  const lastTwo = days % 100;
  const last = days % 10;
  if (last === 1 && lastTwo !== 11) return singular;
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return few;
  return many;
}

export function formatFriendRelationship(lang: Lang, daysTogether: number | null): string {
  if (daysTogether === null) {
    return triLang(lang, {
      ru: 'В друзьях', uk: 'У друзях', es: 'En tus amistades', 'pt-BR': 'Na sua lista de amizades',
      vi: 'Trong danh sách bạn bè', id: 'Dalam daftar teman', tr: 'Arkadaş listende', pl: 'Wśród znajomych',
    });
  }

  return triLang(lang, {
    ru: `${daysTogether} ${slavicDayWord(daysTogether, 'день', 'дня', 'дней')} вместе`,
    uk: `${daysTogether} ${slavicDayWord(daysTogether, 'день', 'дні', 'днів')} разом`,
    es: `${daysTogether} ${daysTogether === 1 ? 'día' : 'días'} de amistad`,
    'pt-BR': `${daysTogether} ${daysTogether === 1 ? 'dia' : 'dias'} de amizade`,
    vi: `${daysTogether} ngày cùng nhau`,
    id: `${daysTogether} hari bersama`,
    tr: `${daysTogether} gün birlikte`,
    pl: `${daysTogether} ${slavicDayWord(daysTogether, 'dzień', 'dni', 'dni')} razem`,
  });
}

function FriendListRow({
  friendUid,
  friendName,
  avatar,
  totalXp,
  auraId,
  daysTogether,
  onOpenProfile,
  onOpenDetails,
}: FriendListRowProps) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const relationship = formatFriendRelationship(lang, daysTogether);
  const profileLabel = triLang(lang, {
    ru: `Открыть профиль ${friendName}`, uk: `Відкрити профіль ${friendName}`, es: `Abrir el perfil de ${friendName}`, 'pt-BR': `Abrir o perfil de ${friendName}`,
    vi: `Mở hồ sơ của ${friendName}`, id: `Buka profil ${friendName}`, tr: `${friendName} profilini aç`, pl: `Otwórz profil ${friendName}`,
  });
  const detailsLabel = triLang(lang, {
    ru: `Открыть детали дружбы с ${friendName}`, uk: `Відкрити деталі дружби з ${friendName}`, es: `Abrir detalles de amistad con ${friendName}`, 'pt-BR': `Abrir detalhes da amizade com ${friendName}`,
    vi: `Mở chi tiết tình bạn với ${friendName}`, id: `Buka detail pertemanan dengan ${friendName}`, tr: `${friendName} ile arkadaşlık ayrıntılarını aç`, pl: `Otwórz szczegóły znajomości z ${friendName}`,
  });

  return (
    <View style={[styles.card, { backgroundColor: t.bgSurface }]}>
      <Pressable
        testID={`friend-row-avatar-${friendUid}`}
        onPress={onOpenProfile}
        accessibilityRole="button"
        accessibilityLabel={profileLabel}
        style={styles.avatarTarget}
      >
        <AvatarView avatar={avatar} totalXP={totalXp} auraId={auraId} size={56} animateAura={false} />
      </Pressable>
      <Pressable
        testID={`friend-row-body-${friendUid}`}
        onPress={onOpenDetails}
        accessibilityRole="button"
        accessibilityLabel={detailsLabel}
        style={styles.bodyTarget}
      >
        <View style={styles.identity}>
          <FlowText testID={`friend-row-name-${friendUid}`} provenance="user" style={[styles.name, { color: t.textPrimary, fontSize: Math.max(16, f.body) }]}>
            {friendName}
          </FlowText>
          <FlowText testID={`friend-row-relationship-${friendUid}`} provenance="authored" style={[styles.relationship, { color: t.textSecond, fontSize: Math.max(14, f.sub) }]}>
            {relationship}
          </FlowText>
        </View>
        <Ionicons name="chevron-forward" size={20} color={t.textMuted} accessible={false} importantForAccessibility="no" />
      </Pressable>
    </View>
  );
}

export default memo(FriendListRow);

const styles = {
  card: {
    minHeight: 84,
    borderRadius: 18,
    marginBottom: 10,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarTarget: {
    width: 68,
    minHeight: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyTarget: {
    flex: 1,
    minWidth: 0,
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  identity: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 3,
  },
  name: {
    fontWeight: '700',
  },
  relationship: {
    fontWeight: '400',
  },
} as const;
