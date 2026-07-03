import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
// PROFILE CARD - one-step upgrade flow.
//
// The old level gallery and style/motion/focus menus are intentionally gone. The product
// shape is now a single decision: preview the new Pro card, then apply it for shards.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  devGrantProfileCardLevel,
  devResetProfileCard,
  fxKindForProfileCard,
  getNextProfileCardLevel,
  getProfileCardLevelDef,
  getProfileCardSnapshot,
  PROFILE_CARD_LEVEL_NAME_RU,
  PROFILE_CARD_SELLING_POINTS,
  PROFILE_CARD_THEME_COLORS,
  profileCardLevelRoman,
  sellingPointText,
  upgradeProfileCardLevel,
  type ProfileCardLevel,
  type ProfileCardSnapshot,
  type ProfileCardTheme,
} from './profile_card_system';
import { profileCardLevelLabel } from '../components/profileCardLabel';
import { ENABLE_DEV_TOOLS } from './config';

const SCREEN_W = Dimensions.get('window').width;
const CARD_W = Math.min(326, SCREEN_W - 48);
const CARD_H = Math.round(CARD_W * 0.64);

type StatItem = { label: string; value: string };

const FALLBACK_SNAPSHOT: ProfileCardSnapshot = {
  level: 0,
  theme: 'classic',
  motion: 'none',
  publicFocus: 'balanced',
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
  const theme: ProfileCardTheme = level >= 1 ? 'gold' : 'classic';
  const colors = PROFILE_CARD_THEME_COLORS[theme] ?? PROFILE_CARD_THEME_COLORS.classic;
  return { theme, colors };
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
  const [previewingUpgrade, setPreviewingUpgrade] = useState(false);
  const previewBeforeApplyRef = useRef<ProfileCardSnapshot | null>(null);

  const [meName, setMeName] = useState('');
  const [meAvatar, setMeAvatar] = useState<string | null>(null);
  const [meLevel, setMeLevel] = useState(1);
  const [stats, setStats] = useState<StatItem[]>([]);

  useEffect(() => {
    if (ENABLE_DEV_TOOLS) return;
    safeRouterBack(router, '/(tabs)/home' as any);
  }, [router]);

  if (!ENABLE_DEV_TOOLS) {
    return null;
  }

  const currentLevel = previewingUpgrade
    ? (previewBeforeApplyRef.current?.level ?? 0)
    : snapshot.level;
  const nextLevel = useMemo(() => getNextProfileCardLevel(currentLevel), [currentLevel]);
  const nextDef = nextLevel === null ? null : getProfileCardLevelDef(nextLevel);
  const displayLevel: ProfileCardLevel = previewingUpgrade && nextDef ? 1 : currentLevel;
  const isApplied = !previewingUpgrade && currentLevel >= 1 && !nextDef;
  const vis = visualForLevel(displayLevel);

  const reload = useCallback(async () => {
    const [snap, balance] = await Promise.all([
      getProfileCardSnapshot().catch(() => FALLBACK_SNAPSHOT),
      getShardsBalance().catch(() => 0),
    ]);
    setSnapshot(snap);
    setShards(balance);
    setPreviewingUpgrade(false);
    previewBeforeApplyRef.current = null;
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
      setMeName((nameRaw || '').trim() || `Level ${lvl}`);
      setMeLevel(lvl);
      setMeAvatar(avatarRaw || null);
      setStats([
        { label: 'Лига', value: LEAGUE_SHORT_RU[Math.min(LEAGUE_SHORT_RU.length - 1, leagueId)] ?? LEAGUE_SHORT_RU[0] },
        { label: 'XP', value: formatCompact(xp) },
        { label: 'Серия', value: String(streak) },
      ]);
    } catch { /* preview survives without personal stats */ }
  }, []);

  useEffect(() => {
    void reload();
    void loadMe();
  }, [reload, loadMe]);

  const notify = useCallback((type: 'success' | 'error' | 'info', messageRu: string) => {
    emitAppEvent('action_toast', { type, messageRu, messageUk: messageRu, messageEs: messageRu });
  }, []);

  const handlePreviewUpgrade = useCallback(() => {
    if (busy || !nextDef || previewingUpgrade) return;
    hapticTap();
    const previousSnapshot = snapshot;
    previewBeforeApplyRef.current = previousSnapshot;
    setSnapshot({ ...previousSnapshot, level: 1 });
    setPreviewingUpgrade(true);
  }, [busy, nextDef, previewingUpgrade, snapshot]);

  const handleUpgrade = useCallback(async () => {
    if (busy || !nextDef) return;
    hapticTap();
    const previousSnapshot = previewBeforeApplyRef.current ?? snapshot;
    setBusy(true);
    try {
      const result = await upgradeProfileCardLevel();
      if (result.ok === true) {
        await hapticSuccess();
        setShards(result.balance);
        const next = await getProfileCardSnapshot();
        setSnapshot(next);
        setPreviewingUpgrade(false);
        previewBeforeApplyRef.current = null;
        syncProfileCardDisplayToCloud();
        notify('success', `Карточка улучшена: ${profileCardLevelLabel(result.level, true)}`);
        return;
      }
      setSnapshot(previousSnapshot);
      setPreviewingUpgrade(false);
      previewBeforeApplyRef.current = null;
      if (result.ok === false && result.reason === 'insufficient') {
        router.push({
          pathname: '/shards_shop',
          params: { need: String(Math.max(0, result.need ?? nextDef.cost - shards)), source: 'profile_card_upgrade' },
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
  }, [busy, lang, nextDef, notify, router, shards, snapshot]);

  const handleDevGrant = useCallback(async () => {
    if (!__DEV__ || busy) return;
    setBusy(true);
    try {
      const next = await devGrantProfileCardLevel();
      setSnapshot(next);
      setPreviewingUpgrade(false);
      previewBeforeApplyRef.current = null;
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
      setPreviewingUpgrade(false);
      previewBeforeApplyRef.current = null;
      notify('info', 'DEV: карточка сброшена');
    } finally {
      setBusy(false);
    }
  }, [busy, notify]);

  const levelName = (lvl: ProfileCardLevel) =>
    lang === 'ru' ? PROFILE_CARD_LEVEL_NAME_RU[lvl] : getProfileCardLevelDef(lvl).name;

  const statCount = displayLevel >= 1 ? 3 : 2;
  const title = displayLevel >= 1 ? 'Phraseman Pro' : levelName(0);
  const subtitle = displayLevel >= 1
    ? triLang(lang as Lang, {
        ru: 'новая карточка профиля',
        uk: 'нова картка профілю',
        es: 'nueva tarjeta de perfil',
        'pt-BR': 'novo cartão de perfil',
        vi: 'thẻ hồ sơ mới',
        id: 'kartu profil baru',
        tr: 'yeni profil kartı',
        pl: 'nowa karta profilu',
      })
    : triLang(lang as Lang, {
        ru: 'текущая карточка',
        uk: 'поточна картка',
        es: 'tarjeta actual',
        'pt-BR': 'cartão atual',
        vi: 'thẻ hiện tại',
        id: 'kartu saat ini',
        tr: 'mevcut kart',
        pl: 'obecna karta',
      });

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
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: bottomInset + 116 }}
        >
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: vis.colors.accent, fontSize: f.caption, fontWeight: '900', letterSpacing: 0.5, marginBottom: 8 }}>
              {displayLevel >= 1 ? `${profileCardLevelRoman(1)} · ${title}` : `0 · ${title}`}
            </Text>

            <View style={{ width: CARD_W, height: CARD_H, borderRadius: 18, overflow: 'hidden' }}>
              <LinearGradient
                colors={displayLevel >= 1
                  ? ['#4A3212', '#1F1B12', '#0E1117']
                  : [`${vis.colors.accent}14`, `${vis.colors.accent}05`, '#0E1117']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ flex: 1, borderRadius: 18, borderWidth: 1.5, borderColor: vis.colors.accentStrong, padding: 14, justifyContent: 'space-between' }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: vis.colors.accentSoft, borderWidth: 1, borderColor: vis.colors.accentStrong }}>
                    <AvatarView avatar={meAvatar || undefined} level={meLevel} size={39} auraId={null} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: monoIcon(themeMode, '#FFFFFF'), fontSize: f.body, fontWeight: '900' }} numberOfLines={1}>{meName}</Text>
                    <Text style={{ color: vis.colors.secondary, fontSize: 11, fontWeight: '800', marginTop: 2 }} numberOfLines={1}>
                      {getTitleString(meLevel, 'ru')}
                    </Text>
                  </View>
                  {displayLevel >= 1 ? (
                    <View style={{ backgroundColor: vis.colors.accent, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ color: monoIcon(themeMode, '#15110A', MONO_ICON.onLight), fontSize: 11, fontWeight: '900' }}>PRO</Text>
                    </View>
                  ) : null}
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {stats.slice(0, statCount).map((s) => (
                    <View key={s.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '900' }} numberOfLines={1}>{s.label}</Text>
                      <Text style={{ color: monoIcon(themeMode, '#FFFFFF'), fontSize: 13, fontWeight: '900', marginTop: 2 }} numberOfLines={1}>{s.value}</Text>
                    </View>
                  ))}
                </View>

                <ProfileCardMotionFx
                  kind={fxKindForProfileCard(displayLevel, 'none')}
                  radius={18}
                  accent={vis.colors.accent}
                  secondary={vis.colors.secondary}
                  accentSoft={vis.colors.accentSoft}
                  enabled={displayLevel >= 1}
                />
              </LinearGradient>
            </View>
          </View>

          <View style={{ marginTop: 18, borderRadius: 16, borderWidth: 1, borderColor: displayLevel >= 1 ? 'rgba(250,204,21,0.34)' : t.border, backgroundColor: displayLevel >= 1 ? 'rgba(250,204,21,0.08)' : t.bgSurface, padding: 14 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '900', marginBottom: 4 }}>
              {displayLevel >= 1 ? title : subtitle}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.caption, lineHeight: 18 }}>
              {displayLevel >= 1
                ? triLang(lang as Lang, {
                    ru: 'Так карточка будет выглядеть после применения апгрейда.',
                    uk: 'Так картка виглядатиме після застосування апгрейду.',
                    es: 'Así se verá la tarjeta después de aplicar la mejora.',
                    'pt-BR': 'É assim que o cartão ficará depois de aplicar o upgrade.',
                    vi: 'Thẻ sẽ trông như thế này sau khi áp dụng nâng cấp.',
                    id: 'Begini tampilan kartu setelah upgrade diterapkan.',
                    tr: 'Yükseltme uygulandıktan sonra kart böyle görünür.',
                    pl: 'Tak karta będzie wyglądać po zastosowaniu ulepszenia.',
                  })
                : triLang(lang as Lang, {
                    ru: 'Сначала посмотри новую карточку, затем применяй за осколки.',
                    uk: 'Спочатку подивись нову картку, потім застосовуй за уламки.',
                    es: 'Primero mira la tarjeta nueva y luego aplícala con fragmentos.',
                    'pt-BR': 'Primeiro veja o novo cartão e depois aplique com fragmentos.',
                    vi: 'Xem thẻ mới trước, rồi áp dụng bằng mảnh.',
                    id: 'Lihat kartu baru dulu, lalu terapkan dengan shard.',
                    tr: 'Önce yeni karta bak, sonra parçalarla uygula.',
                    pl: 'Najpierw zobacz nową kartę, potem zastosuj ją za odłamki.',
                  })}
            </Text>
          </View>

          <View style={{ marginTop: 14, gap: 8 }}>
            {PROFILE_CARD_SELLING_POINTS[displayLevel].map((point, idx) => (
              <View key={idx} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                <Ionicons name={point.isNew ? 'sparkles' : 'checkmark-circle'} size={15} color={point.isNew ? '#FACC15' : '#5FD0A0'} style={{ marginTop: 2 }} />
                <Text style={{ color: t.textMuted, fontSize: f.caption, lineHeight: 18, flex: 1 }}>
                  {sellingPointText(point, lang)}
                  {point.isNew && displayLevel >= 1 ? <Text style={{ color: monoIcon(themeMode, '#FACC15'), fontWeight: '900' }}> · NEW</Text> : null}
                </Text>
              </View>
            ))}
          </View>

          {__DEV__ ? (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
              <TouchableOpacity testID="profile-card-dev-grant" disabled={busy || !nextDef} onPress={handleDevGrant} activeOpacity={0.86}
                style={{ flex: 1, borderRadius: 12, paddingVertical: 11, alignItems: 'center', borderWidth: 1, borderColor: '#22C55E', backgroundColor: 'rgba(34,197,94,0.12)', opacity: busy || !nextDef ? 0.5 : 1 }}>
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
            disabled={busy || !nextDef}
            onPress={previewingUpgrade ? handleUpgrade : handlePreviewUpgrade}
            style={{ borderRadius: 16, paddingVertical: 15, alignItems: 'center', backgroundColor: !nextDef ? t.textGhost : '#FACC15', opacity: busy ? 0.7 : 1, flexDirection: 'row', justifyContent: 'center', gap: 8 }}
          >
            <Text style={{ color: monoIcon(themeMode, '#1A1205', MONO_ICON.onLight), fontSize: f.bodyLg, fontWeight: '900' }}>
              {isApplied
                ? triLang(lang as Lang, { ru: 'Уже применено', uk: 'Уже застосовано', es: 'Ya aplicado', 'pt-BR': 'Já aplicado', vi: 'Đã áp dụng', id: 'Sudah diterapkan', tr: 'Zaten uygulandı', pl: 'Już zastosowano' })
                : previewingUpgrade && nextDef
                  ? triLang(lang as Lang, {
                      ru: `Применить · ${nextDef.cost}`,
                      uk: `Застосувати · ${nextDef.cost}`,
                      es: `Aplicar · ${nextDef.cost}`,
                      'pt-BR': `Aplicar · ${nextDef.cost}`,
                      vi: `Áp dụng · ${nextDef.cost}`,
                      id: `Terapkan · ${nextDef.cost}`,
                      tr: `Uygula · ${nextDef.cost}`,
                      pl: `Zastosuj · ${nextDef.cost}`,
                    })
                  : triLang(lang as Lang, {
                      ru: 'Улучшить карточку',
                      uk: 'Покращити картку',
                      es: 'Mejorar tarjeta',
                      'pt-BR': 'Melhorar cartão',
                      vi: 'Nâng cấp thẻ',
                      id: 'Tingkatkan kartu',
                      tr: 'Kartı yükselt',
                      pl: 'Ulepsz kartę',
                    })}
            </Text>
            {busy ? (
              <ActivityIndicator size="small" color="#1A1205" />
            ) : previewingUpgrade && nextDef ? (
              <Image source={oskolokImageForPackShards(nextDef.cost)} style={{ width: 18, height: 18 }} contentFit="contain" />
            ) : null}
          </TouchableOpacity>
        </View>
      </View>
    </ScreenGradient>
  );
}
