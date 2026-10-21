import React, { memo } from 'react';
import { Text, View } from 'react-native';
import { triLang } from '../../constants/i18n';
import { useLang } from '../LangContext';
import PremiumGoldUserName from '../PremiumGoldUserName';
import { FriendsCard, FriendsCoin, FriendsGlassButton, useFriendsGlass } from './FriendsGlassKit';
import { isPlusProfile } from '../plus/plus_ring_spec';
import { FlowText } from '../text-integrity';

// зачем (владелец 2026-09-29): карточка входящей заявки 1 в 1 по макету community.html#COM-04
// (`request()`): монета/инициал 44, имя, «Хочет добавить вас в друзья», ниже две равные кнопки
// «Принять» (главная) и «Отклонить» (контурная). Логика приёма/отказа остаётся у экрана «Друзья».

export type FriendsRequestProfile = {
  uid: string;
  name: string;
  isPremium: boolean;
  isVip?: boolean;
  isLifetime?: boolean;
  coinRank?: number | null;
};

function FriendsRequestCard({ profile, onAccept, onDecline }: {
  profile: FriendsRequestProfile;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const { lang } = useLang();
  const { glass, textScale } = useFriendsGlass();
  const nameSize = 16 * textScale;
  const accept = triLang(lang, { ru: 'Принять', uk: 'Прийняти', en: 'Accept', es: 'Aceptar', 'pt-BR': 'Aceitar', vi: 'Chấp nhận', id: 'Terima', tr: 'Kabul et', pl: 'Przyjmij' });
  const decline = triLang(lang, { ru: 'Отклонить', uk: 'Відхилити', en: 'Decline', es: 'Rechazar', 'pt-BR': 'Recusar', vi: 'Từ chối', id: 'Tolak', tr: 'Reddet', pl: 'Odrzuć' });
  const wants = triLang(lang, {
    ru: 'Хочет добавить тебя в друзья',
    uk: 'Хоче додати тебе в друзі',
    en: 'Wants to add you as a friend',
    es: 'Quiere agregarte como amigo',
    'pt-BR': 'Quer adicionar você como amigo',
    vi: 'Muốn kết bạn với bạn',
    id: 'Ingin menambahkan kamu sebagai teman',
    tr: 'Seni arkadaş olarak eklemek istiyor',
    pl: 'Chce dodać cię do znajomych',
  });
  return (
    <FriendsCard
      glass={glass}
      testID={`friend-request-row-${profile.uid}`}
      style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12, padding: 14 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <FriendsCoin coinRank={profile.coinRank} name={profile.name} size={44} glass={glass} plus={isPlusProfile(profile)} />
        <View style={{ flex: 1, minWidth: 0 }}>
          {profile.isPremium || profile.isVip
            ? <PremiumGoldUserName text={profile.name} fontSize={nameSize} />
            : <FlowText testID="friends-request-name" provenance="user" style={{ color: glass.text, fontSize: nameSize, lineHeight: 21 * textScale, fontWeight: '700' }}>{profile.name}</FlowText>}
          <Text style={{ /* guard-ok: короткая подпись по макету 2.0 */ color: glass.mutedText, fontSize: 13 * textScale, lineHeight: 18 * textScale, marginTop: 2 }}>{wants}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <FriendsGlassButton
          glass={glass}
          textScale={textScale}
          compact
          label={accept}
          onPress={onAccept}
          testID={`friend-request-accept-${profile.uid}`}
          style={{ flex: 1 }}
        />
        <FriendsGlassButton
          glass={glass}
          textScale={textScale}
          compact
          variant="ghost"
          label={decline}
          onPress={onDecline}
          testID={`friend-request-decline-${profile.uid}`}
          style={{ flex: 1 }}
        />
      </View>
    </FriendsCard>
  );
}

export default memo(FriendsRequestCard);
