import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import TapScale from '../components/TapScale';
import BouncyScrollView from '../components/BouncyScrollView';
import { LinearGradient } from '../components/SafeLinearGradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { Dimensions, Platform, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import ContentWrap from '../components/ContentWrap';
import GiftExpiryCountdown from '../components/GiftExpiryCountdown';
import LevelGiftDualModal from '../components/LevelGiftDualModal';
import LevelGiftModal from '../components/LevelGiftModal';
import TodaysBoonStrip from '../components/TodaysBoonStrip';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import { triLang } from '../constants/i18n';
import { getLevelGiftRewardIcon } from '../constants/levelGiftRewardIcons';
import { isLightThemeMode } from '../constants/theme';
import {
  giftDisplayTitleForLang,
  giftRarityUiLabel,
  giftShardAmount,
  giftTitleForLang,
} from './level_gift_system';
import { oskolokImageForPackShards } from './oskolok';
import { safeRouterBack } from './navigation_back';
import { animateNextLayoutTransition } from './smooth_layout';
import {
  getPendingLevelGiftInventoryCache,
  loadPendingLevelGiftInventory,
  markDualGiftPartClaimed,
  type PendingLevelGiftInventoryItem,
} from './level_gift_inventory';
import {
  loadActiveLevelGiftInventory,
  type ActiveLevelGiftInventoryItem,
} from './level_gift_active_inventory';
import { getCurrentMultiplierBreakdown, type MultiplierBreakdown } from './xp_manager';
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

const giftTone = (accent: string, alpha: string): string =>
  /^#[0-9a-f]{6}$/i.test(accent) ? `${accent}${alpha}` : accent;

const giftBonusLabel = (lang: Parameters<typeof giftTitleForLang>[1]): string =>
  triLang(lang, { ru: 'Бонус', uk: 'Бонус', es: 'Bono', 'pt-BR': 'Bônus', vi: 'Thưởng', id: 'Bonus', tr: 'Bonus', pl: 'Bonus' });

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const dualPartLabel = (
  part: NonNullable<Extract<PendingLevelGiftInventoryItem, { kind: 'single' }>['dualPart']>,
  lang: Parameters<typeof giftTitleForLang>[1],
): string => (
  part === 'f2p'
    ? triLang(lang, { ru: 'Подарок за уровень', uk: 'Подарунок за рівень', es: 'Regalo por nivel', 'pt-BR': 'Presente de n\u00edvel', vi: 'Qu\u00e0 c\u1ea5p \u0111\u1ed9', id: 'Hadiah level', tr: 'Seviye hediyesi', pl: 'Prezent za poziom' })
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
  themeMode: Parameters<typeof oskolokImageForPackShards>[1];
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
  const shardAmount = item.kind === 'single' ? giftShardAmount(item.gift.id) : 0;
  const rowKey = item.kind === 'single' && item.dualPart
    ? `${item.kind}-${item.level}-${item.dualPart}`
    : `${item.kind}-${item.level}`;
  const title = item.kind === 'dual'
    ? triLang(lang, { ru: 'Два подарка', uk: 'Два подарунки', es: 'Dos regalos', 'pt-BR': 'Dois presentes', vi: 'Hai món quà', id: 'Dua hadiah', tr: 'İki hediye', pl: 'Dwa prezenty' })
    : giftDisplayTitleForLang(item.gift, lang);
  const a11yLabel = `${title}. ${triLang(lang, {
    ru: `Уровень ${item.level}, ${giftRarityUiLabel(strongestRarity, lang)}`,
    uk: `Рівень ${item.level}, ${giftRarityUiLabel(strongestRarity, lang)}`,
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
          <Image
            source={shardAmount > 0 ? oskolokImageForPackShards(shardAmount, themeMode) : getLevelGiftRewardIcon(primaryGift.id, themeMode)}
            style={{ width: size * 0.62, height: size * 0.62 }}
            contentFit="contain"
            accessible={false}
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
  const [items, setItems] = useState<PendingLevelGiftInventoryItem[]>(() => getPendingLevelGiftInventoryCache(studyTarget));
  const [activeItems, setActiveItems] = useState<ActiveLevelGiftInventoryItem[]>([]);
  const [multiplierBreakdown, setMultiplierBreakdown] = useState<MultiplierBreakdown | null>(null);
  const [userName, setUserName] = useState('');
  const [selected, setSelected] = useState<PendingLevelGiftInventoryItem | null>(null);
  /**
   * Вкладка раздела подарков.
   *
   * зачем 2026-08-03 (владелец: «подарки после активации просто исчезают… я хочу
   * видеть в этом же разделе подраздел активные, и там пусть показываются все
   * активные… когда заходим в раздел подарки, то видим вкладку инвентарь, а
   * рядом кнопка переключает на активированные»): всё лежало в одном списке —
   * неоткрытые подарки и уже действующие бонусы вперемешку, поэтому после
   * применения подарок будто пропадал. Теперь это два явных раздела.
   */
  const [tab, setTab] = useState<'inventory' | 'active'>('inventory');
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

  useFocusEffect(useCallback(() => {
    void loadData();
    return undefined;
  }, [loadData]));

  // зачем: таймер дошёл до нуля — подарок сгорел; ряд уходит плавным
  // layout-переходом, а перезагрузка данных заодно вычищает его из хранилища.
  const handleGiftExpired = useCallback(() => {
    animateNextLayoutTransition();
    void loadData();
  }, [loadData]);

  const closeGiftModal = (claimed = false) => {
    if (claimed && selected) {
      const selectedKey = selected.kind === 'single' && selected.dualPart
        ? `${selected.kind}-${selected.level}-${selected.dualPart}`
        : `${selected.kind}-${selected.level}`;
      setItems((current) => current.filter((item) => {
        const itemKey = item.kind === 'single' && item.dualPart
          ? `${item.kind}-${item.level}-${item.dualPart}`
          : `${item.kind}-${item.level}`;
        return itemKey !== selectedKey;
      }));
    }
    setSelected(null);
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
                es: 'Regalos',
                'pt-BR': 'Presentes',
                vi: 'Quà',
                id: 'Hadiah',
                tr: 'Hediyeler',
                pl: 'Prezenty',
              })}
            </Text>
          </View>

          <BouncyScrollView decelerationRate="normal" contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false} scrollEventThrottle={16}>
            <View testID="level-gifts-bonus-of-day" style={{ gap: 8 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900', paddingHorizontal: 2 }}>
                {triLang(lang, { ru: 'Бонус дня', uk: 'Бонус дня', es: 'Bono del día', 'pt-BR': 'Bônus do dia', vi: 'Ưu đãi hôm nay', id: 'Bonus hari ini', tr: 'Günün bonusu', pl: 'Bonus dnia' })}
              </Text>
              <TodaysBoonStrip marginTop={0} />
            </View>
            <View testID="level-gifts-active-multipliers" style={{ gap: 8 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900', paddingHorizontal: 2 }}>
                {triLang(lang, { ru: 'Активные множители', uk: 'Активні множники', es: 'Multiplicadores activos', 'pt-BR': 'Multiplicadores ativos', vi: 'Hệ số đang hoạt động', id: 'Pengali aktif', tr: 'Aktif çarpanlar', pl: 'Aktywne mnożniki' })}
              </Text>
              <LinearGradient colors={[giftTone(t.accent, '24'), t.bgCard, t.bgSurface]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 18, padding: 14, gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900' }}>
                    {triLang(lang, { ru: 'Опыт за занятия', uk: 'Досвід за заняття', es: 'XP por práctica', 'pt-BR': 'XP por prática', vi: 'XP mỗi buổi học', id: 'XP per latihan', tr: 'Çalışma XP’si', pl: 'XP za naukę' })}
                  </Text>
                  <Text style={{ color: t.accent, fontSize: f.h2, fontWeight: '900' }}>×{(multiplierBreakdown?.total ?? 1).toFixed(2)}</Text>
                </View>
                {[
                  { key: 'streak', label: triLang(lang, { ru: 'Серия', uk: 'Серія', es: 'Racha', 'pt-BR': 'Sequência', vi: 'Chuỗi', id: 'Rangkaian', tr: 'Seri', pl: 'Seria' }), value: multiplierBreakdown?.streakM ?? 1 },
                  { key: 'club', label: triLang(lang, { ru: 'Лига', uk: 'Ліга', es: 'Liga', 'pt-BR': 'Liga', vi: 'Giải đấu', id: 'Liga', tr: 'Lig', pl: 'Liga' }), value: multiplierBreakdown?.clubM ?? 1 },
                  { key: 'gift', label: triLang(lang, { ru: 'Подарок', uk: 'Подарунок', es: 'Regalo', 'pt-BR': 'Presente', vi: 'Quà tặng', id: 'Hadiah', tr: 'Hediye', pl: 'Prezent' }), value: multiplierBreakdown?.giftM ?? 1 },
                  { key: 'league', label: triLang(lang, { ru: 'Буст лиги', uk: 'Буст ліги', es: 'Impulso de liga', 'pt-BR': 'Impulso de liga', vi: 'Tăng lực giải đấu', id: 'Dorongan liga', tr: 'Lig güçlendirmesi', pl: 'Wzmocnienie ligi' }), value: multiplierBreakdown?.leagueBoostM ?? 1 },
                  { key: 'group', label: triLang(lang, { ru: 'Общий буст', uk: 'Спільний буст', es: 'Impulso común', 'pt-BR': 'Impulso comum', vi: 'Tăng lực chung', id: 'Dorongan bersama', tr: 'Ortak güçlendirme', pl: 'Wspólne wzmocnienie' }), value: multiplierBreakdown?.leagueGroupBoostM ?? 1 },
                  { key: 'comeback', label: triLang(lang, { ru: 'Возврат', uk: 'Повернення', es: 'Retorno', 'pt-BR': 'Retorno', vi: 'Quay lại', id: 'Kembali', tr: 'Geri dönüş', pl: 'Powrót' }), value: multiplierBreakdown?.comebackM ?? 1 },
                  { key: 'chest', label: triLang(lang, { ru: 'Сундук лиги', uk: 'Скриня ліги', es: 'Cofre de liga', 'pt-BR': 'Baú da liga', vi: 'Rương giải đấu', id: 'Peti liga', tr: 'Lig sandığı', pl: 'Skrzynia ligi' }), value: multiplierBreakdown?.leagueChestM ?? 1 },
                ].filter((item) => item.value > 1).map((item) => (
                  <View key={item.key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '700' }}>{item.label}</Text>
                    <Text style={{ color: t.accent, fontSize: f.sub, fontWeight: '900' }}>+{Math.round((item.value - 1) * 100)}%</Text>
                  </View>
                ))}
                {(multiplierBreakdown?.boonXpContribution ?? 0) > 0 ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '700' }}>{triLang(lang, { ru: 'Бонус дня', uk: 'Бонус дня', es: 'Bono del día', 'pt-BR': 'Bônus do dia', vi: 'Ưu đãi hôm nay', id: 'Bonus hari ini', tr: 'Günün bonusu', pl: 'Bonus dnia' })}</Text>
                    <Text style={{ color: t.accent, fontSize: f.sub, fontWeight: '900' }}>+{Math.round((multiplierBreakdown?.boonXpContribution ?? 0) * 100)}%</Text>
                  </View>
                ) : null}
                {(multiplierBreakdown?.total ?? 1) <= 1 ? (
                  <Text style={{ color: t.textMuted, fontSize: f.sub, lineHeight: f.sub + 4 }}>
                    {triLang(lang, { ru: 'Сейчас дополнительных множителей нет', uk: 'Зараз додаткових множників немає', es: 'Ahora no hay multiplicadores extra', 'pt-BR': 'Não há multiplicadores extras agora', vi: 'Hiện chưa có hệ số thêm', id: 'Belum ada pengali tambahan', tr: 'Şu anda ek çarpan yok', pl: 'Brak dodatkowych mnożników' })}
                  </Text>
                ) : null}
              </LinearGradient>
            </View>
            <View testID="level-gifts-inventory" style={{ gap: 10 }}>
              {/* Переключатель разделов: слева неоткрытые подарки, справа уже
                  действующие бонусы со своими таймерами. Счётчик на вкладке
                  сразу говорит, есть ли там что-то, — без лишнего переключения. */}
              <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 2 }}>
                {([
                  { key: 'inventory' as const, label: triLang(lang, { ru: 'Инвентарь', uk: 'Інвентар', es: 'Inventario', 'pt-BR': 'Inventário', vi: 'Kho quà', id: 'Inventaris', tr: 'Envanter', pl: 'Ekwipunek' }), count: items.length },
                  { key: 'active' as const, label: triLang(lang, { ru: 'Активные', uk: 'Активні', es: 'Activos', 'pt-BR': 'Ativos', vi: 'Đang bật', id: 'Aktif', tr: 'Aktif', pl: 'Aktywne' }), count: activeItems.length },
                ]).map((entry) => {
                  const isActiveTab = tab === entry.key;
                  return (
                    <TapScale
                      key={entry.key}
                      testID={`level-gifts-tab-${entry.key}`}
                      onPress={() => { hapticTap(); setTab(entry.key); }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isActiveTab }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        borderRadius: 999,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        // Разделяем тоном, без обводок: активная вкладка плотнее.
                        backgroundColor: isActiveTab ? giftTone(t.accent, '2E') : t.bgSurface,
                      }}
                    >
                      <Text style={{ color: isActiveTab ? t.accent : t.textMuted, fontSize: f.body, fontWeight: '900' }}>
                        {entry.label}
                      </Text>
                      {entry.count > 0 && (
                        <View style={{ minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: isActiveTab ? t.accent : giftTone(t.textMuted, '33') }}>
                          <Text /* guard-ok: счётчик-бейдж внутри вкладки (число подарков), а не подпись-расшифровка под названием */ style={{ color: isActiveTab ? t.bgPrimary : t.textMuted, fontSize: 11, fontWeight: '900', fontVariant: ['tabular-nums'] }}>
                            {entry.count}
                          </Text>
                        </View>
                      )}
                    </TapScale>
                  );
                })}
              </View>
            {tab === 'active' && activeItems.length > 0 && (
              <View style={{ gap: 10 }}>
                {activeItems.map((gift) => {
                  const chipStyle = {
                    flexDirection: 'row' as const,
                    alignItems: 'center' as const,
                    gap: 11,
                    borderRadius: 18,
                    paddingVertical: 11,
                    paddingHorizontal: 12,
                    borderWidth: 0,
                    borderColor: `${gift.accent}70`,
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
                        <Image source={getLevelGiftRewardIcon(gift.iconGiftId, themeMode)} style={{ width: 38, height: 38 }} contentFit="contain" />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ color: t.textPrimary, fontSize: f.body, lineHeight: f.body + 4, fontWeight: '900' }}>
                          {gift.title}
                        </Text>
                        <Text style={{ color: t.textMuted, fontSize: f.sub, lineHeight: f.sub + 4, marginTop: 2 }}>
                          {gift.desc}
                        </Text>
                        {!!gift.hint && (
                          <Text style={{ color: gift.actionRoute ? gift.accent : t.textMuted, fontSize: f.sub - 1, lineHeight: f.sub + 3, marginTop: 3, fontWeight: gift.actionRoute ? '800' : '400' }}>
                            {gift.hint}
                          </Text>
                        )}
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <View style={{ borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: giftTone(gift.accent, '1F') }}>
                          <Text style={{ color: gift.accent, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' }}>
                            {triLang(lang, {
                              ru: 'Активно',
                              uk: 'Активно',
                              es: 'Activo',
                              'pt-BR': 'Ativo',
                              vi: 'Đang bật',
                              id: 'Aktif',
                              tr: 'Aktif',
                              pl: 'Aktywne',
                            })}
                          </Text>
                        </View>
                        {typeof gift.expiresAtMs === 'number' && (
                          <GiftExpiryCountdown
                            expiresAtMs={gift.expiresAtMs}
                            accent={gift.accent}
                            onExpired={handleGiftExpired}
                            testID={`gift-expiry-${gift.key}`}
                          />
                        )}
                        {!!gift.actionRoute && (
                          <Ionicons name="chevron-forward" size={16} color={gift.accent} />
                        )}
                      </View>
                    </LinearGradient>
                  );
                  return gift.actionRoute ? (
                    <TapScale
                      key={gift.key}
                      onPress={() => {
                        hapticTap();
                        router.push(gift.actionRoute as never);
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
            {/* Пустая вкладка «Активные»: объясняем, что сюда попадает, а не
                показываем голый экран. */}
            {tab === 'active' && activeItems.length === 0 ? (
              <LinearGradient
                colors={emptyGiftSurface}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 22, padding: 22, borderWidth: 0, alignItems: 'center' }}
              >
                <View style={{ width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: `${t.accent}24`, marginBottom: 12 }}>
                  <Ionicons name="flash-outline" size={28} color={t.accent} />
                </View>
                <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900', textAlign: 'center' }}>
                  {triLang(lang, {
                    ru: 'Сейчас ничего не действует',
                    uk: 'Зараз нічого не діє',
                    es: 'Nada activo ahora',
                    'pt-BR': 'Nada ativo agora',
                    vi: 'Hiện chưa có hiệu lực',
                    id: 'Belum ada yang aktif',
                    tr: 'Şu anda aktif bir şey yok',
                    pl: 'Nic teraz nie działa',
                  })}
                </Text>
                <Text style={{ color: t.textMuted, fontSize: f.body, lineHeight: f.body + 6, textAlign: 'center', marginTop: 8 }}>
                  {triLang(lang, {
                    ru: 'Применённые бонусы появятся здесь со своим таймером: множители опыта, буст лиги, подарки друзей.',
                    uk: 'Застосовані бонуси з’являться тут із таймером: множники досвіду, буст ліги, подарунки друзів.',
                    es: 'Los bonos aplicados aparecerán aquí con su temporizador: multiplicadores, impulso de liga, regalos de amigos.',
                    'pt-BR': 'Os bônus aplicados aparecerão aqui com seu tempo: multiplicadores, impulso de liga, presentes de amigos.',
                    vi: 'Các ưu đãi đã dùng sẽ hiện ở đây kèm đồng hồ đếm ngược.',
                    id: 'Bonus yang dipakai akan muncul di sini dengan pengatur waktunya.',
                    tr: 'Kullanılan bonuslar süreleriyle birlikte burada görünür.',
                    pl: 'Użyte bonusy pojawią się tutaj z własnym licznikiem czasu.',
                  })}
                </Text>
              </LinearGradient>
            ) : null}
            {tab === 'inventory' && items.length === 0 ? (
              <LinearGradient
                colors={emptyGiftSurface}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 22, padding: 22, borderWidth: 0, borderColor: `${t.accent}55`, alignItems: 'center' }}
              >
                <View style={{ width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: `${t.accent}24`, marginBottom: 12 }}>
                  <Ionicons name="gift-outline" size={28} color={t.accent} />
                </View>
                <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900', textAlign: 'center' }}>
                  {triLang(lang, {
                    ru: 'Подарков пока нет',
                    uk: 'Подарунків поки немає',
                    es: 'Aún no hay regalos',
                    'pt-BR': 'Ainda não há presentes',
                    vi: 'Chưa có quà',
                    id: 'Belum ada hadiah',
                    tr: 'Henüz hediye yok',
                    pl: 'Nie masz jeszcze prezentów',
                  })}
                </Text>
                <Text style={{ color: t.textMuted, fontSize: f.body, lineHeight: f.body + 6, textAlign: 'center', marginTop: 8 }}>
                  {triLang(lang, {
                    ru: 'Новые подарки за уровни будут сохраняться здесь. Их можно применить в удобный момент.',
                    uk: 'Нові подарунки за рівні зберігатимуться тут. Їх можна застосувати у зручний момент.',
                    es: 'Los regalos nuevos por nivel se guardarán aquí. Podrás aplicarlos cuando quieras.',
                    'pt-BR': 'Novos presentes de nível ficarão aqui. Você poderá usar quando quiser.',
                    vi: 'Quà cấp độ mới sẽ được lưu ở đây. Bạn có thể dùng khi muốn.',
                    id: 'Hadiah level baru akan disimpan di sini. Kamu bisa memakainya kapan saja.',
                    tr: 'Yeni seviye hediyeleri burada saklanır. İstediğin zaman kullanabilirsin.',
                    pl: 'Nowe prezenty za poziomy będą tu zapisywane. Użyjesz ich w dogodnym momencie.',
                  })}
                </Text>
              </LinearGradient>
            ) : null}
            {/* Сетка неоткрытых подарков — только на вкладке «Инвентарь». */}
            {tab === 'inventory' && items.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: TILE_GRID_GAP }}>
                {items.map((item) => (
                  <GiftTile
                    key={item.kind === 'single' && item.dualPart
                      ? `${item.kind}-${item.level}-${item.dualPart}`
                      : `${item.kind}-${item.level}`}
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
            onGiftClaimed={selected.dualPart
              ? (_gift, accountToken) => markDualGiftPartClaimed(selected.level, selected.dualPart!, accountToken)
              : undefined}
            saveOnDismiss={false}
            applyAsPremium={selected.dualPart ? true : undefined}
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
      </SafeAreaView>
    </ScreenGradient>
  );
}
