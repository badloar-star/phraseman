import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { bundleLang, triLang } from '../constants/i18n';
import { getShardsBalance } from './shards_system';
import {
  loadMarketplacePacks,
  FlashcardMarketPack,
  loadDevOwnedPackIds,
  packTitleForInterface,
  packDescriptionForInterface,
  primeMarketplaceBuiltCardsCacheFromOwnedStorage,
  saveDevOwnedPackIds,
  setDevActivePack,
} from './flashcards/marketplace';
import { logFeatureOpened } from './firebase';
import { actionToastTri, emitAppEvent } from './events';
import { DEV_MODE, IS_BETA_TESTER } from './config';

import { oskolokImageForPackShards } from './oskolok';

const CATEGORY_LABELS: Record<string, { ru: string; uk: string; es: string }> = {
  business: { ru: 'Бизнес', uk: 'Бізнес', es: 'Negocios' },
  travel: { ru: 'Путешествия', uk: 'Подорожі', es: 'Viajes' },
  daily: { ru: 'На каждый день', uk: 'На щодень', es: 'Día a día' },
  exam: { ru: 'Экзамен', uk: 'Іспит', es: 'Examen' },
  slang: { ru: 'Сленг', uk: 'Сленг', es: 'Coloquial' },
  verbs: { ru: 'Глаголы', uk: 'Дієслова', es: 'Verbos' },
};

export default function FlashcardsMarketDevScreen() {
  const router = useRouter();
  const { theme: t, f, isDark, statusBarLight } = useTheme();
  const { lang } = useLang();
  const ifaceLang = bundleLang(lang);
  const [packs, setPacks] = useState<FlashcardMarketPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [shards, setShards] = useState(0);
  const [ownedPackIds, setOwnedPackIds] = useState<string[]>([]);
  const [buyingPackId, setBuyingPackId] = useState<string | null>(null);
  const isDevMarketEnabled = DEV_MODE || IS_BETA_TESTER;
  useEffect(() => {
    if (!isDevMarketEnabled) {
      router.replace('/flashcards' as any);
    }
  }, [isDevMarketEnabled, router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [balance, list, owned] = await Promise.all([
      getShardsBalance(),
      loadMarketplacePacks(),
      loadDevOwnedPackIds(),
    ]);
    setShards(balance);
    setPacks(list);
    setOwnedPackIds(owned);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    logFeatureOpened('flashcards_market_dev');
  }, [loadData]);

  const title = triLang(lang, {
    ru: 'Маркет карточек (DEV)',
    uk: 'Маркет карток (DEV)',
    es: 'Mercado de tarjetas (DEV)',
  });
  const subtitle = triLang(lang, {
    ru: 'Read-only прототип: смотрим UX и каталог, без покупок.',
    uk: 'Read-only прототип: дивимось UX і каталог, без покупок.',
    es: 'Prototipo de solo lectura: probamos el UX y el catálogo, sin compras.',
  });
  const topPacks = useMemo(
    () => [...packs].sort((a, b) => b.cardCount - a.cardCount || b.priceShards - a.priceShards).slice(0, 4),
    [packs],
  );

  const buyLabel = triLang(lang, { ru: 'Купить (DEV)', uk: 'Купити (DEV)', es: 'Comprar (DEV)' });
  const ownedLabel = triLang(lang, { ru: 'Уже куплено', uk: 'Вже придбано', es: 'Ya lo tienes' });

  const handleDryRunBuy = useCallback(async (pack: FlashcardMarketPack) => {
    if (buyingPackId) return;
    if (ownedPackIds.includes(pack.id)) {
      emitAppEvent(
        'action_toast',
        actionToastTri('success', {
          ru: 'Этот пак уже отмечен как купленный (DEV).',
          uk: 'Цей пак вже позначений як придбаний (DEV).',
          es: 'Este pack ya está marcado como comprado (DEV).',
        }),
      );
      return;
    }
    if (shards < pack.priceShards) {
      emitAppEvent(
        'action_toast',
        actionToastTri('error', {
          ru: 'Недостаточно осколков для покупки.',
          uk: 'Недостатньо осколків для купівлі.',
          es: 'No tienes suficientes fragmentos para comprar.',
        }),
      );
      return;
    }
    setBuyingPackId(pack.id);
    const updated = [...ownedPackIds, pack.id];
    setOwnedPackIds(updated);
    try {
      await saveDevOwnedPackIds(updated);
      await primeMarketplaceBuiltCardsCacheFromOwnedStorage();
      emitAppEvent(
        'action_toast',
        actionToastTri('success', {
          ru: `DEV: пак "${pack.titleRu}" помечен как купленный (без списания).`,
          uk: `DEV: пак "${pack.titleUk}" позначено як придбаний (без списання).`,
          es: `DEV: el pack «${packTitleForInterface(pack, 'es')}» ha quedado marcado como comprado (sin cargo).`,
        }),
      );
    } catch {
      emitAppEvent(
        'action_toast',
        actionToastTri('error', {
          ru: 'Не удалось сохранить DEV-покупку.',
          uk: 'Не вдалося зберегти DEV-покупку.',
          es: 'No se pudo guardar la compra DEV.',
        }),
      );
      setOwnedPackIds((prev) => prev.filter((id) => id !== pack.id));
    } finally {
      setBuyingPackId(null);
    }
  }, [buyingPackId, ownedPackIds, shards]);

  const handleOpenInFlashcards = useCallback(async (packId: string) => {
    await setDevActivePack(packId);
    router.push('/flashcards' as any);
  }, [router]);

  if (!isDevMarketEnabled) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }} />
      </ScreenGradient>
    );
  }

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
        <StatusBar barStyle={statusBarLight ? 'light-content' : 'dark-content'} />

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="arrow-back" size={24} color={t.textPrimary} />
          </TouchableOpacity>
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700' }}>{title}</Text>
          <View style={{ minWidth: 72, borderRadius: 12, borderWidth: 1, borderColor: t.border, backgroundColor: t.bgSurface, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            <Image source={oskolokImageForPackShards(shards)} style={{ width: 18, height: 18 }} contentFit="contain" />
            <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '700' }}>{shards}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <View style={{ backgroundColor: t.bgSurface, borderWidth: 1, borderColor: t.border, borderRadius: 14, padding: 12 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>{subtitle}</Text>
            <Text style={{ marginTop: 6, color: t.textSecond, fontSize: f.sub }}>
              {triLang(lang, {
                ru: 'Этап 1: каталог и оценки. Этап 2: покупка за осколки, ownership, отзывы.',
                uk: 'Етап 1: каталог та оцінки. Етап 2: купівля за осколки, ownership, відгуки.',
                es: 'Fase 1: catálogo y valoraciones. Fase 2: pagos con fragmentos, colección propia y reseñas.',
              })}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {topPacks.map((pack) => (
              <View key={`top_${pack.id}`} style={{ borderWidth: 1, borderColor: t.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: t.bgCard }}>
                <Text style={{ color: t.textSecond, fontSize: f.caption }}>
                  {triLang(lang, { ru: 'Топ', uk: 'Топ', es: 'Top' })} · {pack.cardCount}{' '}
                  {triLang(lang, { ru: 'карточек', uk: 'карток', es: 'tarjetas' })} · {packTitleForInterface(pack, ifaceLang)}
                </Text>
              </View>
            ))}
          </View>

          {!loading && ownedPackIds.length > 0 && (
            <View style={{ backgroundColor: t.bgSurface, borderWidth: 1, borderColor: t.border, borderRadius: 14, padding: 12, gap: 8 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                {triLang(lang, { ru: 'Мои наборы (DEV)', uk: 'Мої набори (DEV)', es: 'Mis packs (DEV)' })}
              </Text>
              {packs
                .filter((p) => ownedPackIds.includes(p.id))
                .map((pack) => (
                  <View key={`owned_${pack.id}`} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <Text style={{ color: t.textSecond, fontSize: f.sub, flex: 1 }} numberOfLines={1}>
                      {packTitleForInterface(pack, ifaceLang)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleOpenInFlashcards(pack.id)}
                      style={{ borderRadius: 10, borderWidth: 1, borderColor: t.accent, backgroundColor: `${t.accent}1A`, paddingHorizontal: 10, paddingVertical: 6 }}
                    >
                      <Text style={{ color: t.accent, fontSize: f.caption, fontWeight: '700' }}>
                        {triLang(lang, {
                          ru: 'Открыть в карточках (DEV)',
                          uk: 'Відкрити в картках (DEV)',
                          es: 'Abrir en tarjetas (DEV)',
                        })}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
            </View>
          )}

          {loading ? (
            <View style={{ paddingVertical: 32, alignItems: 'center' }}>
              <ActivityIndicator color={t.accent} />
            </View>
          ) : (
            packs.map((pack) => {
              const localizedTitle = packTitleForInterface(pack, ifaceLang);
              const localizedDescription = packDescriptionForInterface(pack, ifaceLang);
              const catLabel = CATEGORY_LABELS[pack.category]?.[ifaceLang] ?? pack.category;
              const isOwned = ownedPackIds.includes(pack.id);
              const isBuying = buyingPackId === pack.id;
              return (
                <View key={pack.id} style={{ backgroundColor: t.bgCard, borderRadius: 16, borderWidth: 1, borderColor: t.border, padding: 14 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: t.textPrimary, fontSize: f.h3, fontWeight: '700' }}>{localizedTitle}</Text>
                      <Text style={{ marginTop: 4, color: t.textSecond, fontSize: f.sub }}>{localizedDescription}</Text>
                    </View>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                        borderRadius: 10,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        backgroundColor: `${t.accent}1A`,
                        borderWidth: 1,
                        borderColor: `${t.accent}55`,
                      }}
                    >
                      <Image source={oskolokImageForPackShards(pack.priceShards)} style={{ width: 16, height: 16 }} contentFit="contain" />
                      <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '700' }}>{pack.priceShards}</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                    <Text style={{ color: t.textMuted, fontSize: f.caption }}>{catLabel}</Text>
                    <Text style={{ color: t.textMuted, fontSize: f.caption }}>
                      • {pack.cardCount} {triLang(lang, { ru: 'карточек', uk: 'карток', es: 'tarjetas' })}
                    </Text>
                    <Text style={{ color: t.textMuted, fontSize: f.caption }}>
                      • {triLang(lang, { ru: 'продаж', uk: 'продажів', es: 'ventas' })}: {pack.salesCount}
                    </Text>
                  </View>

                  <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ color: t.textSecond, fontSize: f.caption }}>
                      {pack.isOfficial
                        ? triLang(lang, { ru: 'Официальный пак', uk: 'Офіційний пак', es: 'Pack oficial' })
                        : `${triLang(lang, { ru: 'Автор', uk: 'Автор', es: 'Autor' })}: ${pack.authorName}`}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleDryRunBuy(pack)}
                      disabled={isOwned || isBuying}
                      style={{
                        opacity: isOwned ? 0.8 : 1,
                        backgroundColor: isOwned ? `${t.correct}1A` : t.bgSurface,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: isOwned ? `${t.correct}66` : t.border,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                      }}
                    >
                      <Text style={{ color: isOwned ? t.correct : t.textSecond, fontSize: f.caption, fontWeight: '700' }}>
                        {isBuying
                          ? triLang(lang, { ru: 'Покупаем...', uk: 'Купуємо...', es: 'Comprando…' })
                          : isOwned
                            ? ownedLabel
                            : buyLabel}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </ScreenGradient>
  );
}

