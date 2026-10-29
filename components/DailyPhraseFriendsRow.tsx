import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { captureAccountGeneration, isCurrentAccountGeneration, subscribeAccountGeneration } from '../app/account_generation';
import { answeredPhraseFriends } from '../app/friends_together/friend_phrase';
import { FRIENDS_TOGETHER_UI_ENABLED, useFriendsTogetherEnabled } from '../app/friends_together/together_config';
import { primeFriendsTogetherSnapshot, type FriendsTogetherSnapshot } from '../app/friends_together/together_store';
import { getLocalDayKey } from '../app/local_date';
import { triLang } from '../constants/i18n';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { FriendsCoin, useFriendsGlass } from './friends/FriendsGlassKit';
import { useLang } from './LangContext';

type Props = Readonly<{ phraseId: string; visible: boolean }>;

/** pdHome из friends-full-d.js: монеты — часть карточки Главной, её нажатие по-прежнему открывает фразу. */
export default function DailyPhraseFriendsRow({ phraseId, visible }: Props) {
  const { lang } = useLang();
  const { glass, textScale } = useFriendsGlass();
  const { enabled } = useFriendsTogetherEnabled();
  const active = useRuntimeActive(visible && FRIENDS_TOGETHER_UI_ENABLED && enabled);
  const [account, setAccount] = useState(captureAccountGeneration);
  const [loaded, setLoaded] = useState<Readonly<{ generation: number; snapshot: FriendsTogetherSnapshot | null }> | null>(null);
  useEffect(() => subscribeAccountGeneration(setAccount).remove, []);
  useEffect(() => {
    if (!active || account.phase !== 'active') return;
    let cancelled = false;
    // Только локальный снимок текущего аккаунта. Никаких дополнительных запросов профилей.
    void primeFriendsTogetherSnapshot().then((snapshot) => {
      if (!cancelled && isCurrentAccountGeneration(account)) setLoaded({ generation: account.generation, snapshot });
    }).catch((error: unknown) => {
      console.warn('[FRIEND-PHRASE] home snapshot unavailable', error instanceof Error ? error.name : typeof error); // guard-ok: без личных данных
    });
    return () => { cancelled = true; };
  }, [account, active, phraseId]);
  const pairs = active && loaded?.generation === account.generation ? loaded.snapshot?.pairs ?? {} : {};
  const friends = answeredPhraseFriends(pairs, getLocalDayKey(), phraseId);
  const label = triLang(lang, {
    ru: 'Уже ответили', uk: 'Вже відповіли', en: 'Already answered', es: 'Ya respondieron',
    // зачем (Переводчик 29.10): ключ должен быть 'pt-BR' — с ключом `pt` triLang не находил перевод, и бразилец видел английский
    'pt-BR': 'Já responderam', vi: 'Đã trả lời', id: 'Sudah menjawab', tr: 'Yanıtlayanlar', pl: 'Już odpowiedzieli',
  });
  if (!FRIENDS_TOGETHER_UI_ENABLED || !enabled) return null;
  return (
    <View testID="daily-phrase-friends" style={{ minHeight: 26, marginTop: 4 }}>
      {friends.length > 0 ? (
        <View accessible accessibilityLabel={`${label}: ${friends.map((friend) => friend.name).join(', ')}`} style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          <View style={{ flexDirection: 'row', gap: 3 }}>
            {friends.slice(0, 3).map((friend) => (
              <FriendsCoin key={friend.uid} name={friend.name} coinRank={friend.coinRank} plus={friend.isPlus} size={20} glass={glass} />
            ))}
          </View>
          <Text style={{ color: glass.secondary, fontSize: 13 * textScale, lineHeight: 18 * textScale, flexShrink: 1 }}>{label}: {friends.length}</Text>
        </View>
      ) : null}
    </View>
  );
}
