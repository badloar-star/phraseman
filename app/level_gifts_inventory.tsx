import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import TapScale from '../components/TapScale';
import BouncyScrollView from '../components/BouncyScrollView';
import { LinearGradient } from '../components/SafeLinearGradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
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
import {
  giftDisplayDescForLang,
  giftDisplayTitleForLang,
  giftRarityUiLabel,
  giftShardAmount,
  giftTitleForLang,
  type GiftDef,
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

const giftAccent = (rarity: string): string =>
  rarity === 'epic' ? '#FFD700' : rarity === 'rare' ? '#60A5FA' : '#D6B85C';

const giftTone = (accent: string, alpha: string): string =>
  /^#[0-9a-f]{6}$/i.test(accent) ? `${accent}${alpha}` : accent;

const giftBonusLabel = (lang: Parameters<typeof giftTitleForLang>[1]): string =>
  triLang(lang, { ru: 'Бонус', uk: 'Бонус', es: 'Bono', 'pt-BR': 'Bônus', vi: 'Thưởng', id: 'Bonus', tr: 'Bonus', pl: 'Bonus' });

function GiftIcon({ gift, themeMode }: { gift: GiftDef; themeMode: Parameters<typeof oskolokImageForPackShards>[1] }) {
  return (
    <Image
      source={getLevelGiftRewardIcon(gift.id, themeMode)}
      style={{ width: 38, height: 38 }}
      contentFit="contain"
    />
  );
}

function GiftLine({ gift, label, lang, muted, primary, themeMode }: {
  gift: GiftDef;
  label?: string;
  lang: Parameters<typeof giftTitleForLang>[1];
  muted: string;
  primary: string;
  themeMode: Parameters<typeof oskolokImageForPackShards>[1];
}) {
  const desc = giftDisplayDescForLang(gift, lang);

  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', minWidth: 0 }}>
      <View style={{ width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' }}>
        <GiftIcon gift={gift} themeMode={themeMode} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        {!!label && (
          <Text style={{ color: muted, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 }}>
            {label}
          </Text>
        )}
        <Text style={{ color: primary, fontSize: 15, lineHeight: 19, fontWeight: '900' }}>
          {giftDisplayTitleForLang(gift, lang)}
        </Text>
        {!!desc && (
          <Text style={{ color: muted, fontSize: 12, lineHeight: 16, marginTop: 2 }}>
            {desc}
          </Text>
        )}
      </View>
    </View>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const dualPartLabel = (
  part: NonNullable<Extract<PendingLevelGiftInventoryItem, { kind: 'single' }>['dualPart']>,
  lang: Parameters<typeof giftTitleForLang>[1],
): string => (
  part === 'f2p'
    ? triLang(lang, { ru: 'Подарок за уровень', uk: 'Подарунок за рівень', es: 'Regalo por nivel', 'pt-BR': 'Presente de n\u00edvel', vi: 'Qu\u00e0 c\u1ea5p \u0111\u1ed9', id: 'Hadiah level', tr: 'Seviye hediyesi', pl: 'Prezent za poziom' })
    : giftBonusLabel(lang)
);

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
  const emptyGiftSurface = [giftTone(t.accent, '26'), t.bgCard, t.bgPrimary] as [string, string, string];

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
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900', paddingHorizontal: 2 }}>
                {triLang(lang, { ru: 'Подарки', uk: 'Подарунки', es: 'Regalos', 'pt-BR': 'Presentes', vi: 'Quà tặng', id: 'Hadiah', tr: 'Hediyeler', pl: 'Prezenty' })}
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
                    borderWidth: 0,
                    borderColor: `${gift.accent}70`,
                    overflow: 'hidden' as const,
                  };
                  const chipInner = (
                    <LinearGradient colors={[giftTone(gift.accent, '24'), t.bgCard, t.bgSurface]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={chipStyle}>
                      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 14, right: 14, height: 1, backgroundColor: giftTone(gift.accent, '66'), opacity: 0.8 }} />
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
            {items.length === 0 ? (
              activeItems.length > 0 ? null : (
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
              )
            ) : (
              items.map((item) => {
                const primaryGift = item.kind === 'single' ? item.gift : item.pair.f2p;
                const strongestRarity = item.kind === 'dual'
                  ? primaryGift.rarity === 'epic' || item.pair.prem.rarity === 'epic'
                    ? 'epic'
                    : primaryGift.rarity === 'rare' || item.pair.prem.rarity === 'rare'
                      ? 'rare'
                      : 'common'
                  : primaryGift.rarity;
                const accent = giftAccent(strongestRarity);
                const giftCardSurface = [giftTone(accent, '2E'), t.bgCard, t.bgSurface] as [string, string, string];
                const singleShardAmount = item.kind === 'single' ? giftShardAmount(item.gift.id) : 0;
                const rowArtSize = singleShardAmount > 0 ? 74 : 68;
                const rowKey = item.kind === 'single' && item.dualPart
                  ? `${item.kind}-${item.level}-${item.dualPart}`
                  : `${item.kind}-${item.level}`;
                const singleDescription = item.kind === 'single'
                  ? giftDisplayDescForLang(item.gift, lang)
                  : '';
                return (
                  <LinearGradient
                    key={rowKey}
                    colors={giftCardSurface}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ borderRadius: 22, padding: 14, borderWidth: 0, borderColor: `${accent}88`, overflow: 'hidden' }}
                  >
                    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 18, right: 18, height: 1, backgroundColor: giftTone(accent, '70'), opacity: 0.82 }} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 78, minHeight: 96, alignItems: 'center', justifyContent: 'center', padding: 2, flexShrink: 0 }}>
                        <Image
                          source={
                            singleShardAmount > 0
                              ? oskolokImageForPackShards(singleShardAmount, themeMode)
                              : getLevelGiftRewardIcon(primaryGift.id, themeMode)
                          }
                          style={{ width: rowArtSize, height: rowArtSize }}
                          contentFit="contain"
                        />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ color: accent, fontSize: 11, lineHeight: 15, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                          {triLang(lang, {
                            ru: `Уровень ${item.level} · ${giftRarityUiLabel(strongestRarity, lang)}`,
                            uk: `Рівень ${item.level} · ${giftRarityUiLabel(strongestRarity, lang)}`,
                            es: `Nivel ${item.level} · ${giftRarityUiLabel(strongestRarity, lang)}`,
                            'pt-BR': `Nível ${item.level} · ${giftRarityUiLabel(strongestRarity, lang)}`,
                            vi: `Cấp ${item.level} · ${giftRarityUiLabel(strongestRarity, lang)}`,
                            id: `Level ${item.level} · ${giftRarityUiLabel(strongestRarity, lang)}`,
                            tr: `Seviye ${item.level} · ${giftRarityUiLabel(strongestRarity, lang)}`,
                            pl: `Poziom ${item.level} · ${giftRarityUiLabel(strongestRarity, lang)}`,
                          })}
                        </Text>
                        <Text style={{ color: t.textPrimary, fontSize: f.h2 + 1, lineHeight: f.h2 + 6, fontWeight: '900', marginTop: 3 }}>
                          {item.kind === 'dual'
                            ? triLang(lang, {
                                ru: 'Два подарка',
                                uk: 'Два подарунки',
                                es: 'Dos regalos',
                                'pt-BR': 'Dois presentes',
                                vi: 'Hai món quà',
                                id: 'Dua hadiah',
                                tr: 'İki hediye',
                                pl: 'Dwa prezenty',
                              })
                            : giftDisplayTitleForLang(item.gift, lang)}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
                          <TouchableOpacity
                            testID={`gift-inventory-apply-${rowKey}`}
                            activeOpacity={0.86}
                            onPress={() => {
                              hapticTap();
                              setSelected(item);
                            }}
                            style={{ borderRadius: 16, paddingHorizontal: 16, paddingVertical: 11, minHeight: 44, backgroundColor: accent, minWidth: 118, alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Text style={{ color: strongestRarity === 'epic' ? '#1A1200' : '#FFFFFF', fontSize: f.sub, fontWeight: '900' }}>
                              {triLang(lang, {
                                ru: 'Посмотреть',
                                uk: 'Переглянути',
                                es: 'Ver',
                                'pt-BR': 'Ver',
                                vi: 'Xem',
                                id: 'Lihat',
                                tr: 'Görüntüle',
                                pl: 'Zobacz',
                              })}
                            </Text>
                          </TouchableOpacity>
                          <GiftExpiryCountdown
                            expiresAtMs={item.expiresAtMs}
                            accent={accent}
                            onExpired={handleGiftExpired}
                            testID={`gift-expiry-pending-${rowKey}`}
                          />
                        </View>
                      </View>
                    </View>

                    {item.kind === 'dual' ? (
                      <>
                      <View style={{ height: 12 }} />
                      <View style={{ gap: 9 }}>
                        <GiftLine
                          gift={item.pair.f2p}
                          label={triLang(lang, { ru: 'Подарок за уровень', uk: 'Подарунок за рівень', es: 'Regalo por nivel', 'pt-BR': 'Presente de nível', vi: 'Quà cấp độ', id: 'Hadiah level', tr: 'Seviye hediyesi', pl: 'Prezent za poziom' })}
                          lang={lang}
                          muted={t.textMuted}
                          primary={t.textPrimary}
                          themeMode={themeMode}
                        />
                        <GiftLine
                          gift={item.pair.prem}
                          label={giftBonusLabel(lang)}
                          lang={lang}
                          muted={t.textMuted}
                          primary={t.textPrimary}
                          themeMode={themeMode}
                        />
                      </View>
                      </>
                    ) : singleDescription ? (
                      <>
                      <View style={{ height: 12 }} />
                      <Text style={{ color: t.textMuted, fontSize: f.sub, lineHeight: f.sub + 5 }}>
                        {singleDescription}
                      </Text>
                      </>
                    ) : (
                      null
                    )}
                  </LinearGradient>
                );
              })
            )}
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
