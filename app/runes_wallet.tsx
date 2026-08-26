/**
 * runes_wallet.tsx — раздел «Руны»: баланс, заработанное за всё время и
 * откуда руны приходят.
 *
 * зачем (владелец, 2026-08-24): тап по счётчику рун в шапке главной и шапке
 * «Обучения» открывает этот раздел (решение 23.08, макет
 * docs/v2/mockups/27-runes-wallet-and-boosts.html). Прямой запрет владельца
 * 2026-08-24: ЗДЕСЬ НЕТ ТОВАРОВ И МАГАЗИНА — блок «усиления» из макета отменён,
 * не возвращать его в этот экран.
 *
 * Первый кадр — синхронно из снапшота (peekRunesBalance): никакого «0 и
 * прыжка» (Performance Bible). Цифры по источникам появятся, когда сервер
 * начнёт вести разрез bySource (runes_wallet_stats.ts); до этого строки
 * источников живут без чисел — честно, без нулей-вранья.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Image, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { useScreen } from '../hooks/use-screen';
import ContentWrap from '../components/ContentWrap';
import TapScale from '../components/TapScale';
import { triLang, type Lang } from '../constants/i18n';

// зачем (владелец, 25.08: «иконку смени на ассет правильный»): тот же
// ассет-монета, что в Арене/Лиге/Главной через HomeRuneBalance, а не
// текстовый глиф RuneGlyph — одна валюта, один и тот же образ везде.
const RUNE_ASSET = require('../assets/images/level-spin-rewards/stars_10.webp');
import { RUNE_GLYPHS, runeWord } from '../constants/runes';
import { safeRouterBack } from './navigation_back';
import { peekRunesBalance, subscribeRunesBalance, getRunesBalance, type RunesBalance } from './runes_system';
import {
  loadRunesServerStats,
  peekRunesServerStats,
  type RuneSourceKey,
  type RunesServerStats,
} from './runes_wallet_stats';

type SourceRow = { key: RuneSourceKey; icon: keyof typeof Ionicons.glyphMap };

/** Постоянные источники — видны всегда; exchange/other добавляются только с цифрой > 0. */
const PRIMARY_SOURCES: readonly SourceRow[] = [
  { key: 'arena', icon: 'flash-outline' },
  { key: 'learning', icon: 'book-outline' },
  { key: 'friends', icon: 'people-outline' },
  { key: 'spin', icon: 'gift-outline' },
];

const EXTRA_SOURCES: readonly SourceRow[] = [
  { key: 'exchange', icon: 'swap-horizontal-outline' },
  { key: 'other', icon: 'sparkles-outline' },
];

function sourceName(key: RuneSourceKey, lang: Lang): string {
  switch (key) {
    case 'arena':
      return triLang(lang, { ru: 'Арена', uk: 'Арена', en: 'Arena', es: 'Arena', 'pt-BR': 'Arena', vi: 'Đấu trường', id: 'Arena', tr: 'Arena', pl: 'Arena' });
    case 'learning':
      return triLang(lang, { ru: 'Занятия', uk: 'Заняття', en: 'Lessons', es: 'Clases', 'pt-BR': 'Aulas', vi: 'Buổi học', id: 'Sesi belajar', tr: 'Dersler', pl: 'Zajęcia' });
    case 'friends':
      return triLang(lang, { ru: 'Друзья', uk: 'Друзі', en: 'Friends', es: 'Amigos', 'pt-BR': 'Amigos', vi: 'Bạn bè', id: 'Teman', tr: 'Arkadaşlar', pl: 'Znajomi' });
    case 'spin':
      return triLang(lang, { ru: 'Спин', uk: 'Спін', en: 'Spin', es: 'Giro', 'pt-BR': 'Giro', vi: 'Vòng quay', id: 'Putaran', tr: 'Çark', pl: 'Spin' });
    case 'exchange':
      return triLang(lang, { ru: 'Обмен', uk: 'Обмін', en: 'Exchange', es: 'Cambio', 'pt-BR': 'Troca', vi: 'Trao đổi', id: 'Penukaran', tr: 'Takas', pl: 'Wymiana' });
    case 'other':
      return triLang(lang, { ru: 'Другое', uk: 'Інше', en: 'Other', es: 'Otros', 'pt-BR': 'Outros', vi: 'Khác', id: 'Lainnya', tr: 'Diğer', pl: 'Inne' });
  }
}

export default function RunesWalletScreen() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const { insets } = useScreen();

  // Синхронный первый кадр из снапшота — цифра сразу правильная.
  const [wallet, setWallet] = useState<RunesBalance>(() => peekRunesBalance());
  const [serverStats, setServerStats] = useState<RunesServerStats | null>(() => peekRunesServerStats());

  // Пружинка счётчика при живом начислении (обратная связь, не декорация):
  // тот же язык движения, что у чипа в шапке — bump без перелёта.
  const bumpScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let mounted = true;
    const unsubscribe = subscribeRunesBalance((next, delta) => {
      if (!mounted) return;
      setWallet(next);
      if (delta > 0) {
        bumpScale.setValue(1);
        Animated.spring(bumpScale, {
          toValue: 1,
          useNativeDriver: true,
          // Короткий подхват: вверх и назад одной пружиной через velocity —
          // прерываемо и без каскада sequence.
          velocity: 3,
          speed: 18,
          bounciness: 9,
        }).start();
      }
    });
    // Авторитетная проекция с диска (без чтений Firestore). Поздний ответ не
    // затирает более свежее локальное значение: берём только рост.
    void getRunesBalance().then((authoritative) => {
      if (!mounted) return;
      setWallet((current) => (
        authoritative.balance !== current.balance || authoritative.earnedTotal > current.earnedTotal
          ? authoritative
          : current
      ));
    });
    void loadRunesServerStats().then((stats) => {
      if (mounted && stats) setServerStats(stats);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [bumpScale]);

  const goBack = useCallback(() => safeRouterBack(router), [router]);

  const bySource = serverStats?.bySource ?? null;
  const hasEarnedAnything = wallet.earnedTotal > 0 || wallet.balance > 0;

  const rows: readonly SourceRow[] = bySource
    ? [...PRIMARY_SOURCES, ...EXTRA_SOURCES.filter((row) => (bySource[row.key] ?? 0) > 0)]
    : PRIMARY_SOURCES;

  const title = triLang(lang, { ru: 'Руны', uk: 'Руни', en: 'Runes', es: 'Runas', 'pt-BR': 'Runas', vi: 'Rune', id: 'Rune', tr: 'Rünler', pl: 'Runy' });
  const earnedTotalLabel = triLang(lang, {
    ru: `заработано за всё время — ${wallet.earnedTotal}`,
    uk: `зароблено за весь час — ${wallet.earnedTotal}`,
    en: `earned all-time — ${wallet.earnedTotal}`,
    es: `ganadas en total: ${wallet.earnedTotal}`,
    'pt-BR': `ganhas no total: ${wallet.earnedTotal}`,
    vi: `tổng đã kiếm: ${wallet.earnedTotal}`,
    id: `total diperoleh: ${wallet.earnedTotal}`,
    tr: `toplam kazanılan: ${wallet.earnedTotal}`,
    pl: `zdobyte łącznie: ${wallet.earnedTotal}`,
  });
  const sourcesLabel = triLang(lang, {
    ru: 'Откуда руны', uk: 'Звідки руни', en: 'Where runes come from', es: 'De dónde vienen', 'pt-BR': 'De onde vêm',
    vi: 'Rune đến từ đâu', id: 'Dari mana rune', tr: 'Rünler nereden', pl: 'Skąd runy',
  });

  return (
    <View style={{ flex: 1, backgroundColor: t.bgPrimary }}>
      <ContentWrap>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: insets.top + 6,
            paddingBottom: 8,
          }}
        >
          <TapScale
            onPress={goBack}
            withHaptic={true}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: t.bgCard,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
              flexShrink: 0,
            }}
          >
            <Ionicons name="chevron-back" size={20} color={t.textPrimary} />
          </TapScale>
          <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '700' }} numberOfLines={1}>
            {title}
          </Text>
        </View>

        <ScrollView decelerationRate="fast"
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
          showsVerticalScrollIndicator={false}
        >
          <View
            accessible
            accessibilityLabel={`${wallet.balance} ${runeWord(lang, wallet.balance)}`}
            style={{ alignItems: 'center', paddingTop: 18, paddingBottom: 26, paddingHorizontal: 18 }}
          >
            <Image source={RUNE_ASSET} style={{ width: 52, height: 52 }} resizeMode="contain" accessible={false} />
            <Animated.Text
              allowFontScaling={false}
              style={{
                color: t.textPrimary,
                fontSize: 52,
                fontWeight: '900',
                lineHeight: 58,
                letterSpacing: -1.5,
                fontVariant: ['tabular-nums'],
                marginTop: 4,
                transform: [{ scale: bumpScale }],
              }}
            >
              {wallet.balance}
            </Animated.Text>
            <Text
              style={{
                color: t.textMuted,
                fontSize: 13, // guard-ok: hero .sub из утверждённого макета 27 — статистика, не подпись под пунктом
                fontWeight: '700',
                marginTop: 7,
              }}
            >
              {earnedTotalLabel}
            </Text>
          </View>

          {hasEarnedAnything ? (
            <>
              <Text
                style={{
                  color: t.textMuted,
                  fontSize: 12, // guard-ok: .seclab из макета 27 — заголовок секции над списком, не расшифровка
                  fontWeight: '800',
                  letterSpacing: 0.6,
                  paddingHorizontal: 18,
                  marginBottom: 9,
                }}
              >
                {sourcesLabel.toUpperCase()}
              </Text>
              {rows.map((row) => {
                const value = bySource ? Math.max(0, Math.floor(bySource[row.key] ?? 0)) : null;
                return (
                  <View
                    key={row.key}
                    accessible
                    accessibilityLabel={value !== null
                      ? `${sourceName(row.key, lang)}: ${value} ${runeWord(lang, value)}`
                      : sourceName(row.key, lang)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      marginHorizontal: 12,
                      marginBottom: 8,
                      borderRadius: 18,
                      paddingVertical: 12,
                      paddingHorizontal: 13,
                      backgroundColor: t.bgCard,
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 14,
                        backgroundColor: t.bgPrimary,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Ionicons name={row.icon} size={19} color={t.textPrimary} />
                    </View>
                    <Text style={{ flex: 1, color: t.textPrimary, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>
                      {sourceName(row.key, lang)}
                    </Text>
                    {value !== null ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Image source={RUNE_ASSET} style={{ width: 16, height: 16 }} resizeMode="contain" accessible={false} />
                        <Text
                          style={{
                            color: t.gold,
                            fontSize: 15,
                            fontWeight: '900',
                            fontVariant: ['tabular-nums'],
                          }}
                        >
                          {value}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </>
          ) : (
            <View style={{ alignItems: 'center', paddingHorizontal: 32, paddingTop: 10 }}>
              {/* Пустое состояние учит, где брать руны, — вместо «здесь пусто». */}
              <Text
                allowFontScaling={false}
                accessibilityElementsHidden
                importantForAccessibility="no"
                style={{ fontSize: 38, lineHeight: 44, color: t.textMuted, opacity: 0.45, fontWeight: '700' }}
              >
                {RUNE_GLYPHS[4]}
              </Text>
              <Text style={{ color: t.textPrimary, fontSize: 15, fontWeight: '800', marginTop: 10, textAlign: 'center' }}>
                {triLang(lang, {
                  ru: 'Руны приходят за дело',
                  uk: 'Руни приходять за діло',
                  en: 'Runes are earned by doing',
                  es: 'Las runas se ganan con la práctica',
                  'pt-BR': 'As runas vêm com a prática',
                  vi: 'Rune đến từ việc luyện tập',
                  id: 'Rune datang dari latihan',
                  tr: 'Rünler emekle kazanılır',
                  pl: 'Runy zdobywa się pracą',
                })}
              </Text>
              <Text
                style={{
                  color: t.textMuted,
                  fontSize: 12.5, // guard-ok: .ebody пустого состояния из макета 27 — пустое состояние объясняет маршрут
                  fontWeight: '600',
                  marginTop: 6,
                  textAlign: 'center',
                  lineHeight: 19,
                }}
              >
                {triLang(lang, {
                  ru: 'Занятие, матч на Арене или неделя с другом — и первые руны появятся здесь.',
                  uk: 'Заняття, матч на Арені або тиждень із другом — і перші руни з’являться тут.',
                  en: 'A lesson, an Arena match, or a week with a friend — and your first runes will show up here.',
                  es: 'Una clase, una partida en la Arena o una semana con un amigo, y tus primeras runas aparecerán aquí.',
                  'pt-BR': 'Uma aula, uma partida na Arena ou uma semana com um amigo, e suas primeiras runas aparecem aqui.',
                  vi: 'Một buổi học, một trận Đấu trường hoặc một tuần cùng bạn bè — những rune đầu tiên sẽ xuất hiện ở đây.',
                  id: 'Satu sesi belajar, satu pertandingan Arena, atau seminggu bersama teman — rune pertamamu akan muncul di sini.',
                  tr: 'Bir ders, bir Arena maçı ya da bir arkadaşla geçen bir hafta: ilk rünlerin burada görünecek.',
                  pl: 'Zajęcia, mecz na Arenie albo tydzień ze znajomym — i pierwsze runy pojawią się tutaj.',
                })}
              </Text>
            </View>
          )}
        </ScrollView>
      </ContentWrap>
    </View>
  );
}
