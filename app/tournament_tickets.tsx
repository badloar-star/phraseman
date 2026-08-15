// ═══════════════════════════════════════════════════════════════════════════
// tournament_tickets.tsx — билеты турниров (макеты 36-38).
//
// зачем: билет — не отдельный баланс, а витрина входа (владелец 2026-08-03:
// «билет стоит 5 жемчужин, 1 билет в неделю можно получить бесплатно»).
// Число билетов = локальная клиентская проекция жемчужин ÷ серверная цена
// входа + подтверждённый сервером бесплатный недельный вход.
//
// зачем (владелец 2026-08-04): экран переведён на единый стандарт «шторки
// раздела» приложения — presentation:'modal' (см. app/section_sheet_navigation.ts)
// + SectionSheetHeader (скруглённые углы сверху, крестик слева в шапке),
// тот же паттерн, что у settings_edu/top_helpers/premium_modal. Раньше был
// самодельный полупрозрачный Modal с крестиком справа — не соответствовал
// стандарту приложения.
// ═══════════════════════════════════════════════════════════════════════════

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlowText } from '../components/text-integrity/FlowText';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import SectionSheetHeader from '../components/SectionSheetHeader';
import { safeRouterBack } from './navigation_back';
import { Card } from '../components/tournament/tournament_ui';
import { radius, type, useTournamentPalette, type TournamentPalette } from '../components/tournament/tournament_theme';
import { loadWeeklyBankInfo, type WeeklyBankInfo } from './tournament_client';
import { getShardsBalance } from './shards_system';
import { triLang, type Lang } from '../constants/i18n';
import { useLang } from '../components/LangContext';

const DEFAULT_ENTRY_GEMS = 5;

export default function TournamentTicketsScreen() {
  const { lang } = useLang();
  const router = useRouter();
  // зачем 2026-08-04 (аудит фикса сейф-зоны): экран красил фон/текст статичным
  // T из tournament_theme вместо активной темы — единственный турнирный экран
  // с этим пробелом (все соседи зовут useTournamentPalette).
  const P = useTournamentPalette();
  const styles = useMemo(() => makeStyles(P), [P]);

  // зачем: peek — синхронный первый кадр из кэша loadWeeklyBankInfo (тот же
  // источник, что и лобби), без «сначала пусто, потом появилось».
  const [bank, setBank] = useState<WeeklyBankInfo | null>(() => null);
  const [gems, setGems] = useState(0);
  useEffect(() => {
    let cancelled = false;
    loadWeeklyBankInfo().then((result) => {
      if (!cancelled) setBank(result);
    }).catch(() => {});
    void getShardsBalance().then((balance) => { if (!cancelled) setGems(balance); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const entryGems = Math.max(1, bank?.entryGems ?? DEFAULT_ENTRY_GEMS);
  const freeEntryAvailable = bank?.freeEntryAvailable ?? false;
  const tickets = Math.floor(gems / entryGems) + (freeEntryAvailable ? 1 : 0);

  const close = useCallback(() => safeRouterBack(router, '/(tabs)/home' as any), [router]);

  const visualTickets = useMemo(
    () => Array.from({ length: Math.min(tickets, 5) }, (_, index) => index),
    [tickets],
  );

  return (
    <View style={[styles.root, { backgroundColor: P.bg }]}>
      <SafeAreaView style={styles.flex}>
        <SectionSheetHeader
          title={triLang(lang, { ru: 'Билеты', uk: 'Квитки', es: 'Entradas', 'pt-BR': 'Ingressos', vi: 'Vé', id: 'Tiket', tr: 'Biletler', pl: 'Bilety' })}
          onClose={close}
        />
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Инвентарь */}
          <Card tone="elev" pad={24}>
            <Text style={styles.kicker}>{triLang(lang, { ru: 'Ваши билеты', uk: 'Ваші квитки', es: 'Tus entradas', 'pt-BR': 'Seus ingressos', vi: 'Vé của bạn', id: 'Tiketmu', tr: 'Biletlerin', pl: 'Twoje bilety' })}</Text>

            <View style={styles.ticketRow}>
              {visualTickets.map((index) => (
                <Animated.View
                  key={index}
                  entering={ZoomIn.delay(index * 70).springify().damping(14).stiffness(190)}
                >
                  <TicketCard lang={lang} styles={styles} />
                </Animated.View>
              ))}
              {tickets === 0 ? <Text style={styles.emptyTickets}>{triLang(lang, { ru: 'Пока пусто', uk: 'Поки що порожньо', es: 'Aún vacío', 'pt-BR': 'Ainda vazio', vi: 'Hiện đang trống', id: 'Masih kosong', tr: 'Henüz boş', pl: 'Na razie pusto' })}</Text> : null}
            </View>

            {/* зачем: text-integrity — масштабирование шрифта не отключаем; строка
                в карточке-колонке, при крупном шрифте просто переносится. */}
            <FlowText testID="tickets-count" provenance="authored" style={styles.count}>
              {triLang(lang, { ru: `У вас ${tickets}`, uk: `У вас ${tickets}`, es: `Tienes ${tickets}`, 'pt-BR': `Você tem ${tickets}`, vi: `Bạn có ${tickets}`, id: `Kamu punya ${tickets}`, tr: `${tickets} adet var`, pl: `Masz ${tickets}` })} <Text style={styles.countIcon}>🎟</Text>
            </FlowText>
            <Text style={styles.countHint}>
              {tickets > 0
                  ? triLang(lang, { ru: `хватит на ${tickets} ${pluralRuTournaments(tickets)}`, uk: `вистачить на ${tickets} турнірів`, es: `alcanza para ${tickets} torneos`, 'pt-BR': `dá para ${tickets} torneios`, vi: `đủ cho ${tickets} giải đấu`, id: `cukup untuk ${tickets} turnamen`, tr: `${tickets} turnuvaya yeter`, pl: `starczy na ${tickets} turniejów` })
                  : triLang(lang, { ru: 'нужен хотя бы один', uk: 'потрібен хоча б один', es: 'necesitas al menos uno', 'pt-BR': 'você precisa de pelo menos um', vi: 'cần ít nhất một vé', id: 'butuh setidaknya satu', tr: 'en az bir tane gerekli', pl: 'potrzebny jest przynajmniej jeden' })}
            </Text>
          </Card>

          {/* Бесплатный вход недели — реальная механика вместо витринного VIP. */}
          <Card tone="gold" pad={18} style={styles.vipCard}>
            <View style={styles.vipRow}>
              <Text style={styles.vipIcon}>{freeEntryAvailable ? '🆓' : '✅'}</Text>
              <View style={styles.vipBody}>
                <Text style={styles.vipTitle}>{triLang(lang, { ru: 'Бесплатный вход недели', uk: 'Безкоштовний вхід тижня', es: 'Entrada gratis de la semana', 'pt-BR': 'Entrada grátis da semana', vi: 'Lượt vào miễn phí trong tuần', id: 'Masuk gratis minggu ini', tr: 'Haftanın ücretsiz girişi', pl: 'Darmowe wejście tygodnia' })}</Text>
                <Text style={styles.vipHint}>
                  {freeEntryAvailable
                      ? triLang(lang, { ru: 'ещё не использован — доступен сейчас', uk: 'ще не використаний — доступний зараз', es: 'aún sin usar: disponible ahora', 'pt-BR': 'ainda não usado: disponível agora', vi: 'chưa dùng — hiện đang khả dụng', id: 'belum digunakan — tersedia sekarang', tr: 'henüz kullanılmadı — şimdi mevcut', pl: 'jeszcze nieużyte — dostępne teraz' })
                      : triLang(lang, { ru: 'уже использован на этой неделе', uk: 'вже використаний цього тижня', es: 'ya usado esta semana', 'pt-BR': 'já usado esta semana', vi: 'đã dùng trong tuần này', id: 'sudah digunakan minggu ini', tr: 'bu hafta zaten kullanıldı', pl: 'już wykorzystane w tym tygodniu' })}
                </Text>
              </View>
            </View>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function pluralRuTournaments(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'турнир';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'турнира';
  return 'турниров';
}

type TicketStyles = ReturnType<typeof makeStyles>;

/** Билет с «надрезами» по бокам — как настоящий отрывной талон. */
const TicketCard = memo(function TicketCard({ lang, styles }: { lang: Lang; styles: TicketStyles }) {
  return (
    <View style={styles.ticket}>
      <View style={[styles.notch, styles.notchLeft]} />
      <View style={[styles.notch, styles.notchRight]} />
      <Text style={styles.ticketIcon}>🎟</Text>
      <Text style={styles.ticketLabel}>{triLang(lang, { ru: 'вход', uk: 'вхід', es: 'entrada', 'pt-BR': 'entrada', vi: 'vào', id: 'masuk', tr: 'giriş', pl: 'wejście' })}</Text>
    </View>
  );
});

const makeStyles = (P: TournamentPalette) => StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32, gap: 12 },

  kicker: {
    ...type.label,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: P.muted,
    textAlign: 'center',
  },

  ticketRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 18, minHeight: 76 },
  ticket: {
    width: 74,
    height: 68,
    borderRadius: radius.sm,
    backgroundColor: P.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    overflow: 'hidden',
  },
  // Надрезы — кружки цвета фона по бокам, без единой обводки.
  notch: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 999,
    backgroundColor: P.elev,
    top: '50%',
    marginTop: -7,
  },
  notchLeft: { left: -7 },
  notchRight: { right: -7 },
  ticketIcon: { fontSize: 22 },
  ticketLabel: { fontSize: 11, fontWeight: '800', color: P.accent },
  emptyTickets: { ...type.body, color: P.ghost, alignSelf: 'center' },

  count: {
    fontSize: 40,
    fontWeight: '900',
    color: P.text,
    textAlign: 'center',
    marginTop: 20,
    letterSpacing: -1,
  },
  countIcon: { fontSize: 30 },
  countHint: { ...type.body, color: P.muted, textAlign: 'center', marginTop: 6 },

  vipCard: { marginBottom: 4 },
  vipRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  vipIcon: { fontSize: 32 },
  vipBody: { flex: 1 },
  vipTitle: { fontSize: 17, fontWeight: '800', color: P.text },
  vipHint: { ...type.label, fontWeight: '600', color: P.muted, marginTop: 3 },
});
