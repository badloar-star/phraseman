import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
// PROFILE CARD — лестница из 5 уровней (решение владельца 2026-07-05).
//
// Экран = живое превью: табы I..V, карточка выбранного уровня с настоящим визуалом
// и эффектом, переключатель «Для тебя / Для всех» (полная карточка ↔ строка списка
// с бейджем), и одна кнопка покупки СЛЕДУЮЩЕГО уровня. Уровни покупаются строго
// по порядку — высокие уровни редкие, в этом их статусная ценность.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from '../components/SafeLinearGradient';
import ScreenGradient from '../components/ScreenGradient';
import AvatarView from '../components/AvatarView';
import ProfileCardMotionFx from '../components/ProfileCardMotionFx';
import ProfileCardBadge from '../components/ProfileCardBadge';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { hapticTap, hapticSuccess } from '../hooks/use-haptics';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { triLang, type Lang } from '../constants/i18n';
import { getLevelFromXP } from '../constants/theme';
import { monoIcon, MONO_ICON } from '../constants/monoIcon';
import { getTitleString } from '../constants/titles';
import { safeRouterBack } from './navigation_back';
import { emitAppEvent } from './events';
import { syncToCloud } from './cloud_sync';
import { getShardsBalance } from './shards_system';
import { oskolokImageForPackShards } from './oskolok';
import { readLifetimeProfileStatsCache } from './lifetime_profile_stats';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  devGrantProfileCardLevel,
  devResetProfileCard,
  fxKindForProfileCard,
  getNextProfileCardLevel,
  getProfileCardLegendNo,
  getProfileCardLevelDef,
  getProfileCardSnapshot,
  PROFILE_CARD_GRADIENTS,
  PROFILE_CARD_LEVEL_NAME_RU,
  PROFILE_CARD_MAX_LEVEL,
  PROFILE_CARD_SELLING_POINTS,
  PROFILE_CARD_SURFACES,
  PROFILE_CARD_THEME_COLORS,
  profileCardLevelRoman,
  sellingPointText,
  themeForProfileCardLevel,
  upgradeProfileCardLevel,
  type ProfileCardLevel,
  type ProfileCardLevelDef,
  type ProfileCardSnapshot,
} from './profile_card_system';
import { profileCardLevelLabel } from '../components/profileCardLabel';
import { ENABLE_PROFILE_CARD } from './config';

const SCREEN_W = Dimensions.get('window').width;
const CARD_W = Math.min(340, SCREEN_W - 48);

const PAID_LEVELS: ProfileCardLevel[] = [1, 2, 3, 4, 5];

type StatItem = { label: string; value: string };

type MePreview = {
  name: string;
  avatar: string | null;
  level: number;
  xp: number;
  stats: StatItem[];
  words: number | null;
  phrases: number | null;
  arenaWins: number | null;
  arenaMatches: number | null;
  appDays: number | null;
  longestStreak: number | null;
  legendNo: number | null;
};

const FALLBACK_SNAPSHOT: ProfileCardSnapshot = {
  level: 0,
  theme: 'classic',
  motion: 'none',
  publicFocus: 'balanced',
};

const FALLBACK_ME: MePreview = {
  name: '', avatar: null, level: 1, xp: 0, stats: [],
  words: null, phrases: null, arenaWins: null, arenaMatches: null,
  appDays: null, longestStreak: null, legendNo: null,
};

const LEAGUE_SHORT_RU = [
  'Медь', 'Бронза', 'Серебро', 'Золото', 'Платина', 'Изумруд',
  'Сапфир', 'Рубин', 'Алмаз', 'Чёрный алмаз', 'Эфир', 'Легенда',
];

function syncProfileCardDisplayToCloud(): void {
  void syncToCloud({ forceNow: true });
}

function formatCompact(value: number): string {
  const safe = Math.max(0, Math.floor(Number(value) || 0));
  if (safe >= 1_000_000) return `${(safe / 1_000_000).toFixed(safe >= 10_000_000 ? 0 : 1)}M`;
  if (safe >= 10_000) return `${Math.round(safe / 1000)}k`;
  if (safe >= 1000) return `${(safe / 1000).toFixed(1)}k`;
  return String(safe);
}

function visualForLevel(level: ProfileCardLevel) {
  const theme = themeForProfileCardLevel(level);
  return {
    theme,
    colors: PROFILE_CARD_THEME_COLORS[theme],
    gradient: PROFILE_CARD_GRADIENTS[theme],
    surfaces: PROFILE_CARD_SURFACES[theme],
  };
}

function unlockText(def: ProfileCardLevelDef, lang: string): string {
  switch (lang) {
    case 'uk': return def.unlockUk;
    case 'es': return def.unlockEs;
    case 'pt-BR': return def['unlockPt-BR'];
    case 'vi': return def.unlockVi;
    case 'id': return def.unlockId;
    case 'tr': return def.unlockTr;
    case 'pl': return def.unlockPl;
    default: return def.unlockRu;
  }
}

export default function ProfileCardUpgradeScreen() {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);

  const [snapshot, setSnapshot] = useState<ProfileCardSnapshot>(FALLBACK_SNAPSHOT);
  const [shards, setShards] = useState(0);
  const [busy, setBusy] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<ProfileCardLevel>(1);
  const [publicView, setPublicView] = useState(false);
  const [me, setMe] = useState<MePreview>(FALLBACK_ME);

  // Фича включена решением владельца 2026-07-05; гейт оставлен как аварийный рубильник.
  useEffect(() => {
    if (ENABLE_PROFILE_CARD) return;
    safeRouterBack(router, '/(tabs)/home' as any);
  }, [router]);

  const currentLevel = snapshot.level;
  const nextLevel = useMemo(() => getNextProfileCardLevel(currentLevel), [currentLevel]);
  const selectedDef = getProfileCardLevelDef(selectedLevel);
  const vis = visualForLevel(selectedLevel);

  const reload = useCallback(async () => {
    const [snap, balance] = await Promise.all([
      getProfileCardSnapshot().catch(() => FALLBACK_SNAPSHOT),
      getShardsBalance().catch(() => 0),
    ]);
    setSnapshot(snap);
    setShards(balance);
    // Открываем экран на следующем покупаемом уровне (или на максимуме, если всё куплено).
    setSelectedLevel(getNextProfileCardLevel(snap.level) ?? PROFILE_CARD_MAX_LEVEL);
  }, []);

  const loadMe = useCallback(async () => {
    try {
      const [[, nameRaw], [, xpRaw], [, avatarRaw], [, streakRaw], [, leagueRaw]] =
        await AsyncStorage.multiGet([
          'user_name', 'user_total_xp', 'user_avatar', 'streak_count', 'league_state_v3',
        ]);
      const xp = parseInt(xpRaw || '0', 10) || 0;
      const lvl = getLevelFromXP(xp);
      let leagueId = 0;
      try {
        leagueId = Math.max(0, Math.floor(Number(JSON.parse(leagueRaw || '{}')?.leagueId) || 0));
      } catch {}
      const streak = Math.max(0, parseInt(streakRaw || '0', 10) || 0);
      const [lifetime, legendNo] = await Promise.all([
        readLifetimeProfileStatsCache().catch(() => null),
        getProfileCardLegendNo().catch(() => null),
      ]);
      setMe({
        name: (nameRaw || '').trim() || `Level ${lvl}`,
        avatar: avatarRaw || null,
        level: lvl,
        xp,
        stats: [
          { label: 'Лига', value: LEAGUE_SHORT_RU[Math.min(LEAGUE_SHORT_RU.length - 1, leagueId)] ?? LEAGUE_SHORT_RU[0] },
          { label: 'XP', value: formatCompact(xp) },
          { label: triLang(lang as Lang, { ru: 'Серия', uk: 'Серія', es: 'Racha', 'pt-BR': 'Sequência', vi: 'Chuỗi', id: 'Rentetan', tr: 'Seri', pl: 'Seria' }), value: String(streak) },
        ],
        words: lifetime ? lifetime.wordsLearned : null,
        phrases: lifetime ? lifetime.phrasesLearned : null,
        arenaWins: lifetime ? lifetime.arenaWins : null,
        arenaMatches: lifetime ? lifetime.arenaWins + lifetime.arenaLosses : null,
        appDays: lifetime ? lifetime.appDaysUnion : null,
        longestStreak: lifetime ? lifetime.longestStreakDays : null,
        legendNo,
      });
    } catch { /* preview survives without personal stats */ }
  }, [lang]);

  useEffect(() => {
    void reload();
    void loadMe();
  }, [reload, loadMe]);

  const notify = useCallback((type: 'success' | 'error' | 'info', messageRu: string) => {
    emitAppEvent('action_toast', { type, messageRu, messageUk: messageRu, messageEs: messageRu });
  }, []);

  const handleUpgrade = useCallback(async () => {
    if (busy || !nextLevel || selectedLevel !== nextLevel) return;
    hapticTap();
    const previousSnapshot = snapshot;
    const def = getProfileCardLevelDef(nextLevel);
    setBusy(true);
    try {
      const result = await upgradeProfileCardLevel();
      if (result.ok === true) {
        await hapticSuccess();
        setShards(result.balance);
        const next = await getProfileCardSnapshot();
        setSnapshot(next);
        setSelectedLevel(getNextProfileCardLevel(next.level) ?? PROFILE_CARD_MAX_LEVEL);
        if (result.legendNo) {
          setMe((prev) => ({ ...prev, legendNo: result.legendNo ?? prev.legendNo }));
        }
        syncProfileCardDisplayToCloud();
        notify('success', `Карточка улучшена: ${profileCardLevelLabel(result.level, true)}`);
        return;
      }
      setSnapshot(previousSnapshot);
      if (result.ok === false && result.reason === 'insufficient') {
        router.push({
          pathname: '/shards_shop',
          params: { need: String(Math.max(0, result.need ?? def.cost - shards)), source: 'profile_card_upgrade' },
        } as any);
        return;
      }
      if (result.ok === false && result.reason === 'cloud_error') {
        syncProfileCardDisplayToCloud();
        getShardsBalance().then(setShards).catch(() => {});
        getProfileCardSnapshot().then(setSnapshot).catch(() => {});
        notify('error', triLang(lang as Lang, {
          ru: 'Не получилось обновить карточку. Попробуй ещё раз.',
          uk: 'Не вдалося оновити картку. Спробуй ще раз.',
          es: 'No se pudo mejorar la tarjeta. Inténtalo de nuevo.',
          'pt-BR': 'Não foi possível melhorar o cartão. Tente novamente.',
          vi: 'Không thể nâng cấp thẻ. Hãy thử lại.',
          id: 'Kartu belum bisa ditingkatkan. Coba lagi.',
          tr: 'Kart yükseltilemedi. Tekrar dene.',
          pl: 'Nie udało się ulepszyć karty. Spróbuj ponownie.',
        }));
        return;
      }
      notify('error', triLang(lang as Lang, {
        ru: 'Карточка не улучшилась. Попробуй снова.',
        uk: 'Картку не вдалося покращити. Спробуй знову.',
        es: 'No se pudo mejorar la tarjeta. Inténtalo de nuevo.',
        'pt-BR': 'Não foi possível melhorar o cartão. Tente novamente.',
        vi: 'Không nâng cấp được thẻ. Hãy thử lại.',
        id: 'Kartu gagal ditingkatkan. Coba lagi.',
        tr: 'Kart yükseltilemedi. Tekrar dene.',
        pl: 'Nie udało się ulepszyć karty. Spróbuj ponownie.',
      }));
    } finally {
      setBusy(false);
    }
  }, [busy, lang, nextLevel, notify, router, selectedLevel, shards, snapshot]);

  const handleDevGrant = useCallback(async () => {
    if (!__DEV__ || busy) return;
    setBusy(true);
    try {
      const next = await devGrantProfileCardLevel();
      setSnapshot(next);
      setSelectedLevel(getNextProfileCardLevel(next.level) ?? PROFILE_CARD_MAX_LEVEL);
      notify('info', `DEV: уровень ${profileCardLevelRoman(next.level)} бесплатно`);
    } finally {
      setBusy(false);
    }
  }, [busy, notify]);

  const handleDevReset = useCallback(async () => {
    if (!__DEV__ || busy) return;
    setBusy(true);
    try {
      const next = await devResetProfileCard();
      setSnapshot(next);
      setSelectedLevel(1);
      notify('info', 'DEV: карточка сброшена');
    } finally {
      setBusy(false);
    }
  }, [busy, notify]);

  if (!ENABLE_PROFILE_CARD) {
    return null;
  }

  const levelName = (lvl: ProfileCardLevel) =>
    lang === 'ru' ? PROFILE_CARD_LEVEL_NAME_RU[lvl] : getProfileCardLevelDef(lvl).name;

  const isOwned = selectedLevel <= currentLevel;
  const isNextPurchasable = nextLevel !== null && selectedLevel === nextLevel;
  const isLockedAhead = nextLevel !== null && selectedLevel > nextLevel;
  const statCount = selectedLevel >= 1 ? 3 : 2;
  const winrateText = me.arenaMatches && me.arenaMatches > 0 && me.arenaWins !== null
    ? `${Math.round((me.arenaWins / me.arenaMatches) * 100)}%`
    : '—';

  const miniRow = (icon: string, value: string, label: string) => (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8,
      backgroundColor: vis.surfaces.surface, borderWidth: 1, borderColor: vis.surfaces.surfaceBorder,
      borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7,
    }}>
      <Text style={{ fontSize: 12 }}>{icon}</Text>
      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '900', flex: 1 }} numberOfLines={1}>
        {label.toUpperCase()}
      </Text>
      <Text style={{ color: monoIcon(themeMode, '#FFFFFF'), fontSize: 12, fontWeight: '900' }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );

  return (
    <ScreenGradient>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: insets.top + 4, paddingBottom: 6 }}>
          <TouchableOpacity
            testID="profile-card-screen-back"
            onPress={() => { hapticTap(); safeRouterBack(router, '/avatar_select'); }}
            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={24} color={t.textPrimary} />
          </TouchableOpacity>
          <Text style={{ flex: 1, textAlign: 'center', color: t.textPrimary, fontSize: f.h2, fontWeight: '900' }}>
            {triLang(lang as Lang, {
              ru: 'Карточка профиля', uk: 'Картка профілю', es: 'Tarjeta de perfil',
              'pt-BR': 'Cartão de perfil', vi: 'Thẻ hồ sơ', id: 'Kartu profil', tr: 'Profil kartı', pl: 'Karta profilu',
            })}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: t.bgSurface, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 7, marginRight: 4 }}>
            <Text style={{ color: monoIcon(themeMode, '#FACC15'), fontSize: f.body, fontWeight: '900' }}>{shards}</Text>
            <Image source={oskolokImageForPackShards(shards)} style={{ width: 16, height: 16 }} contentFit="contain" />
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: bottomInset + 116 }}
        >
          {/* Табы уровней I..V: куплено ✓ · выбран · заперт */}
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
            {PAID_LEVELS.map((lvl) => {
              const owned = lvl <= currentLevel;
              const selected = lvl === selectedLevel;
              const chipColors = PROFILE_CARD_THEME_COLORS[themeForProfileCardLevel(lvl)];
              return (
                <TouchableOpacity
                  key={lvl}
                  testID={`profile-card-level-tab-${lvl}`}
                  onPress={() => { hapticTap(); setSelectedLevel(lvl); }}
                  activeOpacity={0.85}
                  style={{
                    flex: 1,
                    borderRadius: 12,
                    paddingVertical: 9,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: selected ? chipColors.accent : t.border,
                    backgroundColor: selected ? chipColors.accentSoft : t.bgSurface,
                  }}
                >
                  <Text style={{
                    color: selected ? chipColors.accent : owned ? t.textSecond : t.textMuted,
                    fontSize: f.sub,
                    fontWeight: '900',
                  }}>
                    {owned ? '✓ ' : ''}{profileCardLevelRoman(lvl)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: vis.colors.accent, fontSize: f.caption, fontWeight: '900', letterSpacing: 0.5, marginBottom: 8 }}>
              {`${profileCardLevelRoman(selectedLevel)} · ${levelName(selectedLevel)}`}
            </Text>

            {!publicView ? (
              <View style={{
                width: CARD_W,
                borderRadius: 18,
                overflow: 'hidden',
                borderWidth: 1.5,
                borderColor: vis.colors.accentStrong,
                shadowColor: vis.colors.shadowColor,
                shadowOpacity: 0.3,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 6 },
                elevation: 8,
              }}>
                <LinearGradient
                  colors={vis.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={{ padding: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: vis.colors.accentSoft, borderWidth: 1, borderColor: vis.colors.accentStrong }}>
                      <AvatarView avatar={me.avatar || undefined} level={me.level} size={39} auraId={null} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: monoIcon(themeMode, '#FFFFFF'), fontSize: f.body, fontWeight: '900' }} numberOfLines={1}>{me.name}</Text>
                      <Text style={{ color: vis.colors.secondary, fontSize: 11, fontWeight: '800', marginTop: 2 }} numberOfLines={1}>
                        {getTitleString(me.level, lang)}
                      </Text>
                    </View>
                    {selectedLevel >= 1 ? (
                      <View style={{ backgroundColor: vis.colors.accent, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ color: monoIcon(themeMode, '#15110A', MONO_ICON.onLight), fontSize: 11, fontWeight: '900' }}>
                          {profileCardLevelRoman(selectedLevel)}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                    {me.stats.slice(0, statCount).map((s) => (
                      <View key={s.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '900' }} numberOfLines={1}>{s.label}</Text>
                        <Text style={{ color: monoIcon(themeMode, '#FFFFFF'), fontSize: 13, fontWeight: '900', marginTop: 2 }} numberOfLines={1}>{s.value}</Text>
                      </View>
                    ))}
                  </View>

                  {selectedLevel >= 2 ? miniRow('📚',
                    `${(me.words ?? 0).toLocaleString()} · ${(me.phrases ?? 0).toLocaleString()}`,
                    triLang(lang as Lang, { ru: 'слова · фразы', uk: 'слова · фрази', es: 'palabras · frases', 'pt-BR': 'palavras · frases', vi: 'từ · cụm từ', id: 'kata · frasa', tr: 'kelime · kalıp', pl: 'słowa · frazy' }),
                  ) : null}
                  {selectedLevel >= 3 ? miniRow('⚔️',
                    `${(me.arenaWins ?? 0).toLocaleString()} · ${winrateText}`,
                    triLang(lang as Lang, { ru: 'арена: победы · винрейт', uk: 'арена: перемоги · вінрейт', es: 'arena: victorias · %', 'pt-BR': 'arena: vitórias · %', vi: 'đấu trường: thắng · %', id: 'arena: menang · %', tr: 'arena: galibiyet · %', pl: 'arena: wygrane · %' }),
                  ) : null}
                  {selectedLevel >= 4 ? miniRow('🧭',
                    `${(me.appDays ?? 0).toLocaleString()} · 🔥${(me.longestStreak ?? 0).toLocaleString()}`,
                    triLang(lang as Lang, { ru: 'дней · рекордная серия', uk: 'днів · рекордна серія', es: 'días · racha récord', 'pt-BR': 'dias · sequência recorde', vi: 'ngày · chuỗi kỷ lục', id: 'hari · rentetan rekor', tr: 'gün · rekor seri', pl: 'dni · rekordowa seria' }),
                  ) : null}
                  {selectedLevel >= 5 ? (
                    <View style={{
                      marginTop: 8, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10,
                      borderWidth: 1, borderColor: vis.colors.accentStrong, alignItems: 'center',
                      backgroundColor: vis.surfaces.surface,
                    }}>
                      <Text style={{ color: vis.colors.secondary, fontSize: 12, fontWeight: '900' }} numberOfLines={1}>
                        {me.legendNo && currentLevel >= 5
                          ? triLang(lang as Lang, { ru: `👑 Легенда №${me.legendNo}`, uk: `👑 Легенда №${me.legendNo}`, es: `👑 Leyenda #${me.legendNo}`, 'pt-BR': `👑 Lenda #${me.legendNo}`, vi: `👑 Huyền thoại #${me.legendNo}`, id: `👑 Legenda #${me.legendNo}`, tr: `👑 Efsane #${me.legendNo}`, pl: `👑 Legenda #${me.legendNo}` })
                          : triLang(lang as Lang, { ru: '👑 Легенда — № выдаётся при покупке', uk: '👑 Легенда — № видається при покупці', es: '👑 Leyenda: el nº se asigna al comprar', 'pt-BR': '👑 Lenda: o nº é atribuído na compra', vi: '👑 Huyền thoại — số được cấp khi mua', id: '👑 Legenda — nomor diberikan saat pembelian', tr: '👑 Efsane — numara satın alınca verilir', pl: '👑 Legenda — nr nadawany przy zakupie' })}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <ProfileCardMotionFx
                  kind={fxKindForProfileCard(selectedLevel, 'none')}
                  radius={18}
                  accent={vis.colors.accent}
                  secondary={vis.colors.secondary}
                  accentSoft={vis.colors.accentSoft}
                  enabled={selectedLevel >= 1}
                />
              </View>
            ) : (
              <View style={{ width: CARD_W }}>
                {/* «Для всех»: так тебя увидят в списках — строка с бейджем уровня */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: t.bgSurface, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11, borderWidth: 1, borderColor: t.border }}>
                  <AvatarView avatar={me.avatar || undefined} level={me.level} size={36} auraId={null} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }} numberOfLines={1}>{me.name}</Text>
                    {selectedLevel >= 1 ? (
                      <ProfileCardBadge level={selectedLevel} size="sm" style={{ marginTop: 3 }} />
                    ) : null}
                  </View>
                  <Text style={{ color: t.gold, fontSize: f.sub, fontWeight: '900' }}>{formatCompact(me.xp)} XP</Text>
                </View>
                <Text style={{ color: t.textMuted, fontSize: f.caption, textAlign: 'center', marginTop: 10, lineHeight: 18 }}>
                  {triLang(lang as Lang, {
                    ru: 'Бейдж уровня виден рядом с твоим ником в Друзьях, Арене и Лиге. Полная карточка — при тапе на игрока.',
                    uk: 'Бейдж рівня видно біля твого ніка в Друзях, Арені та Лізі. Повна картка — по тапу на гравця.',
                    es: 'La insignia de nivel aparece junto a tu nombre en Amigos, Arena y Liga. La tarjeta completa, al tocar al jugador.',
                    'pt-BR': 'O selo de nível aparece ao lado do seu nome em Amigos, Arena e Liga. O cartão completo, ao tocar no jogador.',
                    vi: 'Huy hiệu cấp hiển thị cạnh tên bạn trong Bạn bè, Đấu trường và Giải đấu. Thẻ đầy đủ hiện khi chạm vào người chơi.',
                    id: 'Lencana level tampil di samping namamu di Teman, Arena, dan Liga. Kartu penuh muncul saat pemain diketuk.',
                    tr: 'Seviye rozeti Arkadaşlar, Arena ve Lig’de adının yanında görünür. Tam kart, oyuncuya dokununca açılır.',
                    pl: 'Odznaka poziomu jest widoczna obok twojego nicku w Znajomych, Arenie i Lidze. Pełna karta — po tapnięciu gracza.',
                  })}
                </Text>
              </View>
            )}

            {/* Переключатель «Для тебя / Для всех» */}
            <View style={{ flexDirection: 'row', backgroundColor: t.bgSurface, borderRadius: 999, padding: 3, marginTop: 14, borderWidth: 1, borderColor: t.border }}>
              {[false, true].map((isPublic) => (
                <TouchableOpacity
                  key={String(isPublic)}
                  testID={isPublic ? 'profile-card-view-public' : 'profile-card-view-self'}
                  onPress={() => { hapticTap(); setPublicView(isPublic); }}
                  activeOpacity={0.85}
                  style={{
                    borderRadius: 999,
                    paddingVertical: 7,
                    paddingHorizontal: 18,
                    backgroundColor: publicView === isPublic ? t.bgSurface2 : 'transparent',
                  }}
                >
                  <Text style={{
                    color: publicView === isPublic ? t.textPrimary : t.textMuted,
                    fontSize: f.caption,
                    fontWeight: '900',
                  }}>
                    {isPublic
                      ? triLang(lang as Lang, { ru: 'Для всех', uk: 'Для всіх', es: 'Para todos', 'pt-BR': 'Para todos', vi: 'Cho mọi người', id: 'Untuk semua', tr: 'Herkese', pl: 'Dla wszystkich' })
                      : triLang(lang as Lang, { ru: 'Для тебя', uk: 'Для тебе', es: 'Para ti', 'pt-BR': 'Para você', vi: 'Cho bạn', id: 'Untukmu', tr: 'Sana', pl: 'Dla ciebie' })}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ marginTop: 16, borderRadius: 16, borderWidth: 1, borderColor: vis.colors.accentStrong, backgroundColor: vis.colors.accentSoft, padding: 14 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '900', marginBottom: 4 }}>
              {levelName(selectedLevel)}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.caption, lineHeight: 18 }}>
              {unlockText(selectedDef, lang)}
            </Text>
          </View>

          <View style={{ marginTop: 14, gap: 8 }}>
            {PROFILE_CARD_SELLING_POINTS[selectedLevel].map((point, idx) => (
              <View key={idx} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                <Ionicons name={point.isNew ? 'sparkles' : 'checkmark-circle'} size={15} color={point.isNew ? vis.colors.accent : '#5FD0A0'} style={{ marginTop: 2 }} />
                <Text style={{ color: t.textMuted, fontSize: f.caption, lineHeight: 18, flex: 1 }}>
                  {sellingPointText(point, lang)}
                  {point.isNew && !isOwned ? <Text style={{ color: monoIcon(themeMode, vis.colors.accent), fontWeight: '900' }}> · NEW</Text> : null}
                </Text>
              </View>
            ))}
          </View>

          {__DEV__ ? (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
              <TouchableOpacity testID="profile-card-dev-grant" disabled={busy || !nextLevel} onPress={handleDevGrant} activeOpacity={0.86}
                style={{ flex: 1, borderRadius: 12, paddingVertical: 11, alignItems: 'center', borderWidth: 1, borderColor: '#22C55E', backgroundColor: 'rgba(34,197,94,0.12)', opacity: busy || !nextLevel ? 0.5 : 1 }}>
                <Text style={{ color: '#22C55E', fontSize: f.sub, fontWeight: '900' }}>DEV: +1 бесплатно</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="profile-card-dev-reset" disabled={busy || currentLevel === 0} onPress={handleDevReset} activeOpacity={0.86}
                style={{ borderRadius: 12, paddingVertical: 11, paddingHorizontal: 16, alignItems: 'center', borderWidth: 1, borderColor: '#94A3B8', backgroundColor: 'rgba(148,163,184,0.12)', opacity: busy || currentLevel === 0 ? 0.5 : 1 }}>
                <Text style={{ color: '#94A3B8', fontSize: f.sub, fontWeight: '900' }}>Сброс</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>

        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 10, paddingBottom: bottomInset + 12, backgroundColor: t.bgPrimary, borderTopWidth: 1, borderTopColor: t.border }}>
          <TouchableOpacity
            testID="profile-card-upgrade-submit"
            activeOpacity={0.88}
            disabled={busy || isOwned || isLockedAhead || !isNextPurchasable}
            onPress={handleUpgrade}
            style={{
              borderRadius: 16,
              paddingVertical: 15,
              alignItems: 'center',
              backgroundColor: isOwned || isLockedAhead ? t.bgSurface2 : '#FACC15',
              opacity: busy ? 0.7 : 1,
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Text style={{
              color: isOwned || isLockedAhead ? t.textMuted : monoIcon(themeMode, '#1A1205', MONO_ICON.onLight),
              fontSize: f.bodyLg,
              fontWeight: '900',
            }}>
              {isOwned
                ? triLang(lang as Lang, { ru: '✓ Уже применено', uk: '✓ Уже застосовано', es: '✓ Ya aplicado', 'pt-BR': '✓ Já aplicado', vi: '✓ Đã áp dụng', id: '✓ Sudah diterapkan', tr: '✓ Zaten uygulandı', pl: '✓ Już zastosowano' })
                : isLockedAhead && nextLevel
                  ? triLang(lang as Lang, {
                      ru: `Сначала уровень ${profileCardLevelRoman(nextLevel)}`,
                      uk: `Спочатку рівень ${profileCardLevelRoman(nextLevel)}`,
                      es: `Primero el nivel ${profileCardLevelRoman(nextLevel)}`,
                      'pt-BR': `Primeiro o nível ${profileCardLevelRoman(nextLevel)}`,
                      vi: `Trước tiên cấp ${profileCardLevelRoman(nextLevel)}`,
                      id: `Level ${profileCardLevelRoman(nextLevel)} dulu`,
                      tr: `Önce seviye ${profileCardLevelRoman(nextLevel)}`,
                      pl: `Najpierw poziom ${profileCardLevelRoman(nextLevel)}`,
                    })
                  : triLang(lang as Lang, {
                      ru: `Улучшить · ${selectedDef.cost}`,
                      uk: `Покращити · ${selectedDef.cost}`,
                      es: `Mejorar · ${selectedDef.cost}`,
                      'pt-BR': `Melhorar · ${selectedDef.cost}`,
                      vi: `Nâng cấp · ${selectedDef.cost}`,
                      id: `Tingkatkan · ${selectedDef.cost}`,
                      tr: `Yükselt · ${selectedDef.cost}`,
                      pl: `Ulepsz · ${selectedDef.cost}`,
                    })}
            </Text>
            {busy ? (
              <ActivityIndicator size="small" color="#1A1205" />
            ) : isNextPurchasable && !isOwned ? (
              <Image source={oskolokImageForPackShards(selectedDef.cost)} style={{ width: 18, height: 18 }} contentFit="contain" />
            ) : null}
          </TouchableOpacity>
        </View>
      </View>
    </ScreenGradient>
  );
}
