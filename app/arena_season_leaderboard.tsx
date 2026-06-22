/**
 * Экран «Топ-100 сезона» — сезонный глобальный рейтинг.
 * Стилизован аналогично arena_leaderboard.tsx.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { FlashList } from '@shopify/flash-list';
import { Pressable, Text, View } from 'react-native';
import SkeletonBlock from '../components/SkeletonShimmer';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import AvatarView from '../components/AvatarView';
import PremiumAvatarHalo from '../components/PremiumAvatarHalo';
import PremiumGoldUserName from '../components/PremiumGoldUserName';
import TapScale from '../components/TapScale';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { triLang } from '../constants/i18n';
import { safeRouterBack } from './navigation_back';
import { hapticTap } from '../hooks/use-haptics';
import { fetchSeasonTop, type SeasonTopEntry, type SeasonTopResult } from './services/arena_season_client';
import { CLOUD_SYNC_ENABLED } from './config';

const ROW_H = 72;

function pad2(n: number) { return String(n).padStart(2, '0'); }
function msToDateStr(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCDate()}.${pad2(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;
}

function placeColor(place: number): string | null {
  if (place === 1) return '#F59E0B';
  if (place === 2) return '#94A3B8';
  if (place === 3) return '#CD7F32';
  return null;
}

type RowItem = SeasonTopEntry & { isSelf?: boolean };

const AVATAR_SIZE = 44;

function SeasonRow({ item, t, f }: { item: RowItem; t: any; f: any }) {
  const pc = placeColor(item.place);
  const bgSelf = item.isSelf ? 'rgba(255,210,74,0.08)' : 'transparent';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: bgSelf,
        borderRadius: 12,
        marginHorizontal: 8,
        marginVertical: 2,
      }}
    >
      <Text
        style={{
          width: 36,
          fontWeight: '800',
          fontSize: f.body,
          color: pc ?? t.textSecond,
          textAlign: 'center',
        }}
      >
        {item.place <= 3 ? ['🥇', '🥈', '🥉'][item.place - 1] : `#${item.place}`}
      </Text>
      <PremiumAvatarHalo
        enabled={!!item.isPremium}
        avatarSize={AVATAR_SIZE}
        maskColor={bgSelf || t.bgCard}
      >
        <AvatarView avatar={item.avatar ?? undefined} size={AVATAR_SIZE} />
      </PremiumAvatarHalo>
      <View style={{ flex: 1, marginLeft: 10 }}>
        {item.isPremium
          ? <PremiumGoldUserName text={item.name} fontSize={f.body} />
          : <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '600' }} numberOfLines={1}>{item.name}</Text>}
      </View>
      <Text style={{ color: '#FFD24A', fontSize: f.body, fontWeight: '700' }}>
        {item.sr} SR
      </Text>
    </View>
  );
}

export default function ArenaSeasonLeaderboardScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const { theme: t, f } = useTheme();
  const [data, setData] = useState<SeasonTopResult | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchSeasonTop();
    setData(res);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const title = triLang(lang, {
    ru: 'Топ-100 сезона',
    uk: 'Топ-100 сезону',
    es: 'Top 100 de temporada',
    'pt-BR': 'Top 100 da temporada',
    vi: 'Top 100 mùa giải',
    id: 'Top 100 musim',
    tr: 'Sezon Top 100',
    pl: 'Top 100 sezonu',
  });

  const endsLabel = data
    ? triLang(lang, {
        ru: `Сезон до ${msToDateStr(data.endsAtMs)}`,
        uk: `Сезон до ${msToDateStr(data.endsAtMs)}`,
        es: `Temporada hasta ${msToDateStr(data.endsAtMs)}`,
        'pt-BR': `Temporada até ${msToDateStr(data.endsAtMs)}`,
        vi: `Mùa đến ${msToDateStr(data.endsAtMs)}`,
        id: `Musim s.d. ${msToDateStr(data.endsAtMs)}`,
        tr: `Sezon: ${msToDateStr(data.endsAtMs)}'e kadar`,
        pl: `Sezon do ${msToDateStr(data.endsAtMs)}`,
      })
    : '';

  const myPlaceLabel = data?.myPlace
    ? triLang(lang, {
        ru: `Твоё место: #${data.myPlace} · ${data.mySR} SR`,
        uk: `Твоє місце: #${data.myPlace} · ${data.mySR} SR`,
        es: `Tu posición: #${data.myPlace} · ${data.mySR} SR`,
        'pt-BR': `Sua posição: #${data.myPlace} · ${data.mySR} SR`,
        vi: `Vị trí của bạn: #${data.myPlace} · ${data.mySR} SR`,
        id: `Posisimu: #${data.myPlace} · ${data.mySR} SR`,
        tr: `Sıran: #${data.myPlace} · ${data.mySR} SR`,
        pl: `Twoja pozycja: #${data.myPlace} · ${data.mySR} SR`,
      })
    : '';

  const rows: RowItem[] = data?.entries ?? [];

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <ContentWrap>
          <View style={{ flex: 1 }}>
            {/* header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 }}>
              <TapScale
                onPress={() => safeRouterBack(router, '/(tabs)/arena' as any)}
                style={{
                  width: 44, height: 44, borderRadius: 22,
                  backgroundColor: t.bgCard, borderWidth: 0.5, borderColor: t.border,
                  justifyContent: 'center', alignItems: 'center', marginRight: 8,
                }}
              >
                <Ionicons name="chevron-back" size={22} color={t.textPrimary} />
              </TapScale>
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800' }}>{title}</Text>
                {endsLabel ? (
                  <Text style={{ color: t.textSecond, fontSize: f.sub }}>{endsLabel}</Text>
                ) : null}
              </View>
              <TapScale onPress={() => { hapticTap(); void load(); }}>
                <View style={{ backgroundColor: t.bgCard, borderWidth: 0.5, borderColor: t.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 }}>
                  <Text style={{ color: t.textSecond, fontSize: f.label, fontWeight: '700' }}>
                    {triLang(lang, { ru: 'Обновить', uk: 'Оновити', es: 'Actualizar', 'pt-BR': 'Atualizar', vi: 'Làm mới', id: 'Perbarui', tr: 'Yenile', pl: 'Odśwież' })}
                  </Text>
                </View>
              </TapScale>
            </View>

            {/* моё место */}
            {myPlaceLabel ? (
              <View style={{ marginHorizontal: 16, marginBottom: 8, backgroundColor: 'rgba(255,210,74,0.1)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 }}>
                <Text style={{ color: '#FFD24A', fontSize: f.body, fontWeight: '700' }}>{myPlaceLabel}</Text>
              </View>
            ) : null}

            {/* offline */}
            {!CLOUD_SYNC_ENABLED && (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center' }}>
                  {triLang(lang, { ru: 'Включи синхронизацию для доступа к рейтингу.', uk: 'Увімкни синхронізацію для доступу до рейтингу.', es: 'Activa la sincronización para ver el ranking.', 'pt-BR': 'Ative a sincronização para ver o ranking.', vi: 'Bật đồng bộ để xem bảng xếp hạng.', id: 'Aktifkan sinkronisasi untuk melihat peringkat.', tr: 'Sıralamayı görmek için senkronizasyonu aç.', pl: 'Włącz synchronizację, aby zobaczyć ranking.' })}
                </Text>
              </View>
            )}

            {/* loading: скелетон строк рейтинга (форма SeasonRow), а не спиннер */}
            {loading && (
              <View style={{ paddingTop: 4 }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <View
                    key={`season-skeleton-${i}`}
                    style={{ height: ROW_H, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8 }}
                  >
                    <SkeletonBlock width={28} height={28} borderRadius={14} />
                    <SkeletonBlock width={34} height={34} borderRadius={17} />
                    <View style={{ flex: 1 }}>
                      <SkeletonBlock width={`${70 - i * 4}%`} height={13} borderRadius={6} />
                    </View>
                    <SkeletonBlock width={44} height={16} borderRadius={8} />
                  </View>
                ))}
              </View>
            )}

            {/* list */}
            {!loading && rows.length > 0 && (
              <FlashList
                data={rows}
                keyExtractor={(item) => item.uid}
                estimatedItemSize={ROW_H}
                renderItem={({ item }) => <SeasonRow item={item} t={t} f={f} />}
              />
            )}

            {!loading && rows.length === 0 && CLOUD_SYNC_ENABLED && (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center' }}>
                  {triLang(lang, { ru: 'Пока никого нет. Стань первым.', uk: 'Поки нікого немає. Будь першим.', es: 'Aún no hay nadie. Sé el primero.', 'pt-BR': 'Ninguém ainda. Seja o primeiro.', vi: 'Chưa có ai. Hãy là người đầu tiên.', id: 'Belum ada siapa-siapa. Jadilah yang pertama.', tr: 'Henüz kimse yok. İlk ol.', pl: 'Na razie nikogo. Bądź pierwszy.' })}
                </Text>
              </View>
            )}
          </View>
        </ContentWrap>
      </SafeAreaView>
    </ScreenGradient>
  );
}
