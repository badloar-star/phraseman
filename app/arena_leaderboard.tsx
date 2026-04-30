import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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
import PlayerProfileModal, { PlayerInfo } from '../components/PlayerProfileModal';
import ReportUserModal from '../components/ReportUserModal';
import { getBestAvatarForLevel } from '../constants/avatars';
import { getLevelFromXP } from '../constants/theme';
import { getRankImage, useArenaRank } from '../hooks/use-arena-rank';
import { hapticTap } from '../hooks/use-haptics';
import { logFeatureOpened } from './firebase';
import { trackFeatureOpened } from './user_stats';
import { ensureAnonUser } from './cloud_sync';
import type { RankTier } from './types/arena';
import {
  loadArenaTop100,
  ArenaLbRow,
  ARENA_REMOTE_REFRESH_MS,
  ARENA_TOP100_CACHE_KEY,
  ARENA_REMOTE_REFRESH_AT_KEY,
  fetchMyArenaRank,
  getCachedMyArenaRank,
} from './arena_leaderboard_fetch';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';

const ARENA_MANUAL_REFRESH_COOLDOWN_UNTIL_KEY = 'arena_top100_manual_cooldown_until_v1';

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

function arenaLbTierName(tier: RankTier, lang: Lang): string {
  if (lang === 'uk') return TIER_UK[tier];
  if (lang === 'es') return TIER_ES[tier];
  return TIER_RU[tier];
}

function rankLabelByLang(tier: RankTier, levelRoman: string, lang: Lang): string {
  return `${arenaLbTierName(tier, lang)} ${levelRoman}`;
}

export default function ArenaLeaderboardScreen() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const insets = useSafeAreaInsets();
  const { isPremium: myIsPremium } = usePremium();
  const myArena = useArenaRank();

  const [rows, setRows] = useState<ArenaLbRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualRefreshBusy, setManualRefreshBusy] = useState(false);
  const [manualRefreshCooldownUntil, setManualRefreshCooldownUntil] = useState(0);
  const [nowTs, setNowTs] = useState(() => Date.now());
  const [myUid, setMyUid] = useState<string | null>(null);
  const [myName, setMyName] = useState('');
  const [myTotalXp, setMyTotalXp] = useState(0);
  const [myAvatar, setMyAvatar] = useState('');
  const [myFrame, setMyFrame] = useState('');
  const [myArenaPlace, setMyArenaPlace] = useState<number | null>(null);
  const [myArenaPlaceLoading, setMyArenaPlaceLoading] = useState(false);
  const [profilePlayer, setProfilePlayer] = useState<PlayerInfo | null>(null);
  const [reportTarget, setReportTarget] = useState<{ uid: string; name: string } | null>(null);

  const reloadBoard = useCallback(async (opts?: { forceRemote?: boolean }) => {
    const data = await loadArenaTop100(opts);
    setRows(data);
  }, []);

  useEffect(() => {
    void ensureAnonUser().then(setMyUid);
    (async () => {
      const [n, xp, av, fr] = await AsyncStorage.multiGet([
        'user_name',
        'user_total_xp',
        'user_avatar',
        'user_frame',
      ]);
      setMyName((n[1] ?? '').trim());
      setMyTotalXp(parseInt(xp[1] ?? '0', 10) || 0);
      setMyAvatar(av[1] ?? '');
      setMyFrame(fr[1] ?? '');
      const cached = await getCachedMyArenaRank();
      if (cached) setMyArenaPlace(cached);
    })();
    setLoading(true);
    void reloadBoard().finally(() => setLoading(false));
    logFeatureOpened('arena_leaderboard');
    trackFeatureOpened('arena_leaderboard').catch(() => {});
  }, [reloadBoard]);

  // Подтягиваем актуальное место игрока в общем рейтинге арены, как только знаем,
  // что он не в топ-100. Делаем это после загрузки списка, чтобы не дублировать
  // запросы для тех, кто и так попал в видимую сотню.
  useEffect(() => {
    if (loading) return;
    if (!myArena || (myArena.games ?? 0) < 1) return;
    if (myUid && rows.some((r) => r.uid === myUid)) return;
    let cancelled = false;
    setMyArenaPlaceLoading(true);
    fetchMyArenaRank()
      .then((p) => {
        if (cancelled) return;
        if (typeof p === 'number') setMyArenaPlace(p);
      })
      .finally(() => {
        if (!cancelled) setMyArenaPlaceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loading, myArena, myUid, rows]);

  useEffect(() => {
    AsyncStorage.getItem(ARENA_MANUAL_REFRESH_COOLDOWN_UNTIL_KEY)
      .then((raw) => {
        const ts = parseInt(raw || '0', 10) || 0;
        setManualRefreshCooldownUntil(ts);
      })
      .catch(() => {});
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
      await AsyncStorage.multiRemove([ARENA_TOP100_CACHE_KEY, ARENA_REMOTE_REFRESH_AT_KEY]);
      await reloadBoard({ forceRemote: true });
      const next = Date.now() + ARENA_REMOTE_REFRESH_MS;
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
      totalXP: myTotalXp,
      leagueId: undefined,
      streak: null,
    }),
    [myName, myAvatar, myFrame, myTotalXp],
  );

  const closePlayerProfile = useCallback(() => setProfilePlayer(null), []);

  const disabledCloud = IS_EXPO_GO || !CLOUD_SYNC_ENABLED;

  // Нижняя плашка «ты вне топ-100»: показываем, если игрок отыграл хотя бы один матч
  // (есть профиль арены) и его uid отсутствует в видимой сотне.
  const isMeInBoard = useMemo(
    () => !!myUid && rows.some((r) => r.uid === myUid),
    [myUid, rows],
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

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <ContentWrap>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 }}>
              <TouchableOpacity
                onPress={() => {
                  hapticTap();
                  router.back();
                }}
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
              </TouchableOpacity>
              <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.h2, fontWeight: '800' }}>
                {triLang(lang, {
                  uk: 'Топ-100 арени',
                  ru: 'Топ-100 арены',
                  es: 'Top 100 de la Arena',
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
                  {manualRefreshBusy
                    ? triLang(lang, { uk: 'Оновлення...', ru: 'Обновление...', es: 'Actualizando…' })
                    : refreshCooldownLabel
                      ? refreshCooldownLabel
                      : triLang(lang, { uk: 'Оновити', ru: 'Обновить', es: 'Actualizar' })}
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
                  })}
                </Text>
              </View>
            ) : loading ? (
              <View style={{ paddingTop: 48, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={t.accent} />
              </View>
            ) : (
              <FlatList
                data={rows}
                keyExtractor={(item) => item.uid}
                extraData={`${myUid ?? ''}|${myArenaPlace ?? ''}|${myIsPremium ? 1 : 0}`}
                contentContainerStyle={{
                  paddingBottom: showMyRankFooter
                    ? 16 + stickyRankBarHeight + insets.bottom
                    : 24 + insets.bottom,
                }}
                ListEmptyComponent={
                  <View style={{ padding: 40, alignItems: 'center' }}>
                    <Ionicons name="trophy-outline" size={40} color={t.textSecond} />
                    <Text style={{ color: t.textMuted, fontSize: f.body, marginTop: 12, textAlign: 'center' }}>
                      {triLang(lang, {
                        uk: 'Поки що порожньо. Зіграй дуелі, щоб з’явитися в рейтингу.',
                        ru: 'Пока пусто. Сыграй дуэли, чтобы попасть в рейтинг.',
                        es: 'Por ahora la clasificación está vacía. Juega partidas para aparecer.',
                      })}
                    </Text>
                  </View>
                }
                ListHeaderComponent={
                  rows.length > 0 ? (
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
                        {triLang(lang, { uk: 'Учасник', ru: 'Участник', es: 'Participante' })}
                      </Text>
                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.82}
                        style={{
                          width: 74,
                          color: t.textGhost,
                          fontSize: f.label,
                          fontWeight: '600',
                          textAlign: 'right',
                        }}
                      >
                        {triLang(lang, { uk: 'Звання', ru: 'Звание', es: 'Rango' })}
                      </Text>
                    </View>
                  ) : null
                }
                renderItem={({ item }) => {
                  const isMe = myUid ? item.uid === myUid : false;
                  const isTop3 = item.place <= 3;
                  const totalXp = item.totalXp;
                  const lvl = getLevelFromXP(totalXp);
                  const rowAvatar = String(getBestAvatarForLevel(lvl));
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
                          streak: null,
                          leagueId: undefined,
                          uid: item.uid,
                          isPremium: item.isPremium,
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
                        opacity: pressed ? 0.75 : 1,
                      })}
                    >
                      <Text
                        style={{
                          width: 36,
                          fontSize: isTop3 ? 16 : 14,
                          color: isTop3 ? t.gold : t.textPrimary,
                          textAlign: 'center',
                          fontWeight: isTop3 ? '700' : '500',
                        }}
                      >
                        {item.place}
                      </Text>
                      <PremiumAvatarHalo
                        enabled={item.isPremium}
                        avatarSize={36}
                        maskColor={isMe ? t.accentBg : t.bgCard}
                        style={{ marginRight: 10 }}
                      >
                        <AvatarView avatar={rowAvatar} totalXP={totalXp} size={36} />
                      </PremiumAvatarHalo>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        {item.isPremium ? (
                          <PremiumGoldUserName text={item.displayName} fontSize={isTop3 ? 16 : 15} />
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
                        <Text numberOfLines={2} style={{ color: t.textMuted, fontSize: f.label, marginTop: 2 }}>
                          {`${triLang(lang, { uk: 'Місце', ru: 'Место', es: 'Puesto' })} ${item.place} · ${duelLabel} · ${triLang(lang, { uk: 'рів.', ru: 'ур.', es: 'nv.' })} ${lvl}`}
                        </Text>
                      </View>
                      <Image source={rankImg} style={{ width: 44, height: 44 }} resizeMode="contain" />
                    </Pressable>
                  );
                }}
              />
            )}

            {showMyRankFooter && myArena && (
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
                        adjustsFontSizeToFit
                      >
                        #{myArenaPlace.toLocaleString()}
                      </Text>
                    ) : myArenaPlaceLoading ? (
                      <ActivityIndicator size="small" color={t.textSecond} />
                    ) : (
                      <Text style={{ fontSize: 18, color: t.textMuted, textAlign: 'center' }}>—</Text>
                    )}
                  </View>
                  <PremiumAvatarHalo
                    enabled={myIsPremium}
                    avatarSize={36}
                    maskColor={t.accentBg}
                    style={{ marginRight: 10 }}
                  >
                    <AvatarView avatar={myAvatar} totalXP={myTotalXp} size={36} />
                  </PremiumAvatarHalo>
                  <View style={{ flex: 1, justifyContent: 'center', minWidth: 0 }}>
                    {myIsPremium ? (
                      <PremiumGoldUserName
                        text={myName.trim() || triLang(lang, { uk: 'Ви', ru: 'Вы', es: 'Tú' })}
                        fontSize={15}
                      />
                    ) : (
                      <Text
                        numberOfLines={1}
                        style={{ flex: 1, fontSize: 15, color: t.textPrimary, fontWeight: '700' }}
                      >
                        {myName.trim() || triLang(lang, { uk: 'Ви', ru: 'Вы', es: 'Tú' })}
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
                  </View>
                  {myRankImg ? (
                    <Image source={myRankImg} style={{ width: 40, height: 40 }} resizeMode="contain" />
                  ) : null}
                </View>
              </View>
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
