// ═══════════════════════════════════════════════════════════════════════════
// top_helpers.tsx — экран «Топ хелперов» (Top Helpers).
//
// Топ-10 пользователей, чьи баг-репорты/жалобы подтвердились. Рейтинг = число
// подтверждённых репортов (progress.helpful_error_reports_confirmed_v1),
// денормализованное в публичную проекцию top_helpers/{uid} серверной функцией
// adminReplyToReport. Данные грузятся при заходе на экран с кулдауном 3 ч
// (см. firestore_top_helpers.ts) — дёшево по Firebase, без onSnapshot.
//
// UI переиспользует компоненты Зала славы/лиги: AvatarView, PremiumAvatarHalo,
// имена с коронами/премиумом, ProfileCardBadge и карточку PlayerProfileModal —
// чтобы борд выглядел единообразно с остальным приложением.
//
// Экран самодостаточен: описание борда и тумблер вкл/выкл читаются из
// remote_config/app (пульт админки). Если борд выключен админом — показываем
// заглушку «раздел временно недоступен» (вход в настройках тоже скрыт флагом).
// ═══════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { triLang } from '../constants/i18n';
import AvatarView from '../components/AvatarView';
import PremiumAvatarHalo from '../components/PremiumAvatarHalo';
import PremiumGoldUserName from '../components/PremiumGoldUserName';
import VipGreenUserName from '../components/VipGreenUserName';
import LeagueCrownName from '../components/LeagueCrownName';
import ProfileCardBadge from '../components/ProfileCardBadge';
import PlayerProfileModal, { PlayerInfo } from '../components/PlayerProfileModal';
import { getBestAvatarForLevel } from '../constants/avatars';
import { PREMIUM_AVATAR_AURA_ID, getEffectiveAvatarAuraId } from '../constants/avatar_auras';
import { hapticTap } from '../hooks/use-haptics';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { safeRouterBack } from './navigation_back';
import { logFeatureOpened } from './firebase';
import { loadTopHelpers, type TopHelperRow } from './firestore_top_helpers';

const HELPERS_AVATAR_SIZE = 52;
const HELPERS_ACCENT = '#F59E0B';

function boardTitle(lang: string): string {
  // Название единое для всех языков (как «Help Board») — бренд раздела.
  return triLang(lang as never, {
    ru: 'Топ хелперов', uk: 'Топ хелперів', es: 'Top Helpers', 'pt-BR': 'Top Helpers',
    vi: 'Top Helpers', id: 'Top Helpers', tr: 'Top Helpers', pl: 'Top Helpers',
  });
}

function helpedLabel(count: number, lang: string): string {
  return triLang(lang as never, {
    ru: `Помог с ${count} ${pluralRu(count, 'багом', 'багами', 'багами')}`,
    uk: `Допоміг з ${count} ${count === 1 ? 'багом' : 'багами'}`,
    es: `Ayudó con ${count} ${count === 1 ? 'error' : 'errores'}`,
    'pt-BR': `Ajudou com ${count} ${count === 1 ? 'bug' : 'bugs'}`,
    vi: `Đã giúp ${count} lỗi`,
    id: `Membantu ${count} bug`,
    tr: `${count} hata ile yardım etti`,
    pl: `Pomógł z ${count} ${count === 1 ? 'błędem' : 'błędami'}`,
  });
}

function pluralRu(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

export default function TopHelpersScreen() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);

  const [rows, setRows] = useState<TopHelperRow[]>([]);
  const [myUid, setMyUid] = useState('');
  const [description, setDescription] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [profilePlayer, setProfilePlayer] = useState<PlayerInfo | null>(null);

  const load = useCallback(async () => {
    try {
      const snap = await loadTopHelpers(Date.now());
      setRows(snap.rows);
      setMyUid(snap.myUid);
      setDescription(snap.description);
      setEnabled(snap.enabled);
    } catch {
      // сеть/парсинг упали — оставляем что было (в т.ч. кэш из snap)
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    logFeatureOpened('top_helpers');
    void load();
  }, [load]);

  const openCard = useCallback(
    (item: TopHelperRow) => {
      hapticTap();
      const isMe = !!myUid && item.uid === myUid;
      const lvl = item.profileCardLevel ?? 1;
      const avatar = String(item.avatar?.trim() || getBestAvatarForLevel(lvl));
      setProfilePlayer({
        name: item.displayName,
        points: 0,
        isMe,
        avatar,
        frame: item.frame,
        aura: item.aura,
        streak: null,
        uid: item.uid,
        friendUid: '',
        isPremium: item.isPremium,
        isVip: item.isVip,
        isLifetime: item.isLifetime,
        leagueCrownExpiresAt: item.leagueCrownExpiresAt,
        leagueCrownCount: item.leagueCrownCount,
        profileCardLevel: item.profileCardLevel,
        profileCardTheme: item.profileCardTheme,
      });
    },
    [myUid],
  );

  const renderItem = useCallback(
    ({ item }: { item: TopHelperRow }) => {
      const isMe = !!myUid && item.uid === myUid;
      const isTop3 = item.place <= 3;
      const rowEffectiveAura = getEffectiveAvatarAuraId(item.aura, item.isPremium, item.isVip);
      const rowUsesPremiumAura = rowEffectiveAura === PREMIUM_AVATAR_AURA_ID;
      const crownCount = Math.max(0, Math.floor(Number(item.leagueCrownCount) || 0));
      const hasLeagueCrown = crownCount > 0 || Number(item.leagueCrownExpiresAt) > Date.now();
      const displayCrownCount = hasLeagueCrown ? Math.max(1, crownCount) : 0;
      const avatar = String(item.avatar?.trim() || getBestAvatarForLevel(item.profileCardLevel ?? 1));

      return (
        <Pressable
          onPress={() => openCard(item)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 0.5,
            borderBottomColor: t.border,
            backgroundColor: isMe ? t.accentBg : t.bgCard,
            borderLeftWidth: 4,
            borderLeftColor: isMe ? t.accent : 'transparent',
            opacity: pressed ? 0.75 : 1,
          })}
        >
          <Text
            style={{
              width: 36,
              fontSize: isTop3 ? 16 : 14,
              color: isMe ? t.accent : isTop3 ? t.gold : t.textPrimary,
              textAlign: 'center',
              fontWeight: isMe ? '900' : isTop3 ? '700' : '500',
            }}
          >
            {item.place}
          </Text>
          <PremiumAvatarHalo
            enabled={rowUsesPremiumAura}
            avatarSize={HELPERS_AVATAR_SIZE}
            maskColor={isMe ? t.accentBg : t.bgCard}
            style={{ marginRight: 10 }}
            animateShimmer={false}
          >
            <AvatarView
              avatar={avatar}
              level={item.profileCardLevel ?? 1}
              size={HELPERS_AVATAR_SIZE}
              auraId={rowUsesPremiumAura ? undefined : rowEffectiveAura}
              animateAura={false}
            />
          </PremiumAvatarHalo>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <View style={{ flexShrink: 1, minWidth: 0 }}>
                {hasLeagueCrown ? (
                  <LeagueCrownName text={item.displayName} fontSize={isTop3 ? 16 : 15} count={displayCrownCount} />
                ) : item.isPremium ? (
                  <PremiumGoldUserName text={item.displayName} fontSize={isTop3 ? 16 : 15} />
                ) : item.isVip ? (
                  <VipGreenUserName text={item.displayName} fontSize={isTop3 ? 16 : 15} />
                ) : (
                  <Text
                    numberOfLines={1}
                    style={{
                      fontSize: isTop3 ? 16 : 15,
                      color: t.textPrimary,
                      fontWeight: isMe || isTop3 ? '700' : '600',
                    }}
                  >
                    {item.displayName}
                  </Text>
                )}
              </View>
              <ProfileCardBadge level={item.profileCardLevel} theme={item.profileCardTheme} />
            </View>
            <Text numberOfLines={1} style={{ color: t.textMuted, fontSize: f.label, marginTop: 2 }}>
              {helpedLabel(item.confirmed, lang)}
            </Text>
          </View>
          {isMe && (
            <View
              style={{
                marginHorizontal: 8,
                paddingHorizontal: 7,
                paddingVertical: 3,
                borderRadius: 999,
                backgroundColor: t.accent + '22',
                borderWidth: 0.5,
                borderColor: t.accent + '55',
              }}
            >
              <Text style={{ color: t.accent, fontSize: Math.max(10, f.caption - 1), fontWeight: '900' }}>
                {triLang(lang, { uk: 'Ти', ru: 'Ты', es: 'Tú', 'pt-BR': 'Você', vi: 'Bạn', id: 'Kamu', tr: 'Sen', pl: 'Ty' })}
              </Text>
            </View>
          )}
          <View style={{ alignItems: 'center', justifyContent: 'center', minWidth: 44 }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: isTop3 ? t.gold : t.textPrimary }}>
              {item.confirmed}
            </Text>
            <Ionicons name="ribbon" size={14} color={isTop3 ? t.gold : t.textMuted} />
          </View>
        </Pressable>
      );
    },
    [myUid, t, f, lang, openCard],
  );

  // Описание — ТОЛЬКО из админки (remote_config/app.texts.top_helpers_description).
  // Пусто → блок описания не показываем. Никакого зашитого текста в коде.
  const descText = description.trim();

  return (
    <View style={{ flex: 1 }}>
      <ScreenGradient />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Шапка: назад + заголовок */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingVertical: 10,
            gap: 8,
          }}
        >
          <Pressable
            onPress={() => {
              hapticTap();
              safeRouterBack(router);
            }}
            hitSlop={10}
            style={{ padding: 6 }}
          >
            <Ionicons name="chevron-back" size={26} color={t.textPrimary} />
          </Pressable>
          <Ionicons name="ribbon" size={22} color={HELPERS_ACCENT} />
          <Text style={{ fontSize: 20, fontWeight: '800', color: t.textPrimary }}>{boardTitle(lang)}</Text>
        </View>

        <ContentWrap>
          {!enabled ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Ionicons name="construct-outline" size={40} color={t.textMuted} />
              <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', marginTop: 12 }}>
                {triLang(lang, {
                  ru: 'Раздел временно недоступен.',
                  uk: 'Розділ тимчасово недоступний.',
                  es: 'Sección temporalmente no disponible.',
                  'pt-BR': 'Seção temporariamente indisponível.',
                  vi: 'Mục này tạm thời không khả dụng.',
                  id: 'Bagian ini sementara tidak tersedia.',
                  tr: 'Bölüm geçici olarak kullanılamıyor.',
                  pl: 'Sekcja tymczasowo niedostępna.',
                })}
              </Text>
            </View>
          ) : (
            <FlashList
              data={rows}
              keyExtractor={(item) => item.uid}
              renderItem={renderItem}
              extraData={myUid}
              contentContainerStyle={{ paddingBottom: bottomInset + 24 }}
              ListHeaderComponent={
                descText ? (
                  <View
                    style={{
                      marginHorizontal: 12,
                      marginTop: 4,
                      marginBottom: 12,
                      padding: 14,
                      borderRadius: 16,
                      backgroundColor: t.bgCard,
                      borderWidth: 0.5,
                      borderColor: t.border,
                    }}
                  >
                    <Text style={{ color: t.textPrimary, fontSize: f.body, lineHeight: f.body * 1.4 }}>{descText}</Text>
                  </View>
                ) : null
              }
              ListEmptyComponent={
                loading ? null : (
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <Ionicons name="ribbon-outline" size={40} color={t.textMuted} />
                    <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', marginTop: 12 }}>
                      {triLang(lang, {
                        ru: 'Пока никого нет.',
                        uk: 'Поки нікого немає.',
                        es: 'Aún no hay nadie.',
                        'pt-BR': 'Ninguém ainda.',
                        vi: 'Chưa có ai.',
                        id: 'Belum ada siapa pun.',
                        tr: 'Henüz kimse yok.',
                        pl: 'Jeszcze nikogo nie ma.',
                      })}
                    </Text>
                  </View>
                )
              }
            />
          )}
        </ContentWrap>
      </SafeAreaView>

      <PlayerProfileModal
        player={profilePlayer}
        myInfo={{ name: '…', avatar: '', frame: '', aura: '', totalXP: 0, streak: null }}
        onClose={() => setProfilePlayer(null)}
      />
    </View>
  );
}
