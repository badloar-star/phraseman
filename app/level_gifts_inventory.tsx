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
import LevelGiftDualModal from '../components/LevelGiftDualModal';
import LevelGiftModal from '../components/LevelGiftModal';
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
  const [userName, setUserName] = useState('');
  const [selected, setSelected] = useState<PendingLevelGiftInventoryItem | null>(null);
  const emptyGiftSurface = [giftTone(t.accent, '26'), t.bgCard, t.bgPrimary] as [string, string, string];

  const loadData = useCallback(async () => {
    const [nextItems, nextActiveItems, nameRaw] = await Promise.all([
      loadPendingLevelGiftInventory(studyTarget),
      loadActiveLevelGiftInventory(lang, Date.now(), studyTarget),
      AsyncStorage.getItem('user_name'),
    ]);
    setItems(nextItems);
    setActiveItems(nextActiveItems);
    setUserName(nameRaw || '');
  }, [lang, studyTarget]);

  useFocusEffect(useCallback(() => {
    void loadData();
    return undefined;
  }, [loadData]));

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
            {activeItems.length > 0 && (
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2 }}>
                  <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900' }}>
                    {triLang(lang, {
                      ru: 'Активные сейчас',
                      uk: 'Активні зараз',
                      es: 'Activos ahora',
                      'pt-BR': 'Ativos agora',
                      vi: 'Đang hoạt động',
                      id: 'Sedang aktif',
                      tr: 'Şu an aktif',
                      pl: 'Aktywne teraz',
                    })}
                  </Text>
                </View>
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
                        <TouchableOpacity
                          testID={`gift-inventory-apply-${rowKey}`}
                          activeOpacity={0.86}
                          onPress={() => {
                            hapticTap();
                            setSelected(item);
                          }}
                          style={{ borderRadius: 16, paddingHorizontal: 16, paddingVertical: 11, minHeight: 44, backgroundColor: accent, minWidth: 118, alignSelf: 'flex-start', alignItems: 'center', justifyContent: 'center', marginTop: 10 }}
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
