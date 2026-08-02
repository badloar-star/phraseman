// ═══════════════════════════════════════════════════════════════════════════
// tournament_tickets.tsx — билеты турниров (макеты 36-38).
//
// зачем: билет — валюта входа. Экран отвечает на два вопроса: сколько у меня
// и как получить ещё. Карточки-билеты с надрезами по бокам (как настоящие),
// прогресс до VIP-входа, источники пополнения.
// ═══════════════════════════════════════════════════════════════════════════

import React, { memo, useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { FlowText } from '../components/text-integrity/FlowText';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { Card, Cta, Sheet } from '../components/tournament/tournament_ui';
import { T, radius, type } from '../components/tournament/tournament_theme';

const VIP_COST = 5;
const TICKET_GEM_PRICE = 20;

type Source = { icon: string; title: string; hint: string; ready?: boolean };

/** Источники билетов — совпадают со спекой §4 (все способы получения). */
const SOURCES: Source[] = [
  { icon: '🎁', title: 'Подарок за уровень', hint: 'каждый новый уровень', ready: true },
  { icon: '🔥', title: 'Серия 7 дней', hint: 'осталось 3 дня' },
  { icon: '🎡', title: 'Награда за друга', hint: 'пригласи — получите оба', ready: true },
  { icon: '🆓', title: 'Бесплатный вход недели', hint: 'обновится в понедельник', ready: true },
];

export default function TournamentTicketsScreen() {
  const insets = useStableSafeAreaInsets();

  // TODO(server): баланс придёт из профиля одним снимком вместе с главной.
  // Типы широкие намеренно: с литералами TS считает сравнения с нулём
  // «недостижимыми» и краевое состояние «билетов нет» выпало бы из проверок.
  const [tickets] = useState<number>(3);
  const [gems] = useState<number>(124);

  const toVip = Math.max(0, VIP_COST - tickets);
  const canBuy = gems >= TICKET_GEM_PRICE;

  const [howToVisible, setHowToVisible] = useState(false);
  const openHowTo = useCallback(() => setHowToVisible(true), []);
  const closeHowTo = useCallback(() => setHowToVisible(false), []);

  const visualTickets = useMemo(
    () => Array.from({ length: Math.min(tickets, 5) }, (_, index) => index),
    [tickets],
  );

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Инвентарь */}
        <Card tone="elev" pad={24}>
          <Text style={styles.kicker}>Ваши билеты</Text>

          <View style={styles.ticketRow}>
            {visualTickets.map((index) => (
              <Animated.View
                key={index}
                entering={ZoomIn.delay(index * 70).springify().damping(14).stiffness(190)}
              >
                <TicketCard />
              </Animated.View>
            ))}
            {tickets === 0 ? <Text style={styles.emptyTickets}>Пока пусто</Text> : null}
          </View>

          {/* зачем: text-integrity — масштабирование шрифта не отключаем; строка
              в карточке-колонке, при крупном шрифте просто переносится. */}
          <FlowText testID="tickets-count" provenance="authored" style={styles.count}>
            У вас {tickets} <Text style={styles.countIcon}>🎟</Text>
          </FlowText>
          <Text style={styles.countHint}>
            {tickets > 0 ? `хватит на ${tickets} ${plural(tickets)}` : 'нужен хотя бы один'}
          </Text>
        </Card>

        {/* VIP-прогресс */}
        <Card tone="gold" pad={18}>
          <View style={styles.vipRow}>
            <Text style={styles.vipIcon}>👑</Text>
            <View style={styles.vipBody}>
              <Text style={styles.vipTitle}>VIP нужно {VIP_COST} 🎟</Text>
              <Text style={styles.vipHint}>
                {toVip > 0 ? `не хватает ${toVip} до воскресенья` : 'вход открыт'}
              </Text>
            </View>
          </View>
        </Card>

        <Cta onPress={openHowTo}>Как получить ещё</Cta>

        {/* зачем: 💎 — запрещённая эмодзи-валюта (правило владельца, тот же
            запрет уже применён в tournament_results.tsx). Cta заворачивает
            children в один <Text>, поэтому картинку-жемчужину сюда не вставить
            без переделки компонента — текстом ссылаемся на «жемчужин», как в
            призовом тексте результатов. */}
        <Cta ghost disabled={!canBuy}>
          Купить 1 🎟 за {TICKET_GEM_PRICE} жемчужин
        </Cta>

        {/* Источники */}
        <View style={styles.sources}>
          {SOURCES.map((source, index) => (
            <Animated.View key={source.title} entering={FadeInDown.delay(index * 50).duration(220)}>
              <SourceRow source={source} />
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      {/* Как получить билеты (макет 37) — шторка вместо отдельного экрана:
          список источников короткий, лишний переход тут только мешает. */}
      <Sheet visible={howToVisible} onClose={closeHowTo}>
        <Text style={styles.sheetTitle}>Как получить билеты</Text>
        <View style={styles.sheetSources}>
          {SOURCES.map((source) => (
            <SourceRow key={source.title} source={source} />
          ))}
        </View>
        <Cta ghost onPress={closeHowTo}>Понятно</Cta>
      </Sheet>
    </View>
  );
}

function plural(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'турнир';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'турнира';
  return 'турниров';
}

/** Билет с «надрезами» по бокам — как настоящий отрывной талон. */
const TicketCard = memo(function TicketCard() {
  return (
    <View style={styles.ticket}>
      <View style={[styles.notch, styles.notchLeft]} />
      <View style={[styles.notch, styles.notchRight]} />
      <Text style={styles.ticketIcon}>🎟</Text>
      <Text style={styles.ticketLabel}>вход</Text>
    </View>
  );
});

const SourceRow = memo(function SourceRow({ source }: { source: Source }) {
  return (
    <View style={styles.source}>
      <View style={styles.sourceInnerLight} pointerEvents="none" />
      <Text style={styles.sourceIcon}>{source.icon}</Text>
      <View style={styles.sourceBody}>
        <Text style={styles.sourceTitle}>{source.title}</Text>
        <Text style={styles.sourceHint}>{source.hint}</Text>
      </View>
      {source.ready ? <Text style={styles.sourceReady}>готово</Text> : null}
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
