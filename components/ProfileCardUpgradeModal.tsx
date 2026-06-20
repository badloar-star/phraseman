import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import CompassDepthSurface from './CompassDepthSurface';
import { emitAppEvent } from '../app/events';
import { syncToCloud } from '../app/cloud_sync';
import { ENABLE_PROFILE_CARD } from '../app/config';
import { getShardsBalance } from '../app/shards_system';
import { oskolokImageForPackShards } from '../app/oskolok';
import {
  canUseProfileCardMotion,
  canUseProfileCardPublicFocus,
  canUseProfileCardTheme,
  getProfileCardSnapshot,
  getNextProfileCardLevel,
  getProfileCardLevelDef,
  profileCardLevelRoman,
  PROFILE_CARD_MOTIONS,
  PROFILE_CARD_PUBLIC_FOCUSES,
  PROFILE_CARD_LEVELS,
  PROFILE_CARD_MAX_LEVEL,
  PROFILE_CARD_THEMES,
  ProfileCardLevel,
  ProfileCardMotion,
  ProfileCardPublicFocus,
  ProfileCardSnapshot,
  ProfileCardTheme,
  setProfileCardMotion,
  setProfileCardPublicFocus,
  setProfileCardTheme,
  upgradeProfileCardLevel,
} from '../app/profile_card_system';
import { COMPASS_RICH, compassShadow } from '../constants/compassTheme';
import { triLang, type Lang } from '../constants/i18n';

type Props = {
  visible: boolean;
  level: ProfileCardLevel;
  snapshot?: ProfileCardSnapshot;
  onClose: () => void;
  onUpgraded: (level: ProfileCardLevel) => void;
  onChanged?: (snapshot: ProfileCardSnapshot) => void;
};

const FALLBACK_SNAPSHOT: ProfileCardSnapshot = {
  level: 0,
  theme: 'classic',
  motion: 'none',
  publicFocus: 'balanced',
};

type PlannedProfileCardCopy = {
  'pt-BR': string;
  vi: string;
  id: string;
  tr: string;
  pl: string;
};

const LEVEL_UNLOCK_PLANNED: Record<ProfileCardLevel, PlannedProfileCardCopy> = {
  0: {
    'pt-BR': 'Cartão de perfil básico',
    vi: 'Thẻ hồ sơ cơ bản',
    id: 'Kartu profil dasar',
    tr: 'Temel profil kartı',
    pl: 'Podstawowa karta profilu',
  },
  1: {
    'pt-BR': 'Layout premium, selo de nível do cartão e hierarquia mais clara',
    vi: 'Bố cục cao cấp, huy hiệu cấp thẻ và thứ bậc rõ hơn',
    id: 'Tata letak premium, lencana level kartu, dan hierarki lebih jelas',
    tr: 'Premium düzen, kart seviye rozeti ve daha net hiyerarşi',
    pl: 'Układ premium, odznaka poziomu karty i czytelniejsza hierarchia',
  },
  2: {
    'pt-BR': 'Escolha de tema e material do cartão',
    vi: 'Chọn chủ đề và chất liệu thẻ',
    id: 'Pilihan tema dan material kartu',
    tr: 'Kart teması ve materyali seçimi',
    pl: 'Wybór motywu i materiału karty',
  },
  3: {
    'pt-BR': 'Moldura animada e entrada mais premium do cartão',
    vi: 'Khung động và hiệu ứng vào thẻ cao cấp hơn',
    id: 'Bingkai animasi dan efek masuk kartu yang lebih premium',
    tr: 'Animasyonlu çerçeve ve daha premium kart girişi',
    pl: 'Animowana ramka i bardziej premium wejście karty',
  },
  4: {
    'pt-BR': 'Indicadores públicos de status ampliados',
    vi: 'Chỉ số trạng thái công khai mở rộng',
    id: 'Indikator status publik yang lebih lengkap',
    tr: 'Genişletilmiş herkese açık statü göstergeleri',
    pl: 'Rozszerzone publiczne wskaźniki statusu',
  },
  5: {
    'pt-BR': 'Efeito de entrada elite e status visual mais forte',
    vi: 'Hiệu ứng vào elite và trạng thái hình ảnh mạnh nhất',
    id: 'Efek masuk elite dan status visual terkuat',
    tr: 'Elite giriş efekti ve en güçlü görsel statü',
    pl: 'Elitarny efekt wejścia i najsilniejszy status wizualny',
  },
};

const THEME_DESCRIPTION_PLANNED: Record<ProfileCardTheme, PlannedProfileCardCopy> = {
  classic: {
    'pt-BR': 'Material base limpo sem tema decorativo.',
    vi: 'Chất liệu cơ bản gọn gàng, không có chủ đề trang trí.',
    id: 'Material dasar yang bersih tanpa tema dekoratif.',
    tr: 'Dekoratif tema olmadan sade temel materyal.',
    pl: 'Czysty podstawowy materiał bez dekoracyjnego motywu.',
  },
  gold: {
    'pt-BR': 'Metal dourado quente para um cartão de status.',
    vi: 'Kim loại vàng ấm cho thẻ thể hiện trạng thái.',
    id: 'Logam emas hangat untuk kartu status.',
    tr: 'Statü kartı için sıcak altın metal.',
    pl: 'Ciepły złoty metal dla karty statusu.',
  },
  crystal: {
    'pt-BR': 'Vidro frio, brilho e acabamento premium sutil.',
    vi: 'Kính lạnh, ánh sáng và độ bóng cao cấp vừa phải.',
    id: 'Kaca dingin, kilau, dan sentuhan premium yang rapi.',
    tr: 'Soğuk cam, parlaklık ve zarif premium ışıltı.',
    pl: 'Chłodne szkło, blask i subtelne wykończenie premium.',
  },
  ember: {
    'pt-BR': 'Acento de fogo para jogadores com uma sequência forte.',
    vi: 'Điểm nhấn lửa cho người chơi có chuỗi mạnh.',
    id: 'Aksen api untuk pemain dengan streak kuat.',
    tr: 'Güçlü serisi olan oyuncular için ateşli vurgu.',
    pl: 'Ognisty akcent dla graczy z mocną serią.',
  },
  aurora: {
    'pt-BR': 'Aurora rara para um perfil elite.',
    vi: 'Ánh cực quang hiếm cho hồ sơ elite.',
    id: 'Aurora langka untuk profil elite.',
    tr: 'Elite profil için nadir kuzey ışığı.',
    pl: 'Rzadka zorza dla elitarnego profilu.',
  },
};

const MOTION_DESCRIPTION_PLANNED: Record<ProfileCardMotion, PlannedProfileCardCopy> = {
  none: {
    'pt-BR': 'Cartão calmo, sem movimento.',
    vi: 'Thẻ tĩnh, không có chuyển động.',
    id: 'Kartu tenang tanpa gerakan.',
    tr: 'Hareketsiz, sakin kart.',
    pl: 'Spokojna karta bez ruchu.',
  },
  gleam: {
    'pt-BR': 'Passagem suave de luz pela borda do cartão.',
    vi: 'Luồng sáng mềm chạy qua viền thẻ.',
    id: 'Sapuan cahaya lembut di bingkai kartu.',
    tr: 'Kart çerçevesinde yumuşak ışık geçişi.',
    pl: 'Delikatne przejście światła po ramce karty.',
  },
  pulse: {
    'pt-BR': 'Brilho pulsante ao redor do cartão.',
    vi: 'Ánh sáng nhịp nhàng quanh thẻ.',
    id: 'Cahaya berdenyut di sekitar kartu.',
    tr: 'Kartın etrafında nefes alan parıltı.',
    pl: 'Pulsujący blask wokół karty.',
  },
  particles: {
    'pt-BR': 'Pequenas faíscas ao redor da parte superior do perfil.',
    vi: 'Tia sáng nhỏ quanh phần trên của hồ sơ.',
    id: 'Percikan kecil di sekitar bagian atas profil.',
    tr: 'Profilin üst kısmında küçük kıvılcımlar.',
    pl: 'Małe iskry wokół górnej części profilu.',
  },
  elite: {
    'pt-BR': 'Efeito de entrada mais caro e brilho de cartão elite.',
    vi: 'Hiệu ứng vào đắt giá nhất và ánh sáng của thẻ elite.',
    id: 'Efek masuk paling mahal dan kilau kartu elite.',
    tr: 'En pahalı giriş efekti ve elite kart ışıltısı.',
    pl: 'Najbardziej prestiżowy efekt wejścia i blask elitarnej karty.',
  },
};

const PUBLIC_FOCUS_DESCRIPTION_PLANNED: Record<ProfileCardPublicFocus, PlannedProfileCardCopy> = {
  balanced: {
    'pt-BR': 'Mostra os principais pontos fortes sem exagerar em um só lado.',
    vi: 'Hiển thị điểm mạnh chính mà không nghiêng quá nhiều về một phía.',
    id: 'Menampilkan kekuatan utama tanpa terlalu condong ke satu sisi.',
    tr: 'Ana güçlü yönleri tek tarafa yüklenmeden gösterir.',
    pl: 'Pokazuje główne mocne strony bez przechyłu w jedną stronę.',
  },
  xp: {
    'pt-BR': 'Foco no XP total e no nível.',
    vi: 'Tập trung vào tổng XP và cấp độ.',
    id: 'Fokus pada total XP dan level.',
    tr: 'Toplam XP ve seviyeye odaklanır.',
    pl: 'Akcent na łącznym XP i poziomie.',
  },
  streak: {
    'pt-BR': 'Foco na disciplina e nos dias seguidos.',
    vi: 'Tập trung vào kỷ luật và số ngày liên tiếp.',
    id: 'Fokus pada disiplin dan hari beruntun.',
    tr: 'Disiplin ve arka arkaya günlere odaklanır.',
    pl: 'Akcent na dyscyplinę i dni z rzędu.',
  },
  league: {
    'pt-BR': 'Foco na liga atual.',
    vi: 'Tập trung vào giải đấu hiện tại.',
    id: 'Fokus pada liga saat ini.',
    tr: 'Mevcut lige odaklanır.',
    pl: 'Akcent na obecną ligę.',
  },
  arena: {
    'pt-BR': 'Foco no ranking PvP da arena.',
    vi: 'Tập trung vào hạng PvP trong đấu trường.',
    id: 'Fokus pada peringkat PvP arena.',
    tr: 'Arena PvP sıralamasına odaklanır.',
    pl: 'Akcent na ranking PvP areny.',
  },
};

function ProfileCardUpgradeModal({ visible, level, snapshot, onClose, onUpgraded, onChanged }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme: t, f, themeMode } = useTheme();
  const isCompassTheme = false;
  const profilePrimaryAccent = '#FACC15';
  const profileSuccessAccent = '#22C55E';
  const { lang } = useLang();
  const [shards, setShards] = useState(0);
  const [busy, setBusy] = useState(false);
  const [currentSnapshot, setCurrentSnapshot] = useState<ProfileCardSnapshot>(() => snapshot ?? { ...FALLBACK_SNAPSHOT, level });
  const effectiveVisible = ENABLE_PROFILE_CARD && visible;

  const currentLevel = currentSnapshot.level;
  const nextLevel = useMemo(() => getNextProfileCardLevel(currentLevel), [currentLevel]);
  const currentDef = getProfileCardLevelDef(currentLevel);
  const nextDef = nextLevel === null ? null : getProfileCardLevelDef(nextLevel);
  const progress = Math.max(0, Math.min(1, currentLevel / PROFILE_CARD_MAX_LEVEL));

  useEffect(() => {
    if (!effectiveVisible) return;
    let cancelled = false;
    setCurrentSnapshot(snapshot ?? { ...FALLBACK_SNAPSHOT, level });
    getShardsBalance().then((balance) => {
      if (!cancelled) setShards(balance);
    }).catch(() => {});
    getProfileCardSnapshot().then((next) => {
      if (!cancelled) {
        setCurrentSnapshot(next);
      }
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [effectiveVisible, level, snapshot]);

  const notify = useCallback((type: 'success' | 'error' | 'info', messageRu: string) => {
    emitAppEvent('action_toast', {
      type,
      messageRu,
      messageUk: messageRu,
      messageEs: messageRu,
    });
  }, []);

  const handleUpgrade = useCallback(async () => {
    if (!ENABLE_PROFILE_CARD || busy || !nextDef) return;
    setBusy(true);
    try {
      const result = await upgradeProfileCardLevel();
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        const localBal = await getShardsBalance().catch(() => -1);
        notify('info', `DEBUG: ${JSON.stringify(result)} | local=${localBal} | need=${nextDef?.cost}`);
      }
      if (result.ok) {
        setShards(result.balance);
        const nextSnapshot = await getProfileCardSnapshot();
        setCurrentSnapshot(nextSnapshot);
        onUpgraded(result.level);
        onChanged?.(nextSnapshot);
        void syncToCloud({ forceNow: true });
        notify('success', `Карточка улучшена до ${profileCardLevelRoman(result.level)}`);
        return;
      }
      if (result.reason === 'insufficient') {
        onClose();
        router.push({
          pathname: '/shards_shop',
          params: {
            need: String(Math.max(0, result.need ?? nextDef.cost - shards)),
            source: 'profile_card_upgrade',
          },
        } as any);
        return;
      }
      if (result.reason === 'cloud_error') {
        // The server may or may not have applied the upgrade — re-read the real state from
        // the cloud instead of guessing, and tell the user it didn't go through cleanly.
        void syncToCloud({ forceNow: true });
        getShardsBalance().then(setShards).catch(() => {});
        getProfileCardSnapshot().then((snap) => {
          setCurrentSnapshot(snap);
          onChanged?.(snap);
        }).catch(() => {});
        notify('error', 'Нет связи с сервером. Проверь соединение и открой карточку снова.');
        return;
      }
      notify('error', 'Карточка не улучшилась. Попробуй снова.');
    } finally {
      setBusy(false);
    }
  }, [busy, nextDef, notify, onChanged, onClose, onUpgraded, router, shards]);

  const applyTheme = useCallback(async (theme: ProfileCardTheme) => {
    if (!ENABLE_PROFILE_CARD || busy || !canUseProfileCardTheme(currentLevel, theme) || currentSnapshot.theme === theme) return;
    setBusy(true);
    try {
      const next = await setProfileCardTheme(theme);
      setCurrentSnapshot(next);
      onChanged?.(next);
      void syncToCloud({ forceNow: true });
      notify('info', 'Стиль карточки обновлен');
    } catch {
      notify('error', 'Этот стиль пока закрыт');
    } finally {
      setBusy(false);
    }
  }, [busy, currentLevel, currentSnapshot.theme, notify, onChanged]);

  const applyMotion = useCallback(async (motion: ProfileCardMotion) => {
    if (!ENABLE_PROFILE_CARD || busy || !canUseProfileCardMotion(currentLevel, motion) || currentSnapshot.motion === motion) return;
    setBusy(true);
    try {
      const next = await setProfileCardMotion(motion);
      setCurrentSnapshot(next);
      onChanged?.(next);
      void syncToCloud({ forceNow: true });
      notify('info', 'Анимация карточки обновлена');
    } catch {
      notify('error', 'Эта анимация пока закрыта');
    } finally {
      setBusy(false);
    }
  }, [busy, currentLevel, currentSnapshot.motion, notify, onChanged]);

  const applyPublicFocus = useCallback(async (focus: ProfileCardPublicFocus) => {
    if (!ENABLE_PROFILE_CARD || busy || !canUseProfileCardPublicFocus(currentLevel, focus) || currentSnapshot.publicFocus === focus) return;
    setBusy(true);
    try {
      const next = await setProfileCardPublicFocus(focus);
      setCurrentSnapshot(next);
      onChanged?.(next);
      void syncToCloud({ forceNow: true });
      notify('info', 'Публичный фокус карточки обновлен');
    } catch {
      notify('error', 'Этот фокус пока закрыт');
    } finally {
      setBusy(false);
    }
  }, [busy, currentLevel, currentSnapshot.publicFocus, notify, onChanged]);

  const renderSectionTitle = (title: string, lockedAt?: ProfileCardLevel) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 8 }}>
      <Text style={{ color: t.textPrimary, fontSize: f.label, fontWeight: '900' }}>{title}</Text>
      {lockedAt && currentLevel < lockedAt ? (
        <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '800' }}>
          {triLang(lang as Lang, {
            ru: `CARD ${profileCardLevelRoman(lockedAt)}`,
            uk: `CARD ${profileCardLevelRoman(lockedAt)}`,
            es: `CARD ${profileCardLevelRoman(lockedAt)}`,
            'pt-BR': `CARD ${profileCardLevelRoman(lockedAt)}`,
            vi: `CARD ${profileCardLevelRoman(lockedAt)}`,
            id: `CARD ${profileCardLevelRoman(lockedAt)}`,
            tr: `CARD ${profileCardLevelRoman(lockedAt)}`,
            pl: `CARD ${profileCardLevelRoman(lockedAt)}`,
          })}
        </Text>
      ) : null}
    </View>
  );

  const choiceCardStyle = (selected: boolean, locked: boolean, accent: string) => ({
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 9,
    borderRadius: isCompassTheme ? 10 : 14,
    borderWidth: isCompassTheme ? StyleSheet.hairlineWidth : selected ? 1.5 : 1,
    borderColor: isCompassTheme
      ? selected
        ? COMPASS_RICH.hairlineStrong
        : locked
          ? 'rgba(242,196,141,0.10)'
          : COMPASS_RICH.hairlineQuiet
      : selected
        ? accent
        : locked
          ? 'rgba(148,163,184,0.22)'
          : t.border,
    backgroundColor: isCompassTheme
      ? selected
        ? COMPASS_RICH.wash
        : locked
          ? 'rgba(148,163,184,0.05)'
          : 'transparent'
      : selected
        ? `${accent}1A`
        : locked
          ? 'rgba(148,163,184,0.06)'
          : t.bgSurface,
    paddingHorizontal: 11,
    paddingVertical: 10,
    marginBottom: 8,
    opacity: locked ? 0.55 : 1,
    overflow: 'hidden' as const,
    ...(isCompassTheme ? compassShadow(selected ? 2 : 1) : null),
  });

  return (
    <Modal visible={effectiveVisible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable
          testID="profile-card-upgrade-modal"
          style={{
            backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 18,
            paddingBottom: insets.bottom + 18,
            borderTopWidth: 1,
            borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : t.border,
            overflow: 'hidden',
            ...(isCompassTheme ? compassShadow(3) : null),
          }}
        >
          {isCompassTheme && <CompassDepthSurface radius={28} selected />}
          <View style={{ width: 42, height: 4, borderRadius: 2, backgroundColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : t.border, alignSelf: 'center', marginBottom: 16 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900' }}>
                {triLang(lang as Lang, {
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
              <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 3, lineHeight: 18 }}>
                {triLang(lang as Lang, {
                  ru: 'Внешний статус, анимации и больше публичной информации.',
                  uk: 'Зовнішній статус, анімації та більше публічної інформації.',
                  es: 'Estado visual, animaciones y más información pública.',
                  'pt-BR': 'Status visual, animações e mais informações públicas.',
                  vi: 'Trạng thái hiển thị, hiệu ứng động và thêm thông tin công khai.',
                  id: 'Status visual, animasi, dan lebih banyak info publik.',
                  tr: 'Görsel statü, animasyonlar ve daha fazla herkese açık bilgi.',
                  pl: 'Status wizualny, animacje i więcej informacji publicznych.',
                })}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: isCompassTheme ? COMPASS_RICH.charcoal : t.bgSurface, borderRadius: isCompassTheme ? 10 : 14, paddingHorizontal: 10, paddingVertical: 7, borderWidth: isCompassTheme ? StyleSheet.hairlineWidth : 0, borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : 'transparent', overflow: 'hidden' }}>
              {isCompassTheme && <CompassDepthSurface radius={10} quiet />}
              <Text style={{ color: isCompassTheme ? COMPASS_RICH.champagne : profilePrimaryAccent, fontSize: f.body, fontWeight: '900' }}>{shards}</Text>
              <Image source={oskolokImageForPackShards(shards)} style={{ width: 18, height: 18 }} contentFit="contain" />
            </View>
          </View>

          <View style={{ borderRadius: isCompassTheme ? 14 : 18, borderWidth: 1, borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : 'rgba(250,204,21,0.36)', backgroundColor: isCompassTheme ? 'transparent' : 'rgba(250,204,21,0.08)', padding: 14, marginBottom: 14, overflow: 'hidden', ...(isCompassTheme ? compassShadow(2) : null) }}>
            {isCompassTheme && <CompassDepthSurface radius={14} selected />}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '800' }}>
                  {triLang(lang as Lang, {
                    ru: 'Текущий уровень',
                    uk: 'Поточний рівень',
                    es: 'Nivel actual',
                    'pt-BR': 'Nível atual',
                    vi: 'Cấp hiện tại',
                    id: 'Level saat ini',
                    tr: 'Mevcut seviye',
                    pl: 'Aktualny poziom',
                  })}
                </Text>
                <Text testID="profile-card-current-level-label" style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '900', marginTop: 2 }}>
                  {currentDef.name} {currentLevel > 0 ? profileCardLevelRoman(currentLevel) : ''}
                </Text>
              </View>
              <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: isCompassTheme ? COMPASS_RICH.charcoal : '#111827', borderWidth: 1, borderColor: isCompassTheme ? COMPASS_RICH.champagne : profilePrimaryAccent, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: profilePrimaryAccent, fontSize: f.body, fontWeight: '900' }}>
                  {currentLevel > 0 ? profileCardLevelRoman(currentLevel) : '0'}
                </Text>
              </View>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.10)', marginTop: 12, overflow: 'hidden' }}>
              <View style={{ width: `${progress * 100}%`, height: '100%', borderRadius: 4, backgroundColor: profilePrimaryAccent }} />
            </View>
          </View>

          <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
            {renderSectionTitle(triLang(lang as Lang, {
              ru: 'Стиль карточки',
              uk: 'Стиль картки',
              es: 'Estilo de tarjeta',
              'pt-BR': 'Estilo do cartão',
              vi: 'Kiểu thẻ',
              id: 'Gaya kartu',
              tr: 'Kart stili',
              pl: 'Styl karty',
            }), 2)}
            {PROFILE_CARD_THEMES.map((item) => {
              const selected = currentSnapshot.theme === item.id;
              const locked = !canUseProfileCardTheme(currentLevel, item.id);
              const accent = item.id === 'gold' ? '#FACC15' : item.id === 'crystal' ? '#67E8F9' : item.id === 'ember' ? '#FB7185' : item.id === 'aurora' ? '#A78BFA' : '#94A3B8';
              return (
                <TouchableOpacity
                  testID={`profile-card-theme-${item.id}`}
                  key={item.id}
                  activeOpacity={0.82}
                  disabled={busy || locked}
                  onPress={() => applyTheme(item.id)}
                  style={choiceCardStyle(selected, locked, accent)}
                >
                  {isCompassTheme && <CompassDepthSurface radius={10} selected={selected} quiet={!selected} />}
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: `${accent}26`, borderWidth: 1, borderColor: accent, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={locked ? 'lock-closed' : selected ? 'checkmark' : 'sparkles'} size={13} color={accent} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '900' }}>{item.name}</Text>
                    <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 1 }} numberOfLines={2}>
                      {triLang(lang as Lang, {
                        ru: item.descriptionRu,
                        uk: item.descriptionUk,
                        es: item.descriptionEs,
                        'pt-BR': THEME_DESCRIPTION_PLANNED[item.id]['pt-BR'],
                        vi: THEME_DESCRIPTION_PLANNED[item.id].vi,
                        id: THEME_DESCRIPTION_PLANNED[item.id].id,
                        tr: THEME_DESCRIPTION_PLANNED[item.id].tr,
                        pl: THEME_DESCRIPTION_PLANNED[item.id].pl,
                      })}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {renderSectionTitle(triLang(lang as Lang, {
              ru: 'Движение',
              uk: 'Рух',
              es: 'Movimiento',
              'pt-BR': 'Movimento',
              vi: 'Chuyển động',
              id: 'Gerakan',
              tr: 'Hareket',
              pl: 'Ruch',
            }), 3)}
            {PROFILE_CARD_MOTIONS.map((item) => {
              const selected = currentSnapshot.motion === item.id;
              const locked = !canUseProfileCardMotion(currentLevel, item.id);
              const accent = item.id === 'elite' ? '#FACC15' : item.id === 'particles' ? '#A78BFA' : item.id === 'pulse' ? '#22D3EE' : item.id === 'gleam' ? '#FBBF24' : '#94A3B8';
              return (
                <TouchableOpacity
                  testID={`profile-card-motion-${item.id}`}
                  key={item.id}
                  activeOpacity={0.82}
                  disabled={busy || locked}
                  onPress={() => applyMotion(item.id)}
                  style={choiceCardStyle(selected, locked, accent)}
                >
                  {isCompassTheme && <CompassDepthSurface radius={10} selected={selected} quiet={!selected} />}
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: `${accent}26`, borderWidth: 1, borderColor: accent, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={locked ? 'lock-closed' : selected ? 'checkmark' : 'radio-button-on'} size={13} color={accent} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '900' }}>{item.name}</Text>
                    <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 1 }} numberOfLines={2}>
                      {triLang(lang as Lang, {
                        ru: item.descriptionRu,
                        uk: item.descriptionUk,
                        es: item.descriptionEs,
                        'pt-BR': MOTION_DESCRIPTION_PLANNED[item.id]['pt-BR'],
                        vi: MOTION_DESCRIPTION_PLANNED[item.id].vi,
                        id: MOTION_DESCRIPTION_PLANNED[item.id].id,
                        tr: MOTION_DESCRIPTION_PLANNED[item.id].tr,
                        pl: MOTION_DESCRIPTION_PLANNED[item.id].pl,
                      })}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {renderSectionTitle(triLang(lang as Lang, {
              ru: 'Публичный акцент',
              uk: 'Публічний акцент',
              es: 'Enfoque público',
              'pt-BR': 'Foco público',
              vi: 'Điểm nhấn công khai',
              id: 'Fokus publik',
              tr: 'Herkese açık vurgu',
              pl: 'Publiczny akcent',
            }), 4)}
            {PROFILE_CARD_PUBLIC_FOCUSES.map((item) => {
              const selected = currentSnapshot.publicFocus === item.id;
              const locked = !canUseProfileCardPublicFocus(currentLevel, item.id);
              const accent = item.id === 'arena' ? '#EF4444' : item.id === 'streak' ? '#F97316' : item.id === 'league' ? '#22C55E' : item.id === 'xp' ? '#60A5FA' : '#FACC15';
              return (
                <TouchableOpacity
                  testID={`profile-card-focus-${item.id}`}
                  key={item.id}
                  activeOpacity={0.82}
                  disabled={busy || locked}
                  onPress={() => applyPublicFocus(item.id)}
                  style={choiceCardStyle(selected, locked, accent)}
                >
                  {isCompassTheme && <CompassDepthSurface radius={10} selected={selected} quiet={!selected} />}
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: `${accent}26`, borderWidth: 1, borderColor: accent, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={locked ? 'lock-closed' : selected ? 'checkmark' : 'eye'} size={13} color={accent} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '900' }}>{item.name}</Text>
                    <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 1 }} numberOfLines={2}>
                      {triLang(lang as Lang, {
                        ru: item.descriptionRu,
                        uk: item.descriptionUk,
                        es: item.descriptionEs,
                        'pt-BR': PUBLIC_FOCUS_DESCRIPTION_PLANNED[item.id]['pt-BR'],
                        vi: PUBLIC_FOCUS_DESCRIPTION_PLANNED[item.id].vi,
                        id: PUBLIC_FOCUS_DESCRIPTION_PLANNED[item.id].id,
                        tr: PUBLIC_FOCUS_DESCRIPTION_PLANNED[item.id].tr,
                        pl: PUBLIC_FOCUS_DESCRIPTION_PLANNED[item.id].pl,
                      })}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {renderSectionTitle(triLang(lang as Lang, {
              ru: 'Лестница уровней',
              uk: 'Сходи рівнів',
              es: 'Ruta de niveles',
              'pt-BR': 'Escada de níveis',
              vi: 'Thang cấp độ',
              id: 'Tangga level',
              tr: 'Seviye merdiveni',
              pl: 'Drabina poziomów',
            }))}
            {PROFILE_CARD_LEVELS.slice(1).map((item) => {
              const unlocked = currentLevel >= item.level;
              const target = nextLevel === item.level;
              return (
                <View
                  key={item.level}
                  style={{
                    flexDirection: 'row',
                    gap: 10,
                    borderRadius: isCompassTheme ? 10 : 16,
                    borderWidth: isCompassTheme ? StyleSheet.hairlineWidth : target ? 1.5 : 1,
                    borderColor: isCompassTheme ? (target ? COMPASS_RICH.hairlineStrong : COMPASS_RICH.hairlineQuiet) : target ? profilePrimaryAccent : t.border,
                    backgroundColor: isCompassTheme ? (target ? COMPASS_RICH.wash : 'transparent') : unlocked ? 'rgba(34,197,94,0.08)' : target ? 'rgba(250,204,21,0.08)' : t.bgSurface,
                    padding: 12,
                    marginBottom: 8,
                    overflow: 'hidden',
                    ...(isCompassTheme ? compassShadow(target ? 2 : 1) : null),
                  }}
                >
                  {isCompassTheme && <CompassDepthSurface radius={10} selected={target} quiet={!target} />}
                  <View style={{ width: 38, height: 38, borderRadius: isCompassTheme ? 8 : 19, alignItems: 'center', justifyContent: 'center', backgroundColor: unlocked ? 'rgba(34,197,94,0.20)' : isCompassTheme ? COMPASS_RICH.charcoalWarm : 'rgba(255,255,255,0.07)', borderWidth: isCompassTheme ? StyleSheet.hairlineWidth : 0, borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : 'transparent', overflow: 'hidden' }}>
                    {isCompassTheme && <CompassDepthSurface radius={8} selected={target} quiet={!target} />}
                    <Ionicons name={unlocked ? 'checkmark' : target ? 'sparkles' : 'lock-closed'} size={18} color={unlocked ? profileSuccessAccent : target ? (isCompassTheme ? COMPASS_RICH.champagne : profilePrimaryAccent) : t.textMuted} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                      <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900' }}>
                        {profileCardLevelRoman(item.level)} · {item.name}
                      </Text>
                      {!unlocked && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '900' }}>{item.cost}</Text>
                          <Image source={oskolokImageForPackShards(item.cost)} style={{ width: 14, height: 14 }} contentFit="contain" />
                        </View>
                      )}
                    </View>
                    <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 3, lineHeight: 17 }}>
                      {triLang(lang as Lang, {
                        ru: item.unlockRu,
                        uk: item.unlockUk,
                        es: item.unlockEs,
                        'pt-BR': LEVEL_UNLOCK_PLANNED[item.level]['pt-BR'],
                        vi: LEVEL_UNLOCK_PLANNED[item.level].vi,
                        id: LEVEL_UNLOCK_PLANNED[item.level].id,
                        tr: LEVEL_UNLOCK_PLANNED[item.level].tr,
                        pl: LEVEL_UNLOCK_PLANNED[item.level].pl,
                      })}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            testID="profile-card-upgrade-submit"
            activeOpacity={0.86}
            disabled={busy || !nextDef}
            onPress={handleUpgrade}
            style={{
              marginTop: 14,
              borderRadius: isCompassTheme ? 11 : 16,
              paddingVertical: 14,
              alignItems: 'center',
              backgroundColor: isCompassTheme ? 'transparent' : !nextDef ? t.textGhost : profilePrimaryAccent,
              opacity: busy ? 0.68 : 1,
              borderWidth: isCompassTheme ? StyleSheet.hairlineWidth : 0,
              borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : 'transparent',
              overflow: 'hidden',
              ...(isCompassTheme ? compassShadow(nextDef ? 2 : 1) : null),
            }}
          >
            {isCompassTheme && <CompassDepthSurface radius={11} cream={!!nextDef} quiet={!nextDef} />}
            <Text style={{ color: isCompassTheme ? (nextDef ? COMPASS_RICH.textDark : COMPASS_RICH.champagne) : '#111827', fontSize: f.bodyLg, fontWeight: '900' }}>
              {nextDef
                ? triLang(lang as Lang, {
                    ru: `Улучшить за ${nextDef.cost}`,
                    uk: `Покращити за ${nextDef.cost}`,
                    es: `Mejorar por ${nextDef.cost}`,
                    'pt-BR': `Melhorar por ${nextDef.cost}`,
                    vi: `Nâng cấp với ${nextDef.cost}`,
                    id: `Tingkatkan seharga ${nextDef.cost}`,
                    tr: `${nextDef.cost} karşılığında yükselt`,
                    pl: `Ulepsz za ${nextDef.cost}`,
                  })
                : triLang(lang as Lang, {
                    ru: 'Максимальный уровень',
                    uk: 'Максимальний рівень',
                    es: 'Nivel máximo',
                    'pt-BR': 'Nível máximo',
                    vi: 'Cấp tối đa',
                    id: 'Level maksimum',
                    tr: 'Maksimum seviye',
                    pl: 'Maksymalny poziom',
                  })}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default memo(ProfileCardUpgradeModal);
