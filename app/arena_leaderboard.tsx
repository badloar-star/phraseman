import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TapScale from '../components/TapScale';
import {
  InteractionManager,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { usePremium } from '../components/PremiumContext';
import AvatarView from '../components/AvatarView';
import PremiumAvatarHalo from '../components/PremiumAvatarHalo';
import PremiumGoldUserName from '../components/PremiumGoldUserName';
import VipGreenUserName from '../components/VipGreenUserName';
import LeagueCrownName from '../components/LeagueCrownName';
import ProfileCardBadge from '../components/ProfileCardBadge';
import PlayerProfileModal, { PlayerInfo } from '../components/PlayerProfileModal';
import ReportUserModal from '../components/ReportUserModal';
import { getBestAvatarForLevel } from '../constants/avatars';
import { PREMIUM_AVATAR_AURA_ID, USER_AVATAR_AURA_KEY, getEffectiveAvatarAuraId } from '../constants/avatar_auras';
import { getLevelFromXP } from '../constants/theme';
import { getRankImage, getRankImageDisplayScale, useArenaRank } from '../hooks/use-arena-rank';
import { hapticTap } from '../hooks/use-haptics';
import { logFeatureOpened } from './firebase';
import { trackFeatureOpened } from './user_stats';
import { ensureAnonUser } from './cloud_sync';
import { ensureArenaAuthUid } from './user_id_policy';
import { safeRouterBack } from './navigation_back';
import type { RankTier } from './types/arena';
import {
  loadArenaTop100,
  ArenaLbRow,
  ARENA_REMOTE_REFRESH_AT_KEY,
  fetchMyArenaRank,
  getCachedMyArenaRank,
  withOptimisticArenaSelf,
} from './arena_leaderboard_fetch';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO, DEV_CONTENT_UNLOCK } from './config';
import { computeAllPercentiles } from './leaderboard_stats';

const ARENA_MANUAL_REFRESH_COOLDOWN_UNTIL_KEY = 'arena_top100_manual_cooldown_until_v1';
const LEADERBOARD_AVATAR_SIZE = 52;
const ARENA_ROW_HEIGHT = 84;

const TIER_RU: Record<RankTier, string> = {
  bronze: 'Бронза',
  silver: 'Серебро',
  gold: 'Золото',
  platinum: 'Платина',
  diamond: 'Алмаз',
  master: 'Мастер',
  grandmaster: 'Грандмастер',
  legend: 'Легенда',
};

const TIER_UK: Record<RankTier, string> = {
  bronze: 'Бронза',
  silver: 'Срібло',
  gold: 'Золото',
  platinum: 'Платина',
  diamond: 'Алмаз',
  master: 'Майстер',
  grandmaster: 'Гросмейстер',
  legend: 'Легенда',
};

const TIER_ES: Record<RankTier, string> = {
  bronze: 'Bronce',
  silver: 'Plata',
  gold: 'Oro',
  platinum: 'Platino',
  diamond: 'Diamante',
  master: 'Maestro',
  grandmaster: 'Gran maestro',
  legend: 'Leyenda',
};

const TIER_PTBR: Record<RankTier, string> = {
  bronze: 'Bronze',
  silver: 'Prata',
  gold: 'Ouro',
  platinum: 'Platina',
  diamond: 'Diamante',
  master: 'Mestre',
  grandmaster: 'Grande mestre',
  legend: 'Lenda',
};

const TIER_VI: Record<RankTier, string> = {
  bronze: 'Đồng',
  silver: 'Bạc',
  gold: 'Vàng',
  platinum: 'Bạch kim',
  diamond: 'Kim cương',
  master: 'Cao thủ',
  grandmaster: 'Đại cao thủ',
  legend: 'Huyền thoại',
};

const TIER_ID: Record<RankTier, string> = {
  bronze: 'Perunggu',
  silver: 'Perak',
  gold: 'Emas',
  platinum: 'Platinum',
  diamond: 'Berlian',
  master: 'Master',
  grandmaster: 'Grandmaster',
  legend: 'Legenda',
};

const TIER_TR: Record<RankTier, string> = {
  bronze: 'Bronz',
  silver: 'Gümüş',
  gold: 'Altın',
  platinum: 'Platin',
  diamond: 'Elmas',
  master: 'Usta',
  grandmaster: 'Büyük usta',
  legend: 'Efsane',
};

const TIER_PL: Record<RankTier, string> = {
  bronze: 'Brąz',
  silver: 'Srebro',
  gold: 'Złoto',
  platinum: 'Platyna',
  diamond: 'Diament',
  master: 'Mistrz',
  grandmaster: 'Arcymistrz',
  legend: 'Legenda',
};

const TIER_NAMES_BY_LANG: Record<Lang, Record<RankTier, string>> = {
  ru: TIER_RU,
  uk: TIER_UK,
  es: TIER_ES,
  'pt-BR': TIER_PTBR,
  vi: TIER_VI,
  id: TIER_ID,
  tr: TIER_TR,
  pl: TIER_PL,
};

export function arenaLbTierName(tier: RankTier, lang: Lang): string {
  const tierNames = TIER_NAMES_BY_LANG[lang];
  return tierNames[tier];
}

function rankLabelByLang(tier: RankTier, levelRoman: string, lang: Lang): string {
  return `${arenaLbTierName(tier, lang)} ${levelRoman}`;
}

export default function ArenaLeaderboardScreen() {
  const router = useRouter();
  const { theme: t, f, themeMode } = useTheme();
  const arenaLeaderboardAccent = '#F59E0B';
  const { lang } = useLang();
  const insets = useSafeAreaInsets();
  const { isPremium: myIsPremium, isVip: myIsVip } = usePremium();
  const myArena = useArenaRank();

  const [rows, setRows] = useState<ArenaLbRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [manualRefreshBusy, setManualRefreshBusy] = useState(false);
  const [manualRefreshCooldownUntil, setManualRefreshCooldownUntil] = useState(0);
  const [nowTs, setNowTs] = useState(() => Date.now());
  const [myUid, setMyUid] = useState<string | null>(null);
  const [myStableUid, setMyStableUid] = useState<string | null>(null);
  const [myName, setMyName] = useState('');
  const [myTotalXp, setMyTotalXp] = useState(0);
  const [myAvatar, setMyAvatar] = useState('');
  const [myFrame, setMyFrame] = useState('');
  const [myAura, setMyAura] = useState('');
  const [myProfileCardLevel, setMyProfileCardLevel] = useState(0);
  const [myProfileCardTheme, setMyProfileCardTheme] = useState('');
  const [myArenaPlace, setMyArenaPlace] = useState<number | null>(null);
  const [arenaXpPercentile, setArenaXpPercentile] = useState<number | null>(null);
  const [profilePlayer, setProfilePlayer] = useState<PlayerInfo | null>(null);
  const [reportTarget, setReportTarget] = useState<{ uid: string; name: string } | null>(null);
  const listRef = useRef<FlashListRef<ArenaLbRow> | null>(null);
  const didAutoScrollToMeRef = useRef<string | null>(null);
  const reloadSeqRef = useRef(0);

  const reloadBoard = useCallback(async (opts?: { forceRemote?: boolean }) => {
    const seq = ++reloadSeqRef.current;
    try {
      const data = await loadArenaTop100({
        ...opts,
        onBackgroundRefresh: (freshRows) => {
          if (seq === reloadSeqRef.current) setRows(freshRows);
        },
      });
      if (seq !== reloadSeqRef.current) return;
      setLoadError(false);
      setRows(data);
    } catch {
      // Сбой загрузки рейтинга больше не маскируется под пустое состояние
      // «Пока пусто» — показываем явную ошибку с retry.
      if (seq !== reloadSeqRef.current) return;
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    void ensureArenaAuthUid().then(setMyUid);
    void ensureAnonUser().then(setMyStableUid);
    (async () => {
      const [n, xp, av, fr, aura, cardLevel, cardTheme] = await AsyncStorage.multiGet([
        'user_name',
        'user_total_xp',
        'user_avatar',
        'user_frame',
        USER_AVATAR_AURA_KEY,
        'profile_card_level',
        'profile_card_theme',
      ]);
      setMyName((n[1] ?? '').trim());
      setMyTotalXp(parseInt(xp[1] ?? '0', 10) || 0);
      setMyAvatar(av[1] ?? '');
      setMyFrame(fr[1] ?? '');
      setMyAura(aura[1] ?? '');
      setMyProfileCardLevel(Math.max(0, Math.min(5, parseInt(cardLevel[1] ?? '0', 10) || 0)));
      setMyProfileCardTheme(cardTheme[1] ?? '');
      const cached = await getCachedMyArenaRank();
      if (cached) setMyArenaPlace(cached);
    })();
    setLoading(true);
    void reloadBoard().finally(() => setLoading(false));
    logFeatureOpened('arena_leaderboard');
    trackFeatureOpened('arena_leaderboard').catch(() => {});
  }, [reloadBoard]);

  const displayRows = useMemo(
    () => withOptimisticArenaSelf(rows, {
      uid: myUid,
      friendUid: myStableUid,
      displayName: myName,
      arenaXp: myArena?.xp ?? 0,
      tier: myArena?.tier ?? 'bronze',
      levelRoman: myArena?.level ?? 'I',
      totalXp: myTotalXp,
      isPremium: myIsPremium,
      isVip: myIsVip,
      frame: myFrame,
      aura: myAura,
      avatarEmoji: myAvatar,
      games: myArena?.games ?? 0,
      profileCardLevel: myProfileCardLevel,
      profileCardTheme: myProfileCardTheme,
    }),
    [myArena, myAura, myAvatar, myFrame, myIsPremium, myIsVip, myName, myProfileCardLevel, myProfileCardTheme, myStableUid, myTotalXp, myUid, rows],
  );

  // Подтягиваем актуальное место игрока в общем рейтинге арены, как только знаем,
  // что он не в топ-100. Делаем это после загрузки списка, чтобы не дублировать
  // запросы для тех, кто и так попал в видимую сотню.
  useEffect(() => {
    if (loading) return;
    if (!myArena || (myArena.games ?? 0) < 1) {
      return;
    }
    if (myUid && displayRows.some((r) => r.uid === myUid)) {
      const me = displayRows.find((r) => r.uid === myUid);
      if (me) setMyArenaPlace(me.place);
      return;
    }
    let cancelled = false;
    fetchMyArenaRank()
      .then((p) => {
        if (cancelled) return;
        if (typeof p === 'number') setMyArenaPlace(p);
      });
    return () => {
      cancelled = true;
    };
  }, [displayRows, loading, myArena, myUid]);

  useEffect(() => {
    // В dev-режиме используем mock-xp если реального нет.
    // DEV_CONTENT_UNLOCK гасится в стор-сборке → в проде фейковый 800 XP не подставляется.
    const arenaXp = (myArena?.xp ?? 0) > 0 ? myArena!.xp : DEV_CONTENT_UNLOCK ? 800 : 0;
    if (arenaXp <= 0) return;
    if (!DEV_CONTENT_UNLOCK && (myArena?.games ?? 0) < 1) return;
    computeAllPercentiles({ myXp: 0, myStreak: 0, myWeekXp: 0, myDaily7xp: 0, myDaily7timeMs: 0, myArenaXp: arenaXp })
      .then((p) => { if (p.arenaXp !== null && p.arenaXp >= 10) setArenaXpPercentile(p.arenaXp); })
      .catch(() => {});
  }, [myArena]);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      AsyncStorage.getItem(ARENA_MANUAL_REFRESH_COOLDOWN_UNTIL_KEY)
        .then((raw) => {
          const ts = parseInt(raw || '0', 10) || 0;
          setManualRefreshCooldownUntil(ts);
        })
        .catch(() => {});
    });
    return () => task.cancel();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const formatCooldown = useCallback(
    (ms: number): string => {
      const totalSec = Math.max(0, Math.ceil(ms / 1000));
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      return triLang(lang, {
        ru: `${h}ч ${m}м`,
        uk: `${h} год ${m} хв`,
        es: `${h} h ${m} min`,
        'pt-BR': `${h} h ${m} min`,
        vi: `${h} giờ ${m} phút`,
        id: `${h} j ${m} mnt`,
        tr: `${h} sa ${m} dk`,
        pl: `${h} godz. ${m} min`,
      });
    },
    [lang],
  );

  const onManualRefresh = useCallback(async () => {
    if (manualRefreshBusy) return;
    const now = Date.now();
    if (manualRefreshCooldownUntil > now) return;
    setManualRefreshBusy(true);
    try {
      await AsyncStorage.removeItem(ARENA_REMOTE_REFRESH_AT_KEY);
      await reloadBoard({ forceRemote: true });
      const next = Date.now() + 5 * 60 * 1000; // 5 мин cooldown на ручной refresh
      setManualRefreshCooldownUntil(next);
      await AsyncStorage.setItem(ARENA_MANUAL_REFRESH_COOLDOWN_UNTIL_KEY, String(next));
    } finally {
      setManualRefreshBusy(false);
    }
  }, [manualRefreshBusy, manualRefreshCooldownUntil, reloadBoard]);

  const refreshOnCooldown = manualRefreshCooldownUntil > nowTs;
  const refreshCooldownLabel = refreshOnCooldown
    ? formatCooldown(manualRefreshCooldownUntil - nowTs)
    : null;

  const myInfoForProfile = React.useMemo(
    () => ({
      name: myName || '…',
      avatar: myAvatar,
      frame: myFrame,
      aura: myAura,
      totalXP: myTotalXp,
      leagueId: undefined,
      streak: null,
    }),
    [myName, myAvatar, myFrame, myAura, myTotalXp],
  );

  const closePlayerProfile = useCallback(() => setProfilePlayer(null), []);

  const disabledCloud = IS_EXPO_GO || !CLOUD_SYNC_ENABLED;

  // Нижняя плашка «ты вне топ-100»: показываем, если игрок отыграл хотя бы один матч
  // (есть профиль арены) и его uid отсутствует в видимой сотне.
  const isMeInBoard = useMemo(
    () => !!myUid && displayRows.some((r) => r.uid === myUid),
    [displayRows, myUid],
  );
  const myBoardIndex = useMemo(
    () => displayRows.findIndex((r) =>
      (!!myUid && r.uid === myUid) ||
      (!!myStableUid && r.friendUid === myStableUid)
    ),
    [displayRows, myStableUid, myUid],
  );
  const showMyRankFooter = useMemo(
    () => !disabledCloud && !loading && !!myArena && (myArena.games ?? 0) >= 1 && !isMeInBoard,
    [disabledCloud, loading, myArena, isMeInBoard],
  );
  const stickyRankBarHeight = 76;
  const myDuelLabel = myArena
    ? rankLabelByLang(myArena.tier, myArena.level, lang)
    : null;
  const myRankImg = myArena ? getRankImage(myArena.tier, myArena.level) : null;

  useEffect(() => {
    if (loading || myBoardIndex < 0) return;
    const scrollKey = `${displayRows.length}-${displayRows[myBoardIndex]?.uid ?? ''}-${myBoardIndex}`;
    if (didAutoScrollToMeRef.current === scrollKey) return;
    didAutoScrollToMeRef.current = scrollKey;
    const id = setTimeout(() => {
      try {
        listRef.current?.scrollToIndex({
          index: myBoardIndex,
          animated: false,
          viewPosition: 0.38,
        });
      } catch {
        listRef.current?.scrollToOffset({
          offset: Math.max(0, myBoardIndex * ARENA_ROW_HEIGHT),
          animated: false,
        });
      }
    }, 80);
    return () => clearTimeout(id);
  }, [displayRows, loading, myBoardIndex]);

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <ContentWrap>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 }}>
              <TapScale
                onPress={() => safeRouterBack(router, '/(tabs)/arena' as any)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: t.bgCard,
                  borderWidth: 0.5,
                  borderColor: t.border,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 8,
                }}
              >
                <Ionicons name="chevron-back" size={22} color={t.textPrimary} />
              </TapScale>
              <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.h2, fontWeight: '800' }}>
                {triLang(lang, {
                  uk: 'Топ-100 арени',
                  ru: 'Топ-100 арены',
                  es: 'Top 100 de la Arena',
                  'pt-BR': 'Top 100 da Arena',
                  vi: 'Top 100 Arena',
                  id: 'Top 100 Arena',
                  tr: 'Arena Top 100',
                  pl: 'Top 100 Areny',
                })}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  hapticTap();
                  void onManualRefresh();
                }}
                disabled={disabledCloud || manualRefreshBusy || refreshOnCooldown}
                style={{
                  marginRight: 4,
                  backgroundColor:
                    disabledCloud || manualRefreshBusy || refreshOnCooldown ? '#4A4A4A' : t.bgCard,
                  borderWidth: 0.5,
                  borderColor:
                    disabledCloud || manualRefreshBusy || refreshOnCooldown ? '#6A6A6A' : t.border,
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                  opacity:
                    disabledCloud || manualRefreshBusy || refreshOnCooldown ? 0.85 : 1,
                }}
              >
                <Text style={{ color: t.textSecond, fontSize: f.label, fontWeight: '700' }}>
                  {refreshCooldownLabel
                      ? refreshCooldownLabel
                      : triLang(lang, { uk: 'Оновити', ru: 'Обновить', es: 'Actualizar', 'pt-BR': 'Atualizar', vi: 'Làm mới', id: 'Perbarui', tr: 'Yenile', pl: 'Odśwież' })}
                </Text>
              </TouchableOpacity>
            </View>

            {disabledCloud ? (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center' }}>
                  {triLang(lang, {
                    uk: 'Рейтинг доступний лише з увімкненою синхронізацією.',
                    ru: 'Рейтинг доступен только при включённой синхронизации.',
                    es: 'La clasificación solo está disponible con la sincronización activada.',
                    'pt-BR': 'O ranking só está disponível com a sincronização ativada.',
                    vi: 'Bảng xếp hạng chỉ khả dụng khi bật đồng bộ hóa.',
                    id: 'Peringkat hanya tersedia jika sinkronisasi aktif.',
                    tr: 'Sıralama yalnızca senkronizasyon açıkken kullanılabilir.',
                    pl: 'Ranking jest dostępny tylko przy włączonej synchronizacji.',
                  })}
                </Text>
              </View>
            ) : (
              <FlashList
                ref={listRef}
                data={displayRows}
                keyExtractor={(item) => item.uid}
                extraData={`${myUid ?? ''}|${myStableUid ?? ''}|${myArenaPlace ?? ''}|${myAvatar}|${myAura}|${myIsPremium ? 1 : 0}|${myIsVip ? 1 : 0}`}
                contentContainerStyle={{
                  paddingBottom: showMyRankFooter
                    ? 16 + stickyRankBarHeight + insets.bottom
                    : 24 + insets.bottom,
                }}
                ListEmptyComponent={
                  loading ? null : loadError ? (
                    <View style={{ padding: 40, alignItems: 'center' }}>
                      <Ionicons name="cloud-offline-outline" size={40} color={t.textSecond} />
                      <Text style={{ color: t.textMuted, fontSize: f.body, marginTop: 12, textAlign: 'center' }}>
                        {triLang(lang, {
                          uk: 'Не вдалося завантажити рейтинг. Перевірте інтернет.',
                          ru: 'Не удалось загрузить рейтинг. Проверьте интернет.',
                          es: 'No se pudo cargar la clasificación. Comprueba tu conexión.',
                          'pt-BR': 'Não foi possível carregar o ranking. Verifique a internet.',
                          vi: 'Không thể tải bảng xếp hạng. Kiểm tra kết nối.',
                          id: 'Gagal memuat peringkat. Periksa koneksi internet.',
                          tr: 'Sıralama yüklenemedi. İnternet bağlantını kontrol et.',
                          pl: 'Nie udało się załadować rankingu. Sprawdź internet.',
                        })}
                      </Text>
                      <TouchableOpacity
                        testID="arena-lb-retry"
                        accessibilityRole="button"
                        onPress={() => {
                          hapticTap();
                          setLoading(true);
                          void reloadBoard({ forceRemote: true }).finally(() => setLoading(false));
                        }}
                        style={{ marginTop: 16, backgroundColor: t.accent, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10 }}
                      >
                        <Text style={{ color: t.correctText, fontWeight: '800', fontSize: f.body }}>
                          {triLang(lang, {
                            uk: 'Повторити', ru: 'Повторить', es: 'Reintentar', 'pt-BR': 'Tentar de novo',
                            vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Spróbuj ponownie',
                          })}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : <View style={{ padding: 40, alignItems: 'center' }}>
                    <Ionicons name="trophy-outline" size={40} color={t.textSecond} />
                    <Text style={{ color: t.textMuted, fontSize: f.body, marginTop: 12, textAlign: 'center' }}>
                      {triLang(lang, {
                        uk: 'Поки що порожньо. Зіграй дуелі, щоб з\'явитися в рейтингу.',
                        ru: 'Пока пусто. Сыграй дуэли, чтобы попасть в рейтинг.',
                        es: 'Por ahora la clasificación está vacía. Juega partidas para aparecer.',
                        'pt-BR': 'Ainda está vazio. Jogue duelos para aparecer no ranking.',
                        vi: 'Hiện vẫn trống. Chơi các trận đấu để xuất hiện trên bảng xếp hạng.',
                        id: 'Masih kosong. Mainkan duel agar muncul di peringkat.',
                        tr: 'Şimdilik boş. Sıralamada görünmek için düellolar oyna.',
                        pl: 'Na razie pusto. Zagraj pojedynki, aby pojawić się w rankingu.',
                      })}
                    </Text>
                  </View>
                }
                ListHeaderComponent={
                  displayRows.length > 0 ? (
                    <View
                      style={{
                        flexDirection: 'row',
                        paddingHorizontal: 16,
                        paddingVertical: 6,
                        alignItems: 'center',
                        borderBottomWidth: 0.5,
                        borderBottomColor: t.border,
                      }}
                    >
                      <Text style={{ width: 36, color: t.textGhost, fontSize: f.label, fontWeight: '600' }}>#</Text>
                      <Text style={{ flex: 1, color: t.textGhost, fontSize: f.label, fontWeight: '600', minWidth: 0 }}>
                        {triLang(lang, { uk: 'Учасник', ru: 'Участник', es: 'Participante', 'pt-BR': 'Participante', vi: 'Người tham gia', id: 'Peserta', tr: 'Katılımcı', pl: 'Uczestnik' })}
                      </Text>
                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                        style={{
                          width: 74,
                          color: t.textGhost,
                          fontSize: f.label,
                          fontWeight: '600',
                          textAlign: 'right',
                        }}
                      >
                        {triLang(lang, { uk: 'Звання', ru: 'Звание', es: 'Rango', 'pt-BR': 'Ranque', vi: 'Hạng', id: 'Rank', tr: 'Rütbe', pl: 'Ranga' })}
                      </Text>
                    </View>
                  ) : null
                }
                renderItem={({ item }) => {
                  const isMe =
                    (!!myUid && item.uid === myUid) ||
                    (!!myStableUid && item.friendUid === myStableUid);
                  const isTop3 = item.place <= 3;
                  const totalXp = item.totalXp;
                  const lvl = getLevelFromXP(totalXp);
                  const rowAvatar = isMe
                    ? String(myAvatar?.trim() || getBestAvatarForLevel(lvl))
                    : String(item.avatarEmoji?.trim() || getBestAvatarForLevel(lvl));
                  const rowAura = isMe ? myAura : item.aura;
                  const rowIsPremium = isMe ? myIsPremium : item.isPremium;
                  const rowIsVip = isMe ? myIsVip : item.isVip;
                  const rowEffectiveAura = getEffectiveAvatarAuraId(rowAura, rowIsPremium, rowIsVip);
                  const rowUsesPremiumAura = rowEffectiveAura === PREMIUM_AVATAR_AURA_ID;
                  const leagueCrownCount = Math.max(0, Math.floor(Number(item.leagueCrown?.crownCount) || 0));
                  const hasLeagueCrown = !!item.leagueCrown && (leagueCrownCount > 0 || item.leagueCrown.expiresAt > Date.now());
                  const displayLeagueCrownCount = hasLeagueCrown ? Math.max(1, leagueCrownCount) : 0;
                  const duelLabel = rankLabelByLang(item.tier, item.levelRoman, lang);
                  const rankImg = getRankImage(item.tier, item.levelRoman);

                  return (
                    <Pressable
                      onPress={() => {
                        setProfilePlayer({
                          name: item.displayName,
                          points: totalXp,
                          isMe,
                          avatar: rowAvatar,
                          frame: item.frame,
                          aura: rowAura,
                          streak: null,
                          leagueId: undefined,
                          uid: item.uid,
                          friendUid: item.friendUid ?? '',
                          isPremium: rowIsPremium,
                          isVip: rowIsVip,
                          leagueCrownExpiresAt: item.leagueCrown?.expiresAt,
                          leagueCrownCount: displayLeagueCrownCount,
                          profileCardLevel: item.profileCardLevel,
                          profileCardTheme: item.profileCardTheme,
                          profileCardMotion: item.profileCardMotion,
                          profileCardPublicFocus: item.profileCardPublicFocus,
                        });
                      }}
                      onLongPress={() => {
                        if (!isMe && item.uid) {
                          setReportTarget({ uid: item.uid, name: item.displayName });
                        }
                      }}
                      delayLongPress={500}
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
                          color: isMe ? t.accent : (isTop3 ? t.gold : t.textPrimary),
                          textAlign: 'center',
                          fontWeight: isMe ? '900' : (isTop3 ? '700' : '500'),
                        }}
                      >
                        {item.place}
                      </Text>
                      <PremiumAvatarHalo
                        enabled={rowUsesPremiumAura}
                        avatarSize={LEADERBOARD_AVATAR_SIZE}
                        maskColor={isMe ? t.accentBg : t.bgCard}
                        style={{ marginRight: 10 }}
                      >
                        <AvatarView
                          avatar={rowAvatar}
                          totalXP={totalXp}
                          size={LEADERBOARD_AVATAR_SIZE}
                          auraId={rowUsesPremiumAura ? undefined : rowEffectiveAura}
                        />
                      </PremiumAvatarHalo>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 }}>
                          <View style={{ flexShrink: 1, minWidth: 0 }}>
                            {hasLeagueCrown ? (
                              <LeagueCrownName text={item.displayName} fontSize={isTop3 ? 16 : 15} count={displayLeagueCrownCount} />
                            ) : rowIsPremium ? (
                              <PremiumGoldUserName text={item.displayName} fontSize={isTop3 ? 16 : 15} />
                            ) : rowIsVip ? (
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
                        <Text numberOfLines={2} style={{ color: t.textMuted, fontSize: f.label, marginTop: 2 }}>
                          {`${triLang(lang, { uk: 'Місце', ru: 'Место', es: 'Puesto', 'pt-BR': 'Posição', vi: 'Vị trí', id: 'Posisi', tr: 'Sıra', pl: 'Miejsce' })} ${item.place} · ${duelLabel} · ${triLang(lang, { uk: 'рів.', ru: 'ур.', es: 'nv.', 'pt-BR': 'nív.', vi: 'cấp', id: 'lvl', tr: 'sv.', pl: 'poz.' })} ${lvl}`}
                        </Text>
                      </View>
                      {isMe && (
                        <View style={{ marginHorizontal: 8, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, backgroundColor: t.accent + '22', borderWidth: 0.5, borderColor: t.accent + '55' }}>
                          <Text style={{ color: t.accent, fontSize: Math.max(10, f.caption - 1), fontWeight: '900' }}>
                            {triLang(lang, { uk: 'Ти', ru: 'Ты', es: 'Tú', 'pt-BR': 'Você', vi: 'Bạn', id: 'Kamu', tr: 'Sen', pl: 'Ty' })}
                          </Text>
                        </View>
                      )}
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          overflow: 'hidden',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Image
                          source={rankImg}
                          contentFit="contain"
                          style={{
                            width: 44,
                            height: 44,
                            transform: [{ scale: getRankImageDisplayScale(item.tier, item.levelRoman) }],
                          }}
                          accessibilityLabel={`Ранг: ${duelLabel}`}
                        />
                      </View>
                    </Pressable>
                  );
                }}
              />
            )}

            {showMyRankFooter && myArena && (
              (() => {
                const myEffectiveAura = getEffectiveAvatarAuraId(myAura, myIsPremium, myIsVip);
                const myUsesPremiumAura = myEffectiveAura === PREMIUM_AVATAR_AURA_ID;
                return (
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 20,
                  elevation: 12,
                  paddingHorizontal: 16,
                  paddingTop: 8,
                  paddingBottom: Math.max(8, insets.bottom),
                  backgroundColor: t.bgCard,
                  borderTopWidth: 1,
                  borderTopColor: t.border,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    backgroundColor: t.accentBg,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: t.accent + '44',
                  }}
                >
                  <View style={{ width: 56, minHeight: 28, alignItems: 'center', justifyContent: 'center' }}>
                    {myArenaPlace != null && myArenaPlace > 0 ? (
                      <Text
                        style={{ fontSize: 14, color: t.textMuted, textAlign: 'center', fontWeight: '600' }}
                        numberOfLines={1}
                      >
                        #{myArenaPlace.toLocaleString()}
                      </Text>
                    ) : (
                      <Text style={{ fontSize: 18, color: t.textMuted, textAlign: 'center' }}>—</Text>
                    )}
                  </View>
                  <PremiumAvatarHalo
                    enabled={myUsesPremiumAura}
                    avatarSize={LEADERBOARD_AVATAR_SIZE}
                    maskColor={t.accentBg}
                    style={{ marginRight: 10 }}
                  >
                    <AvatarView
                      avatar={myAvatar}
                      totalXP={myTotalXp}
                      size={LEADERBOARD_AVATAR_SIZE}
                      auraId={myUsesPremiumAura ? undefined : myEffectiveAura}
                    />
                  </PremiumAvatarHalo>
                  <View style={{ flex: 1, justifyContent: 'center', minWidth: 0 }}>
                    {myIsPremium ? (
                      <PremiumGoldUserName
                        text={myName.trim() || triLang(lang, { uk: 'Ти', ru: 'Ты', es: 'Tú', 'pt-BR': 'Você', vi: 'Bạn', id: 'Kamu', tr: 'Sen', pl: 'Ty' })}
                        fontSize={15}
                      />
                    ) : myIsVip ? (
                      <VipGreenUserName
                        text={myName.trim() || triLang(lang, { uk: 'Ти', ru: 'Ты', es: 'Tú', 'pt-BR': 'Você', vi: 'Bạn', id: 'Kamu', tr: 'Sen', pl: 'Ty' })}
                        fontSize={15}
                      />
                    ) : (
                      <Text
                        numberOfLines={1}
                        style={{ flex: 1, fontSize: 15, color: t.textPrimary, fontWeight: '700' }}
                      >
                        {myName.trim() || triLang(lang, { uk: 'Ти', ru: 'Ты', es: 'Tú', 'pt-BR': 'Você', vi: 'Bạn', id: 'Kamu', tr: 'Sen', pl: 'Ty' })}
                      </Text>
                    )}
                    {myDuelLabel && (
                      <Text
                        numberOfLines={1}
                        style={{ color: t.textMuted, fontSize: f.label, marginTop: 2 }}
                      >
                        {myDuelLabel}
                      </Text>
                    )}
                    {arenaXpPercentile !== null && (
                      <Text numberOfLines={2} style={{ color: arenaLeaderboardAccent, fontSize: f.label - 1, marginTop: 2, fontWeight: '700' }}>
                        {triLang(lang, {
                          ru: `Топ ${100 - arenaXpPercentile}% в арене`,
                          uk: `Топ ${100 - arenaXpPercentile}% в арені`,
                          es: `Top ${100 - arenaXpPercentile}% en arena`,
                          'pt-BR': `Top ${100 - arenaXpPercentile}% na arena`,
                          vi: `Top ${100 - arenaXpPercentile}% trong arena`,
                          id: `Top ${100 - arenaXpPercentile}% di arena`,
                          tr: `Arena içinde top ${100 - arenaXpPercentile}%`,
                          pl: `Top ${100 - arenaXpPercentile}% na arenie`,
                        })}
                      </Text>
                    )}
                  </View>
                  {myRankImg && myArena ? (
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        overflow: 'hidden',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Image
                        source={myRankImg}
                        contentFit="contain"
                        style={{
                          width: 40,
                          height: 40,
                          transform: [{ scale: getRankImageDisplayScale(myArena.tier, myArena.level) }],
                        }}
                        accessibilityLabel={myDuelLabel ? `Мой ранг: ${myDuelLabel}` : 'Мой ранг'}
                      />
                    </View>
                  ) : null}
                  </View>
                </View>
                );
              })()
            )}
          </View>
        </ContentWrap>
      </SafeAreaView>

      <PlayerProfileModal player={profilePlayer} myInfo={myInfoForProfile} onClose={closePlayerProfile} />
      {reportTarget && (
        <ReportUserModal
          visible={!!reportTarget}
          reportedUid={reportTarget.uid}
          reportedName={reportTarget.name}
          screen="arena"
          lang={lang}
          onClose={() => setReportTarget(null)}
        />
      )}
    </ScreenGradient>
  );
}
