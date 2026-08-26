/**
 * coin_exchange.tsx — «Биржа»: обмен монет на руны (односторонний).
 * Экономика: docs/plans/2026-07-20-coins-stars-economy-plan.ru.md §6.
 * Курс глобальный, динамический, пересчёт раз в сутки на сервере; клиент курс НЕ считает.
 * Обмен сервер-авторитетный: результат показываем только из ответа callable.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// зачем: голый router.back() крашит Android/Fabric при teardown — контракт
// navigation_back_underlay_contract требует safeRouterBack (честный replace).
import { safeRouterBack } from './navigation_back';
import { ENABLE_DEV_TOOLS } from './config';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import Svg, { Polyline, Line, Circle } from 'react-native-svg';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { useScreen } from '../hooks/use-screen';
import ContentWrap from '../components/ContentWrap';
import TapScale from '../components/TapScale';
import { triLang } from '../constants/i18n';
import { runeWord } from '../constants/runes';
import RuneGlyph from '../components/RuneGlyph';
import { actionToastTri, emitAppEvent, onAppEvent } from './events';
import { getShardsBalance, loadShardsFromCloud, peekLastKnownShardsBalance } from './shards_system';
import { coinIconForBalance } from './coin_icons';
import {
  fetchCoinExchangeHistory,
  fetchCoinExchangeQuote,
  loadCachedCoinExchangeHistory,
  loadCachedCoinExchangeQuote,
  peekCoinExchangeHistory,
  peekCoinExchangeQuote,
  type CoinExchangeHistoryPoint,
  type CoinExchangeQuote,
} from './coin_exchange_client';
import { exchangeCoinsForStarsDurably } from './coin_exchange_wallet_outbox';

const CHART_W = 320;
const CHART_H = 120;
const CHART_PAD = 8;

function RateHistoryChart({ points, accent, textMuted }: { points: CoinExchangeHistoryPoint[]; accent: string; textMuted: string }) {
  const chart = useMemo(() => {
    if (points.length < 2) return null;
    const rates = points.map((p) => p.rate);
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    const span = max - min || 1;
    const innerW = CHART_W - CHART_PAD * 2;
    const innerH = CHART_H - CHART_PAD * 2;
    const coords = points.map((p, i) => {
      const x = CHART_PAD + (innerW * i) / (points.length - 1);
      const y = CHART_PAD + innerH * (1 - (p.rate - min) / span);
      return { x, y };
    });
    return { min, max, coords };
  }, [points]);
  if (!chart) return null;
  const polyline = chart.coords.map((c) => `${c.x},${c.y}`).join(' ');
  const last = chart.coords[chart.coords.length - 1];
  return (
    <Svg width="100%" height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Line x1={CHART_PAD} y1={CHART_H - CHART_PAD} x2={CHART_W - CHART_PAD} y2={CHART_H - CHART_PAD} stroke={textMuted} strokeOpacity={0.25} strokeWidth={1} />
      <Polyline points={polyline} fill="none" stroke={accent} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={last.x} cy={last.y} r={4} fill={accent} />
    </Svg>
  );
}

export default function CoinExchangeScreen() {
  const router = useRouter();
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const { insets } = useScreen();

  // зачем: «Биржа» скрыта из публичной сборки владельцем — код/маршрут остаются рабочими
  // для dev/QA, но прямой переход по ссылке в проде должен просто вернуть назад.
  useEffect(() => {
    if (!ENABLE_DEV_TOOLS) {
      safeRouterBack(router);
    }
  }, [router]);

  // Первый кадр — из кэша (Performance Bible: никакого полноэкранного спиннера).
  const [quote, setQuote] = useState<CoinExchangeQuote | null>(() => peekCoinExchangeQuote());
  const [history, setHistory] = useState<CoinExchangeHistoryPoint[]>(() => peekCoinExchangeHistory() ?? []);
  const [coinsBalance, setCoinsBalance] = useState<number>(() => peekLastKnownShardsBalance() ?? 0);
  const [coinsInput, setCoinsInput] = useState('');
  const [exchanging, setExchanging] = useState(false);

  useEffect(() => {
    void loadCachedCoinExchangeQuote().then((cached) => { if (cached) setQuote((cur) => cur ?? cached); });
    void loadCachedCoinExchangeHistory().then((cached) => { if (cached.length > 0) setHistory((cur) => (cur.length > 0 ? cur : cached)); });
    void getShardsBalance().then(setCoinsBalance).catch(() => {});
    // Тихая ревалидация с сервера.
    void fetchCoinExchangeQuote().then((fresh) => { if (fresh) setQuote(fresh); });
    void fetchCoinExchangeHistory(30).then((fresh) => { if (fresh && fresh.length > 0) setHistory(fresh); });
  }, []);

  useEffect(() => {
    const sub = onAppEvent('shards_balance_updated', (payload) => {
      const b = (payload as { balance?: number } | undefined)?.balance;
      if (typeof b === 'number' && Number.isFinite(b)) setCoinsBalance(Math.max(0, Math.floor(b)));
    });
    return () => sub.remove();
  }, []);

  const coinsAmount = useMemo(() => {
    const n = Math.floor(Number(coinsInput.replace(/[^0-9]/g, '')));
    return Number.isFinite(n) ? n : 0;
  }, [coinsInput]);

  const starsEstimate = quote && coinsAmount > 0 ? coinsAmount * quote.rate : 0;
  const canExchange = coinsAmount > 0 && coinsAmount <= coinsBalance && quote !== null && !exchanging;

  const nextRecalcLabel = useMemo(() => {
    if (!quote?.nextRecalcAt) return null;
    const ts = Date.parse(quote.nextRecalcAt);
    if (!Number.isFinite(ts)) return null;
    return new Date(ts).toLocaleString(lang === 'uk' ? 'uk-UA' : lang === 'es' ? 'es-ES' : 'ru-RU', {
      day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    });
  }, [quote?.nextRecalcAt, lang]);

  const coinsWord = useCallback((n: number) => {
    const k = Math.abs(n) % 100;
    const d = Math.abs(n) % 10;
    // зачем: RU-интерфейс называет валюту «жемчужина» — украинское «перлина»
    // здесь протекало в русский экран обмена.
    if (d === 1 && k !== 11) return triLang(lang, {
      ru: 'жемчужина', uk: 'перлина', en: 'pearl', es: 'perla',
      'pt-BR': 'pérola', vi: 'xu', id: 'koin', tr: 'jeton', pl: 'perła',
    });
    if (d >= 2 && d <= 4 && (k < 12 || k > 14)) return triLang(lang, {
      ru: 'жемчужины', uk: 'перлини', en: 'pearls', es: 'perlas',
      'pt-BR': 'pérolas', vi: 'xu', id: 'koin', tr: 'jeton', pl: 'perły',
    });
    return triLang(lang, {
      ru: 'жемчужин', uk: 'перлин', en: 'pearls', es: 'perlas',
      'pt-BR': 'pérolas', vi: 'xu', id: 'koin', tr: 'jeton', pl: 'pereł',
    });
  }, [lang]);

  const onExchange = useCallback(async () => {
    if (!canExchange) return;
    setExchanging(true);
    try {
      const result = await exchangeCoinsForStarsDurably(coinsAmount);
      // Сервер подтвердил обмен — дотягиваем авторитетный баланс монет из облака.
      await loadShardsFromCloud().catch(() => {});
      emitAppEvent('action_toast', actionToastTri('success', {
        ru: `Обмен выполнен: +${result.starsGranted} ${runeWord('ru', result.starsGranted)} (курс ${result.rateUsed})`,
        uk: `Обмін виконано: +${result.starsGranted} ${runeWord('uk', result.starsGranted)} (курс ${result.rateUsed})`,
        es: `Cambio realizado: +${result.starsGranted} ${runeWord('es', result.starsGranted)} (tasa ${result.rateUsed})`,
        'pt-BR': `Troca concluída: +${result.starsGranted} ${runeWord('pt-BR', result.starsGranted)} (taxa ${result.rateUsed})`,
        vi: `Đã đổi xong: +${result.starsGranted} ${runeWord('vi', result.starsGranted)} (tỷ giá ${result.rateUsed})`,
        id: `Tukar berhasil: +${result.starsGranted} ${runeWord('id', result.starsGranted)} (kurs ${result.rateUsed})`,
        tr: `Takas tamamlandı: +${result.starsGranted} ${runeWord('tr', result.starsGranted)} (kur ${result.rateUsed})`,
        pl: `Wymiana zakończona: +${result.starsGranted} ${runeWord('pl', result.starsGranted)} (kurs ${result.rateUsed})`,
      }));
      setCoinsInput('');
      void fetchCoinExchangeQuote().then((fresh) => { if (fresh) setQuote(fresh); });
      void fetchCoinExchangeHistory(30).then((fresh) => { if (fresh && fresh.length > 0) setHistory(fresh); });
    } catch {
      emitAppEvent('action_toast', actionToastTri('error', {
        ru: 'Обмен не удался. Проверь интернет и попробуй ещё раз.',
        uk: 'Обмін не вдався. Перевір інтернет і спробуй ще раз.',
        es: 'El cambio falló. Revisa tu conexión e inténtalo de nuevo.',
        'pt-BR': 'A troca falhou. Verifique sua internet e tente novamente.',
        vi: 'Đổi thất bại. Kiểm tra kết nối mạng và thử lại.',
        id: 'Tukar gagal. Periksa internet dan coba lagi.',
        tr: 'Takas başarısız oldu. İnterneti kontrol edip tekrar dene.',
        pl: 'Wymiana nie powiodła się. Sprawdź internet i spróbuj ponownie.',
      }));
    } finally {
      setExchanging(false);
    }
  }, [canExchange, coinsAmount]);

  const balanceA11y = triLang(lang, {
    ru: `Баланс: ${coinsBalance} ${coinsWord(coinsBalance)}`,
    uk: `Баланс: ${coinsBalance} ${coinsWord(coinsBalance)}`,
    en: `Balance: ${coinsBalance} ${coinsWord(coinsBalance)}`,
    es: `Saldo: ${coinsBalance} ${coinsWord(coinsBalance)}`,
    'pt-BR': `Saldo: ${coinsBalance} ${coinsWord(coinsBalance)}`,
    vi: `Số dư: ${coinsBalance} ${coinsWord(coinsBalance)}`,
    id: `Saldo: ${coinsBalance} ${coinsWord(coinsBalance)}`,
    tr: `Bakiye: ${coinsBalance} ${coinsWord(coinsBalance)}`,
    pl: `Saldo: ${coinsBalance} ${coinsWord(coinsBalance)}`,
  });

  const cardStyle = {
    backgroundColor: t.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: t.border,
    padding: 16,
  } as const;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bgPrimary }} edges={['top']}>
      <ScrollView decelerationRate="fast" contentContainerStyle={{ paddingBottom: Math.max(24, insets.bottom + 16) }}>
        <ContentWrap>
          {/* Шапка */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
            <TapScale
              onPress={() => safeRouterBack(router)}
              accessibilityLabel={triLang(lang, {
                ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás',
                'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz',
              })}
              accessibilityRole="button"
              style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="chevron-back" size={24} color={t.textPrimary} />
            </TapScale>
            <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.h2, fontWeight: '900' }}>
              {triLang(lang, {
                ru: 'Биржа', uk: 'Біржа', en: 'Exchange', es: 'Intercambio',
                'pt-BR': 'Câmbio', vi: 'Đổi xu', id: 'Tukar Koin', tr: 'Takas', pl: 'Kantor',
              })}
            </Text>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              accessibilityLabel={balanceA11y}
              accessibilityRole="text"
            >
              <Image source={coinIconForBalance(coinsBalance, themeMode)} style={{ width: 28, height: 28 }} contentFit="contain" accessibilityElementsHidden importantForAccessibility="no" />
              <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '900' }}>{coinsBalance}</Text>
            </View>
          </View>

          {/* Герой: текущий курс */}
          <View style={[cardStyle, { alignItems: 'center', marginTop: 8 }]}>
            <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
              {triLang(lang, {
                ru: 'Текущий курс', uk: 'Поточний курс', en: 'Current rate', es: 'Tasa actual',
                'pt-BR': 'Taxa atual', vi: 'Tỷ giá hiện tại', id: 'Kurs saat ini', tr: 'Güncel kur', pl: 'Aktualny kurs',
              })}
            </Text>
            {quote ? (
              <>
                <Text
                  style={{ color: t.textPrimary, fontSize: 26, fontWeight: '900', marginTop: 8, textAlign: 'center' }}
                  accessibilityLabel={triLang(lang, {
                    ru: `1 жемчужина = ${quote.rate} ${runeWord('ru', quote.rate)}`,
                    uk: `1 перлина = ${quote.rate} ${runeWord('uk', quote.rate)}`,
                    en: `1 pearl = ${quote.rate} ${runeWord('en', quote.rate)}`,
                    es: `1 moneda = ${quote.rate} ${runeWord('es', quote.rate)}`,
                    'pt-BR': `1 pérola = ${quote.rate} ${runeWord('pt-BR', quote.rate)}`,
                    vi: `1 xu = ${quote.rate} ${runeWord('vi', quote.rate)}`,
                    id: `1 koin = ${quote.rate} ${runeWord('id', quote.rate)}`,
                    tr: `1 jeton = ${quote.rate} ${runeWord('tr', quote.rate)}`,
                    pl: `1 perła = ${quote.rate} ${runeWord('pl', quote.rate)}`,
                  })}
                >
                  {triLang(lang, {
                    ru: '1 жемчужина = ', uk: '1 перлина = ', en: '1 pearl = ', es: '1 perla = ',
                    'pt-BR': '1 pérola = ', vi: '1 xu = ', id: '1 koin = ', tr: '1 jeton = ', pl: '1 perła = ',
                  })}
                  <Text style={{ color: t.accent }}>
                    {quote.rate} <RuneGlyph size={22} color={t.accent} />
                  </Text>
                </Text>
                <Text style={{ color: t.textMuted, fontSize: f.body, marginTop: 8, textAlign: 'center' }}>
                  {triLang(lang, {
                    ru: `Коридор курса: ${quote.corridorMin}–${quote.corridorMax} рун за жемчужину`,
                    uk: `Коридор курсу: ${quote.corridorMin}–${quote.corridorMax} рун за перлину`,
                    en: `Range: ${quote.corridorMin}–${quote.corridorMax} runes per pearl`,
                    es: `Corredor: ${quote.corridorMin}–${quote.corridorMax} runas por perla`,
                    'pt-BR': `Corredor: ${quote.corridorMin}–${quote.corridorMax} runas por pérola`,
                    vi: `Biên độ: ${quote.corridorMin}–${quote.corridorMax} rune mỗi xu`,
                    id: `Koridor: ${quote.corridorMin}–${quote.corridorMax} rune per koin`,
                    tr: `Aralık: jeton başına ${quote.corridorMin}–${quote.corridorMax} rün`,
                    pl: `Korytarz: ${quote.corridorMin}–${quote.corridorMax} run za perłę`,
                  })}
                </Text>
                {nextRecalcLabel ? (
                  <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 4, textAlign: 'center' }}>
                    {triLang(lang, {
                      ru: `Следующий пересчёт: ${nextRecalcLabel}`,
                      uk: `Наступний перерахунок: ${nextRecalcLabel}`,
                      en: `Next recalc: ${nextRecalcLabel}`,
                      es: `Próximo recálculo: ${nextRecalcLabel}`,
                      'pt-BR': `Próximo recálculo: ${nextRecalcLabel}`,
                      vi: `Lần tính lại tiếp theo: ${nextRecalcLabel}`,
                      id: `Perhitungan ulang berikutnya: ${nextRecalcLabel}`,
                      tr: `Sonraki yeniden hesaplama: ${nextRecalcLabel}`,
                      pl: `Następne przeliczenie: ${nextRecalcLabel}`,
                    })}
                  </Text>
                ) : null}
              </>
            ) : (
              <Text style={{ color: t.textMuted, fontSize: f.body, marginTop: 8, textAlign: 'center' }}>
                {triLang(lang, {
                  ru: 'Курс временно недоступен. Проверь интернет — покажем, как только сможем.',
                  uk: 'Курс тимчасово недоступний. Перевір інтернет — покажемо, щойно зможемо.',
                  en: 'Rate temporarily unavailable. Check your connection — we’ll show it as soon as we can.',
                  es: 'Tasa no disponible. Revisa tu conexión e inténtalo de nuevo.',
                  'pt-BR': 'Taxa temporariamente indisponível. Verifique sua internet — mostraremos assim que possível.',
                  vi: 'Tỷ giá tạm thời không khả dụng. Kiểm tra kết nối mạng — chúng tôi sẽ hiển thị ngay khi có thể.',
                  id: 'Kurs sementara tidak tersedia. Periksa internet kamu — akan kami tampilkan begitu bisa.',
                  tr: 'Kur şu anda kullanılamıyor. İnterneti kontrol et — mümkün olur olmaz gösteririz.',
                  pl: 'Kurs chwilowo niedostępny. Sprawdź internet — pokażemy, jak tylko będzie można.',
                })}
              </Text>
            )}
          </View>

          {/* История курса */}
          <View style={[cardStyle, { marginTop: 12 }]}>
            <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '800' }}>
              {triLang(lang, {
                ru: 'История курса · 30 дней', uk: 'Історія курсу · 30 днів', en: 'Rate history · 30 days', es: 'Historial · 30 días',
                'pt-BR': 'Histórico · 30 dias', vi: 'Lịch sử tỷ giá · 30 ngày', id: 'Riwayat kurs · 30 hari', tr: 'Kur geçmişi · 30 gün', pl: 'Historia kursu · 30 dni',
              })}
            </Text>
            <View style={{ marginTop: 12, alignItems: 'center' }}>
              {history.length >= 2 ? (
                <RateHistoryChart points={history} accent={t.accent} textMuted={t.textMuted} />
              ) : (
                <Text style={{ color: t.textMuted, fontSize: f.body, paddingVertical: 24, textAlign: 'center' }}>
                  {triLang(lang, {
                    ru: 'История пока пуста — данные появятся после первых пересчётов курса.',
                    uk: 'Історія поки порожня — дані з\'являться після перших перерахунків курсу.',
                    en: 'No history yet — data will show up after the first recalculations.',
                    es: 'Historial vacío por ahora: habrá datos tras los primeros recálculos.',
                    'pt-BR': 'Histórico ainda vazio — os dados aparecerão após os primeiros recálculos.',
                    vi: 'Lịch sử còn trống — dữ liệu sẽ xuất hiện sau các lần tính lại đầu tiên.',
                    id: 'Riwayat masih kosong — data akan muncul setelah perhitungan ulang pertama.',
                    tr: 'Geçmiş henüz boş — ilk yeniden hesaplamalardan sonra veriler görünecek.',
                    pl: 'Historia jest jeszcze pusta — dane pojawią się po pierwszych przeliczeniach.',
                  })}
                </Text>
              )}
            </View>
          </View>

          {/* Почему курс меняется */}
          <View style={[cardStyle, { marginTop: 12 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="information-circle-outline" size={20} color={t.accent} accessibilityElementsHidden importantForAccessibility="no" />
              <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '800' }}>
                {triLang(lang, {
                  ru: 'Почему курс меняется', uk: 'Чому курс змінюється', en: 'Why the rate changes', es: 'Por qué cambia la tasa',
                  'pt-BR': 'Por que a taxa muda', vi: 'Vì sao tỷ giá thay đổi', id: 'Kenapa kurs berubah', tr: 'Kur neden değişiyor', pl: 'Dlaczego kurs się zmienia',
                })}
              </Text>
            </View>
            <Text style={{ color: t.textSecond, fontSize: f.body, marginTop: 8, lineHeight: 20 }}>
              {triLang(lang, {
                ru: 'Курс растёт, когда многие игроки обменивают жемчужины, и плавно возвращается к базовому, когда спрос падает. Пересчёт — раз в сутки, максимум на 10% за день.',
                uk: 'Курс зростає, коли багато гравців обмінюють перлини, і плавно повертається до базового, коли попит падає. Перерахунок — раз на добу, максимум на 10% за день.',
                en: 'The rate rises when many players exchange pearls and eases back to baseline as demand drops. Recalculated once a day, by at most 10% per day.',
                es: 'La tasa sube cuando muchos jugadores cambian perlas y vuelve suavemente a la base cuando baja la demanda. Se recalcula una vez al día, máximo un 10% por día.',
                'pt-BR': 'A taxa sobe quando muitos jogadores trocam pérolas e volta suavemente à base quando a demanda cai. Recálculo uma vez por dia, no máximo 10% por dia.',
                vi: 'Tỷ giá tăng khi nhiều người chơi đổi xu và giảm dần về mức cơ bản khi nhu cầu giảm. Tính lại một lần mỗi ngày, tối đa 10% mỗi ngày.',
                id: 'Kurs naik saat banyak pemain menukar koin, lalu turun perlahan ke dasar saat permintaan menurun. Dihitung ulang sekali sehari, maksimal 10% per hari.',
                tr: 'Kur, çok sayıda oyuncu jeton takas ettiğinde yükselir ve talep düştüğünde yumuşakça temel seviyeye döner. Günde bir kez, en fazla %10 yeniden hesaplanır.',
                pl: 'Kurs rośnie, gdy wielu graczy wymienia perły, i płynnie wraca do bazowego, gdy popyt spada. Przeliczenie raz dziennie, maksymalnie o 10% dziennie.',
              })}
            </Text>
          </View>

          {/* Форма обмена */}
          <View style={[cardStyle, { marginTop: 12 }]}>
            <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '800' }}>
              {triLang(lang, {
                ru: 'Обменять жемчужины', uk: 'Обміняти перлини', en: 'Exchange pearls', es: 'Cambiar perlas',
                'pt-BR': 'Trocar pérolas', vi: 'Đổi xu', id: 'Tukar koin', tr: 'Jeton takas et', pl: 'Wymień perły',
              })}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
              <TextInput
                value={coinsInput}
                onChangeText={setCoinsInput}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={t.textGhost}
                accessibilityLabel={triLang(lang, {
                  ru: 'Сколько жемчужин обменять', uk: 'Скільки перлин обміняти', en: 'How many pearls to exchange', es: 'Cuántas perlas cambiar',
                  'pt-BR': 'Quantas pérolas trocar', vi: 'Bao nhiêu xu để đổi', id: 'Berapa koin yang ditukar', tr: 'Kaç jeton takas edilecek', pl: 'Ile pereł wymienić',
                })}
                style={{
                  flex: 1,
                  backgroundColor: t.bgSurface,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: t.border,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  color: t.textPrimary,
                  fontSize: f.numMd,
                  fontWeight: '800',
                }}
              />
              <TapScale
                onPress={() => setCoinsInput(String(coinsBalance))}
                accessibilityRole="button"
                accessibilityLabel={triLang(lang, {
                  ru: 'Обменять все жемчужины', uk: 'Обміняти всі перлини', en: 'Exchange all pearls', es: 'Cambiar todas las perlas',
                  'pt-BR': 'Trocar todas as pérolas', vi: 'Đổi tất cả xu', id: 'Tukar semua koin', tr: 'Tüm jetonları takas et', pl: 'Wymień wszystkie perły',
                })}
                style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: t.border }}
              >
                <Text style={{ color: t.accent, fontWeight: '800', fontSize: f.body }}>
                  {triLang(lang, {
                    ru: 'Все', uk: 'Усі', en: 'All', es: 'Todas',
                    'pt-BR': 'Todas', vi: 'Tất cả', id: 'Semua', tr: 'Tümü', pl: 'Wszystkie',
                  })}
                </Text>
              </TapScale>
            </View>
            {coinsAmount > coinsBalance ? (
              <Text style={{ color: t.wrong, fontSize: f.caption, marginTop: 6 }}>
                {triLang(lang, {
                  ru: 'Недостаточно жемчужин на балансе',
                  uk: 'Недостатньо перлин на балансі',
                  en: 'Not enough pearls in your balance',
                  es: 'No hay perlas suficientes en el saldo',
                  'pt-BR': 'Saldo de pérolas insuficiente',
                  vi: 'Số xu trên số dư không đủ',
                  id: 'Saldo koin tidak cukup',
                  tr: 'Bakiyede yeterli jeton yok',
                  pl: 'Za mało pereł na saldzie',
                })}
              </Text>
            ) : null}
            <Text
              style={{ color: t.textSecond, fontSize: f.body, marginTop: 10 }}
              accessibilityLiveRegion="polite"
            >
              {coinsAmount > 0 && quote
                ? triLang(lang, {
                    ru: `Вы получите ≈ ${starsEstimate} ${runeWord('ru', starsEstimate)}`,
                    uk: `Ви отримаєте ≈ ${starsEstimate} ${runeWord('uk', starsEstimate)}`,
                    en: `You’ll get ≈ ${starsEstimate} ${runeWord('en', starsEstimate)}`,
                    es: `Recibirás ≈ ${starsEstimate} ${runeWord('es', starsEstimate)}`,
                    'pt-BR': `Você receberá ≈ ${starsEstimate} ${runeWord('pt-BR', starsEstimate)}`,
                    vi: `Bạn sẽ nhận ≈ ${starsEstimate} ${runeWord('vi', starsEstimate)}`,
                    id: `Kamu akan menerima ≈ ${starsEstimate} ${runeWord('id', starsEstimate)}`,
                    tr: `≈ ${starsEstimate} ${runeWord('tr', starsEstimate)} alacaksın`,
                    pl: `Otrzymasz ≈ ${starsEstimate} ${runeWord('pl', starsEstimate)}`,
                  })
                : triLang(lang, {
                    ru: 'Введите количество жемчужин — покажем оценку в рунах.',
                    uk: 'Введіть кількість перлин — покажемо оцінку в рунах.',
                    en: 'Enter the number of pearls — we’ll show the estimate in runes.',
                    es: 'Introduce la cantidad de perlas: mostraremos la estimación en runas.',
                    'pt-BR': 'Digite a quantidade de pérolas: mostraremos a estimativa em runas.',
                    vi: 'Nhập số xu — chúng tôi sẽ hiển thị ước tính bằng rune.',
                    id: 'Masukkan jumlah koin — kami tampilkan perkiraan dalam rune.',
                    tr: 'Jeton miktarını gir — rün cinsinden tahmini gösterelim.',
                    pl: 'Podaj liczbę pereł — pokażemy szacunek w runach.',
                  })}
            </Text>
            <TapScale
              onPress={() => { void onExchange(); }}
              disabled={!canExchange}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canExchange, busy: exchanging }}
              accessibilityLabel={triLang(lang, {
                ru: 'Подтвердить обмен', uk: 'Підтвердити обмін', en: 'Confirm exchange', es: 'Confirmar el cambio',
                'pt-BR': 'Confirmar a troca', vi: 'Xác nhận đổi', id: 'Konfirmasi tukar', tr: 'Takası onayla', pl: 'Potwierdź wymianę',
              })}
              style={{
                marginTop: 12,
                borderRadius: 14,
                backgroundColor: canExchange ? t.accent : t.bgSurface,
                alignItems: 'center',
                paddingVertical: 14,
                opacity: canExchange ? 1 : 0.7,
              }}
            >
              {exchanging ? (
                <ActivityIndicator color="#07110A" />
              ) : (
                <Text style={{ color: canExchange ? '#07110A' : t.textMuted, fontSize: f.bodyLg, fontWeight: '900' }}>
                  {triLang(lang, {
                    ru: 'Обменять', uk: 'Обміняти', en: 'Exchange', es: 'Cambiar',
                    'pt-BR': 'Trocar', vi: 'Đổi', id: 'Tukar', tr: 'Takas et', pl: 'Wymień',
                  })}
                </Text>
              )}
            </TapScale>
          </View>

          {/* Обязательный дисклеймер (спека §6) */}
          <View style={[cardStyle, { marginTop: 12, borderColor: `${t.accent}40` }]}>
            <Text style={{ color: t.textSecond, fontSize: f.caption, lineHeight: 18, textAlign: 'center' }}>
              {triLang(lang, {
                ru: 'Жемчужины ускоряют доступ к урокам, но не повышают оценку и не подтверждают знание',
                uk: 'Перлини пришвидшують доступ до уроків, але не підвищують оцінку і не підтверджують знання',
                en: 'Pearls speed up access to lessons, but they don’t raise your grade or prove your knowledge',
                es: 'Las perlas aceleran el acceso a las lecciones, pero no mejoran la nota ni confirman el conocimiento',
                'pt-BR': 'As pérolas aceleram o acesso às lições, mas não melhoram a nota nem comprovam conhecimento',
                vi: 'Xu giúp tăng tốc truy cập bài học, nhưng không nâng điểm và không xác nhận kiến thức',
                id: 'Koin mempercepat akses ke pelajaran, tapi tidak menaikkan nilai atau membuktikan pengetahuan',
                tr: 'Jetonlar derslere erişimi hızlandırır ama notu yükseltmez ve bilgiyi doğrulamaz',
                pl: 'Perły przyspieszają dostęp do lekcji, ale nie podnoszą oceny ani nie potwierdzają wiedzy',
              })}
            </Text>
          </View>
        </ContentWrap>
      </ScrollView>
    </SafeAreaView>
  );
}
