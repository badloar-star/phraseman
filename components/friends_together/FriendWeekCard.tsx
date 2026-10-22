/**
 * Карточка ленты «Итоги недели» (идея 6, docs/design/v2-app/friends-full.html #week, `wcard`) — одна неделя друга.
 *
 * зачем (координатор 22.10, 1:1 с макетом): монета 40, имя и даты; у занимавшегося — серия · занятия · этаж Пика, строка «лучшее за
 * неделю» и «Дать пять» (сразу «Пять отправлено» — решение принимает экран, здесь только вид); у пропустившего — «Без занятий…» и
 * «Позвать». Вся карточка — кнопка: открывает «Неделю · {имя}». Кегли по шкале D145 (16 и 13), цвета — только токены темы.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Lang } from '../../constants/i18n';
import type { FriendWeekCard as FriendWeekCardModel } from '../../app/friends_together/friend_week_rail';
import { lineFloorsUp, weekCopy, weekRangeLabel } from '../../app/friends_together/friend_week_copy';
import { pairCopy } from '../../app/friends_together/pair_copy';
import PressableHybrid from '../PressableHybrid';
import { FlowText } from '../text-integrity';
import { FriendsCoin, type FriendsGlass } from '../friends/FriendsGlassKit';
import { plateBoxShadow } from '../v2/ShadowSurface';
import type { FriendCallState } from './FriendCallPill';
import { pairFlameColor } from './PairFlameInline';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
type PillTone = 'soft' | 'done' | 'off';

export const FRIEND_WEEK_CARD_WIDTH = 236;

function WeekPill({ glass, textScale, tone, icon, label, onPress, testID, accessibilityLabel }: Readonly<{
  glass: FriendsGlass;
  textScale: number;
  tone: PillTone;
  icon: IoniconName;
  label: string;
  onPress?: () => void;
  testID: string;
  accessibilityLabel: string;
}>) {
  // зачем (макет `.pb.soft` / `.pb.done` / `.pb.off`): мягкая — тон контрола, «готово» — мягкий успех темы, выключенная — приглушённая
  const fill = tone === 'done' ? glass.goodSoft : glass.opaqueControl;
  const ink = tone === 'done' ? glass.good : tone === 'off' ? glass.secondary : glass.text;
  return (
    <PressableHybrid
      testID={testID}
      onPress={onPress}
      disabled={!onPress}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !onPress }}
      style={styles.pill}
      contentStyle={[styles.pillContent, { backgroundColor: fill }]}
    >
      <Ionicons name={icon} size={16} color={ink} accessible={false} />
      <FlowText testID={`${testID}-label`} provenance="authored" style={{ flexShrink: 1, color: ink, fontSize: 16 * textScale, lineHeight: 21 * textScale, fontWeight: '700' }}>
        {label}
      </FlowText>
    </PressableHybrid>
  );
}

function Stat({ glass, textScale, icon, color, value }: Readonly<{ glass: FriendsGlass; textScale: number; icon: IoniconName; color: string; value: number }>) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={15} color={color} accessible={false} />
      <FlowText testID={`friend-week-stat-${icon}`} provenance="authored" style={{ color: glass.text, fontSize: 16 * textScale, lineHeight: 21 * textScale, fontWeight: '700' }}>{String(value)}</FlowText>
    </View>
  );
}

function callPill(lang: Lang, state: FriendCallState): Readonly<{ tone: PillTone; icon: IoniconName; label: string }> {
  if (state === 'called') return { tone: 'done', icon: 'checkmark', label: pairCopy(lang, 'called') };
  if (state === 'queued') return { tone: 'done', icon: 'time-outline', label: pairCopy(lang, 'queued') };
  if (state === 'limit') return { tone: 'off', icon: 'checkmark', label: pairCopy(lang, 'alreadyCalled') };
  if (state === 'quiet') return { tone: 'off', icon: 'moon-outline', label: pairCopy(lang, 'quietHours') };
  return { tone: 'soft', icon: 'notifications-outline', label: pairCopy(lang, 'call') };
}

/** Строка «лучшее за неделю»: подъём на Пике → неделя без пропусков → ничего (не выдумываем). */
function bestLine(lang: Lang, card: Extract<FriendWeekCardModel, { kind: 'active' }>): string | null {
  if (card.week.rise !== null && card.week.rise > 0) return lineFloorsUp(lang, card.week.rise);
  if (card.week.days >= 7) return weekCopy(lang, 'noGaps');
  return null;
}

function FriendWeekCard({ glass, textScale, lang, weekKey, card, highFived, callState, onOpen, onHighFive, onCall }: Readonly<{
  glass: FriendsGlass;
  textScale: number;
  lang: Lang;
  /** Понедельник показываемой недели — даты и у карточки «без занятий» (макет: «13–19 октября» у всех карточек). */
  weekKey: string;
  card: FriendWeekCardModel;
  highFived: boolean;
  callState: FriendCallState;
  onOpen: (uid: string) => void;
  onHighFive: (uid: string) => void;
  onCall: (uid: string) => void;
}>) {
  const range = weekRangeLabel(lang, weekKey);
  const rested = card.kind === 'rested';
  const line = card.kind === 'active' ? bestLine(lang, card) : null;
  const call = rested ? callPill(lang, callState) : null;
  return (
    <PressableHybrid
      testID={`friend-week-card-${card.uid}`}
      onPress={() => onOpen(card.uid)}
      disabled={rested}
      accessibilityRole="button"
      accessibilityLabel={range ? `${card.name}, ${range}` : card.name}
      style={styles.cardOuter}
      contentStyle={[styles.card, { backgroundColor: glass.opaqueCard, boxShadow: plateBoxShadow(glass), opacity: rested ? 0.8 : 1 }]}
    >
      <View style={styles.head}>
        <FriendsCoin coinRank={card.coinRank} name={card.name} size={40} glass={glass} plus={card.isPlus} />
        <View style={styles.headText}>
          <FlowText testID="friend-week-card-name" provenance="user" style={{ color: glass.text, fontSize: 16 * textScale, lineHeight: 21 * textScale, fontWeight: '700' }}>{card.name}</FlowText>
          {range ? <FlowText testID="friend-week-card-range" provenance="authored" style={{ color: glass.secondary, fontSize: 13 * textScale, lineHeight: 17 * textScale }}>{range}</FlowText> : null}{/* guard-ok: даты недели под именем — короткая подпись макета #week (исключение 2.0) */}
        </View>
      </View>
      {card.kind === 'active' ? (
        <>
          <View style={styles.stats}>
            <Stat glass={glass} textScale={textScale} icon="flame" color={pairFlameColor(glass, card.week.streak)} value={card.week.streak} />
            <Stat glass={glass} textScale={textScale} icon="book" color={glass.accentGraphic} value={card.week.lessons} />
            {card.week.floor !== null ? <Stat glass={glass} textScale={textScale} icon="podium" color={glass.accentGraphic} value={card.week.floor} /> : null}
          </View>
          {line ? <FlowText testID="friend-week-card-line" provenance="authored" style={{ marginTop: 6, color: glass.secondary, fontSize: 13 * textScale, lineHeight: 18 * textScale }}>{line}</FlowText> : null}{/* guard-ok: строка «лучшее за неделю» макета #week (исключение 2.0) */}
          <View style={styles.grow} />
          <WeekPill
            glass={glass}
            textScale={textScale}
            tone={highFived ? 'done' : 'soft'}
            icon={highFived ? 'checkmark' : 'hand-left-outline'}
            label={pairCopy(lang, highFived ? 'highFived' : 'highFive')}
            onPress={highFived ? undefined : () => onHighFive(card.uid)}
            testID={`friend-week-high-five-${card.uid}`}
            accessibilityLabel={`${pairCopy(lang, highFived ? 'highFived' : 'highFive')}: ${card.name}`}
          />
        </>
      ) : (
        <>
          <FlowText testID="friend-week-card-rested" provenance="authored" style={[styles.restedText, { color: glass.secondary, fontSize: 13 * textScale, lineHeight: 18 * textScale /* guard-ok: текст карточки «без занятий» макета #week (исключение 2.0) */ }]}>
            {weekCopy(lang, 'rested')}
          </FlowText>
          <View style={styles.grow} />
          {call ? (
            <WeekPill
              glass={glass}
              textScale={textScale}
              tone={call.tone}
              icon={call.icon}
              label={call.label}
              onPress={callState === 'idle' ? () => onCall(card.uid) : undefined}
              testID={`friend-week-call-${card.uid}`}
              accessibilityLabel={`${call.label}: ${card.name}`}
            />
          ) : null}
        </>
      )}
    </PressableHybrid>
  );
}

export default memo(FriendWeekCard);

const styles = StyleSheet.create({
  cardOuter: { width: FRIEND_WEEK_CARD_WIDTH, alignSelf: 'stretch' },
  // макет `.cd` 22 и поля 14; тон и тень вместо обводки (стиль «Тень»)
  card: { flex: 1, borderRadius: 22, padding: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headText: { flex: 1, minWidth: 0 },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 12 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  restedText: { marginTop: 12, minHeight: 58 },
  grow: { flexGrow: 1 },
  pill: { alignSelf: 'flex-start', width: 'auto', marginTop: 10 },
  // зачем (text-integrity: текст не обрезаем): 36 по макету — минимум; длинный перевод переносится, пилюля растёт
  pillContent: { width: 'auto', minHeight: 36, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
});
