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
import { emitAppEvent, onAppEvent } from './events';
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
    if (d === 1 && k !== 11) return triLang(lang, { ru: 'жемчужина', uk: 'перлина', es: 'perla' });
    if (d >= 2 && d <= 4 && (k < 12 || k > 14)) return triLang(lang, { ru: 'жемчужины', uk: 'перлини', es: 'perlas' });
    return triLang(lang, { ru: 'жемчужин', uk: 'перлин', es: 'perlas' });
  }, [lang]);

  const onExchange = useCallback(async () => {
    if (!canExchange) return;
    setExchanging(true);
    try {
      const result = await exchangeCoinsForStarsDurably(coinsAmount);
      // Сервер подтвердил обмен — дотягиваем авторитетный баланс монет из облака.
      await loadShardsFromCloud().catch(() => {});
      emitAppEvent('action_toast', {
        type: 'success',
        messageRu: `Обмен выполнен: +${result.starsGranted} ${runeWord('ru', result.starsGranted)} (курс ${result.rateUsed})`,
        messageUk: `Обмін виконано: +${result.starsGranted} ${runeWord('uk', result.starsGranted)} (курс ${result.rateUsed})`,
        messageEs: `Cambio realizado: +${result.starsGranted} ${runeWord('es', result.starsGranted)} (tasa ${result.rateUsed})`,
      });
      setCoinsInput('');
      void fetchCoinExchangeQuote().then((fresh) => { if (fresh) setQuote(fresh); });
      void fetchCoinExchangeHistory(30).then((fresh) => { if (fresh && fresh.length > 0) setHistory(fresh); });
    } catch {
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Обмен не удался. Проверь интернет и попробуй ещё раз.',
        messageUk: 'Обмін не вдався. Перевір інтернет і спробуй ще раз.',
        messageEs: 'El cambio falló. Revisa tu conexión e inténtalo de nuevo.',
      });
    } finally {
      setExchanging(false);
    }
  }, [canExchange, coinsAmount]);

  const balanceA11y = triLang(lang, {
    ru: `Баланс: ${coinsBalance} ${coinsWord(coinsBalance)}`,
    uk: `Баланс: ${coinsBalance} ${coinsWord(coinsBalance)}`,
    es: `Saldo: ${coinsBalance} ${coinsWord(coinsBalance)}`,
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
      <ScrollView decelerationRate="normal" contentContainerStyle={{ paddingBottom: Math.max(24, insets.bottom + 16) }}>
        <ContentWrap>
          {/* Шапка */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
            <TapScale
              onPress={() => safeRouterBack(router)}
              accessibilityLabel={triLang(lang, { ru: 'Назад', uk: 'Назад', es: 'Atrás' })}
              accessibilityRole="button"
              style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="chevron-back" size={24} color={t.textPrimary} />
            </TapScale>
            <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.h2, fontWeight: '900' }}>
              {triLang(lang, { ru: 'Биржа', uk: 'Біржа', es: 'Intercambio' })}
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
              {triLang(lang, { ru: 'Текущий курс', uk: 'Поточний курс', es: 'Tasa actual' })}
            </Text>
            {quote ? (
              <>
                <Text
                  style={{ color: t.textPrimary, fontSize: 26, fontWeight: '900', marginTop: 8, textAlign: 'center' }}
                  accessibilityLabel={triLang(lang, {
                    ru: `1 жемчужина = ${quote.rate} ${runeWord('ru', quote.rate)}`,
                    uk: `1 перлина = ${quote.rate} ${runeWord('uk', quote.rate)}`,
                    es: `1 moneda = ${quote.rate} ${runeWord('es', quote.rate)}`,
                    'pt-BR': `1 pérola = ${quote.rate} ${runeWord('pt-BR', quote.rate)}`,
                    vi: `1 xu = ${quote.rate} ${runeWord('vi', quote.rate)}`,
                    id: `1 koin = ${quote.rate} ${runeWord('id', quote.rate)}`,
                    tr: `1 jeton = ${quote.rate} ${runeWord('tr', quote.rate)}`,
                    pl: `1 perła = ${quote.rate} ${runeWord('pl', quote.rate)}`,
                  })}
                >
                  {triLang(lang, { ru: '1 жемчужина = ', uk: '1 перлина = ', es: '1 perla = ' })}
                  <Text style={{ color: t.accent }}>
                    {quote.rate} <RuneGlyph size={22} color={t.accent} />
                  </Text>
                </Text>
                <Text style={{ color: t.textMuted, fontSize: f.body, marginTop: 8, textAlign: 'center' }}>
                  {triLang(lang, {
                    ru: `Коридор курса: ${quote.corridorMin}–${quote.corridorMax} рун за жемчужину`,
                    uk: `Коридор курсу: ${quote.corridorMin}–${quote.corridorMax} рун за перлину`,
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
                      es: `Próximo recálculo: ${nextRecalcLabel}`,
                    })}
                  </Text>
                ) : null}
              </>
            ) : (
              <Text style={{ color: t.textMuted, fontSize: f.body, marginTop: 8, textAlign: 'center' }}>
                {triLang(lang, {
                  ru: 'Курс временно недоступен. Проверь интернет — покажем, как только сможем.',
                  uk: 'Курс тимчасово недоступний. Перевір інтернет — покажемо, щойно зможемо.',
                  es: 'Tasa no disponible. Revisa tu conexión: la mostraremos en cuanto podamos.',
                })}
              </Text>
            )}
          </View>

          {/* История курса */}
          <View style={[cardStyle, { marginTop: 12 }]}>
            <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '800' }}>
              {triLang(lang, { ru: 'История курса · 30 дней', uk: 'Історія курсу · 30 днів', es: 'Historial · 30 días' })}
            </Text>
            <View style={{ marginTop: 12, alignItems: 'center' }}>
              {history.length >= 2 ? (
                <RateHistoryChart points={history} accent={t.accent} textMuted={t.textMuted} />
              ) : (
                <Text style={{ color: t.textMuted, fontSize: f.body, paddingVertical: 24, textAlign: 'center' }}>
                  {triLang(lang, {
                    ru: 'История пока пуста — данные появятся после первых пересчётов курса.',
                    uk: 'Історія поки порожня — дані з\'являться після перших перерахунків курсу.',
                    es: 'Historial vacío por ahora: habrá datos tras los primeros recálculos.',
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
                {triLang(lang, { ru: 'Почему курс меняется', uk: 'Чому курс змінюється', es: 'Por qué cambia la tasa' })}
              </Text>
            </View>
            <Text style={{ color: t.textSecond, fontSize: f.body, marginTop: 8, lineHeight: 20 }}>
              {triLang(lang, {
                ru: 'Курс растёт, когда многие игроки обменивают жемчужины, и плавно возвращается к базовому, когда спрос падает. Пересчёт — раз в сутки, максимум на 10% за день.',
                uk: 'Курс зростає, коли багато гравців обмінюють перлини, і плавно повертається до базового, коли попит падає. Перерахунок — раз на добу, максимум на 10% за день.',
                es: 'La tasa sube cuando muchos jugadores cambian perlas y vuelve suavemente a la base cuando baja la demanda. Se recalcula una vez al día, máximo un 10% por día.',
              })}
            </Text>
          </View>

          {/* Форма обмена */}
          <View style={[cardStyle, { marginTop: 12 }]}>
            <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '800' }}>
              {triLang(lang, { ru: 'Обменять жемчужины', uk: 'Обміняти перлини', es: 'Cambiar perlas' })}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
              <TextInput
                value={coinsInput}
                onChangeText={setCoinsInput}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={t.textGhost}
                accessibilityLabel={triLang(lang, { ru: 'Сколько жемчужин обменять', uk: 'Скільки перлин обміняти', es: 'Cuántas perlas cambiar' })}
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
                accessibilityLabel={triLang(lang, { ru: 'Обменять все жемчужины', uk: 'Обміняти всі перлини', es: 'Cambiar todas las perlas' })}
                style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: t.border }}
              >
                <Text style={{ color: t.accent, fontWeight: '800', fontSize: f.body }}>
                  {triLang(lang, { ru: 'Все', uk: 'Усі', es: 'Todas' })}
                </Text>
              </TapScale>
            </View>
            {coinsAmount > coinsBalance ? (
              <Text style={{ color: t.wrong, fontSize: f.caption, marginTop: 6 }}>
                {triLang(lang, {
                  ru: 'Недостаточно жемчужин на балансе',
                  uk: 'Недостатньо перлин на балансі',
                  es: 'No hay perlas suficientes en el saldo',
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
              accessibilityLabel={triLang(lang, { ru: 'Подтвердить обмен', uk: 'Підтвердити обмін', es: 'Confirmar el cambio' })}
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
                  {triLang(lang, { ru: 'Обменять', uk: 'Обміняти', es: 'Cambiar' })}
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
                es: 'Las perlas aceleran el acceso a las lecciones, pero no mejoran la nota ni confirman el conocimiento',
              })}
            </Text>
          </View>
        </ContentWrap>
      </ScrollView>
    </SafeAreaView>
  );
}
