import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Image, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ContentWrap from '../components/ContentWrap';
import LevelGiftArt from '../components/LevelGiftArt';
import LevelGiftDualModal from '../components/LevelGiftDualModal';
import LevelGiftModal from '../components/LevelGiftModal';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import StatsArtBackdrop from '../components/StatsArtBackdrop';
import { useTheme } from '../components/ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import { triLang } from '../constants/i18n';
import { getLevelGiftRewardIcon } from '../constants/levelGiftRewardIcons';
import {
  giftDescForLang,
  giftRarityUiLabel,
  giftShardAmount,
  giftTitleForLang,
  type GiftDef,
} from './level_gift_system';
import { oskolokImageForPackShards } from './oskolok';
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

function GiftIcon({ gift, themeMode }: { gift: GiftDef; themeMode: Parameters<typeof oskolokImageForPackShards>[1] }) {
  return (
    <Image
      source={getLevelGiftRewardIcon(gift.id, themeMode)}
      style={{ width: 38, height: 38 }}
      resizeMode="contain"
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
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', minWidth: 0 }}>
      <View style={{ width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' }}>
        <GiftIcon gift={gift} themeMode={themeMode} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        {!!label && (
          <Text style={{ color: muted, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 }} numberOfLines={1}>
            {label}
          </Text>
        )}
        <Text style={{ color: primary, fontSize: 15, fontWeight: '900' }} numberOfLines={1}>
          {giftTitleForLang(gift, lang)}
        </Text>
        <Text style={{ color: muted, fontSize: 12, lineHeight: 16, marginTop: 2 }} numberOfLines={2}>
          {giftDescForLang(gift, lang)}
        </Text>
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
    ? triLang(lang, { ru: 'ÐŸÐ¾Ð´Ð°Ñ€Ð¾Ðº Ð·Ð° ÑƒÑ€Ð¾Ð²ÐµÐ½ÑŒ', uk: 'ÐŸÐ¾Ð´Ð°Ñ€ÑƒÐ½Ð¾Ðº Ð·Ð° Ñ€Ñ–Ð²ÐµÐ½ÑŒ', es: 'Regalo por nivel', 'pt-BR': 'Presente de n\u00edvel', vi: 'Qu\u00e0 c\u1ea5p \u0111\u1ed9', id: 'Hadiah level', tr: 'Seviye hediyesi', pl: 'Prezent za poziom' })
    : triLang(lang, { ru: 'Ð‘Ð¾Ð½ÑƒÑ Ð¿Ñ€ÐµÐ¼Ð¸ÑƒÐ¼', uk: 'ÐŸÑ€ÐµÐ¼Ñ–ÑƒÐ¼-Ð±Ð¾Ð½ÑƒÑ', es: 'Bono premium', 'pt-BR': 'B\u00f4nus premium', vi: 'Th\u01b0\u1edfng premium', id: 'Bonus premium', tr: 'Premium bonus', pl: 'Bonus premium' })
);

export default function LevelGiftsInventoryScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const { theme: t, f, themeMode } = useTheme();
  const [items, setItems] = useState<PendingLevelGiftInventoryItem[]>(() => getPendingLevelGiftInventoryCache());
  const [activeItems, setActiveItems] = useState<ActiveLevelGiftInventoryItem[]>([]);
  const [userName, setUserName] = useState('');
  const [selected, setSelected] = useState<PendingLevelGiftInventoryItem | null>(null);

  const loadData = useCallback(async () => {
    const [nextItems, nextActiveItems, nameRaw] = await Promise.all([
      loadPendingLevelGiftInventory(),
      loadActiveLevelGiftInventory(lang),
      AsyncStorage.getItem('user_name'),
    ]);
    setItems(nextItems);
    setActiveItems(nextActiveItems);
    setUserName(nameRaw || '');
  }, [lang]);

  useFocusEffect(useCallback(() => {
    void loadData();
    return undefined;
  }, [loadData]));

  const closeGiftModal = () => {
    setSelected(null);
    void loadData();
  };

  return (
    <ScreenGradient>
      <StatsArtBackdrop />
      <SafeAreaView testID="screen-level-gifts-inventory" style={{ flex: 1 }}>
        <ContentWrap>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingTop: Platform.OS === 'android' ? 28 : 15, paddingBottom: 15, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
              <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
            </TouchableOpacity>
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

          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false}>
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
                {activeItems.map((gift) => (
                  <View
                    key={gift.key}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 11,
                      borderRadius: 18,
                      paddingVertical: 11,
                      paddingHorizontal: 12,
                      backgroundColor: t.bgCard,
                      borderWidth: 1,
                      borderColor: `${gift.accent}70`,
                    }}
                  >
                    <View style={{ width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: `${gift.accent}22` }}>
                      <Image source={getLevelGiftRewardIcon(gift.iconGiftId, themeMode)} style={{ width: 38, height: 38 }} resizeMode="contain" />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900' }} numberOfLines={1}>
                        {gift.title}
                      </Text>
                      <Text style={{ color: t.textMuted, fontSize: f.sub, lineHeight: f.sub + 4, marginTop: 2 }} numberOfLines={1}>
                        {gift.desc}
                      </Text>
                    </View>
                    <View style={{ borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: `${gift.accent}18` }}>
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
                  </View>
                ))}
              </View>
            )}
            {items.length === 0 ? (
              activeItems.length > 0 ? null : (
              <LinearGradient
                colors={[t.bgCard, t.bgSurface, t.bgPrimary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 22, padding: 22, borderWidth: 1, borderColor: `${t.accent}55`, alignItems: 'center' }}
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
                const singleShardAmount = item.kind === 'single' ? giftShardAmount(item.gift.id) : 0;
                const rowArtSize = singleShardAmount > 0 ? 56 : 62;
                const rowKey = item.kind === 'single' && item.dualPart
                  ? `${item.kind}-${item.level}-${item.dualPart}`
                  : `${item.kind}-${item.level}`;
                return (
                  <LinearGradient
                    key={rowKey}
                    colors={[t.bgCard, t.bgSurface, t.bgPrimary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ borderRadius: 22, padding: 14, borderWidth: 1, borderColor: `${accent}88`, overflow: 'hidden' }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 68, height: 68, alignItems: 'center', justifyContent: 'center', padding: 4 }}>
                        {singleShardAmount > 0 ? (
                          <Image
                            source={oskolokImageForPackShards(singleShardAmount, themeMode)}
                            style={{ width: rowArtSize, height: rowArtSize }}
                            resizeMode="contain"
                          />
                        ) : (
                          <LevelGiftArt
                            themeMode={themeMode}
                            variant={item.kind === 'dual' ? 'premium' : strongestRarity}
                            size={rowArtSize}
                          />
                        )}
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ color: accent, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 }} numberOfLines={1}>
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
                        <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '900', marginTop: 2 }} numberOfLines={1}>
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
                            : giftTitleForLang(item.gift, lang)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        testID={`gift-inventory-apply-${rowKey}`}
                        activeOpacity={0.86}
                        onPress={() => {
                          hapticTap();
                          setSelected(item);
                        }}
                        style={{ borderRadius: 16, paddingHorizontal: 14, paddingVertical: 11, backgroundColor: accent, minWidth: 92, alignItems: 'center' }}
                      >
                        <Text style={{ color: strongestRarity === 'epic' ? '#1A1200' : '#FFFFFF', fontSize: f.sub, fontWeight: '900' }} numberOfLines={1}>
                          {triLang(lang, {
                            ru: 'Применить',
                            uk: 'Застосувати',
                            es: 'Aplicar',
                            'pt-BR': 'Usar',
                            vi: 'Dùng',
                            id: 'Pakai',
                            tr: 'Kullan',
                            pl: 'Użyj',
                          })}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={{ height: 12 }} />
                    {item.kind === 'dual' ? (
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
                          label={triLang(lang, { ru: 'Бонус премиум', uk: 'Преміум-бонус', es: 'Bono premium', 'pt-BR': 'Bônus premium', vi: 'Thưởng premium', id: 'Bonus premium', tr: 'Premium bonus', pl: 'Bonus premium' })}
                          lang={lang}
                          muted={t.textMuted}
                          primary={t.textPrimary}
                          themeMode={themeMode}
                        />
                      </View>
                    ) : (
                      <Text style={{ color: t.textMuted, fontSize: f.sub, lineHeight: f.sub + 5 }}>
                        {giftDescForLang(item.gift, lang)}
                      </Text>
                    )}
                  </LinearGradient>
                );
              })
            )}
            <View style={{ height: 8 }} />
          </ScrollView>
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
            onGiftClaimed={selected.dualPart ? () => markDualGiftPartClaimed(selected.level, selected.dualPart!) : undefined}
            saveOnDismiss={false}
            applyAsPremium={selected.dualPart ? true : undefined}
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
          />
        )}
      </SafeAreaView>
    </ScreenGradient>
  );
}
