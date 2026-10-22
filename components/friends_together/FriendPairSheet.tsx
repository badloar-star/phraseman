/**
 * Шторка друга 2.0 «Вместе» — серия вдвоём, неделя пары, «Позвать», занятия вдвоём, «Дать пять», меню «⋯».
 *
 * зачем (владелец 21.10, макет docs/design/v2-app/friends-full.html#hub «Шторка · Ирина / Марк», «Меню «⋯»», #streak «Серия прервалась»):
 * шторка друга становится входом во все занятия вдвоём. Размеры — 1 в 1 с макетом (`.shh`, `.xcl` 48, `.sb2` 52/r16, `.wk`, `.acts`),
 * каркас — тот же HybridSheetShell, что у FriendTogetherSheet. «Удалить» и «Заблокировать» уехали в «⋯».
 * Старая FriendTogetherSheet остаётся при выключенном флаге «Вместе» — до «Сверки» люди видят прежнюю шторку.
 */
import React, { memo, useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View, type BoxShadowValue } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import HybridSheetShell from '../modal_fx/HybridSheetShell';
import PressableHybrid from '../PressableHybrid';
import { FlowText } from '../text-integrity';
import { useLang } from '../LangContext';
import { FriendsCoin, FriendsRoundButton, useFriendsGlass, type FriendsGlass } from '../friends/FriendsGlassKit';
import { nestedBoxShadow } from '../v2/ShadowSurface';
import { triLang, type Lang } from '../../constants/i18n';
import { buttonForegroundForBackground } from '../../constants/color_contrast';
import { pairBestLabel, pairCopy, pairStreakDaysLabel, weekdayLetters } from '../../app/friends_together/pair_copy';
import type { PairFlameState, PairStreakView, PairWeekDay } from '../../app/friends_together/pair_streak';
import type { FriendCallState } from './FriendCallPill';
import { pairFlameColor } from './PairFlameInline';
import FriendSheetButton from './FriendSheetButton';

export type { FriendCallState } from './FriendCallPill';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/** Занятие вдвоём (плитка `.act`): дуэль, урок вместе, подарок энергии — появляются по мере готовности идей 2, 3, 9. */
export type FriendPairActivity = Readonly<{
  key: string;
  icon: IoniconName;
  title: string;
  sub: string;
  disabled?: boolean;
  onPress: () => void;
}>;

export interface FriendPairSheetProps {
  visible: boolean;
  onClose: () => void;
  onDismissed?: () => void;
  friendName: string;
  coinRank: number | null;
  isPlus: boolean;
  /** «Занималась сегодня в 8:40» / «Был 3 дня назад» — считает экран из профиля друга. */
  statusLine: string;
  pair: PairStreakView | null;
  call: Readonly<{ state: FriendCallState; onCall: () => void }> | null;
  activities: readonly FriendPairActivity[];
  highFived: boolean;
  onHighFive: () => void;
  onOpenCard: () => void;
  onDelete: ((requestDismiss: () => void) => void) | null;
  onBlock: ((requestDismiss: () => void) => void) | null;
}

// зачем (макет): «Позвать» в шторке — только когда звать есть смысл: друг ещё не занимался, никто не занимался, серия прервалась
const CALL_STATES_WITH_BUTTON: ReadonlySet<PairFlameState> = new Set<PairFlameState>(['friend_pending', 'none_today', 'broken']);

/** Цвет `#RRGGBB` с прозрачностью; токен с уже заданной альфой отдаём как есть (не ломаем строку цвета). */
function withAlpha(hex: string, alphaHex: string): string {
  return /^#[0-9A-Fa-f]{6}$/.test(hex) ? `${hex}${alphaHex}` : hex;
}

function flameColor(glass: FriendsGlass, pair: PairStreakView): string {
  // зачем (макет «Серия прервалась»): погасший огонь — приглушённый контур; живой — тот же цвет, что в строке друга
  return pair.state === 'broken' ? glass.mutedText : pairFlameColor(glass, pair.streak);
}

function WeekStrip({ week, glass, letters, textScale }: Readonly<{ week: readonly PairWeekDay[]; glass: FriendsGlass; letters: readonly string[]; textScale: number }>) {
  const checkColor = buttonForegroundForBackground(glass.accentGraphic);
  const todayRing: BoxShadowValue[] = [{ offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 2, color: withAlpha(glass.text, '4D'), inset: true }]; // shadow-ok: кольцо «сегодня» в полосе недели — индикатор дня, как в календаре, не обводка контейнера (макет friends-full.html .wk .d.today)
  return (
    <View style={styles.week} accessible={false} importantForAccessibility="no-hide-descendants">
      {week.map((day, index) => {
        const both = day.mine && day.friend;
        const half = !both && (day.mine || day.friend);
        return (
          <View key={day.dayKey} style={styles.weekCol}>
            <View
              testID={`friend-pair-week-${index}-${both ? 'both' : half ? 'half' : 'none'}${day.today ? '-today' : ''}`}
              style={[styles.weekCell, { backgroundColor: both ? glass.accentGraphic : glass.opaqueControl }, day.today ? { boxShadow: todayRing } : null]}
            >
              {/* `.d.half` макета = color-mix(акцент 24 %, контрол): тот же тон накладкой поверх контрола */}
              {half ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.weekHalf, { backgroundColor: glass.accentGraphic }]} /> : null}
              {both ? <Ionicons name="checkmark" size={16} color={checkColor} accessible={false} /> : null}
            </View>
            <FlowText testID={`friend-pair-week-letter-${index}`} provenance="authored" style={{ color: glass.secondary, fontSize: 12 * textScale, lineHeight: 14 * textScale, fontWeight: '700' }}>
              {letters[index] ?? ''}
            </FlowText>
          </View>
        );
      })}
    </View>
  );
}

function callButtonCopy(lang: Lang, state: FriendCallState, broken: boolean): Readonly<{ label: string; icon: IoniconName }> {
  if (state === 'called') return { label: pairCopy(lang, 'called'), icon: 'checkmark' };
  if (state === 'limit') return { label: pairCopy(lang, 'alreadyCalled'), icon: 'checkmark' };
  if (state === 'quiet') return { label: pairCopy(lang, 'quietHours'), icon: 'moon-outline' };
  if (state === 'queued') return { label: pairCopy(lang, 'queued'), icon: 'time-outline' };
  return { label: pairCopy(lang, broken ? 'callRestart' : 'callToStudy'), icon: 'notifications-outline' };
}

function FriendPairSheet({
  visible,
  onClose,
  onDismissed,
  friendName,
  coinRank,
  isPlus,
  statusLine,
  pair,
  call,
  activities,
  highFived,
  onHighFive,
  onOpenCard,
  onDelete,
  onBlock,
}: FriendPairSheetProps) {
  const { glass, textScale } = useFriendsGlass();
  const { lang } = useLang();
  const [menu, setMenu] = useState(false);
  const closeLabel = triLang(lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' });
  const blockLabel = triLang(lang, { ru: 'Заблокировать', uk: 'Заблокувати', en: 'Block', es: 'Bloquear', 'pt-BR': 'Bloquear', vi: 'Chặn', id: 'Blokir', tr: 'Engelle', pl: 'Zablokuj' });
  const deleteLabel = triLang(lang, { ru: 'Удалить из друзей', uk: 'Видалити з друзів', en: 'Remove from friends', es: 'Eliminar de amigos', 'pt-BR': 'Remover dos amigos', vi: 'Xóa khỏi bạn bè', id: 'Hapus dari teman', tr: 'Arkadaşlardan kaldır', pl: 'Usuń ze znajomych' });
  const showPair = pair !== null && pair.state !== 'none';
  const broken = pair?.state === 'broken';
  const showCall = call !== null && pair !== null && CALL_STATES_WITH_BUTTON.has(pair.state);
  const callCopy = call ? callButtonCopy(lang, call.state, broken) : null;
  // зачем: шторка закрылась — следующий показ снова с главного вида, а не с меню «⋯»
  const handleClose = useCallback(() => { setMenu(false); onClose(); }, [onClose]);
  const handleDismissed = useCallback(() => { setMenu(false); onDismissed?.(); }, [onDismissed]);

  return (
    <HybridSheetShell visible={visible} onClose={handleClose} onDismissed={handleDismissed} closeLabel={closeLabel} backdropAccessible={false} testID="friend-pair-sheet" material="liquid-glass-opaque" glowColor={glass.cta}>
      {({ requestDismiss }) => (
        <>
          <View style={styles.header}>
            <FriendsCoin coinRank={coinRank} name={friendName} size={44} glass={glass} plus={isPlus} />
            <View style={styles.headerText}>
              <FlowText testID="friend-pair-sheet-name" provenance="user" accessibilityRole="header" style={{ color: glass.text, fontSize: 18 * textScale, lineHeight: 23 * textScale, fontWeight: '700' }}>
                {friendName}
              </FlowText>
              {statusLine ? (
                <FlowText testID="friend-pair-sheet-status" provenance="authored" style={{ color: glass.secondary, fontSize: 13 * textScale, lineHeight: 17 * textScale }}>
                  {statusLine}
                </FlowText>
              ) : null}
            </View>
            {!menu ? <FriendsRoundButton glass={glass} icon="ellipsis-horizontal" size={48} label={pairCopy(lang, 'menu')} testID="friend-pair-sheet-menu" onPress={() => setMenu(true)} /> : null}
            <FriendsRoundButton glass={glass} icon="close" size={48} label={closeLabel} testID="friend-pair-sheet-close" onPress={menu ? () => setMenu(false) : requestDismiss} />
          </View>

          {menu ? (
            <View style={styles.menu} testID="friend-pair-sheet-menu-list">
              <FriendSheetButton glass={glass} textScale={textScale} tone="secondary" icon="person-outline" label={pairCopy(lang, 'openCard')} testID="friend-pair-sheet-open-card" onPress={() => { requestDismiss(); onOpenCard(); }} />
              {onDelete ? <FriendSheetButton glass={glass} textScale={textScale} tone="danger" icon="person-remove-outline" label={deleteLabel} testID="friend-pair-sheet-delete" onPress={() => onDelete(requestDismiss)} /> : null}
              {onBlock ? <FriendSheetButton glass={glass} textScale={textScale} tone="bare" label={blockLabel} testID="friend-pair-sheet-block" onPress={() => onBlock(requestDismiss)} /> : null}
            </View>
          ) : (
            <ScrollView decelerationRate="fast" style={styles.scroll} nestedScrollEnabled showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
              {showPair && pair ? (
                <View
                  testID={`friend-pair-sheet-streak-${pair.state}`}
                  accessible
                  accessibilityLabel={`${broken ? pairCopy(lang, 'pairBroken') : `${pair.streak} ${pairStreakDaysLabel(lang, pair.streak)}`}${pair.best > 0 ? `, ${pairBestLabel(lang, pair.best)}` : ''}`}
                  style={styles.streakRow}
                >
                  <Ionicons name={broken ? 'flame-outline' : 'flame'} size={26} color={flameColor(glass, pair)} accessible={false} />
                  <FlowText testID="friend-pair-sheet-streak-value" provenance="authored" style={{ color: glass.text, fontSize: 32 * textScale, lineHeight: 36 * textScale, fontWeight: '700' }}>{broken ? 0 : pair.streak}</FlowText>
                  <FlowText testID="friend-pair-sheet-streak-label" provenance="authored" style={[styles.streakLabel, { color: glass.secondary, fontSize: 14 * textScale, lineHeight: 19 * textScale }]}>
                    {broken ? pairCopy(lang, 'pairBroken') : pairStreakDaysLabel(lang, pair.streak)}
                  </FlowText>
                  {pair.best > 0 ? (
                    <FlowText testID="friend-pair-sheet-best" provenance="authored" style={{ color: glass.secondary, fontSize: 13 * textScale, lineHeight: 17 * textScale }}>{pairBestLabel(lang, pair.best)}</FlowText>
                  ) : null}
                </View>
              ) : null}
              {showPair && pair ? <WeekStrip week={pair.week} glass={glass} letters={weekdayLetters(lang)} textScale={textScale} /> : null}

              {showCall && call && callCopy ? (
                <FriendSheetButton
                  glass={glass}
                  textScale={textScale}
                  tone={call.state === 'idle' ? 'primary' : 'off'}
                  icon={callCopy.icon}
                  label={callCopy.label}
                  testID={`friend-pair-sheet-call-${call.state}`}
                  onPress={call.state === 'idle' ? call.onCall : undefined}
                  style={styles.callGap}
                />
              ) : null}

              {activities.length > 0 ? (
                <View style={styles.tiles}>
                  {activities.map((activity) => (
                    <PressableHybrid
                      key={activity.key}
                      testID={`friend-pair-activity-${activity.key}`}
                      onPress={activity.disabled ? undefined : activity.onPress}
                      disabled={activity.disabled}
                      accessibilityRole="button"
                      accessibilityLabel={`${activity.title}. ${activity.sub}`}
                      accessibilityState={{ disabled: Boolean(activity.disabled) }}
                      variant="secondary"
                      style={styles.tile}
                      contentStyle={[styles.tileContent, { backgroundColor: glass.opaqueControl, boxShadow: nestedBoxShadow(glass), opacity: activity.disabled ? 0.5 : 1 }]}
                    >
                      <Ionicons name={activity.icon} size={24} color={glass.text} accessible={false} />
                      <FlowText testID={`friend-pair-activity-${activity.key}-title`} provenance="authored" style={{ color: glass.text, fontSize: 16 * textScale, lineHeight: 20 * textScale, fontWeight: '700' }}>{activity.title}</FlowText>
                      <FlowText testID={`friend-pair-activity-${activity.key}-sub`} provenance="authored" style={{ color: glass.secondary, fontSize: 13 * textScale, lineHeight: 17 * textScale }}>{activity.sub}</FlowText>
                    </PressableHybrid>
                  ))}
                </View>
              ) : null}

              <FriendSheetButton
                glass={glass}
                textScale={textScale}
                tone={highFived ? 'off' : 'secondary'}
                icon={highFived ? 'checkmark' : 'hand-left-outline'}
                label={pairCopy(lang, highFived ? 'highFived' : 'highFive')}
                testID="friend-pair-sheet-high-five"
                onPress={highFived ? undefined : onHighFive}
                style={styles.highFiveGap}
              />
            </ScrollView>
          )}
        </>
      )}
    </HybridSheetShell>
  );
}

export default memo(FriendPairSheet);

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 2 },
  headerText: { flex: 1, minWidth: 0, gap: 2 },
  scroll: { flexShrink: 1 },
  body: { paddingBottom: 8 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  streakLabel: { flex: 1, minWidth: 0, marginLeft: 4 },
  week: { flexDirection: 'row', gap: 6, marginTop: 12 },
  weekCol: { flex: 1, alignItems: 'center', gap: 6 },
  weekCell: { width: '100%', maxWidth: 40, aspectRatio: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  weekHalf: { opacity: 0.24 },
  callGap: { marginTop: 16 },
  highFiveGap: { marginTop: 12 },
  menu: { marginTop: 16, gap: 10 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  tile: { width: '48%', flexGrow: 1 },
  tileContent: { minHeight: 92, borderRadius: 16, padding: 12, gap: 8, alignItems: 'flex-start', justifyContent: 'flex-start' },
});
