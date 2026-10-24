/**
 * «Урок вместе» (идея 2, макет docs/design/v2-app/friends-full.html «Друг прошёл») — ряд в финале занятия у друга:
 * две монеты внахлёст, «Алекс: занятие вместе», «Награда «вместе» вам обоим» и «+2».
 *
 * зачем (координатор 22.10; закон владельца «монеты выдаёт телефон»): +2 начисляет телефон сразу после засчитывания занятия
 * (lesson_together_claim → lesson_together_moment) — ряд появляется в тот же миг, без сети. Начисления для этого занятия нет —
 * ряда нет (обычное занятие не по приглашению). Только за выключателем «Вместе» (решает HorizonSessionResult).
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { FlowText } from '../text-integrity';
import { useLang } from '../LangContext';
import { FriendsCoin, useFriendsGlass } from '../friends/FriendsGlassKit';
import { plateBoxShadow } from '../v2/ShadowSurface';
import { useIsPlus } from '../plus/use_is_plus';
import { useMyCoinRank } from '../../hooks/use_my_coin_rank';
import { semanticInk } from '../../constants/liquidGlassSemanticInk';
import { finalTogetherSub, finalTogetherTitle } from '../../app/friends_together/lesson_together_finish_copy';
import { peekTogetherCredit, subscribeTogetherCredit, type TogetherCredit } from '../../app/friends_together/lesson_together_moment';
import { getFriendsTogetherSnapshot } from '../../app/friends_together/together_store';

const AVATAR = 36;
const RING = 3;

export default function FinishLessonTogether({ lessonKey }: Readonly<{ lessonKey: string | undefined }>) {
  const { lang } = useLang();
  const { glass, textScale } = useFriendsGlass();
  const myCoinRank = useMyCoinRank();
  const myIsPlus = useIsPlus();
  const [credit, setCredit] = useState<TogetherCredit | null>(() => (lessonKey ? peekTogetherCredit(lessonKey) : null));
  const [myName, setMyName] = useState('');

  useEffect(() => {
    if (!lessonKey) {
      console.log('[FRIENDS-2] finish:together skip reason=no_lesson_key'); // guard-ok: ранний выход называет причину
      return undefined;
    }
    setCredit(peekTogetherCredit(lessonKey));
    return subscribeTogetherCredit((next) => {
      if (next.sessionId !== lessonKey) {
        console.log(`[FRIENDS-2] finish:together skip reason=other_session got=${next.sessionId} mine=${lessonKey}`); // guard-ok: чужое занятие
        return;
      }
      setCredit(next);
    });
  }, [lessonKey]);

  useEffect(() => {
    if (!credit) return;
    let alive = true;
    AsyncStorage.getItem('user_name')
      .then((name) => { if (alive) setMyName(name ?? ''); })
      .catch((e: unknown) => console.warn(`[FRIENDS-2] finish:together user_name read failed → инициал без имени: ${e instanceof Error ? e.message : String(e)}`)); // guard-ok: catch называет причину
    console.log(`[FRIENDS-2] finish:together shown session=${credit.sessionId} coins=${credit.coins}`); // guard-ok: что увидел пользователь
    return () => { alive = false; };
  }, [credit]);

  if (!credit) return null;
  const friendPair = getFriendsTogetherSnapshot()?.pairs[credit.inviterUid];
  const ring = { width: AVATAR + RING * 2, height: AVATAR + RING * 2, borderRadius: (AVATAR + RING * 2) / 2, backgroundColor: glass.opaqueCard };
  return (
    <View
      testID="finish-lesson-together"
      accessible
      accessibilityLabel={`${finalTogetherTitle(lang, credit.inviterName)}. ${finalTogetherSub(lang)}. +${credit.coins}`}
      style={[styles.card, { backgroundColor: glass.opaqueCard, boxShadow: plateBoxShadow(glass) }]}
    >
      <View style={styles.pair} importantForAccessibility="no-hide-descendants">
        <View style={[styles.ring, ring]}>
          <FriendsCoin coinRank={friendPair?.coinRank ?? null} name={credit.inviterName} size={AVATAR} glass={glass} plus={friendPair?.isPlus === true} />
        </View>
        <View style={[styles.ring, ring, styles.ringOverlap]}>
          <FriendsCoin coinRank={myCoinRank} name={myName} size={AVATAR} glass={glass} plus={myIsPlus} />
        </View>
      </View>
      <View style={styles.text}>
        <FlowText testID="finish-lesson-together-title" provenance="authored" style={{ color: glass.text, fontSize: 16 * textScale, lineHeight: 21 * textScale, fontWeight: '700' }}>
          {finalTogetherTitle(lang, credit.inviterName)}
        </FlowText>
        <Text style={{ color: glass.secondary, fontSize: 13 * textScale, lineHeight: 18 * textScale }}>{finalTogetherSub(lang)}</Text>{/* guard-ok: короткая строка макета «Друг прошёл» — исключение PhraseMan 2.0 */}
      </View>
      <View style={[styles.chip, { backgroundColor: glass.goodSoft }]}>
        <Text style={{ color: semanticInk(glass).goodText, fontSize: 13 * textScale, lineHeight: 18 * textScale, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{`+${credit.coins}`}</Text>{/* guard-ok: счётчик награды, не подпись */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  text: { flex: 1, minWidth: 0, gap: 2 },
  pair: { flexDirection: 'row', alignItems: 'center', flexShrink: 0, marginLeft: -RING },
  ring: { alignItems: 'center', justifyContent: 'center' },
  ringOverlap: { marginLeft: -(12 + RING * 2) },
  chip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
});
