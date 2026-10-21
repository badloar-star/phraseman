import React, { memo } from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';
import { FriendsCard, FriendsCoin, useFriendsGlass } from '../friends/FriendsGlassKit';
import { FlowText } from '../text-integrity';
import { type Lang, triLang } from '../../constants/i18n';
import type { FriendSocialEvent } from '../../app/friend_social_events';
import FriendEventMarker from './FriendEventMarker';
import { noAndroidOutline } from '../../constants/androidGlow';

export interface FriendListRowProps {
  friendUid: string;
  friendName: string;
  /** Публичный ранг монеты друга; нет данных — нейтральный кружок с инициалом (зачем: макет COM-04, ранги не выдумываем). */
  coinRank?: number | null;
  /** У друга есть Plus (кольцо у монеты, владелец 21.10). Примитив — строка под memo не перерисовывается зря. */
  isPlus?: boolean;
  daysTogether: number | null;
  // зачем (аудит скорости 2026-08-22): колбэки принимают friendUid, а не готовое
  // замыкание — так родитель (FriendsTabScreen) передаёт СТАБИЛЬНЫЕ ссылки
  // (useCallback с пустыми deps + ref-lookup) вместо новой стрелочной функции
  // на каждый item при каждом рендере, что раньше ломало React.memo ниже.
  onOpenProfile: (friendUid: string) => void;
  onOpenDetails: (friendUid: string) => void;
  event?: FriendSocialEvent | null;
  onOpenEvent?: (friendUid: string, event: FriendSocialEvent) => void;
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
      ru: 'В друзьях', uk: 'У друзях', en: 'Friends', es: 'En tus amistades', 'pt-BR': 'Na sua lista de amizades',
      vi: 'Trong danh sách bạn bè', id: 'Dalam daftar teman', tr: 'Arkadaş listende', pl: 'Wśród znajomych',
    });
  }

  return triLang(lang, {
    ru: `${daysTogether} ${slavicDayWord(daysTogether, 'день', 'дня', 'дней')} вместе`,
    uk: `${daysTogether} ${slavicDayWord(daysTogether, 'день', 'дні', 'днів')} разом`,
    en: `${daysTogether} ${daysTogether === 1 ? 'day' : 'days'} together`,
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
  coinRank = null,
  isPlus = false,
  daysTogether,
  onOpenProfile,
  onOpenDetails,
  event = null,
  onOpenEvent,
}: FriendListRowProps) {
  const { theme: t } = useTheme();
  const { glass, textScale } = useFriendsGlass();
  const { lang } = useLang();
  const relationship = formatFriendRelationship(lang, daysTogether);
  // Локальные обёртки-с-аргументом: сам компонент под memo, поэтому создание
  // этих замыканий на его собственный рендер (а не на рендер списка) безвредно —
  // они не участвуют в сравнении пропсов и не размножаются на N строк.
  const handleOpenProfile = () => onOpenProfile(friendUid);
  const handleOpenDetails = () => onOpenDetails(friendUid);
  const handleOpenEvent = onOpenEvent && event ? () => onOpenEvent(friendUid, event) : undefined;
  const profileLabel = triLang(lang, {
    ru: `Открыть профиль ${friendName}`, uk: `Відкрити профіль ${friendName}`, en: `Open ${friendName}'s profile`, es: `Abrir el perfil de ${friendName}`, 'pt-BR': `Abrir o perfil de ${friendName}`,
    vi: `Mở hồ sơ của ${friendName}`, id: `Buka profil ${friendName}`, tr: `${friendName} profilini aç`, pl: `Otwórz profil ${friendName}`,
  });
  const detailsLabel = triLang(lang, {
    ru: `Открыть детали дружбы с ${friendName}`, uk: `Відкрити деталі дружби з ${friendName}`, en: `Open friendship details with ${friendName}`, es: `Abrir detalles de amistad con ${friendName}`, 'pt-BR': `Abrir detalhes da amizade com ${friendName}`,
    vi: `Mở chi tiết tình bạn với ${friendName}`, id: `Buka detail pertemanan dengan ${friendName}`, tr: `${friendName} ile arkadaşlık ayrıntılarını aç`, pl: `Otwórz szczegóły znajomości z ${friendName}`,
  });

  // зачем (владелец 2026-09-29): строка друга 1 в 1 по макету community.html#COM-04 (`person()`):
  // плашка 64 dp, монета/инициал 44, имя 16/21, подпись 13/18, шеврон. Две зоны нажатия сохранены
  // (профиль / детали), обе не меньше 44 dp.
  return (
    <FriendsCard glass={glass} style={styles.card}>
      <Pressable
        testID={`friend-row-avatar-${friendUid}`}
        onPress={handleOpenProfile}
        accessibilityRole="button"
        accessibilityLabel={profileLabel}
        style={styles.avatarTarget}
      >
        <View style={event ? [styles.eventRing, { shadowColor: event.kind === 'duel_invite' ? t.wrong : glass.cta }] : undefined}>
          <FriendsCoin coinRank={coinRank} name={friendName} size={44} glass={glass} plus={isPlus} />
        </View>
      </Pressable>
      <Pressable
        testID={`friend-row-body-${friendUid}`}
        onPress={handleOpenDetails}
        accessibilityRole="button"
        accessibilityLabel={detailsLabel}
        style={styles.bodyTarget}
      >
        <View style={styles.identity}>
          <FlowText testID={`friend-row-name-${friendUid}`} provenance="user" style={[styles.name, { color: glass.text, fontSize: 16 * textScale, lineHeight: 21 * textScale }]}>
            {friendName}
          </FlowText>
          <FlowText testID={`friend-row-relationship-${friendUid}`} provenance="authored" style={[styles.relationship, { color: glass.mutedText, fontSize: 13 * textScale, lineHeight: 18 * textScale }]}>
            {relationship}
          </FlowText>
        </View>
        {event && handleOpenEvent
          ? <FriendEventMarker event={event} onPress={handleOpenEvent} />
          : <Ionicons name="chevron-forward" size={18} color={glass.secondary} accessible={false} importantForAccessibility="no" />}
      </Pressable>
    </FriendsCard>
  );
}

export default memo(FriendListRow);

const styles = {
  card: {
    marginBottom: 10,
  },
  avatarTarget: {
    width: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventRing: {
    borderRadius: 30,
    shadowOpacity: 0.72,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    ...noAndroidOutline, // зачем: без непрозрачного фона Android рисует квадрат вокруг скругления (сторож android_no_square_outline)
  },
  bodyTarget: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
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
