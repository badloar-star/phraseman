// ═══════════════════════════════════════════════════════════════════════════
// tournament_tickets.tsx — билеты турниров (макеты 36-38).
//
// зачем: билет — не отдельный баланс, а витрина входа (владелец 2026-08-03:
// «билет стоит 5 жемчужин, 1 билет в неделю можно получить бесплатно»).
// Число билетов = жемчужины ÷ цена входа + бесплатный недельный вход,
// оба числа приходят с сервера вместе с банком недели (0 доп. чтений).
// ═══════════════════════════════════════════════════════════════════════════

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { FlowText } from '../components/text-integrity/FlowText';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { Card, Cta, Sheet } from '../components/tournament/tournament_ui';
import { TournamentBackdrop } from '../components/tournament/TournamentBackdrop';
import { T, radius, type } from '../components/tournament/tournament_theme';
import { loadWeeklyBankInfo, type WeeklyBankInfo } from './tournament_client';
import { triLang, type Lang } from '../constants/i18n';
import { useLang } from '../components/LangContext';

const DEFAULT_ENTRY_GEMS = 5;

type Source = { icon: string; title: string; hint: string; ready?: boolean };

/** Источники жемчужин, из которых складываются билеты — спека §4. */
function sourcesForLang(lang: Lang): Source[] {
  return [
    { icon: '🎁', title: triLang(lang, { ru: 'Подарок за уровень', uk: 'Подарунок за рівень', es: 'Regalo por nivel', 'pt-BR': 'Presente por nível', vi: 'Quà tặng theo cấp độ', id: 'Hadiah per level', tr: 'Seviye hediyesi', pl: 'Prezent za poziom' }), hint: triLang(lang, { ru: 'каждый новый уровень', uk: 'кожен новий рівень', es: 'cada nivel nuevo', 'pt-BR': 'a cada novo nível', vi: 'mỗi cấp độ mới', id: 'setiap level baru', tr: 'her yeni seviyede', pl: 'każdy nowy poziom' }), ready: true },
    { icon: '🔥', title: triLang(lang, { ru: 'Серия 7 дней', uk: 'Серія 7 днів', es: 'Racha de 7 días', 'pt-BR': 'Sequência de 7 dias', vi: 'Chuỗi 7 ngày', id: 'Rentetan 7 hari', tr: '7 günlük seri', pl: 'Seria 7 dni' }), hint: triLang(lang, { ru: 'осталось 3 дня', uk: 'залишилось 3 дні', es: 'quedan 3 días', 'pt-BR': 'faltam 3 dias', vi: 'còn 3 ngày', id: 'tersisa 3 hari', tr: '3 gün kaldı', pl: 'zostały 3 dni' }) },
    { icon: '🎡', title: triLang(lang, { ru: 'Награда за друга', uk: 'Нагорода за друга', es: 'Recompensa por amigo', 'pt-BR': 'Recompensa por amigo', vi: 'Phần thưởng bạn bè', id: 'Hadiah teman', tr: 'Arkadaş ödülü', pl: 'Nagroda za znajomego' }), hint: triLang(lang, { ru: 'пригласи — получите оба', uk: 'запроси — отримаєте обидва', es: 'invita y ambos ganan', 'pt-BR': 'convide e os dois ganham', vi: 'mời bạn — cả hai đều nhận', id: 'undang — kalian berdua dapat', tr: 'davet et — ikiniz de kazanın', pl: 'zaproś — oboje dostajecie' }), ready: true },
  ];
}

export default function TournamentTicketsScreen() {
  const { lang } = useLang();
  const insets = useStableSafeAreaInsets();
  const SOURCES = useMemo(() => sourcesForLang(lang), [lang]);

  // зачем: peek — синхронный первый кадр из кэша loadWeeklyBankInfo (тот же
  // источник, что и лобби), без «сначала пусто, потом появилось».
  const [bank, setBank] = useState<WeeklyBankInfo | null>(() => null);
  useEffect(() => {
    let cancelled = false;
    loadWeeklyBankInfo().then((result) => {
      if (!cancelled) setBank(result);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const entryGems = Math.max(1, bank?.entryGems ?? DEFAULT_ENTRY_GEMS);
  const gems = Math.max(0, bank?.gemBalance ?? 0);
  const freeEntryAvailable = bank?.freeEntryAvailable ?? false;
  const tickets = Math.floor(gems / entryGems) + (freeEntryAvailable ? 1 : 0);

  const [howToVisible, setHowToVisible] = useState(false);
  const openHowTo = useCallback(() => setHowToVisible(true), []);
  const closeHowTo = useCallback(() => setHowToVisible(false), []);

  const visualTickets = useMemo(
    () => Array.from({ length: Math.min(tickets, 5) }, (_, index) => index),
    [tickets],
  );

  return (
    <View style={styles.root}>
      <TournamentBackdrop variant="tickets" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 120 },
        ]}
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
                <TicketCard lang={lang} />
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
        <Card tone="gold" pad={18}>
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

        <Cta onPress={openHowTo}>{triLang(lang, { ru: 'Как получить ещё', uk: 'Як отримати ще', es: 'Cómo conseguir más', 'pt-BR': 'Como conseguir mais', vi: 'Cách nhận thêm', id: 'Cara mendapatkan lagi', tr: 'Nasıl daha fazla kazanılır', pl: 'Jak zdobyć więcej' })}</Cta>

        {/* Источники */}
        <View style={styles.sources}>
          {SOURCES.map((source, index) => (
            <Animated.View key={source.title} entering={FadeInDown.delay(index * 50).duration(220)}>
              <SourceRow source={source} lang={lang} />
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      {/* Как получить билеты (макет 37) — шторка вместо отдельного экрана:
          список источников короткий, лишний переход тут только мешает. */}
      <Sheet visible={howToVisible} onClose={closeHowTo}>
        <Text style={styles.sheetTitle}>{triLang(lang, { ru: 'Как получить билеты', uk: 'Як отримати квитки', es: 'Cómo conseguir entradas', 'pt-BR': 'Como conseguir ingressos', vi: 'Cách nhận vé', id: 'Cara mendapatkan tiket', tr: 'Nasıl bilet kazanılır', pl: 'Jak zdobyć bilety' })}</Text>
        <View style={styles.sheetSources}>
          {SOURCES.map((source) => (
            <SourceRow key={source.title} source={source} lang={lang} />
          ))}
        </View>
        <Cta ghost onPress={closeHowTo}>{triLang(lang, { ru: 'Понятно', uk: 'Зрозуміло', es: 'Entendido', 'pt-BR': 'Entendi', vi: 'Đã hiểu', id: 'Mengerti', tr: 'Anladım', pl: 'Rozumiem' })}</Cta>
      </Sheet>
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

/** Билет с «надрезами» по бокам — как настоящий отрывной талон. */
const TicketCard = memo(function TicketCard({ lang }: { lang: Lang }) {
  return (
    <View style={styles.ticket}>
      <View style={[styles.notch, styles.notchLeft]} />
      <View style={[styles.notch, styles.notchRight]} />
      <Text style={styles.ticketIcon}>🎟</Text>
      <Text style={styles.ticketLabel}>{triLang(lang, { ru: 'вход', uk: 'вхід', es: 'entrada', 'pt-BR': 'entrada', vi: 'vào', id: 'masuk', tr: 'giriş', pl: 'wejście' })}</Text>
    </View>
  );
});

const SourceRow = memo(function SourceRow({ source, lang }: { source: Source; lang: Lang }) {
  return (
    <View style={styles.source}>
      <View style={styles.sourceInnerLight} pointerEvents="none" />
      <Text style={styles.sourceIcon}>{source.icon}</Text>
      <View style={styles.sourceBody}>
        <Text style={styles.sourceTitle}>{source.title}</Text>
        <Text style={styles.sourceHint}>{source.hint}</Text>
      </View>
      {source.ready ? <Text style={styles.sourceReady}>{triLang(lang, { ru: 'готово', uk: 'готово', es: 'listo', 'pt-BR': 'pronto', vi: 'đã xong', id: 'siap', tr: 'hazır', pl: 'gotowe' })}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  content: { paddingHorizontal: 16, gap: 12 },

  kicker: {
    ...type.label,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: T.muted,
    textAlign: 'center',
  },

  ticketRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 18, minHeight: 76 },
  ticket: {
    width: 74,
    height: 68,
    borderRadius: radius.sm,
    backgroundColor: T.accentSoft,
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
    backgroundColor: T.elev,
    top: '50%',
    marginTop: -7,
  },
  notchLeft: { left: -7 },
  notchRight: { right: -7 },
  ticketIcon: { fontSize: 22 },
  ticketLabel: { fontSize: 11, fontWeight: '800', color: T.accent },
  emptyTickets: { ...type.body, color: T.ghost, alignSelf: 'center' },

  count: {
    fontSize: 40,
    fontWeight: '900',
    color: T.text,
    textAlign: 'center',
    marginTop: 20,
    letterSpacing: -1,
  },
  countIcon: { fontSize: 30 },
  countHint: { ...type.body, color: T.muted, textAlign: 'center', marginTop: 6 },

  vipRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  vipIcon: { fontSize: 32 },
  vipBody: { flex: 1 },
  vipTitle: { fontSize: 17, fontWeight: '800', color: T.text },
  vipHint: { ...type.label, fontWeight: '600', color: T.muted, marginTop: 3 },

  sources: { gap: 8, marginTop: 4 },
  source: {
    minHeight: 62,
    borderRadius: radius.md,
    backgroundColor: T.card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 14,
    overflow: 'hidden',
  },
  sourceInnerLight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.045)',
  },
  sourceIcon: { fontSize: 24 },
  sourceBody: { flex: 1 },
  sourceTitle: { fontSize: 16, fontWeight: '800', color: T.text },
  sourceHint: { ...type.label, fontWeight: '600', color: T.muted, marginTop: 2 },
  sourceReady: { ...type.label, color: T.accent },

  sheetTitle: { fontSize: 22, fontWeight: '900', color: T.text, textAlign: 'center' },
  sheetSources: { gap: 8, marginTop: 18, marginBottom: 18 },
});
