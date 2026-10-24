/**
 * «Урок вместе» (идея 2, макет friends-full.html «Сообщения» утром): тихие строки «Ирина: приглашение закончилось в полночь»
 * в центре уведомлений у пригласившего.
 *
 * зачем (координатор 22.10): строка считается на телефоне — свои отправленные приглашения (lesson_invite_client, держим 36 ч
 * после срока) минус те, по которым пришло «друг прошёл» (lesson_together с тем же inviteId); имя — из снимка «Вместе».
 * 0 чтений, без планировщика. Строки только читаются: не отмечаются прочитанными на сервере и не удаляются — сами уходят
 * через 36 ч. Только за выключателем «Вместе» (решает NotificationCenterButton).
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';
import type { Lang } from '../../constants/i18n';
import type { UserNotification } from '../../app/user_notifications';
import { readSentLessonInvites } from '../../app/friends_together/lesson_invite_client';
import { expiredLessonInvites, type ExpiredLessonInvite } from '../../app/friends_together/lesson_invite_expired';
import { bellInviteExpired } from '../../app/friends_together/lesson_together_finish_copy';
import { primeFriendsTogetherSnapshot } from '../../app/friends_together/together_store';

export default function BellLessonInviteExpired({ rows, active }: Readonly<{ rows: readonly UserNotification[]; active: boolean }>) {
  const { lang } = useLang();
  const { theme: t, f } = useTheme();
  const [expired, setExpired] = useState<readonly ExpiredLessonInvite[]>([]);

  useEffect(() => {
    if (!active) return undefined;
    let alive = true;
    void Promise.all([readSentLessonInvites(), primeFriendsTogetherSnapshot()])
      .then(([sent, snapshot]) => {
        if (!alive) return;
        const names: Record<string, string | undefined> = {};
        for (const [uid, pair] of Object.entries(snapshot?.pairs ?? {})) names[uid] = pair?.name;
        const next = expiredLessonInvites(sent, rows, names, Date.now());
        console.log(`[FRIENDS-2] bell:expired sent=${sent.length} shown=${next.length} snapshot=${snapshot ? 'yes' : 'none'}`); // guard-ok: что увидел пользователь
        setExpired(next);
      })
      .catch((e: unknown) => {
        console.warn(`[FRIENDS-2] bell:expired failed → без строк «приглашение закончилось»: ${e instanceof Error ? e.message : String(e)}`); // guard-ok: catch называет причину
      });
    return () => { alive = false; };
  }, [active, rows]);

  if (expired.length === 0) return null;
  return (
    <View testID="bell-lesson-invite-expired" style={styles.stack}>
      {expired.map((item) => (
        <View
          key={item.inviteId}
          testID="bell-lesson-invite-expired-row"
          accessible
          accessibilityLabel={bellInviteExpired(lang as Lang, item.name)}
          style={[styles.row, { backgroundColor: t.bgSurface }]}
        >
          <View style={[styles.icon, { backgroundColor: t.bgCard }]}>
            <Ionicons name="moon-outline" size={18} color={t.textMuted} />
          </View>
          <Text style={[styles.copy, { color: t.textPrimary, fontSize: f.caption, lineHeight: Math.round(f.caption * 1.3) }]}>
            {bellInviteExpired(lang as Lang, item.name)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 8, marginBottom: 8 },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, paddingLeft: 12, paddingRight: 14, paddingVertical: 10 },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0, fontWeight: '700' },
});
