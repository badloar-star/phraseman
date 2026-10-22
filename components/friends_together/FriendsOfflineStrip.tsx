/**
 * Полоса «Нет сети · список сохранён в 18:40» над списком друзей (идея 1).
 *
 * зачем (макет docs/design/v2-app/friends-full.html «Нет сети», .offl): без сети вкладка не прячет список и не показывает
 * экран ошибки (правило владельца «экранов-ошибок нигде»), а спокойно говорит, насколько свежий список; «Позвать» в это время
 * уходит в очередь. Янтарь темы (warnSoft — фон, warn — значок), без обводки; текст переносится, не режется.
 */
import React, { memo, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { FlowText } from '../text-integrity';
import { useLang } from '../LangContext';
import { useFriendsGlass } from '../friends/FriendsGlassKit';
import { pairOfflineStrip } from '../../app/friends_together/pair_copy';
import { peekFriendsListSyncedAt, readFriendsListSyncedAt } from '../../app/friends_together/friends_list_sync';

function FriendsOfflineStrip() {
  const { glass, textScale } = useFriendsGlass();
  const { lang } = useLang();
  const peeked = peekFriendsListSyncedAt();
  const [syncedAtMs, setSyncedAtMs] = useState<number | null>(peeked);
  // зачем: время из памяти есть — полоса сразу целиком; нет (холодный старт без сети) — ждём чтение диска (мс), чтобы текст не менялся на глазах
  const [ready, setReady] = useState(peeked !== null);

  useEffect(() => {
    let alive = true;
    if (!ready) {
      readFriendsListSyncedAt()
        .catch((e: unknown) => {
          console.warn(`[FRIENDS-1] offline_strip:synced_at failed → без времени: ${e instanceof Error ? e.message : String(e)}`); // guard-ok: catch называет причину
          return null;
        })
        .then((atMs) => {
          if (!alive) {
            console.log('[FRIENDS-1] offline_strip:skip reason=unmounted'); // guard-ok: ранний выход называет причину
            return;
          }
          console.log(`[FRIENDS-1] offline_strip:synced_at source=disk value=${atMs === null ? 'none' : new Date(atMs).toISOString()}`); // guard-ok: откуда время
          setSyncedAtMs(atMs);
          setReady(true);
        });
    }
    return () => { alive = false; };
  }, [ready]);

  if (!ready) return null;
  const text = pairOfflineStrip(lang, syncedAtMs, Date.now());
  return (
    <View testID="friends-offline-strip" accessible accessibilityLabel={text} accessibilityLiveRegion="polite" style={[styles.strip, { backgroundColor: glass.warnSoft }]}>
      <Ionicons name="cloud-offline-outline" size={18} color={glass.warn} />
      <FlowText testID="friends-offline-strip-text" provenance="authored" style={[styles.text, { color: glass.text, fontSize: 16 * textScale, lineHeight: 21 * textScale }]}>
        {text}
      </FlowText>
    </View>
  );
}

export default memo(FriendsOfflineStrip);

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, marginTop: 10 },
  text: { flex: 1, fontWeight: '600' },
});
