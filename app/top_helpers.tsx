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
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import ScreenGradient from '../components/ScreenGradient';
import SectionSheetHeader from '../components/SectionSheetHeader';
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
import SkeletonBlock from '../components/SkeletonShimmer';

const HELPERS_AVATAR_SIZE = 52;
const HELPERS_ACCENT = '#F59E0B';

// Фаза 4: золото имени владельца карточки V «Легенда» — насыщенное золото + лёгкое
// свечение. Применяется только в «простой» ветке имени (vip/premium-стили сильнее).
const LEGEND_CARD_NAME_GOLD = {
  color: '#F5C842',
  textShadowColor: 'rgba(245,200,66,0.45)',
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 6,
} as const;

function boardTitle(lang: string): string {
  return triLang(lang as never, {
    ru: 'Топ хелперов', uk: 'Топ хелперів', es: 'Top Helpers', 'pt-BR': 'Top Helpers',
    vi: 'Top Helpers', id: 'Top Helpers', tr: 'Top Helpers', pl: 'Top Helpers',
  });
}

/**
 * Титул баг-хелпера по числу подтверждённых находок (Набор A «Охотники», 10 уровней).
 * Индекс уровня общий для всех языков — меняется только перевод строки.
 */
const HELPER_TITLE_TIERS: { min: number; titles: Record<string, string> }[] = [
  { min: 100, titles: { ru: 'Легенда Phraseman', uk: 'Легенда Phraseman', es: 'Leyenda de Phraseman', 'pt-BR': 'Lenda do Phraseman', vi: 'Huyền thoại Phraseman', id: 'Legenda Phraseman', tr: 'Phraseman Efsanesi', pl: 'Legenda Phraseman' } },
  { min: 61, titles: { ru: 'Хранитель качества', uk: 'Охоронець якості', es: 'Guardián de la calidad', 'pt-BR': 'Guardião da qualidade', vi: 'Người giữ chất lượng', id: 'Penjaga kualitas', tr: 'Kalite Muhafızı', pl: 'Strażnik jakości' } },
  { min: 41, titles: { ru: 'Легенда отладки', uk: 'Легенда налагодження', es: 'Leyenda del debug', 'pt-BR': 'Lenda da depuração', vi: 'Huyền thoại gỡ lỗi', id: 'Legenda debug', tr: 'Hata Ayıklama Efsanesi', pl: 'Legenda debugowania' } },
  { min: 26, titles: { ru: 'Гроза ошибок', uk: 'Гроза помилок', es: 'Azote de errores', 'pt-BR': 'Terror dos erros', vi: 'Khắc tinh của lỗi', id: 'Momok bug', tr: 'Hataların Kâbusu', pl: 'Postrach błędów' } },
  { min: 16, titles: { ru: 'Мастер багов', uk: 'Майстер багів', es: 'Maestro de bugs', 'pt-BR': 'Mestre dos bugs', vi: 'Bậc thầy săn lỗi', id: 'Master bug', tr: 'Hata Ustası', pl: 'Mistrz bugów' } },
  { min: 11, titles: { ru: 'Ветеран', uk: 'Ветеран', es: 'Veterano', 'pt-BR': 'Veterano', vi: 'Cựu binh', id: 'Veteran', tr: 'Veteran', pl: 'Weteran' } },
  { min: 7, titles: { ru: 'Знаток', uk: 'Знавець', es: 'Experto', 'pt-BR': 'Especialista', vi: 'Chuyên gia', id: 'Ahli', tr: 'Uzman', pl: 'Znawca' } },
  { min: 4, titles: { ru: 'Охотник за багами', uk: 'Мисливець за багами', es: 'Cazador de bugs', 'pt-BR': 'Caçador de bugs', vi: 'Thợ săn lỗi', id: 'Pemburu bug', tr: 'Hata Avcısı', pl: 'Łowca bugów' } },
  { min: 2, titles: { ru: 'Следопыт', uk: 'Слідопит', es: 'Rastreador', 'pt-BR': 'Rastreador', vi: 'Người theo dấu', id: 'Penjejak', tr: 'İz Sürücü', pl: 'Tropiciel' } },
  { min: 1, titles: { ru: 'Первопроходец', uk: 'Першопрохідець', es: 'Pionero', 'pt-BR': 'Pioneiro', vi: 'Người tiên phong', id: 'Perintis', tr: 'Öncü', pl: 'Pionier' } },
];

function helperTitle(count: number, lang: string): string {
  const tier = HELPER_TITLE_TIERS.find((tr) => count >= tr.min) ?? HELPER_TITLE_TIERS[HELPER_TITLE_TIERS.length - 1];
  return triLang(lang as never, tier.titles as never);
}

/** Короткая подпись под счётчиком багов справа. */
function caughtLabel(lang: string): string {
  return triLang(lang as never, {
    ru: 'поймано', uk: 'спіймано', es: 'atrapados', 'pt-BR': 'capturados',
    vi: 'đã bắt', id: 'tertangkap', tr: 'yakalandı', pl: 'złapane',
  });
}

// Плейсхолдер-строки на время первой загрузки: форма совпадает с реальной
// строкой борда (место + аватар + имя/титул), чтобы переход «загрузка → данные»
// шёл без скачка лэйаута и пустого экрана.
function HelperSkeletonRows({ borderColor, bgCard }: { borderColor: string; bgCard: string }) {
  return (
    <View>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 0.5,
            borderBottomColor: borderColor,
            backgroundColor: bgCard,
          }}
        >
          <View style={{ width: 36, alignItems: 'center' }}>
            <SkeletonBlock width={16} height={16} borderRadius={4} />
          </View>
          <SkeletonBlock
            width={HELPERS_AVATAR_SIZE}
            height={HELPERS_AVATAR_SIZE}
            borderRadius={HELPERS_AVATAR_SIZE / 2}
            style={{ marginRight: 10 }}
          />
          <View style={{ flex: 1, gap: 6 }}>
            <SkeletonBlock width={`${60 - i * 4}%`} height={13} />
            <SkeletonBlock width={`${40 - i * 3}%`} height={10} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function TopHelpersScreen() {
  const router = useRouter();
  const { source } = useLocalSearchParams<{ source?: string }>();
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
      const lvl = item.gameLevel && item.gameLevel > 0 ? item.gameLevel : 1;
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
      // Настоящий игровой уровень (не profileCardLevel — тот флаг 0..1). Фолбэк 1.
      const gameLvl = item.gameLevel && item.gameLevel > 0 ? item.gameLevel : 1;
      const avatar = String(item.avatar?.trim() || getBestAvatarForLevel(gameLvl));

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
          {/* Фикс-слот под аватар: аура рисуется поверх (выходя за центр), но НЕ толкает
              имя вправо. Без этого строки с аурой были шире и съезжали. */}
          <View
            style={{
              width: HELPERS_AVATAR_SIZE,
              height: HELPERS_AVATAR_SIZE,
              marginRight: 10,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PremiumAvatarHalo
              enabled={rowUsesPremiumAura}
              avatarSize={HELPERS_AVATAR_SIZE}
              maskColor={isMe ? t.accentBg : t.bgCard}
              animateShimmer={false}
            >
              <AvatarView
                avatar={avatar}
                level={gameLvl}
                size={HELPERS_AVATAR_SIZE}
                auraId={rowUsesPremiumAura ? undefined : rowEffectiveAura}
                animateAura={false}
              />
            </PremiumAvatarHalo>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ minWidth: 0, overflow: 'hidden' }}>
              <View style={{ flexShrink: 1, minWidth: 0, overflow: 'hidden' }}>
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
                      ...((item.profileCardLevel ?? 0) >= 5 ? LEGEND_CARD_NAME_GOLD : null),
                    }}
                  >
                    {item.displayName}
                  </Text>
                )}
              </View>
            </View>
            <ProfileCardBadge level={item.profileCardLevel} theme={item.profileCardTheme} style={{ marginTop: 3 }} />
            <Text numberOfLines={1} style={{ color: HELPERS_ACCENT, fontSize: f.label, marginTop: 2, fontWeight: '700' }}>
              {helperTitle(item.confirmed, lang)}
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
                borderWidth: 0,
                borderColor: t.accent + '55',
              }}
            >
              <Text style={{ color: t.accent, fontSize: Math.max(10, f.caption - 1), fontWeight: '900' }}>
                {triLang(lang, { uk: 'Ти', ru: 'Ты', es: 'Tú', 'pt-BR': 'Você', vi: 'Bạn', id: 'Kamu', tr: 'Sen', pl: 'Ty' })}
              </Text>
            </View>
          )}
          <View style={{ alignItems: 'center', justifyContent: 'center', minWidth: 52 }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: isTop3 ? t.gold : t.textPrimary }}>
              {item.confirmed}
            </Text>
            <Text style={{ fontSize: Math.max(9, f.caption - 2), color: t.textMuted, marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              {caughtLabel(lang)}
            </Text>
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
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        {/* зачем: стандарт «шторки раздела» — модал с выездом снизу, шапка
            с центрированным заголовком и крестиком вместо стрелки «назад». */}
        <SectionSheetHeader
          title={boardTitle(lang)}
          onClose={() => safeRouterBack(router, source === 'settings' ? '/(tabs)/settings' as any : undefined)}
        />

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
              contentContainerStyle={{ flexGrow: 1, paddingBottom: bottomInset + 24 }}
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
                      borderWidth: 0,
                      borderColor: t.border,
                    }}
                  >
                    <Text style={{ color: t.textPrimary, fontSize: f.body, lineHeight: f.body * 1.4 }}>{descText}</Text>
                  </View>
                ) : null
              }
              ListEmptyComponent={
                loading ? (
                  <HelperSkeletonRows borderColor={t.border} bgCard={t.bgCard} />
                ) : (
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <Ionicons name="ribbon-outline" size={40} color={t.textMuted} />
                    <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', marginTop: 12 }}>
                      {triLang(lang, {
                        ru: 'Пока никто не в топе. Пришли отчёт об ошибке — стань первым!',
                        uk: 'Поки нікого немає. Надішли звіт про помилку — стань першим!',
                        es: 'Aún no hay nadie. ¡Envía un reporte y sé el primero!',
                        'pt-BR': 'Ninguém ainda. Envie um relato e seja o primeiro!',
                        vi: 'Chưa có ai. Gửi báo cáo lỗi để dẫn đầu!',
                        id: 'Belum ada. Kirim laporan bug jadi yang pertama!',
                        tr: 'Henüz kimse yok. Bir hata bildir, ilk sen ol!',
                        pl: 'Jeszcze nikogo. Wyślij zgłoszenie i bądź pierwszy!',
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
    </ScreenGradient>
  );
}
