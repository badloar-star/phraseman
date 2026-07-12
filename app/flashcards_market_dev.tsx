import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import TapScale from '../components/TapScale';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ScreenGradient from '../components/ScreenGradient';
import { glassFill } from '../components/GlassSurface';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
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
import { DEV_CONTENT_UNLOCK, IS_BETA_TESTER } from './config';
import { flashcardsOfficialPacksAvailableForTarget, frenchFlashcardsGateCopy } from './flashcards_target_gate';
import { FLASHCARDS_MARKET_DEV_ROUTE_NAME } from '../constants/devRoutes';
import { safeRouterBack } from './navigation_back';

import { oskolokImageForPackShards } from './oskolok';

const CATEGORY_LABELS: Record<string, { ru: string; uk: string; es: string; 'pt-BR': string; vi: string; id: string; tr: string; pl: string }> = {
  business: { ru: 'Бизнес', uk: 'Бізнес', es: 'Negocios', 'pt-BR': 'Negócios', vi: 'Kinh doanh', id: 'Bisnis', tr: 'İş', pl: 'Biznes' },
  travel: { ru: 'Путешествия', uk: 'Подорожі', es: 'Viajes', 'pt-BR': 'Viagens', vi: 'Du lịch', id: 'Perjalanan', tr: 'Seyahat', pl: 'Podróże' },
  daily: { ru: 'На каждый день', uk: 'На щодень', es: 'Día a día', 'pt-BR': 'Dia a dia', vi: 'Hằng ngày', id: 'Sehari-hari', tr: 'Günlük', pl: 'Na co dzień' },
  exam: { ru: 'Экзамен', uk: 'Іспит', es: 'Examen', 'pt-BR': 'Exame', vi: 'Bài thi', id: 'Ujian', tr: 'Sınav', pl: 'Egzamin' },
  slang: { ru: 'Сленг', uk: 'Сленг', es: 'Coloquial', 'pt-BR': 'Gírias', vi: 'Tiếng lóng', id: 'Slang', tr: 'Argo', pl: 'Slang' },
  verbs: { ru: 'Глаголы', uk: 'Дієслова', es: 'Verbos', 'pt-BR': 'Verbos', vi: 'Động từ', id: 'Kata kerja', tr: 'Fiiller', pl: 'Czasowniki' },
};

export default function FlashcardsMarketDevScreen() {
  const router = useRouter();
  const { theme: t, f, isDark, statusBarLight } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const ifaceLang = bundleLang(lang);
  const frenchPacksBlocked = !flashcardsOfficialPacksAvailableForTarget(studyTarget, lang);
  const frenchGateCopy = frenchFlashcardsGateCopy(lang);
  const [packs, setPacks] = useState<FlashcardMarketPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [shards, setShards] = useState(0);
  const [ownedPackIds, setOwnedPackIds] = useState<string[]>([]);
  const [buyingPackId, setBuyingPackId] = useState<string | null>(null);
  const isDevMarketEnabled = DEV_CONTENT_UNLOCK || IS_BETA_TESTER;
  useEffect(() => {
    if (!isDevMarketEnabled) {
      router.replace('/flashcards' as any);
    }
  }, [isDevMarketEnabled, router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    if (frenchPacksBlocked) {
      const balance = await getShardsBalance().catch(() => 0);
      setShards(balance);
      setPacks([]);
      setOwnedPackIds([]);
      setLoading(false);
      return;
    }
    const [balance, list, owned] = await Promise.all([
      getShardsBalance(),
      loadMarketplacePacks(studyTarget, lang),
      loadDevOwnedPackIds(studyTarget),
    ]);
    setShards(balance);
    setPacks(list);
    setOwnedPackIds(owned);
    setLoading(false);
  }, [frenchPacksBlocked, lang, studyTarget]);

  useEffect(() => {
    loadData();
    logFeatureOpened(FLASHCARDS_MARKET_DEV_ROUTE_NAME);
  }, [loadData]);

  const title = triLang(lang, {
    ru: 'Маркет карточек (DEV)',
    uk: 'Маркет карток (DEV)',
    es: 'Mercado de tarjetas (DEV)',
    'pt-BR': 'Mercado de cartões (DEV)',
    vi: 'Chợ thẻ (DEV)',
    id: 'Market kartu (DEV)',
    tr: 'Kart marketi (DEV)',
    pl: 'Market kart (DEV)',
  });
  const subtitle = triLang(lang, {
    ru: 'Read-only прототип: смотрим UX и каталог, без покупок.',
    uk: 'Read-only прототип: дивимось UX і каталог, без покупок.',
    es: 'Prototipo de solo lectura: probamos el UX y el catálogo, sin compras.',
    'pt-BR': 'Protótipo somente leitura: avaliamos UX e catálogo, sem compras.',
    vi: 'Nguyên mẫu chỉ đọc: kiểm tra UX và danh mục, không mua hàng.',
    id: 'Prototipe read-only: cek UX dan katalog, tanpa pembelian.',
    tr: 'Salt okunur prototip: UX ve kataloğu inceliyoruz, satın alma yok.',
    pl: 'Prototyp tylko do odczytu: sprawdzamy UX i katalog, bez zakupów.',
  });
  const topPacks = useMemo(
    () => [...packs].sort((a, b) => b.cardCount - a.cardCount || b.priceShards - a.priceShards).slice(0, 4),
    [packs],
  );

  const buyLabel = triLang(lang, { ru: 'Купить (DEV)', uk: 'Купити (DEV)', es: 'Comprar (DEV)', 'pt-BR': 'Comprar (DEV)', vi: 'Mua (DEV)', id: 'Beli (DEV)', tr: 'Satın al (DEV)', pl: 'Kup (DEV)' });
  const ownedLabel = triLang(lang, { ru: 'Уже куплено', uk: 'Вже придбано', es: 'Ya lo tienes', 'pt-BR': 'Já comprado', vi: 'Đã mua', id: 'Sudah dibeli', tr: 'Zaten alındı', pl: 'Już kupione' });

  const handleDryRunBuy = useCallback(async (pack: FlashcardMarketPack) => {
    if (buyingPackId) return;
    if (ownedPackIds.includes(pack.id)) {
      emitAppEvent(
        'action_toast',
        actionToastTri('success', {
          ru: 'Этот пак уже отмечен как купленный (DEV).',
          uk: 'Цей пак вже позначений як придбаний (DEV).',
          es: 'Este pack ya está marcado como comprado (DEV).',
          'pt-BR': 'Este pack já está marcado como comprado (DEV).',
          vi: 'Pack này đã được đánh dấu là đã mua (DEV).',
          id: 'Pack ini sudah ditandai sebagai dibeli (DEV).',
          tr: 'Bu paket zaten satın alındı olarak işaretlenmiş (DEV).',
          pl: 'Ten pakiet jest już oznaczony jako kupiony (DEV).',
        }),
      );
      return;
    }
    if (shards < pack.priceShards) {
      emitAppEvent(
        'action_toast',
        actionToastTri('error', {
          ru: 'Недостаточно осколков для покупки.',
          uk: 'Недостатньо уламків для купівлі.',
          es: 'No tienes suficientes fragmentos para comprar.',
          'pt-BR': 'Você não tem fragmentos suficientes para comprar.',
          vi: 'Bạn không có đủ mảnh để mua.',
          id: 'Shard tidak cukup untuk membeli.',
          tr: 'Satın almak için yeterli parçan yok.',
          pl: 'Masz za mało odłamków, aby kupić.',
        }),
      );
      return;
    }
    setBuyingPackId(pack.id);
    const updated = [...ownedPackIds, pack.id];
    setOwnedPackIds(updated);
    try {
      await saveDevOwnedPackIds(updated, studyTarget);
      await primeMarketplaceBuiltCardsCacheFromOwnedStorage(studyTarget);
      emitAppEvent(
        'action_toast',
        actionToastTri('success', {
          ru: `DEV: пак "${packTitleForInterface(pack, 'ru')}" помечен как купленный (без списания).`,
          uk: `DEV: пак "${packTitleForInterface(pack, 'uk')}" позначено як придбаний (без списання).`,
          es: `DEV: el pack «${packTitleForInterface(pack, 'es')}» ha quedado marcado como comprado (sin cargo).`,
          'pt-BR': `DEV: o pack "${packTitleForInterface(pack, 'pt-BR')}" foi marcado como comprado (sem cobrança).`,
          vi: `DEV: pack "${packTitleForInterface(pack, 'vi')}" đã được đánh dấu là đã mua (không trừ mảnh).`,
          id: `DEV: pack "${packTitleForInterface(pack, 'id')}" ditandai sebagai dibeli (tanpa pemotongan).`,
          tr: `DEV: "${packTitleForInterface(pack, 'tr')}" paketi satın alındı olarak işaretlendi (kesinti yok).`,
          pl: `DEV: pakiet "${packTitleForInterface(pack, 'pl')}" oznaczono jako kupiony (bez potrącenia).`,
        }),
      );
    } catch {
      emitAppEvent(
        'action_toast',
        actionToastTri('error', {
          ru: 'DEV-покупка не сохранилась.',
          uk: 'Не вдалося зберегти DEV-покупку.',
          es: 'No se pudo guardar la compra DEV.',
          'pt-BR': 'Não foi possível salvar a compra DEV.',
          vi: 'Không thể lưu giao dịch mua DEV.',
          id: 'Gagal menyimpan pembelian DEV.',
          tr: 'DEV satın alma kaydedilemedi.',
          pl: 'Nie udało się zapisać zakupu DEV.',
        }),
      );
      setOwnedPackIds((prev) => prev.filter((id) => id !== pack.id));
    } finally {
      setBuyingPackId(null);
    }
  }, [buyingPackId, ownedPackIds, shards, studyTarget]);

  const handleOpenInFlashcards = useCallback(async (packId: string) => {
    await setDevActivePack(packId, studyTarget);
    router.push('/flashcards' as any);
  }, [router, studyTarget]);

  if (!isDevMarketEnabled) {
    return (
      <ScreenGradient artBackdrop="flashcards">
        <SafeAreaView style={{ flex: 1 }} />
      </ScreenGradient>
    );
  }

  if (frenchPacksBlocked) {
    return (
      <ScreenGradient artBackdrop="flashcards">
        <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
          <StatusBar barStyle={statusBarLight ? 'light-content' : 'dark-content'} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
            <TapScale onPress={() => safeRouterBack(router, '/flashcards' as any)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="arrow-back" size={24} color={t.textPrimary} />
            </TapScale>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700' }}>{title}</Text>
            <View style={{ minWidth: 72, borderRadius: 12, borderWidth: 1, borderColor: t.border, backgroundColor: t.bgSurface, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
              <Image source={oskolokImageForPackShards(shards)} style={{ width: 18, height: 18 }} contentFit="contain" />
              <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '700' }}>{shards}</Text>
            </View>
          </View>
          <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
            <View style={{ backgroundColor: glassFill(t.bgSurface, 0.46), borderRadius: 14, padding: 16 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.h3, fontWeight: '800' }}>{frenchGateCopy.title}</Text>
              <Text style={{ marginTop: 8, color: t.textSecond, fontSize: f.body, lineHeight: Math.round(f.body * 1.35) }}>
                {frenchGateCopy.body}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  return (
    <ScreenGradient artBackdrop="flashcards">
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
        <StatusBar barStyle={statusBarLight ? 'light-content' : 'dark-content'} />

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
          <TouchableOpacity onPress={() => safeRouterBack(router, '/flashcards' as any)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="arrow-back" size={24} color={t.textPrimary} />
          </TouchableOpacity>
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700' }}>{title}</Text>
          <View style={{ minWidth: 72, borderRadius: 12, borderWidth: 1, borderColor: t.border, backgroundColor: t.bgSurface, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            <Image source={oskolokImageForPackShards(shards)} style={{ width: 18, height: 18 }} contentFit="contain" />
            <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '700' }}>{shards}</Text>
          </View>
        </View>

        <ScrollView decelerationRate="normal" contentContainerStyle={{ padding: 16, gap: 12 }}>
          <View style={{ backgroundColor: glassFill(t.bgSurface, 0.46), borderRadius: 14, padding: 12 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>{subtitle}</Text>
            <Text style={{ marginTop: 6, color: t.textSecond, fontSize: f.sub }}>
              {triLang(lang, {
                ru: 'Этап 1: каталог. Этап 2: покупка за осколки и ownership.',
                uk: 'Етап 1: каталог. Етап 2: купівля за уламки та ownership.',
                es: 'Fase 1: catálogo. Fase 2: pagos con fragmentos y colección propia.',
                'pt-BR': 'Fase 1: catálogo. Fase 2: compra com fragmentos e ownership.',
                vi: 'Giai đoạn 1: danh mục. Giai đoạn 2: mua bằng mảnh và quyền sở hữu.',
                id: 'Tahap 1: katalog. Tahap 2: pembelian dengan pecahan dan ownership.',
                tr: 'Aşama 1: katalog. Aşama 2: parçalarla satın alma ve sahiplik.',
                pl: 'Etap 1: katalog. Etap 2: zakup za odłamki i ownership.',
              })}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {topPacks.map((pack) => (
              <View key={`top_${pack.id}`} style={{ borderWidth: 1, borderColor: t.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: t.bgCard }}>
                <Text style={{ color: t.textSecond, fontSize: f.caption }}>
                  {triLang(lang, { ru: 'Топ', uk: 'Топ', es: 'Top', 'pt-BR': 'Top', vi: 'Top', id: 'Top', tr: 'Top', pl: 'Top' })} · {pack.cardCount}{' '}
                  {triLang(lang, { ru: 'карточек', uk: 'карток', es: 'tarjetas', 'pt-BR': 'cartões', vi: 'thẻ', id: 'kartu', tr: 'kart', pl: 'kart' })} · {packTitleForInterface(pack, ifaceLang)}
                </Text>
              </View>
            ))}
          </View>

          {!loading && ownedPackIds.length > 0 && (
            <View style={{ backgroundColor: glassFill(t.bgSurface, 0.46), borderRadius: 14, padding: 12, gap: 8 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                {triLang(lang, { ru: 'Мои наборы (DEV)', uk: 'Мої набори (DEV)', es: 'Mis packs (DEV)', 'pt-BR': 'Meus packs (DEV)', vi: 'Bộ của tôi (DEV)', id: 'Pack saya (DEV)', tr: 'Paketlerim (DEV)', pl: 'Moje pakiety (DEV)' })}
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
                          'pt-BR': 'Abrir nos cartões (DEV)',
                          vi: 'Mở trong thẻ (DEV)',
                          id: 'Buka di kartu (DEV)',
                          tr: 'Kartlarda aç (DEV)',
                          pl: 'Otwórz w kartach (DEV)',
                        })}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
            </View>
          )}

          {false && loading ? (
            <View style={{ paddingVertical: 32, alignItems: 'center' }}>
              <View />
            </View>
          ) : (
            packs.map((pack) => {
              const localizedTitle = packTitleForInterface(pack, ifaceLang);
              const localizedDescription = packDescriptionForInterface(pack, ifaceLang);
              const catLabel = CATEGORY_LABELS[pack.category]?.[ifaceLang] ?? pack.category;
              const isOwned = ownedPackIds.includes(pack.id);
              const isBuying = buyingPackId === pack.id;
              return (
                <View key={pack.id} style={{ backgroundColor: glassFill(t.bgCard, 0.46), borderRadius: 16, padding: 14 }}>
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
                      • {pack.cardCount} {triLang(lang, { ru: 'карточек', uk: 'карток', es: 'tarjetas', 'pt-BR': 'cartões', vi: 'thẻ', id: 'kartu', tr: 'kart', pl: 'kart' })}
                    </Text>
                    <Text style={{ color: t.textMuted, fontSize: f.caption }}>
                      • {triLang(lang, { ru: 'продаж', uk: 'продажів', es: 'ventas', 'pt-BR': 'vendas', vi: 'lượt bán', id: 'penjualan', tr: 'satış', pl: 'sprzedaży' })}: {pack.salesCount}
                    </Text>
                  </View>

                  <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ color: t.textSecond, fontSize: f.caption }}>
                      {pack.isOfficial
                        ? triLang(lang, { ru: 'Официальный пак', uk: 'Офіційний пак', es: 'Pack oficial', 'pt-BR': 'Pack oficial', vi: 'Pack chính thức', id: 'Pack resmi', tr: 'Resmi paket', pl: 'Oficjalny pakiet' })
                        : `${triLang(lang, { ru: 'Автор', uk: 'Автор', es: 'Autor', 'pt-BR': 'Autor', vi: 'Tác giả', id: 'Penulis', tr: 'Yazar', pl: 'Autor' })}: ${pack.authorName}`}
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
                          ? triLang(lang, { ru: 'Покупаем...', uk: 'Купуємо...', es: 'Comprando…', 'pt-BR': 'Comprando...', vi: 'Đang mua...', id: 'Membeli...', tr: 'Satın alınıyor...', pl: 'Kupowanie...' })
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
