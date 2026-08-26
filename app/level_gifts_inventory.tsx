import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import TapScale from '../components/TapScale';
import BouncyScrollView from '../components/BouncyScrollView';
import { LinearGradient } from '../components/SafeLinearGradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { AppState, Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import ContentWrap from '../components/ContentWrap';
import GiftExpiryCountdown from '../components/GiftExpiryCountdown';
import LevelGiftDualModal from '../components/LevelGiftDualModal';
import LevelGiftModal from '../components/LevelGiftModal';
import CenteredDialogShell from '../components/centered_dialog_shell';
import TodaysBoonStrip from '../components/TodaysBoonStrip';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import { triLang } from '../constants/i18n';
import LevelSpinRewardArt from '../components/LevelSpinRewardArt';
import SpinTicketArt from '../components/SpinTicketArt';
import { isLightThemeMode } from '../constants/theme';
import {
  giftDisplayTitleForLang,
  giftRarityUiLabel,
  giftTitleForLang,
} from './level_gift_system';
import { safeRouterBack } from './navigation_back';
import { animateNextLayoutTransition } from './smooth_layout';
import {
  loadPendingLevelGiftInventory,
  markDualGiftPartClaimed,
  markLevelSpinGiftOccurrenceClaimed,
  restoreDualGiftPartAfterFailedClaim,
  type PendingLevelGiftInventoryItem,
} from './level_gift_inventory';
import {
  loadActiveLevelGiftInventory,
  type ActiveLevelGiftInventoryItem,
} from './level_gift_active_inventory';
import { getCurrentMultiplierBreakdown, type MultiplierBreakdown } from './xp_manager';
import { captureAccountGeneration, isCurrentAccountGeneration } from './account_generation';
import { onAppEvent } from './events';
import {
  fetchLevelSpinStatus,
  peekLevelSpinBalance,
  readCachedLevelSpinBalance,
} from './level_reward_spins_client';
import {
  giftGradientAlpha,
  giftGradientBaseColor,
  giftGradientShape,
  type GiftRarity,
} from './gift_gradient_palette';
import type { ThemeMode } from '../constants/theme';

// зачем 2026-08-03 (владелец: «полностью измени цвета градиентов подарков,
// сделай под каждую тему свои цвета и форму градиента»): здесь жили giftAccent
// и giftAccentLight — по три захардкоженных hex на тёмные и светлые темы
// (#FFD700 / #60A5FA / #D6B85C и их тёмные аналоги). Эти шесть цветов
// показывались во ВСЕХ 13 темах, поэтому подарки всюду выглядели чужеродно, а
// тема на них не влияла вообще. Палитра переехала в gift_gradient_palette.ts:
// цвет берётся из токенов активной темы, редкость меняет плотность и угол.

// зачем: владелец попросил сетку как в «Темах интерфейса» — те же зазор,
// паддинг и 3 плитки в ряд, чтобы ритм сеток по приложению был единым
// (settings_themes.tsx TILE_GRID_GAP/GRID_SCREEN_PAD).
const TILE_GRID_GAP = 10;
const GRID_SCREEN_PAD = 16;
const TILES_PER_ROW = 3;

function pendingGiftItemKey(item: PendingLevelGiftInventoryItem): string {
  if (item.kind === 'single' && item.spinOccurrence) {
    return `single-spin-${item.spinOccurrence.requestId}-${item.spinOccurrence.lane}`;
  }
  if (item.kind === 'single' && item.dualPart) {
    return `single-${item.level}-${item.dualPart}`;
  }
  return `${item.kind}-${item.level}`;
}

const giftTone = (accent: string, alpha: string): string =>
  /^#[0-9a-f]{6}$/i.test(accent) ? `${accent}${alpha}` : accent;

const giftBonusLabel = (lang: Parameters<typeof giftTitleForLang>[1]): string =>
  triLang(lang, { ru: 'Бонус', uk: 'Бонус', en: 'Bonus', es: 'Bono', 'pt-BR': 'Bônus', vi: 'Thưởng', id: 'Bonus', tr: 'Bonus', pl: 'Bonus' });

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const dualPartLabel = (
  part: NonNullable<Extract<PendingLevelGiftInventoryItem, { kind: 'single' }>['dualPart']>,
  lang: Parameters<typeof giftTitleForLang>[1],
): string => (
  part === 'f2p'
    ? triLang(lang, { ru: 'Подарок за уровень', uk: 'Подарунок за рівень', en: 'Level gift', es: 'Regalo por nivel', 'pt-BR': 'Presente de n\u00edvel', vi: 'Qu\u00e0 c\u1ea5p \u0111\u1ed9', id: 'Hadiah level', tr: 'Seviye hediyesi', pl: 'Prezent za poziom' })
    : giftBonusLabel(lang)
);

/**
 * Плитка подарка — квадрат с крупной иконкой и названием ПОД ним.
 *
 * зачем (владелец, 2026-08-03): прежние широкие карточки с кнопкой
 * «Посмотреть», таймером и абзацем описания выглядели шумно и в светлой теме
 * были нечитаемы (жёлтый на жёлтом). Владелец попросил ровно тот же язык,
 * что в разделе «Темы интерфейса»: немой квадрат с иконкой, имя снаружи,
 * состояние — угловым бейджем, вся информация — в модалке по нажатию.
 * Никаких подписей-расшифровок внутри плитки (запрет владельца).
 */
const GiftTile = memo(function GiftTile({ item, size, lang, themeMode, nameColor, isLight, surface, themeAccent, themeGold, onPress, onExpired }: {
  item: PendingLevelGiftInventoryItem;
  size: number;
  lang: Parameters<typeof giftTitleForLang>[1];
  themeMode: ThemeMode;
  nameColor: string;
  isLight: boolean;
  /** Две нижние ступени градиента плитки — из токенов активной темы. */
  surface: [string, string];
  /**
   * Акцент и золото АКТИВНОЙ темы.
   *
   * зачем 2026-08-03 (владелец: «сделай под каждую тему свои цвета и форму
   * градиента»): цвет подарка считался тремя захардкоженными hex и был
   * одинаков во всех 13 темах. Теперь палитру задаёт тема, а редкость меняет
   * плотность и угол — см. gift_gradient_palette.ts.
   */
  themeAccent: string;
  themeGold: string;
  onPress: (item: PendingLevelGiftInventoryItem) => void;
  onExpired: () => void;
}) {
  const primaryGift = item.kind === 'single' ? item.gift : item.pair.f2p;
  const strongestRarity = item.kind === 'dual'
    ? primaryGift.rarity === 'epic' || item.pair.prem.rarity === 'epic'
      ? 'epic'
      : primaryGift.rarity === 'rare' || item.pair.prem.rarity === 'rare'
        ? 'rare'
        : 'common'
    : primaryGift.rarity;
  // зачем 2026-08-03 (владелец: «сделай под каждую тему свои цвета и форму
  // градиента»): было `isLight ? giftAccentLight(rarity) : giftAccent(rarity)` —
  // три захардкоженных hex на все 13 тем. Теперь семейство цвета задаёт тема, а
  // редкость меняет плотность заливки и угол градиента.
  const accent = giftGradientBaseColor(themeMode as ThemeMode, strongestRarity as GiftRarity, themeAccent, themeGold);
  const gradientAlpha = giftGradientAlpha(strongestRarity as GiftRarity, isLight);
  const gradientShape = giftGradientShape(strongestRarity as GiftRarity);
  const rowKey = item.kind === 'single' && item.spinOccurrence
    ? `${item.kind}-spin-${item.spinOccurrence.requestId}-${item.spinOccurrence.lane}`
    : item.kind === 'single' && item.dualPart
    ? `${item.kind}-${item.level}-${item.dualPart}`
    : `${item.kind}-${item.level}`;
  const title = item.kind === 'dual'
    ? triLang(lang, { ru: 'Два подарка', uk: 'Два подарунки', en: 'Two gifts', es: 'Dos regalos', 'pt-BR': 'Dois presentes', vi: 'Hai món quà', id: 'Dua hadiah', tr: 'İki hediye', pl: 'Dwa prezenty' })
    : giftDisplayTitleForLang(item.gift, lang);
  const a11yLabel = `${title}. ${triLang(lang, {
    ru: `Уровень ${item.level}, ${giftRarityUiLabel(strongestRarity, lang)}`,
    uk: `Рівень ${item.level}, ${giftRarityUiLabel(strongestRarity, lang)}`,
    en: `Level ${item.level}, ${giftRarityUiLabel(strongestRarity, lang)}`,
    es: `Nivel ${item.level}, ${giftRarityUiLabel(strongestRarity, lang)}`,
    'pt-BR': `Nível ${item.level}, ${giftRarityUiLabel(strongestRarity, lang)}`,
    vi: `Cấp ${item.level}, ${giftRarityUiLabel(strongestRarity, lang)}`,
    id: `Level ${item.level}, ${giftRarityUiLabel(strongestRarity, lang)}`,
    tr: `Seviye ${item.level}, ${giftRarityUiLabel(strongestRarity, lang)}`,
    pl: `Poziom ${item.level}, ${giftRarityUiLabel(strongestRarity, lang)}`,
  })}`;

  return (
    <View style={{ width: size }}>
      <TapScale
        testID={`gift-inventory-apply-${rowKey}`}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        onPress={() => {
          hapticTap();
          onPress(item);
        }}
        scaleTo={0.95}
        style={{ borderRadius: 22 }}
      >
        <LinearGradient
          colors={[giftTone(accent, gradientAlpha), surface[0], surface[1]] as [string, string, string]}
          start={gradientShape.start}
          end={gradientShape.end}
          style={{ width: size, height: size, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}
        >
          <LevelSpinRewardArt
            rewardId={primaryGift.id}
            // зачем (владелец, 2026-08-24): «пусть подарки будут больше внутри
            // своих контейнеров» — арт занимал 0.62 плитки, а contentFit="contain"
            // ужимал узкие предметы (кристалл, руна) ещё сильнее, и плитка читалась
            // пустой. 0.82 оставляет поля под угловые бейджи (таймер справа,
            // «2» слева сидят на отступе 8) и не даёт им лечь на рисунок.
            size={size * 0.82}
            accessibilityLabel={title}
            fallbackColor={accent}
          />
          {item.kind === 'dual' ? (
            <View style={{ position: 'absolute', top: 8, left: 8, minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: accent }}>
              <Text style={{ color: isLight ? '#FFFFFF' : '#1A1200', fontSize: 12, fontWeight: '900' }}>2</Text>
            </View>
          ) : null}
          <View style={{ position: 'absolute', top: 8, right: 8 }}>
            <GiftExpiryCountdown
              expiresAtMs={item.expiresAtMs}
              accent={accent}
              onExpired={onExpired}
              compact
              testID={`gift-expiry-pending-${rowKey}`}
            />
          </View>
        </LinearGradient>
      </TapScale>
      <Text style={{ marginTop: 8, fontSize: 13, lineHeight: 17, minHeight: 34, fontWeight: '800', letterSpacing: -0.1, textAlign: 'center', color: nameColor }}>
        {title}
      </Text>
    </View>
  );
});

export default function LevelGiftsInventoryScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { theme: t, f, themeMode } = useTheme();
  const [items, setItems] = useState<PendingLevelGiftInventoryItem[]>([]);
  const [activeItems, setActiveItems] = useState<ActiveLevelGiftInventoryItem[]>([]);
  const [multiplierBreakdown, setMultiplierBreakdown] = useState<MultiplierBreakdown | null>(null);
  const [spinBalance, setSpinBalance] = useState<number | null>(() => {
    const token = captureAccountGeneration();
    return peekLevelSpinBalance(token.stableId) ?? null;
  });
  const reducedMotion = useReducedMotion();
  const spinPulse = useSharedValue(1);
  const spinPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: spinPulse.value }, { rotate: '-1deg' }, { translateY: 2 }],
  }));
  const startSpinPulse = useCallback((appIsActive: boolean) => {
    cancelAnimation(spinPulse);
    spinPulse.value = 1;
    if (appIsActive && (spinBalance ?? 0) > 0 && !reducedMotion) {
      spinPulse.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 720 }),
          withTiming(1, { duration: 720 }),
        ),
        -1,
        false,
      );
    }
  }, [reducedMotion, spinBalance, spinPulse]);

  useFocusEffect(useCallback(() => {
    startSpinPulse(AppState.currentState === 'active');
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      startSpinPulse(state === 'active');
    });
    return () => {
      appStateSubscription.remove();
      cancelAnimation(spinPulse);
      spinPulse.value = 1;
    };
  }, [spinPulse, startSpinPulse]));

  const spinBalanceA11yLabel = spinBalance === null
    ? triLang(lang, {
      ru: 'Спины: количество загружается', uk: 'Спіни: кількість завантажується',
      en: 'Spins: loading count',
      es: 'Giros: cantidad cargando', 'pt-BR': 'Giros: quantidade carregando',
      vi: 'Lượt quay: đang tải số lượng', id: 'Putaran: jumlah sedang dimuat',
      tr: 'Çevirmeler: sayı yükleniyor', pl: 'Spiny: wczytywanie liczby',
    })
    : triLang(lang, {
      ru: `Спины: ${spinBalance}`, uk: `Спіни: ${spinBalance}`, en: `Spins: ${spinBalance}`, es: `Giros: ${spinBalance}`,
      'pt-BR': `Giros: ${spinBalance}`, vi: `Lượt quay: ${spinBalance}`,
      id: `Putaran: ${spinBalance}`, tr: `Çevirmeler: ${spinBalance}`, pl: `Spiny: ${spinBalance}`,
    });
  const [userName, setUserName] = useState('');
  const [selected, setSelected] = useState<PendingLevelGiftInventoryItem | null>(null);
  const [selectedInfoGift, setSelectedInfoGift] = useState<ActiveLevelGiftInventoryItem | null>(null);
  /**
   * Раздел подарков — ОДИН список, без вкладок.
   *
   * зачем 2026-08-23 (владелец: «убери в разделе подарки разделение на два
   * раздела активные и инвентарь, просто сделай так чтобы когда мы активируем
   * подарок чтобы он менял свой статус и вид внутри одного раздела»): вкладки
   * «Инвентарь / Активные» (2026-08-03) лечили симптом «подарок исчез» ценой
   * переключения — активированный подарок уезжал на соседний экран, и человек
   * всё равно не видел результата своего действия там, где его совершил.
   * Теперь активированные бонусы стоят первыми в том же списке, а неоткрытые
   * подарки — под ними: смена вида происходит на месте.
   *
   * Почему не «та же плитка меняет вид»: активный бонус и подарок в инвентаре —
   * разные сущности в данных. Подарок при применении уходит из pending-канала,
   * а бонус собирается из своих ключей хранилища (gift_xp_multiplier,
   * league_personal_boost_v1 и т.д.) — связи «плитка → бонус» не существует.
   * Один список даёт ровно тот же смысл без выдуманной связи.
   */
  const emptyGiftSurface = [giftTone(t.accent, '26'), t.bgCard, t.bgPrimary] as [string, string, string];
  const isLight = isLightThemeMode(themeMode);
  // зачем: точный пиксельный размер плитки вместо %/flexGrow — гарантирует
  // РОВНО 3 в ряд на любой ширине (тот же приём и та же причина, что в
  // settings_themes.tsx: при процентной базе Yoga ставит все плитки в один ряд).
  const tileSize = useMemo(() => {
    const usableWidth = Dimensions.get('window').width - GRID_SCREEN_PAD * 2;
    return Math.floor((usableWidth - TILE_GRID_GAP * (TILES_PER_ROW - 1)) / TILES_PER_ROW);
  }, []);

  const loadData = useCallback(async () => {
    const [nextItems, nextActiveItems, nextMultiplierBreakdown, nameRaw] = await Promise.all([
      loadPendingLevelGiftInventory(studyTarget),
      loadActiveLevelGiftInventory(lang, Date.now(), studyTarget),
      getCurrentMultiplierBreakdown(),
      AsyncStorage.getItem('user_name'),
    ]);
    setItems(nextItems);
    setActiveItems(nextActiveItems);
    setMultiplierBreakdown(nextMultiplierBreakdown);
    setUserName(nameRaw || '');
  }, [lang, studyTarget]);

  const loadSpinBalance = useCallback(async () => {
    const accountToken = captureAccountGeneration();
    const stableId = accountToken.stableId;
    if (!stableId || !isCurrentAccountGeneration(accountToken, stableId)) return;

    const cached = await readCachedLevelSpinBalance(stableId);
    if (cached !== null && isCurrentAccountGeneration(accountToken, stableId)) {
      setSpinBalance(cached);
    }

    try {
      const status = await fetchLevelSpinStatus();
      if (isCurrentAccountGeneration(accountToken, stableId)) {
        setSpinBalance(status.balance);
      }
    } catch {
      // Offline/error: keep the account-scoped cached count without blocking legacy gifts.
    }
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    void loadData();
    void loadSpinBalance();
    const subscription = onAppEvent('level_spin_balance_changed', () => {
      if (!active) return;
      void loadData();
      const accountToken = captureAccountGeneration();
      const stableId = accountToken.stableId;
      if (!stableId || !isCurrentAccountGeneration(accountToken, stableId)) return;
      const cached = peekLevelSpinBalance(stableId);
      if (cached !== null) setSpinBalance(cached);
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [loadData, loadSpinBalance]));

  // зачем: таймер дошёл до нуля — подарок сгорел; ряд уходит плавным
  // layout-переходом, а перезагрузка данных заодно вычищает его из хранилища.
  const handleGiftExpired = useCallback(() => {
    animateNextLayoutTransition();
    void loadData();
  }, [loadData]);

  const closeGiftModal = (claimed = false) => {
    if (claimed && selected) {
      const selectedKey = pendingGiftItemKey(selected);
      setItems((current) => current.filter((item) => pendingGiftItemKey(item) !== selectedKey));
    }
    setSelected(null);
    // A claimed close is optimistic: reloading here races the background
    // journal commit and can reinsert the stale tile. The modal refreshes after
    // application settles; cancelled closes still refresh immediately.
    if (!claimed) void loadData();
  };

  return (
    <ScreenGradient artBackdrop="levelGifts">
      <SafeAreaView testID="screen-level-gifts-inventory" style={{ flex: 1 }}>
        <ContentWrap>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingTop: Platform.OS === 'android' ? 28 : 15, paddingBottom: 15, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
            <TapScale onPress={() => safeRouterBack(router)} hitSlop={12}>
              <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
            </TapScale>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', marginLeft: 8, flex: 1 }} numberOfLines={1}>
              {triLang(lang, {
                ru: 'Подарки',
                uk: 'Подарунки',
                en: 'Gifts',
                es: 'Regalos',
                'pt-BR': 'Presentes',
                vi: 'Quà',
                id: 'Hadiah',
                tr: 'Hediyeler',
                pl: 'Prezenty',
              })}
            </Text>
            <Animated.View style={spinPulseStyle}>
              <TapScale
                testID="level-gifts-spins-button"
                accessibilityRole="button"
                accessibilityLiveRegion="polite"
                accessibilityLabel={spinBalanceA11yLabel}
                onPress={() => {
                  hapticTap();
                  router.push('/level_reward_spin' as any);
                }}
                scaleTo={0.97}
                style={styles.spinHeaderButton}
              >
                <LinearGradient
                  colors={[t.gold, '#F4C95D', '#D99D18']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.spinHeaderGradient}
                >
                  {/* зачем (владелец, 2026-08-26): единый значок спина — тот же,
                      что на Главной, в награде сундука лиги и в итоге Арены.
                      Метка доступности уже на кнопке, значок декоративный. */}
                  <SpinTicketArt size={24} accessibilityLabel="" />
                  <Text style={styles.spinHeaderLabel}>
                    {triLang(lang, {
                      ru: 'Спин', uk: 'Спін', en: 'Spin', es: 'Giro', 'pt-BR': 'Giro',
                      vi: 'Quay', id: 'Putar', tr: 'Çevir', pl: 'Spin',
                    })}
                  </Text>
                  <View testID="level-gifts-spin-count" style={styles.spinCountBadge}>
                    <Text style={styles.spinCountText}>{spinBalance ?? '…'}</Text>
                  </View>
                </LinearGradient>
              </TapScale>
            </Animated.View>
          </View>

          <BouncyScrollView decelerationRate="fast" contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false} scrollEventThrottle={16}>
            <View testID="level-gifts-bonus-of-day" style={{ gap: 8 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900', paddingHorizontal: 2 }}>
                {triLang(lang, { ru: 'Бонус дня', uk: 'Бонус дня', en: 'Daily bonus', es: 'Bono del día', 'pt-BR': 'Bônus do dia', vi: 'Ưu đãi hôm nay', id: 'Bonus hari ini', tr: 'Günün bonusu', pl: 'Bonus dnia' })}
              </Text>
              <TodaysBoonStrip marginTop={0} />
            </View>
            <View testID="level-gifts-active-multipliers" style={{ gap: 8 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900', paddingHorizontal: 2 }}>
                {triLang(lang, { ru: 'Активные множители', uk: 'Активні множники', en: 'Active multipliers', es: 'Multiplicadores activos', 'pt-BR': 'Multiplicadores ativos', vi: 'Hệ số đang hoạt động', id: 'Pengali aktif', tr: 'Aktif çarpanlar', pl: 'Aktywne mnożniki' })}
              </Text>
              <LinearGradient colors={[giftTone(t.accent, '24'), t.bgCard, t.bgSurface]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 18, padding: 14, gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900' }}>
                    {triLang(lang, { ru: 'Опыт за занятия', uk: 'Досвід за заняття', en: 'XP for practice', es: 'XP por práctica', 'pt-BR': 'XP por prática', vi: 'XP mỗi buổi học', id: 'XP per latihan', tr: 'Çalışma XP’si', pl: 'XP za naukę' })}
                  </Text>
                  <Text style={{ color: t.accent, fontSize: f.h2, fontWeight: '900' }}>×{(multiplierBreakdown?.total ?? 1).toFixed(2)}</Text>
                </View>
                {[
                  { key: 'streak', label: triLang(lang, { ru: 'Серия', uk: 'Серія', en: 'Streak', es: 'Racha', 'pt-BR': 'Sequência', vi: 'Chuỗi', id: 'Rangkaian', tr: 'Seri', pl: 'Seria' }), value: multiplierBreakdown?.streakM ?? 1 },
                  { key: 'club', label: triLang(lang, { ru: 'Лига', uk: 'Ліга', en: 'League', es: 'Liga', 'pt-BR': 'Liga', vi: 'Giải đấu', id: 'Liga', tr: 'Lig', pl: 'Liga' }), value: multiplierBreakdown?.clubM ?? 1 },
                  { key: 'gift', label: triLang(lang, { ru: 'Подарок', uk: 'Подарунок', en: 'Gift', es: 'Regalo', 'pt-BR': 'Presente', vi: 'Quà tặng', id: 'Hadiah', tr: 'Hediye', pl: 'Prezent' }), value: multiplierBreakdown?.giftM ?? 1 },
                  { key: 'league', label: triLang(lang, { ru: 'Буст лиги', uk: 'Буст ліги', en: 'League boost', es: 'Impulso de liga', 'pt-BR': 'Impulso de liga', vi: 'Tăng lực giải đấu', id: 'Dorongan liga', tr: 'Lig güçlendirmesi', pl: 'Wzmocnienie ligi' }), value: multiplierBreakdown?.leagueBoostM ?? 1 },
                  { key: 'group', label: triLang(lang, { ru: 'Общий буст', uk: 'Спільний буст', en: 'Shared boost', es: 'Impulso común', 'pt-BR': 'Impulso comum', vi: 'Tăng lực chung', id: 'Dorongan bersama', tr: 'Ortak güçlendirme', pl: 'Wspólne wzmocnienie' }), value: multiplierBreakdown?.leagueGroupBoostM ?? 1 },
                  { key: 'comeback', label: triLang(lang, { ru: 'Возврат', uk: 'Повернення', en: 'Comeback', es: 'Retorno', 'pt-BR': 'Retorno', vi: 'Quay lại', id: 'Kembali', tr: 'Geri dönüş', pl: 'Powrót' }), value: multiplierBreakdown?.comebackM ?? 1 },
                  { key: 'chest', label: triLang(lang, { ru: 'Сундук лиги', uk: 'Скриня ліги', en: 'League chest', es: 'Cofre de liga', 'pt-BR': 'Baú da liga', vi: 'Rương giải đấu', id: 'Peti liga', tr: 'Lig sandığı', pl: 'Skrzynia ligi' }), value: multiplierBreakdown?.leagueChestM ?? 1 },
                ].filter((item) => item.value > 1).map((item) => (
                  <View key={item.key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '700' }}>{item.label}</Text>
                    <Text style={{ color: t.accent, fontSize: f.sub, fontWeight: '900' }}>+{Math.round((item.value - 1) * 100)}%</Text>
                  </View>
                ))}
                {(multiplierBreakdown?.boonXpContribution ?? 0) > 0 ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '700' }}>{triLang(lang, { ru: 'Бонус дня', uk: 'Бонус дня', en: 'Daily bonus', es: 'Bono del día', 'pt-BR': 'Bônus do dia', vi: 'Ưu đãi hôm nay', id: 'Bonus hari ini', tr: 'Günün bonusu', pl: 'Bonus dnia' })}</Text>
                    <Text style={{ color: t.accent, fontSize: f.sub, fontWeight: '900' }}>+{Math.round((multiplierBreakdown?.boonXpContribution ?? 0) * 100)}%</Text>
                  </View>
                ) : null}
                {(multiplierBreakdown?.total ?? 1) <= 1 ? (
                  <Text style={{ color: t.textMuted, fontSize: f.sub, lineHeight: f.sub + 4 }}>
                    {triLang(lang, { ru: 'Сейчас дополнительных множителей нет', uk: 'Зараз додаткових множників немає', en: 'No extra multipliers right now', es: 'Ahora no hay multiplicadores extra', 'pt-BR': 'Não há multiplicadores extras agora', vi: 'Hiện chưa có hệ số thêm', id: 'Belum ada pengali tambahan', tr: 'Şu anda ek çarpan yok', pl: 'Brak dodatkowych mnożników' })}
                  </Text>
                ) : null}
              </LinearGradient>
            </View>
            <View testID="level-gifts-inventory" style={{ gap: 10 }}>
              {/* Заголовок единого списка. Вкладок нет: активные бонусы и
                  неоткрытые подарки живут вместе, активные — первыми. */}
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900', paddingHorizontal: 2 }}>
                {triLang(lang, { ru: 'Твои подарки', uk: 'Твої подарунки', en: 'Your gifts', es: 'Tus regalos', 'pt-BR': 'Seus presentes', vi: 'Quà của bạn', id: 'Hadiahmu', tr: 'Hediyelerin', pl: 'Twoje prezenty' })}
              </Text>
            {activeItems.length > 0 && (
              <View style={{ gap: 10 }}>
                {activeItems.map((gift) => {
                  const chipStyle = {
                    flexDirection: 'row' as const,
                    alignItems: 'center' as const,
                    gap: 11,
                    borderRadius: 18,
                    paddingVertical: 11,
                    paddingHorizontal: 12,
                    // зачем 2026-08-04: borderWidth уже 0 (разделяем тоном, не
                    // обводкой), а borderColor остался висеть мёртвым — убран,
                    // чтобы случайное возвращение ширины не вернуло рамку.
                    borderWidth: 0,
                    overflow: 'hidden' as const,
                  };
                  const chipInner = (
                    <LinearGradient colors={[giftTone(gift.accent, '24'), t.bgCard, t.bgSurface]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={chipStyle}>
                      {/* зачем 2026-08-03 (владелец: «карточка горизонтальная
                          (бонус), там жёлтая полоска наверху — удали её»):
                          здесь была декоративная линия height:1 цветом акцента
                          поверх карточки. Она не несла смысла и читалась как
                          случайная царапина на градиенте. */}
                      <View style={{ width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: giftTone(gift.accent, '28') }}>
                        <LevelSpinRewardArt
                          rewardId={gift.iconGiftId}
                          size={38}
                          accessibilityLabel={gift.title}
                          fallbackColor={gift.accent}
                        />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ color: t.textPrimary, fontSize: f.body, lineHeight: f.body + 4, fontWeight: '900' }}>
                          {gift.title}
                        </Text>
                        <Text style={{ color: t.textMuted, fontSize: f.sub, lineHeight: f.sub + 4, marginTop: 2 }}>
                          {gift.desc}
                        </Text>
                        {/* зачем 2026-08-04 (владелец: «убери подписи, только
                            название и сколько ещё опыта»): третья строка-хинт
                            («Работает автоматически», «Опыт удвоится сам…»)
                            ничего не добавляла к названию и делала карточку
                            выше на строку. Для кликабельных подарков путь
                            подсказывает стрелка справа. */}
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <View style={{ borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: giftTone(gift.accent, '1F') }}>
                          <Text
                            testID={gift.informationKind === 'attempt_restore_all' ? 'session-attempt-restore-count' : undefined}
                            style={{ color: gift.accent, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' }}
                          >
                            {typeof gift.countBadge === 'number'
                              ? `×${gift.countBadge}`
                              : triLang(lang, {
                                  ru: 'Активно',
                                  uk: 'Активно',
                                  en: 'Active',
                                  es: 'Activo',
                                  'pt-BR': 'Ativo',
                                  vi: 'Đang bật',
                                  id: 'Aktif',
                                  tr: 'Aktif',
                                  pl: 'Aktywne',
                                })}
                          </Text>
                        </View>
                        {gift.lifetime.kind === 'expires' && (
                          // зачем 2026-08-23 (владелец: «таймер уже показывает
                          // не когда подарок сгорит, а сколько он действует»):
                          // подарок уже активирован — отсчёт означает остаток
                          // действия, а не срок до потери.
                          <GiftExpiryCountdown
                            expiresAtMs={gift.lifetime.expiresAtMs}
                            accent={gift.accent}
                            onExpired={handleGiftExpired}
                            meaning="remaining"
                            testID={`gift-expiry-${gift.key}`}
                          />
                        )}
                        {gift.lifetime.kind === 'permanent' && gift.informationKind === 'attempt_restore_all' ? (
                          <Text style={{ color: t.textMuted, fontSize: 10, fontWeight: '800', textAlign: 'right' }}>
                            {triLang(lang, {
                              ru: 'Без срока действия', uk: 'Без строку дії', en: 'No expiry',
                              es: 'Sin caducidad', 'pt-BR': 'Sem validade', vi: 'Không hết hạn',
                              id: 'Tanpa kedaluwarsa', tr: 'Süresiz', pl: 'Bez terminu',
                            })}
                          </Text>
                        ) : null}
                        {(!!gift.actionRoute || gift.informationKind === 'attempt_restore_all') && (
                          <Ionicons name="chevron-forward" size={16} color={gift.accent} />
                        )}
                      </View>
                    </LinearGradient>
                  );
                  return gift.actionRoute || gift.informationKind === 'attempt_restore_all' ? (
                    <TapScale
                      key={gift.key}
                      accessibilityRole="button"
                      accessibilityLabel={gift.title}
                      onPress={() => {
                        hapticTap();
                        if (gift.informationKind === 'attempt_restore_all') {
                          setSelectedInfoGift(gift);
                        } else if (gift.actionRoute) {
                          router.push(gift.actionRoute as never);
                        }
                      }}
                    >
                      {chipInner}
                    </TapScale>
                  ) : (
                    <View key={gift.key}>
                      {chipInner}
                    </View>
                  );
                })}
              </View>
            )}
            {/* Совсем пусто: ни действующих бонусов, ни неоткрытых подарков. */}
            {activeItems.length === 0 && items.length === 0 ? (
              <LinearGradient
                colors={emptyGiftSurface}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 22, padding: 22, borderWidth: 0, alignItems: 'center' }}
              >
                <View style={{ width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: `${t.accent}24`, marginBottom: 12 }}>
                  <Ionicons name="gift-outline" size={28} color={t.accent} />
                </View>
                <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900', textAlign: 'center' }}>
                  {triLang(lang, {
                    ru: 'Подарков пока нет',
                    uk: 'Подарунків поки немає',
                    en: 'No gifts yet',
                    es: 'Aún no hay regalos',
                    'pt-BR': 'Ainda não há presentes',
                    vi: 'Chưa có quà',
                    id: 'Belum ada hadiah',
                    tr: 'Henüz hediye yok',
                    pl: 'Nie masz jeszcze prezentów',
                  })}
                </Text>
                {/* зачем 2026-08-23: раньше это была пустая вкладка «Активные»
                    и текст говорил только про применённые бонусы. Теперь список
                    один, и пусто здесь значит «нет ни того, ни другого» —
                    объясняем оба случая, иначе текст врёт про половину экрана. */}
                <Text style={{ color: t.textMuted, fontSize: f.body, lineHeight: f.body + 6, textAlign: 'center', marginTop: 8 }}>
                  {triLang(lang, {
                    ru: 'Подарки за уровни появятся здесь. Применишь — подарок останется в списке и покажет, сколько ещё действует.',
                    uk: 'Подарунки за рівні з’являться тут. Застосуєш — подарунок лишиться у списку й покаже, скільки ще діє.',
                    en: 'Level gifts will appear here. Once applied, a gift stays in the list showing how long it’s still active.',
                    es: 'Los regalos por nivel aparecerán aquí. Al aplicarlos, seguirán en la lista mostrando cuánto duran.',
                    'pt-BR': 'Os presentes de nível aparecerão aqui. Ao aplicar, eles ficam na lista mostrando quanto tempo duram.',
                    vi: 'Quà cấp độ sẽ hiện ở đây. Khi dùng, quà vẫn nằm trong danh sách và hiện thời gian còn hiệu lực.',
                    id: 'Hadiah level akan muncul di sini. Setelah dipakai, hadiah tetap di daftar dan menampilkan sisa waktunya.',
                    tr: 'Seviye hediyeleri burada görünür. Kullandığında listede kalır ve ne kadar süre geçerli olduğunu gösterir.',
                    pl: 'Prezenty za poziomy pojawią się tutaj. Po użyciu zostaną na liście i pokażą, jak długo działają.',
                  })}
                </Text>
              </LinearGradient>
            ) : null}
            {/* зачем 2026-08-23: активные бонусы уже наверху и занимают экран.
                Второй крупный пустой блок на пол-экрана конкурировал бы с ними
                за внимание — здесь достаточно тихой строки. */}
            {items.length === 0 && activeItems.length > 0 ? (
              <Text style={{ color: t.textMuted, fontSize: f.sub, lineHeight: f.sub + 5, paddingHorizontal: 2, paddingVertical: 4 }}>
                {triLang(lang, {
                  ru: 'Неоткрытых подарков нет — новые за уровни появятся здесь.',
                  uk: 'Невідкритих подарунків немає — нові за рівні з’являться тут.',
                  en: 'No unopened gifts — new level gifts will appear here.',
                  es: 'No hay regalos sin abrir: los nuevos por nivel aparecerán aquí.',
                  'pt-BR': 'Não há presentes fechados: os novos de nível aparecerão aqui.',
                  vi: 'Không có quà chưa mở — quà cấp độ mới sẽ hiện ở đây.',
                  id: 'Tidak ada hadiah yang belum dibuka — hadiah level baru akan muncul di sini.',
                  tr: 'Açılmamış hediye yok — yeni seviye hediyeleri burada görünür.',
                  pl: 'Brak nieotwartych prezentów — nowe za poziomy pojawią się tutaj.',
                })}
              </Text>
            ) : null}
            {/* Сетка неоткрытых подарков — под действующими бонусами. */}
            {items.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: TILE_GRID_GAP }}>
                {items.map((item) => (
                  <GiftTile
                    key={pendingGiftItemKey(item)}
                    item={item}
                    size={tileSize}
                    lang={lang}
                    themeMode={themeMode}
                    themeAccent={t.accent}
                    themeGold={t.gold}
                    nameColor={t.textPrimary}
                    isLight={isLight}
                    surface={[t.bgCard, t.bgSurface]}
                    onPress={setSelected}
                    onExpired={handleGiftExpired}
                  />
                ))}
              </View>
            ) : null}
            </View>
            <View style={{ height: 8 }} />
          </BouncyScrollView>
        </ContentWrap>

        {selected?.kind === 'single' && (
          <LevelGiftModal
            visible
            level={selected.level}
            userName={userName}
            lang={lang}
            onClose={closeGiftModal}
            preRolledGift={selected.gift}
            deliveryMode="claim"
            presentationMode="apply"
            onGiftClaimed={selected.spinOccurrence
              ? async (_gift, accountToken) => {
                  const claimed = await markLevelSpinGiftOccurrenceClaimed(
                    selected.spinOccurrence!.requestId,
                    selected.spinOccurrence!.lane,
                    accountToken,
                  );
                  if (!claimed) throw new Error('local_spin_outer_journal_not_durable');
                }
              : selected.dualPart
                ? (_gift, accountToken) => markDualGiftPartClaimed(selected.level, selected.dualPart!, accountToken)
                : undefined}
            onGiftApplyFailed={selected.dualPart
              ? (gift, accountToken) => restoreDualGiftPartAfterFailedClaim(selected.level, selected.dualPart!, gift, accountToken)
              : undefined}
            onGiftApplySettled={loadData}
            saveOnDismiss={false}
            applyAsPremium={selected.spinOccurrence?.lane === 'premium' || selected.dualPart ? true : undefined}
            occurrenceId={selected.spinOccurrence?.occurrenceId ?? `level:${selected.level}:${selected.dualPart ?? 'f2p'}`}
            deviceLocalSpin={selected.spinOccurrence?.localOnly === true ? true : undefined}
            studyTarget={studyTarget}
          />
        )}
        {selected?.kind === 'dual' && (
          <LevelGiftDualModal
            visible
            level={selected.level}
            userName={userName}
            lang={lang}
            onClose={closeGiftModal}
            preRolledPair={selected.pair}
            deliveryMode="claim"
            presentationMode="apply"
            studyTarget={studyTarget}
          />
        )}
        <CenteredDialogShell
          visible={selectedInfoGift?.informationKind === 'attempt_restore_all'}
          onClose={() => setSelectedInfoGift(null)}
          title={triLang(lang, {
            ru: 'Второй шанс', uk: 'Другий шанс', en: 'Second chance', es: 'Segunda oportunidad',
            'pt-BR': 'Segunda chance', vi: 'Cơ hội thứ hai', id: 'Kesempatan kedua',
            tr: 'İkinci şans', pl: 'Druga szansa',
          })}
          closeLabel={triLang(lang, {
            ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar',
            vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij',
          })}
          testID="session-attempt-restore-info-modal"
        >
          <View style={{ alignItems: 'center', gap: 14 }}>
            <View style={{ width: 132, height: 132, alignItems: 'center', justifyContent: 'center' }}>
              <LevelSpinRewardArt
                rewardId="attempt_restore_all"
                size={124}
                accessibilityLabel={triLang(lang, {
                  ru: 'Подарок Второй шанс', uk: 'Подарунок Другий шанс', en: 'Second chance gift',
                  es: 'Regalo Segunda oportunidad', 'pt-BR': 'Presente Segunda chance',
                  vi: 'Quà Cơ hội thứ hai', id: 'Hadiah Kesempatan kedua',
                  tr: 'İkinci şans hediyesi', pl: 'Prezent Druga szansa',
                })}
                fallbackColor="#D96076"
              />
            </View>
            <Text style={{ color: t.textPrimary, fontSize: f.body, lineHeight: f.body + 6, fontWeight: '800', textAlign: 'center' }}>
              {triLang(lang, {
                ru: 'Восстанавливает все 3 попытки во время сессии',
                uk: 'Відновлює всі 3 спроби під час сесії',
                en: 'Restores all 3 attempts during a session',
                es: 'Restaura los 3 intentos durante la sesión',
                'pt-BR': 'Restaura todas as 3 tentativas durante uma sessão',
                vi: 'Khôi phục cả 3 lượt thử trong một phiên',
                id: 'Memulihkan semua 3 percobaan selama sesi',
                tr: 'Oturum sırasında 3 denemenin tümünü yeniler',
                pl: 'Przywraca wszystkie 3 próby podczas sesji',
              })}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: giftTone('#D96076', '24') }}>
                <Text style={{ color: '#D96076', fontSize: f.sub, fontWeight: '900' }}>
                  ×{selectedInfoGift?.countBadge ?? 0}
                </Text>
              </View>
              <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '800' }}>
                {triLang(lang, {
                  ru: 'Без срока действия', uk: 'Без строку дії', en: 'No expiry',
                  es: 'Sin caducidad', 'pt-BR': 'Sem validade', vi: 'Không hết hạn',
                  id: 'Tanpa kedaluwarsa', tr: 'Süresiz', pl: 'Bez terminu',
                })}
              </Text>
            </View>
            <Text style={{ color: t.textMuted, fontSize: f.sub, lineHeight: f.sub + 6, textAlign: 'center' }}>
              {triLang(lang, {
                ru: 'Использовать подарок можно, когда попытки в сессии закончатся.',
                uk: 'Використати подарунок можна, коли спроби в сесії закінчаться.',
                en: 'You can use this gift when you run out of attempts in a session.',
                es: 'Puedes usar este regalo cuando te quedes sin intentos en una sesión.',
                'pt-BR': 'Você pode usar este presente quando acabar suas tentativas na sessão.',
                vi: 'Bạn có thể dùng quà này khi hết lượt thử trong một phiên.',
                id: 'Hadiah ini dapat dipakai saat percobaanmu habis dalam sesi.',
                tr: 'Bu hediyeyi oturumdaki denemelerin bittiğinde kullanabilirsin.',
                pl: 'Możesz użyć prezentu, gdy skończą się próby w sesji.',
              })}
            </Text>
          </View>
        </CenteredDialogShell>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  spinHeaderButton: { borderRadius: 16 },
  spinHeaderGradient: {
    minWidth: 104,
    minHeight: 44,
    borderRadius: 16,
    // зачем: слева теперь значок спина, а не пустое поле (см. Главную).
    paddingLeft: 9,
    paddingRight: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderBottomWidth: 4,
    borderBottomColor: '#A96F06',
  },
  spinHeaderLabel: { color: '#211500', fontSize: 15, fontWeight: '900', letterSpacing: 0.15 },
  spinCountBadge: {
    minWidth: 30,
    height: 30,
    borderRadius: 10,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(33,21,0,0.14)',
  },
  spinCountText: { color: '#211500', fontSize: 15, fontWeight: '900', fontVariant: ['tabular-nums'] },
});
