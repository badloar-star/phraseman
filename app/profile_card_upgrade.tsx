// PROFILE CARD — полноэкранный экран прокачки карточки профиля.
//
// ПОЛНЫЙ редизайн (старый bottom-sheet ProfileCardUpgradeModal снесён: не закрывался,
// глючил скролл, всё было свалено в кучу). Здесь:
//   • «герой» — большое ЖИВОЕ превью карточки по центру, которое можно ЛИСТАТЬ по всем
//     уровням 0..5 (свайп влево/вправо) → видно все будущие карточки = мотивация апгрейда;
//   • точки-индикатор уровней + понятная подпись «сейчас у тебя / следующий»;
//   • под превью — что добавит уровень (буллеты) и аккуратный выбор стиля/движения/фокуса
//     (только разблокированные на текущем уровне);
//   • одна крупная кнопка «Улучшить за N».
//
// Экран, а НЕ модалка → закрытие назад/крестиком никогда не ломается, скролл всегда ровный.
// Вся ЛОГИКА (уровни/цены/анти-чит/осколки) живёт в profile_card_system + сервере и здесь
// только потребляется — экран ничего не дублирует.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from '../components/SafeLinearGradient';
import ScreenGradient from '../components/ScreenGradient';
import AvatarView from '../components/AvatarView';
import ProfileCardMotionFx from '../components/ProfileCardMotionFx';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { hapticTap, hapticSuccess } from '../hooks/use-haptics';
import { triLang, type Lang } from '../constants/i18n';
import { getLevelFromXP } from '../constants/theme';
import { monoIcon, MONO_ICON } from '../constants/monoIcon';
import { getTitleString } from '../constants/titles';
import { getBestFrameForLevel } from '../constants/avatars';
import { safeRouterBack } from './navigation_back';
import { emitAppEvent } from './events';
import { syncToCloud } from './cloud_sync';
import { getShardsBalance } from './shards_system';
import { oskolokImageForPackShards } from './oskolok';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  canUseProfileCardMotion,
  canUseProfileCardPublicFocus,
  canUseProfileCardTheme,
  devGrantProfileCardLevel,
  devResetProfileCard,
  fxKindForProfileCard,
  getNextProfileCardLevel,
  getProfileCardLevelDef,
  getProfileCardSnapshot,
  PROFILE_CARD_LEVELS,
  PROFILE_CARD_LEVEL_NAME_RU,
  PROFILE_CARD_MAX_LEVEL,
  PROFILE_CARD_MOTIONS,
  PROFILE_CARD_PUBLIC_FOCUSES,
  PROFILE_CARD_SELLING_POINTS,
  PROFILE_CARD_THEMES,
  PROFILE_CARD_THEME_COLORS,
  profileCardLevelRoman,
  sellingPointText,
  setProfileCardMotion,
  setProfileCardPublicFocus,
  setProfileCardTheme,
  upgradeProfileCardLevel,
  type ProfileCardLevel,
  type ProfileCardMotion,
  type ProfileCardPublicFocus,
  type ProfileCardSnapshot,
  type ProfileCardTheme,
} from './profile_card_system';
import { profileCardLevelLabel } from '../components/profileCardLabel';

const SCREEN_W = Dimensions.get('window').width;
// Карточка-превью занимает почти всю ширину, с полями по бокам, чтобы при свайпе чуть
// выглядывали соседние уровни (подсказка «есть ещё»).
const CARD_PAGE_W = SCREEN_W;
const CARD_W = Math.min(300, SCREEN_W - 96);
const CARD_H = Math.round(CARD_W * 0.62);

type StatItem = { label: string; value: string };

const FALLBACK_SNAPSHOT: ProfileCardSnapshot = {
  level: 0,
  theme: 'classic',
  motion: 'none',
  publicFocus: 'balanced',
};
const PROFILE_CARD_DISPLAY_CLOUD_SYNC_DEFER_MS = 30_000;

type ProfileCardDisplayCloudSyncMode = 'immediate' | 'deferred';

function syncProfileCardDisplayToCloud(mode: ProfileCardDisplayCloudSyncMode): void {
  if (mode === 'immediate') {
    void syncToCloud({ forceNow: true });
    return;
  }
  void syncToCloud({ deferMs: PROFILE_CARD_DISPLAY_CLOUD_SYNC_DEFER_MS });
}

function formatCompact(value: number): string {
  const safe = Math.max(0, Math.floor(Number(value) || 0));
  if (safe >= 1_000_000) return `${(safe / 1_000_000).toFixed(safe >= 10_000_000 ? 0 : 1)}M`;
  if (safe >= 10_000) return `${Math.round(safe / 1000)}k`;
  if (safe >= 1000) return `${(safe / 1000).toFixed(1)}k`;
  return String(safe);
}

const LEAGUE_SHORT_RU = [
  'Медь', 'Бронза', 'Серебро', 'Золото', 'Платина', 'Изумруд',
  'Сапфир', 'Рубин', 'Алмаз', 'Чёрный алмаз', 'Эфир', 'Легенда',
];

/**
 * Как выглядит карточка на КОНКРЕТНОМ уровне `displayLevel` при выбранных игроком
 * theme/motion. До разблокировки темы (уровень<2) карточка показывается как classic,
 * движение — только с уровня доступности. Цвета берём из единого PROFILE_CARD_THEME_COLORS.
 */
function visualForLevel(snapshot: ProfileCardSnapshot, displayLevel: ProfileCardLevel) {
  const theme: ProfileCardTheme = displayLevel >= 2 ? snapshot.theme : 'classic';
  const motion: ProfileCardMotion = displayLevel >= 3 ? snapshot.motion : 'none';
  const colors = PROFILE_CARD_THEME_COLORS[theme] ?? PROFILE_CARD_THEME_COLORS.classic;
  return { theme, motion, colors };
}

export default function ProfileCardUpgradeScreen() {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [snapshot, setSnapshot] = useState<ProfileCardSnapshot>(FALLBACK_SNAPSHOT);
  const [shards, setShards] = useState(0);
  const [busy, setBusy] = useState(false);
  // Какой уровень сейчас в центре галереи (для подписи/кнопки/буллетов).
  const [pageLevel, setPageLevel] = useState<ProfileCardLevel>(0);
  const galleryRef = useRef<ScrollView>(null);
  // Метаданные игрока для превью (имя/аватар/лига/статы).
  const [meName, setMeName] = useState('');
  const [meAvatar, setMeAvatar] = useState<string | null>(null);
  const [meLevel, setMeLevel] = useState(1);
  const [stats, setStats] = useState<StatItem[]>([]);

  const currentLevel = snapshot.level;
  const nextLevel = useMemo(() => getNextProfileCardLevel(currentLevel), [currentLevel]);
  const nextDef = nextLevel === null ? null : getProfileCardLevelDef(nextLevel);

  const reload = useCallback(async () => {
    const [snap, balance] = await Promise.all([
      getProfileCardSnapshot().catch(() => FALLBACK_SNAPSHOT),
      getShardsBalance().catch(() => 0),
    ]);
    setSnapshot(snap);
    setShards(balance);
    // На входе центрируем галерею на текущем уровне игрока.
    setPageLevel((prev) => (prev === 0 && snap.level > 0 ? snap.level : prev));
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
      try { leagueId = Math.max(0, Math.floor(Number(JSON.parse(leagueRaw || '{}')?.leagueId) || 0)); } catch {}
      const streak = Math.max(0, parseInt(streakRaw || '0', 10) || 0);
      setMeName((nameRaw || '').trim() || `Level ${lvl}`);
      setMeLevel(lvl);
      setMeAvatar(avatarRaw || null);
      setStats([
        { label: 'Лига', value: LEAGUE_SHORT_RU[Math.min(LEAGUE_SHORT_RU.length - 1, leagueId)] ?? LEAGUE_SHORT_RU[0] },
        { label: 'XP', value: formatCompact(xp) },
        { label: 'Серия', value: String(streak) },
      ]);
    } catch { /* превью переживёт без статов */ }
  }, []);

  useEffect(() => {
    void reload();
    void loadMe();
  }, [reload, loadMe]);

  // После того как известен реальный уровень — доскроллить галерею к нему один раз.
  const didInitScroll = useRef(false);
  useEffect(() => {
    if (didInitScroll.current) return;
    if (snapshot.level <= 0) { didInitScroll.current = true; return; }
    didInitScroll.current = true;
    const target = snapshot.level;
    setPageLevel(target as ProfileCardLevel);
    requestAnimationFrame(() => {
      galleryRef.current?.scrollTo({ x: target * CARD_PAGE_W, animated: false });
    });
  }, [snapshot.level]);

  const notify = useCallback((type: 'success' | 'error' | 'info', messageRu: string) => {
    emitAppEvent('action_toast', { type, messageRu, messageUk: messageRu, messageEs: messageRu });
  }, []);

  const onGalleryScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / CARD_PAGE_W);
    const clamped = Math.max(0, Math.min(PROFILE_CARD_MAX_LEVEL, idx)) as ProfileCardLevel;
    setPageLevel((prev) => (prev === clamped ? prev : clamped));
  }, []);

  const handleUpgrade = useCallback(async () => {
    if (busy || !nextDef) return;
    hapticTap();
    setBusy(true);
    try {
      const result = await upgradeProfileCardLevel();
      if (result.ok) {
        await hapticSuccess();
        setShards(result.balance);
        const next = await getProfileCardSnapshot();
        setSnapshot(next);
        syncProfileCardDisplayToCloud('immediate');
        notify('success', `Карточка улучшена: ${profileCardLevelLabel(result.level, true)}`);
        // Доскроллим галерею к только что открытому уровню.
        requestAnimationFrame(() => {
          galleryRef.current?.scrollTo({ x: result.level * CARD_PAGE_W, animated: true });
        });
        setPageLevel(result.level);
        return;
      }
      if (result.reason === 'insufficient') {
        router.push({
          pathname: '/shards_shop',
          params: { need: String(Math.max(0, result.need ?? nextDef.cost - shards)), source: 'profile_card_upgrade' },
        } as any);
        return;
      }
      if (result.reason === 'cloud_error') {
        // Сервер мог уже применить апгрейд — перечитываем реальное состояние, не угадываем.
        syncProfileCardDisplayToCloud('immediate');
        getShardsBalance().then(setShards).catch(() => {});
        getProfileCardSnapshot().then(setSnapshot).catch(() => {});
        notify('error', 'Нет связи с сервером. Проверь соединение и попробуй снова.');
        return;
      }
      notify('error', 'Карточка не улучшилась. Попробуй снова.');
    } finally {
      setBusy(false);
    }
  }, [busy, nextDef, notify, router, shards]);

  const applyTheme = useCallback(async (theme: ProfileCardTheme) => {
    if (busy || !canUseProfileCardTheme(currentLevel, theme) || snapshot.theme === theme) return;
    hapticTap();
    setBusy(true);
    try {
      const next = await setProfileCardTheme(theme);
      setSnapshot(next);
      syncProfileCardDisplayToCloud('deferred');
    } catch {
      notify('error', 'Этот стиль пока закрыт');
    } finally {
      setBusy(false);
    }
  }, [busy, currentLevel, snapshot.theme, notify]);

  const applyMotion = useCallback(async (motion: ProfileCardMotion) => {
    if (busy || !canUseProfileCardMotion(currentLevel, motion) || snapshot.motion === motion) return;
    hapticTap();
    setBusy(true);
    try {
      const next = await setProfileCardMotion(motion);
      setSnapshot(next);
      syncProfileCardDisplayToCloud('deferred');
    } catch {
      notify('error', 'Эта анимация пока закрыта');
    } finally {
      setBusy(false);
    }
  }, [busy, currentLevel, snapshot.motion, notify]);

  const applyFocus = useCallback(async (focus: ProfileCardPublicFocus) => {
    if (busy || !canUseProfileCardPublicFocus(currentLevel, focus) || snapshot.publicFocus === focus) return;
    hapticTap();
    setBusy(true);
    try {
      const next = await setProfileCardPublicFocus(focus);
      setSnapshot(next);
      syncProfileCardDisplayToCloud('deferred');
    } catch {
      notify('error', 'Этот фокус пока закрыт');
    } finally {
      setBusy(false);
    }
  }, [busy, currentLevel, snapshot.publicFocus, notify]);

  const handleDevGrant = useCallback(async () => {
    if (!__DEV__ || busy) return;
    setBusy(true);
    try {
      const next = await devGrantProfileCardLevel();
      setSnapshot(next);
      notify('info', `DEV: уровень ${profileCardLevelRoman(next.level)} (бесплатно)`);
      requestAnimationFrame(() => galleryRef.current?.scrollTo({ x: next.level * CARD_PAGE_W, animated: true }));
      setPageLevel(next.level);
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
      notify('info', 'DEV: карточка сброшена');
      requestAnimationFrame(() => galleryRef.current?.scrollTo({ x: 0, animated: true }));
      setPageLevel(0);
    } finally {
      setBusy(false);
    }
  }, [busy, notify]);

  const levelName = (lvl: ProfileCardLevel) =>
    lang === 'ru' ? PROFILE_CARD_LEVEL_NAME_RU[lvl] : getProfileCardLevelDef(lvl).name;

  // ВСЕ уровни для галереи (0..5).
  const pages = useMemo(() => PROFILE_CARD_LEVELS.map((d) => d.level), []);

  const accentForTheme = (theme: ProfileCardTheme) => PROFILE_CARD_THEME_COLORS[theme]?.accent ?? '#94A3B8';

  return (
    <ScreenGradient>
      <View style={{ flex: 1 }}>
        {/* Шапка */}
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
          contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
        >
          {/* ГАЛЕРЕЯ превью уровней — горизонтальный свайп-пейджинг */}
          <ScrollView
            ref={galleryRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onGalleryScroll}
            scrollEventThrottle={16}
            decelerationRate="fast"
            style={{ marginTop: 6 }}
          >
            {pages.map((lvl) => {
              const vis = visualForLevel(snapshot, lvl);
              const isCurrent = lvl === currentLevel;
              const isLocked = lvl > currentLevel;
              return (
                <View key={lvl} style={{ width: CARD_PAGE_W, alignItems: 'center', paddingVertical: 8 }}>
                  <View style={{ width: CARD_W }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ color: vis.colors.accent, fontSize: f.caption, fontWeight: '900', letterSpacing: 0.5 }}>
                        {profileCardLevelRoman(lvl)} · {levelName(lvl)}
                      </Text>
                      {isCurrent ? (
                        <View style={{ backgroundColor: 'rgba(34,197,94,0.18)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ color: monoIcon(themeMode, '#22C55E'), fontSize: 10, fontWeight: '900' }}>
                            {triLang(lang as Lang, { ru: 'у тебя сейчас', uk: 'зараз у тебе', es: 'tu nivel', 'pt-BR': 'seu nível', vi: 'hiện tại', id: 'saat ini', tr: 'mevcut', pl: 'masz teraz' })}
                          </Text>
                        </View>
                      ) : isLocked ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(148,163,184,0.16)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Ionicons name="lock-closed" size={10} color={t.textMuted} />
                          <Text style={{ color: t.textMuted, fontSize: 10, fontWeight: '900' }}>{getProfileCardLevelDef(lvl).cost}</Text>
                          <Image source={oskolokImageForPackShards(getProfileCardLevelDef(lvl).cost)} style={{ width: 11, height: 11 }} contentFit="contain" />
                        </View>
                      ) : (
                        <Ionicons name="checkmark-circle" size={16} color={monoIcon(themeMode, '#22C55E')} />
                      )}
                    </View>

                    {/* Сама карточка-превью (живой FX) */}
                    <View style={{ width: CARD_W, height: CARD_H, borderRadius: 18, overflow: 'hidden', opacity: isLocked ? 0.96 : 1 }}>
                      <LinearGradient
                        colors={[`${vis.colors.accent}14`, `${vis.colors.accent}05`, '#0E1117']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ flex: 1, borderRadius: 18, borderWidth: 1.5, borderColor: vis.colors.accentStrong, padding: 14, justifyContent: 'space-between' }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View style={{ width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: vis.colors.accentSoft, borderWidth: 1, borderColor: vis.colors.accentStrong }}>
                            <AvatarView avatar={meAvatar || undefined} level={meLevel} size={38} auraId={null} />
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={{ color: monoIcon(themeMode, '#FFFFFF'), fontSize: f.body, fontWeight: '900' }} numberOfLines={1}>{meName}</Text>
                            <Text style={{ color: vis.colors.secondary, fontSize: 11, fontWeight: '800', marginTop: 2 }} numberOfLines={1}>
                              {getTitleString(meLevel, 'ru')}
                            </Text>
                          </View>
                          {lvl > 0 ? (
                            <View style={{ backgroundColor: vis.colors.accent, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                              <Text style={{ color: monoIcon(themeMode, '#15110A', MONO_ICON.onLight), fontSize: 11, fontWeight: '900' }}>{profileCardLevelRoman(lvl)}</Text>
                            </View>
                          ) : null}
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          {stats.slice(0, lvl >= 4 ? 3 : 2).map((s) => (
                            <View key={s.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7 }}>
                              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '900' }} numberOfLines={1}>{s.label}</Text>
                              <Text style={{ color: monoIcon(themeMode, '#FFFFFF'), fontSize: 13, fontWeight: '900', marginTop: 2 }} numberOfLines={1}>{s.value}</Text>
                            </View>
                          ))}
                        </View>
                        <ProfileCardMotionFx
                          kind={fxKindForProfileCard(lvl, vis.motion)}
                          radius={18}
                          accent={vis.colors.accent}
                          secondary={vis.colors.secondary}
                          accentSoft={vis.colors.accentSoft}
                          enabled={!isLocked || lvl === (pageLevel as number)}
                        />
                      </LinearGradient>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Точки-индикатор */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 }}>
            {pages.map((lvl) => (
              <View
                key={lvl}
                style={{
                  width: lvl === pageLevel ? 20 : 7,
                  height: 7,
                  borderRadius: 6,
                  backgroundColor: lvl === pageLevel ? '#FACC15' : 'rgba(148,163,184,0.4)',
                }}
              />
            ))}
          </View>
          <Text style={{ textAlign: 'center', color: t.textMuted, fontSize: 11, marginTop: 7 }}>
            {triLang(lang as Lang, {
              ru: 'листай, чтобы увидеть все уровни', uk: 'гортай, щоб побачити всі рівні', es: 'desliza para ver todos los niveles',
              'pt-BR': 'deslize para ver todos os níveis', vi: 'vuốt để xem mọi cấp độ', id: 'geser untuk lihat semua level',
              tr: 'tüm seviyeleri görmek için kaydır', pl: 'przesuwaj, aby zobaczyć wszystkie poziomy',
            })}
          </Text>

          {/* Что добавит уровень, который сейчас в центре */}
          <View style={{ marginHorizontal: 16, marginTop: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)', backgroundColor: 'rgba(167,139,250,0.07)', padding: 14 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '900', marginBottom: 10 }}>
              {pageLevel > currentLevel
                ? triLang(lang as Lang, { ru: `Что даст уровень «${levelName(pageLevel)}»`, uk: `Що дасть рівень «${levelName(pageLevel)}»`, es: `Qué da el nivel «${levelName(pageLevel)}»`, 'pt-BR': `O que dá o nível «${levelName(pageLevel)}»`, vi: `Cấp «${levelName(pageLevel)}» mang lại gì`, id: `Apa yang diberikan level «${levelName(pageLevel)}»`, tr: `«${levelName(pageLevel)}» seviyesi ne verir`, pl: `Co daje poziom «${levelName(pageLevel)}»` })
                : triLang(lang as Lang, { ru: `Уровень «${levelName(pageLevel)}» — уже у тебя`, uk: `Рівень «${levelName(pageLevel)}» — вже в тебе`, es: `Nivel «${levelName(pageLevel)}» — ya lo tienes`, 'pt-BR': `Nível «${levelName(pageLevel)}» — você já tem`, vi: `Cấp «${levelName(pageLevel)}» — bạn đã có`, id: `Level «${levelName(pageLevel)}» — sudah kamu miliki`, tr: `«${levelName(pageLevel)}» seviyesi — sende var`, pl: `Poziom «${levelName(pageLevel)}» — już masz` })}
            </Text>
            {PROFILE_CARD_SELLING_POINTS[pageLevel].map((point, idx, arr) => {
              const showNew = pageLevel > currentLevel && point.isNew;
              return (
                <View key={idx} style={{ flexDirection: 'row', gap: 8, marginBottom: idx === arr.length - 1 ? 0 : 7 }}>
                  <Ionicons name={showNew ? 'sparkles' : 'checkmark-circle'} size={15} color={showNew ? '#FACC15' : '#5FD0A0'} style={{ marginTop: 1 }} />
                  <Text style={{ color: t.textMuted, fontSize: f.caption, lineHeight: 18, flex: 1 }}>
                    {sellingPointText(point, lang)}
                    {showNew ? <Text style={{ color: monoIcon(themeMode, '#FACC15'), fontWeight: '900' }}>  · NEW</Text> : null}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* НАСТРОЙКИ карточки — стиль / движение / фокус (только разблокированные) */}
          {currentLevel >= 2 ? (
            <PickerSection
              title={triLang(lang as Lang, { ru: 'Стиль', uk: 'Стиль', es: 'Estilo', 'pt-BR': 'Estilo', vi: 'Kiểu', id: 'Gaya', tr: 'Stil', pl: 'Styl' })}
              t={t} f={f}
            >
              {PROFILE_CARD_THEMES.map((item) => {
                const selected = snapshot.theme === item.id;
                const locked = !canUseProfileCardTheme(currentLevel, item.id);
                if (locked) return null;
                const accent = accentForTheme(item.id);
                return (
                  <Chip key={item.id} testID={`profile-card-theme-${item.id}`} selected={selected} accent={accent} label={item.name} disabled={busy} onPress={() => applyTheme(item.id)} t={t} f={f} />
                );
              })}
            </PickerSection>
          ) : null}

          {currentLevel >= 3 ? (
            <PickerSection
              title={triLang(lang as Lang, { ru: 'Движение', uk: 'Рух', es: 'Movimiento', 'pt-BR': 'Movimento', vi: 'Chuyển động', id: 'Gerakan', tr: 'Hareket', pl: 'Ruch' })}
              t={t} f={f}
            >
              {PROFILE_CARD_MOTIONS.map((item) => {
                const selected = snapshot.motion === item.id;
                const locked = !canUseProfileCardMotion(currentLevel, item.id);
                if (locked) return null;
                return (
                  <Chip key={item.id} testID={`profile-card-motion-${item.id}`} selected={selected} accent="#A78BFA" label={item.name} disabled={busy} onPress={() => applyMotion(item.id)} t={t} f={f} />
                );
              })}
            </PickerSection>
          ) : null}

          {currentLevel >= 4 ? (
            <PickerSection
              title={triLang(lang as Lang, { ru: 'Публичный акцент', uk: 'Публічний акцент', es: 'Enfoque público', 'pt-BR': 'Foco público', vi: 'Điểm nhấn công khai', id: 'Fokus publik', tr: 'Herkese açık vurgu', pl: 'Publiczny akcent' })}
              t={t} f={f}
            >
              {PROFILE_CARD_PUBLIC_FOCUSES.map((item) => {
                const selected = snapshot.publicFocus === item.id;
                const locked = !canUseProfileCardPublicFocus(currentLevel, item.id);
                if (locked) return null;
                return (
                  <Chip key={item.id} testID={`profile-card-focus-${item.id}`} selected={selected} accent="#FACC15" label={item.name} disabled={busy} onPress={() => applyFocus(item.id)} t={t} f={f} />
                );
              })}
            </PickerSection>
          ) : null}

          {__DEV__ ? (
            <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 18 }}>
              <TouchableOpacity testID="profile-card-dev-grant" disabled={busy || !nextDef} onPress={handleDevGrant} activeOpacity={0.86}
                style={{ flex: 1, borderRadius: 12, paddingVertical: 11, alignItems: 'center', borderWidth: 1, borderColor: '#22C55E', backgroundColor: 'rgba(34,197,94,0.12)', opacity: busy || !nextDef ? 0.5 : 1 }}>
                <Text style={{ color: '#22C55E', fontSize: f.sub, fontWeight: '900' }}>⚙ DEV: +1 бесплатно</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="profile-card-dev-reset" disabled={busy || currentLevel === 0} onPress={handleDevReset} activeOpacity={0.86}
                style={{ borderRadius: 12, paddingVertical: 11, paddingHorizontal: 16, alignItems: 'center', borderWidth: 1, borderColor: '#94A3B8', backgroundColor: 'rgba(148,163,184,0.12)', opacity: busy || currentLevel === 0 ? 0.5 : 1 }}>
                <Text style={{ color: '#94A3B8', fontSize: f.sub, fontWeight: '900' }}>Сброс</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>

        {/* Закреплённая внизу кнопка апгрейда */}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 10, paddingBottom: insets.bottom + 12, backgroundColor: t.bgPrimary, borderTopWidth: 1, borderTopColor: t.border }}>
          <TouchableOpacity
            testID="profile-card-upgrade-submit"
            activeOpacity={0.88}
            disabled={busy || !nextDef}
            onPress={handleUpgrade}
            style={{ borderRadius: 16, paddingVertical: 15, alignItems: 'center', backgroundColor: !nextDef ? t.textGhost : '#FACC15', opacity: busy ? 0.7 : 1, flexDirection: 'row', justifyContent: 'center', gap: 8 }}
          >
            <Text style={{ color: monoIcon(themeMode, '#1A1205', MONO_ICON.onLight), fontSize: f.bodyLg, fontWeight: '900' }}>
              {nextDef
                ? triLang(lang as Lang, {
                    ru: `Улучшить до «${levelName(nextLevel as ProfileCardLevel)}» · ${nextDef.cost}`,
                    uk: `Покращити до «${levelName(nextLevel as ProfileCardLevel)}» · ${nextDef.cost}`,
                    es: `Mejorar a «${levelName(nextLevel as ProfileCardLevel)}» · ${nextDef.cost}`,
                    'pt-BR': `Melhorar para «${levelName(nextLevel as ProfileCardLevel)}» · ${nextDef.cost}`,
                    vi: `Nâng lên «${levelName(nextLevel as ProfileCardLevel)}» · ${nextDef.cost}`,
                    id: `Tingkatkan ke «${levelName(nextLevel as ProfileCardLevel)}» · ${nextDef.cost}`,
                    tr: `«${levelName(nextLevel as ProfileCardLevel)}» seviyesine yükselt · ${nextDef.cost}`,
                    pl: `Ulepsz do «${levelName(nextLevel as ProfileCardLevel)}» · ${nextDef.cost}`,
                  })
                : triLang(lang as Lang, {
                    ru: 'Максимальный уровень', uk: 'Максимальний рівень', es: 'Nivel máximo', 'pt-BR': 'Nível máximo',
                    vi: 'Cấp tối đa', id: 'Level maksimum', tr: 'Maksimum seviye', pl: 'Maksymalny poziom',
                  })}
            </Text>
            {busy ? (
              <ActivityIndicator size="small" color="#1A1205" />
            ) : nextDef ? (
              <Image source={oskolokImageForPackShards(nextDef.cost)} style={{ width: 18, height: 18 }} contentFit="contain" />
            ) : null}
          </TouchableOpacity>
        </View>
      </View>
    </ScreenGradient>
  );
}

function PickerSection({ title, children, t, f }: { title: string; children: React.ReactNode; t: any; f: any }) {
  return (
    <View style={{ marginHorizontal: 16, marginTop: 16 }}>
      <Text style={{ color: t.textPrimary, fontSize: f.label, fontWeight: '900', marginBottom: 9 }}>{title}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>
    </View>
  );
}

function Chip({
  label, selected, accent, disabled, onPress, testID, t, f,
}: {
  label: string; selected: boolean; accent: string; disabled?: boolean;
  onPress: () => void; testID?: string; t: any; f: any;
}) {
  return (
    <TouchableOpacity
      testID={testID}
      activeOpacity={0.82}
      disabled={disabled}
      onPress={onPress}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 7,
        borderRadius: 12, borderWidth: selected ? 1.5 : 1,
        borderColor: selected ? accent : t.border,
        backgroundColor: selected ? `${accent}1A` : t.bgSurface,
        paddingHorizontal: 12, paddingVertical: 9, opacity: disabled ? 0.7 : 1,
      }}
    >
      <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: `${accent}26`, borderWidth: 1, borderColor: accent, alignItems: 'center', justifyContent: 'center' }}>
        {selected ? <Ionicons name="checkmark" size={11} color={accent} /> : null}
      </View>
      <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '900' }}>{label}</Text>
    </TouchableOpacity>
  );
}
