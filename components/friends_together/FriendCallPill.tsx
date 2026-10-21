/**
 * Кнопка «Позвать» справа в строке друга (`.pb` макета) и её состояния.
 *
 * зачем (владелец 21.10, макет docs/design/v2-app/friends-full.html «Состояния кнопки»): позвать друга можно прямо из списка,
 * без шторки. Ответ виден сразу — «Позвал» до ответа сервера (Optimistic UI), затем «Уже звал» / «Тихие часы» / «В очереди».
 * Решение, какое состояние показать, принимает экран (nudge_client); здесь только вид.
 */
import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import PressableHybrid from '../PressableHybrid';
import { FlowText } from '../text-integrity';
import { useLang } from '../LangContext';
import type { FriendsGlass } from '../friends/FriendsGlassKit';
import { pairCopy } from '../../app/friends_together/pair_copy';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/** Состояние «Позвать»: обычное, «Позвал» (сразу после тапа), лимит на сегодня, тихие часы друга, нет сети (уйдёт при связи). */
export type FriendCallState = 'idle' | 'called' | 'limit' | 'quiet' | 'queued';

type PillLook = Readonly<{ fill: string; ink: string; icon: IoniconName | null; label: string }>;

function pillLook(glass: FriendsGlass, lang: ReturnType<typeof useLang>['lang'], state: FriendCallState): PillLook {
  // зачем (макет): `.pb` — заливка цветом текста, подпись цветом карточки; `.pb.done` — мягкий «успех» темы; `.pb.off` — контрол и вторичный текст
  if (state === 'called') return { fill: glass.goodSoft, ink: glass.good, icon: 'checkmark', label: pairCopy(lang, 'called') };
  if (state === 'queued') return { fill: glass.goodSoft, ink: glass.good, icon: 'time-outline', label: pairCopy(lang, 'queued') };
  if (state === 'limit') return { fill: glass.opaqueControl, ink: glass.secondary, icon: 'checkmark', label: pairCopy(lang, 'alreadyCalled') };
  if (state === 'quiet') return { fill: glass.opaqueControl, ink: glass.secondary, icon: 'moon-outline', label: pairCopy(lang, 'quietHours') };
  return { fill: glass.text, ink: glass.opaqueCard, icon: null, label: pairCopy(lang, 'call') };
}

function FriendCallPill({ glass, textScale, state, friendName, onCall, testID }: Readonly<{
  glass: FriendsGlass;
  textScale: number;
  state: FriendCallState;
  friendName: string;
  onCall: () => void;
  testID?: string;
}>) {
  const { lang } = useLang();
  const look = pillLook(glass, lang, state);
  const idle = state === 'idle';
  return (
    <PressableHybrid
      testID={testID ?? `friend-call-pill-${state}`}
      onPress={idle ? onCall : undefined}
      disabled={!idle}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      accessibilityRole="button"
      accessibilityLabel={idle ? `${look.label}: ${friendName}` : look.label}
      accessibilityState={{ disabled: !idle }}
      variant={idle ? 'primary' : 'secondary'}
      style={styles.pill}
      contentStyle={[styles.pillContent, { backgroundColor: look.fill }]}
    >
      {look.icon ? <Ionicons name={look.icon} size={16} color={look.ink} accessible={false} /> : null}
      <FlowText testID="friend-call-pill-label" provenance="authored" style={{ flexShrink: 1, textAlign: 'center', color: look.ink, fontSize: 15 * textScale, lineHeight: 20 * textScale, fontWeight: '700' }}>
        {look.label}
      </FlowText>
    </PressableHybrid>
  );
}

export default memo(FriendCallPill);

const styles = StyleSheet.create({
  pill: { flexShrink: 0, width: 'auto' },
  // зачем (text-integrity: текст не обрезаем): 36 по макету — минимум; длинный перевод переносится, кнопка растёт, а не режет слово
  pillContent: { width: 'auto', minHeight: 36, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
});
