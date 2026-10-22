/**
 * Шторка «Неделя · {имя}» (идея 6, docs/design/v2-app/friends-full.html #week, `wDetail`) — тап по карточке ленты «Итоги недели».
 *
 * зачем (координатор 22.10, 1:1 с макетом): монета 72, заголовок, даты; три факта — дней серии, занятий, этаж Пика (с «↑N», если
 * поднялся); «Лучший день»; «Дать пять» (сразу «Пять отправлено» — решает экран) и «Вызвать на дуэль». Данные — уже в снапшоте пар,
 * сеть не нужна. Кегли по шкале D145 (заголовки 25 и 22 — от 19, остальное 16 и 13), цвета — токены темы.
 */
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { triLang, type Lang } from '../../constants/i18n';
import type { FriendWeekSummary } from '../../app/friends_together/friend_week';
import {
  bestDayValue,
  factLessons,
  factStreakDays,
  weekCopy,
  weekDetailTitle,
  weekdayName,
  weekRangeLabel,
} from '../../app/friends_together/friend_week_copy';
import { pairCopy } from '../../app/friends_together/pair_copy';
import HybridSheetShell from '../modal_fx/HybridSheetShell';
import { FlowText } from '../text-integrity';
import { useLang } from '../LangContext';
import { FriendsCoin, useFriendsGlass, type FriendsGlass } from '../friends/FriendsGlassKit';
import FriendSheetButton from './FriendSheetButton';

export interface FriendWeekSheetProps {
  visible: boolean;
  friendName: string;
  friendCoinRank: number | null;
  friendIsPlus: boolean;
  week: FriendWeekSummary;
  highFived: boolean;
  onHighFive: () => void;
  /** «Вызвать на дуэль»: экран готовит вызов, шторка закрывается, вызов открывается после закрытия. */
  onDuel: () => void;
  onClose: () => void;
  onDismissed?: () => void;
}

function Fact({ id, glass, textScale, value, rise, label }: Readonly<{ id: 'streak' | 'lessons' | 'floor'; glass: FriendsGlass; textScale: number; value: string; rise?: number | null; label: string }>) {
  return (
    <View style={[styles.fact, { backgroundColor: glass.opaqueControl }]}>
      <FlowText testID={`friend-week-fact-${id}`} provenance="authored" style={[styles.center, { color: glass.text, fontSize: 22 * textScale, lineHeight: 26 * textScale, fontWeight: '700' }]}>
        {value}
        {rise ? <Text style={{ color: glass.accentTextSafe }}>{` ↑${rise}`}</Text> : null}
      </FlowText>
      <FlowText testID={`friend-week-fact-${id}-label`} provenance="authored" style={[styles.center, { color: glass.secondary, fontSize: 13 * textScale, lineHeight: 17 * textScale }]}>{label}</FlowText>{/* guard-ok: подпись факта под числом — макет #week (исключение 2.0) */}
    </View>
  );
}

function FriendWeekSheet({ visible, friendName, friendCoinRank, friendIsPlus, week, highFived, onHighFive, onDuel, onClose, onDismissed }: FriendWeekSheetProps) {
  const { glass, textScale } = useFriendsGlass();
  const { lang } = useLang();
  const closeLabel = triLang(lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' });
  const l = lang as Lang;
  return (
    <HybridSheetShell visible={visible} onClose={onClose} onDismissed={onDismissed} closeLabel={closeLabel} backdropAccessible={false} testID="friend-week-sheet" material="liquid-glass-opaque" glowColor={glass.cta}>
      {({ requestDismiss }) => (
        <View style={styles.body}>
          <View style={styles.hero}>
            <FriendsCoin coinRank={friendCoinRank} name={friendName} size={72} glass={glass} plus={friendIsPlus} />
          </View>
          <FlowText testID="friend-week-sheet-title" provenance="authored" accessibilityRole="header" style={[styles.center, { marginTop: 14, color: glass.text, fontSize: 25 * textScale, lineHeight: 31 * textScale, fontWeight: '700' }]}>
            {weekDetailTitle(l, friendName)}
          </FlowText>
          <FlowText testID="friend-week-sheet-range" provenance="authored" style={[styles.center, { marginTop: 4, color: glass.secondary, fontSize: 16 * textScale, lineHeight: 22 * textScale }]}>
            {weekRangeLabel(l, week.week)}
          </FlowText>
          <View style={styles.facts}>
            <Fact id="streak" glass={glass} textScale={textScale} value={String(week.streak)} label={factStreakDays(l, week.streak)} />
            <Fact id="lessons" glass={glass} textScale={textScale} value={String(week.lessons)} label={factLessons(l, week.lessons)} />
            <Fact id="floor" glass={glass} textScale={textScale} value={week.floor !== null ? String(week.floor) : '—'} rise={week.rise} label={weekCopy(l, 'factPeakFloor')} />
          </View>
          {week.best ? (
            <View style={[styles.best, { backgroundColor: glass.opaqueControl }]}>
              <FlowText testID="friend-week-sheet-best-label" provenance="authored" style={{ color: glass.secondary, fontSize: 13 * textScale, lineHeight: 17 * textScale, fontWeight: '700' }}>{weekCopy(l, 'bestDay')}</FlowText>{/* guard-ok: заголовок «Лучший день» макета #week (исключение 2.0) */}
              <FlowText testID="friend-week-sheet-best" provenance="authored" style={{ marginTop: 4, color: glass.text, fontSize: 16 * textScale, lineHeight: 21 * textScale, fontWeight: '700' }}>
                {bestDayValue(l, weekdayName(l, week.week, week.best.dow), week.best.lessons)}
              </FlowText>
            </View>
          ) : null}
          <View style={styles.actions}>
            <FriendSheetButton
              glass={glass}
              textScale={textScale}
              tone={highFived ? 'off' : 'primary'}
              icon={highFived ? 'checkmark' : 'hand-left-outline'}
              label={pairCopy(l, highFived ? 'highFived' : 'highFive')}
              testID="friend-week-sheet-high-five"
              onPress={highFived ? undefined : onHighFive}
            />
            <FriendSheetButton
              glass={glass}
              textScale={textScale}
              tone="secondary"
              icon="shield-outline"
              label={weekCopy(l, 'challengeDuel')}
              testID="friend-week-sheet-duel"
              onPress={() => { onDuel(); requestDismiss(); }}
            />
          </View>
        </View>
      )}
    </HybridSheetShell>
  );
}

export default memo(FriendWeekSheet);

const styles = StyleSheet.create({
  body: { paddingBottom: 8 },
  hero: { alignItems: 'center', marginTop: 16 },
  center: { textAlign: 'center' },
  // макет `.facts`: три равные плашки, зазор 10, радиус 16, поля 12/6
  facts: { flexDirection: 'row', gap: 10, marginTop: 16 },
  fact: { flex: 1, minWidth: 0, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 6 },
  best: { marginTop: 12, borderRadius: 22, paddingVertical: 14, paddingHorizontal: 16 },
  actions: { marginTop: 16, gap: 10 },
});
