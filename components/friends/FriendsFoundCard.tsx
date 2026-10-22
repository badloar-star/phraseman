import React from 'react';
import { Text, View } from 'react-native';
import { triLang } from '../../constants/i18n';
import { useLang } from '../LangContext';
import { StreakChainIcon } from '../StreakChainIcon';
import { useTheme } from '../ThemeContext';
import { FriendsCard, FriendsCoin, FriendsGlassButton, FriendsRoundButton, useFriendsGlass } from './FriendsGlassKit';
import { isPlusProfile } from '../plus/plus_ring_spec';
import { FlowText } from '../text-integrity';
import { noteSkeletonGeom } from '../../app/skeleton_geom_log';

// зачем (владелец 2026-09-29): карточка найденного профиля в окне «Добавить друга» 1 в 1 по
// макету community.html#COM-04-FOUND / COM-04-ADDING (`.cf-found`): монета/инициал 48, имя, серия,
// крестик «скрыть», ниже главная кнопка на всю ширину. Пока идёт отправка — «Отправляем заявку…».

export type FriendsFoundProfile = {
  uid: string;
  name: string;
  streak: number;
  isPremium: boolean;
  isVip?: boolean;
  isLifetime?: boolean;
  /** Настоящий Plus и срок (Ядро 22.10) — кольцо по isPlusProfile. */
  isPlus?: boolean | null;
  plusUntilMs?: number | null;
  coinRank?: number | null;
};

export default function FriendsFoundCard({ profile, onAdd, onClose, isAdding }: {
  profile: FriendsFoundProfile;
  onAdd: () => void;
  onClose: () => void;
  isAdding: boolean;
}) {
  const { lang } = useLang();
  const { themeMode } = useTheme();
  const { glass, textScale } = useFriendsGlass();
  const add = triLang(lang, { ru: 'Добавить в друзья', uk: 'Додати в друзі', en: 'Add friend', es: 'Agregar amigo', 'pt-BR': 'Adicionar amigo', vi: 'Thêm bạn bè', id: 'Tambah teman', tr: 'Arkadaş ekle', pl: 'Dodaj znajomego' });
  const sending = triLang(lang, { ru: 'Отправляем заявку…', uk: 'Надсилаємо заявку…', en: 'Sending request…', es: 'Enviando solicitud…', 'pt-BR': 'Enviando solicitação…', vi: 'Đang gửi lời mời…', id: 'Mengirim permintaan…', tr: 'İstek gönderiliyor…', pl: 'Wysyłanie zaproszenia…' });
  const hide = triLang(lang, { ru: 'Скрыть найденный профиль', uk: 'Сховати знайдений профіль', en: 'Hide found profile', es: 'Ocultar el perfil encontrado', 'pt-BR': 'Ocultar perfil encontrado', vi: 'Ẩn hồ sơ đã tìm thấy', id: 'Sembunyikan profil yang ditemukan', tr: 'Bulunan profili gizle', pl: 'Ukryj znaleziony profil' });
  const streakText = `${profile.streak} ${triLang(lang, { ru: 'дней подряд', uk: 'днів поспіль', en: 'days in a row', es: 'días seguidos', 'pt-BR': 'dias seguidos', vi: 'ngày liên tiếp', id: 'hari berturut-turut', tr: 'gün üst üste', pl: 'dni z rzędu' })}`;
  const nameSize = 17 * textScale;
  return (
    <FriendsCard
      glass={glass}
      testID="friends-found-user-card"
      onLayoutHeight={(height) => noteSkeletonGeom('friends_search', 'ready', height + 2)} // + marginTop 2: скелетон меряется вместе с отступом
      style={{ flexDirection: 'column', alignItems: 'stretch', gap: 14, padding: 14, marginTop: 2 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <FriendsCoin coinRank={profile.coinRank} name={profile.name} size={48} glass={glass} plus={isPlusProfile(profile)} />
        <View style={{ flex: 1, minWidth: 0 }}>
          {/* зачем (владелец 22.10): золотое имя у друзей убрано — Plus теперь показывает кольцо у аватара (isPlusProfile); имя обычного цвета, без градиента */}
          <FlowText testID="friends-found-name" provenance="user" style={{ color: glass.text, fontSize: nameSize, lineHeight: 22 * textScale, fontWeight: '700' }}>{profile.name}</FlowText>
          {profile.streak > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <StreakChainIcon themeMode={themeMode} streakDays={profile.streak} size={15} />
              <Text style={{ /* guard-ok: короткая подпись по макету 2.0 */ color: glass.mutedText, fontSize: 13 * textScale, lineHeight: 18 * textScale }}>{streakText}</Text>
            </View>
          ) : null}
        </View>
        <FriendsRoundButton glass={glass} icon="close" bare label={hide} onPress={onClose} testID="friends-found-hide" />
      </View>
      <FriendsGlassButton
        glass={glass}
        textScale={textScale}
        label={isAdding ? sending : add}
        onPress={onAdd}
        disabled={isAdding}
        testID="friends-add-found"
      />
    </FriendsCard>
  );
}
