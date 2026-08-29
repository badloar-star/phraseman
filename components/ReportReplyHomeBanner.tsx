import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Reanimated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

import {
  readCachedUserNotifications,
  refreshUserNotificationsOnce,
  type UserNotification,
} from '../app/user_notifications';
import { getCanonicalUserId } from '../app/user_id_policy';
import { triLang, type Lang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';

const DISMISSED_KEY_PREFIX = 'report_reply_home_banner_dismissed_v1:';

type Props = {
  active: boolean;
  refreshTick: number;
  onOpen: (notification: UserNotification) => void;
};

async function dismissedIds(owner: string): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(`${DISMISSED_KEY_PREFIX}${encodeURIComponent(owner)}`);
    const rows = raw ? JSON.parse(raw) as unknown : [];
    return new Set(Array.isArray(rows) ? rows.filter((id): id is string => typeof id === 'string').slice(-200) : []);
  } catch {
    return new Set();
  }
}

async function persistDismissed(owner: string, id: string): Promise<void> {
  const ids = await dismissedIds(owner);
  ids.add(id);
  await AsyncStorage.setItem(
    `${DISMISSED_KEY_PREFIX}${encodeURIComponent(owner)}`,
    JSON.stringify([...ids].slice(-200)),
  );
}

function latestUnreadReportReply(list: readonly UserNotification[], dismissed: ReadonlySet<string>): UserNotification | null {
  return list
    .filter((row) => row.type === 'report_reply' && !!row.reportReply && !row.read && !dismissed.has(row.id))
    .sort((left, right) => right.createdAt - left.createdAt)[0] ?? null;
}

function ReportReplyHomeBanner({ active, refreshTick, onOpen }: Props) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const reduceMotion = useReduceMotion();
  const [row, setRow] = useState<UserNotification | null>(null);
  const [owner, setOwner] = useState('');

  useEffect(() => {
    if (!active) return;
    let alive = true;
    void (async () => {
      const currentOwner = String(await getCanonicalUserId().catch(() => '') || '');
      if (!currentOwner || !alive) return;
      setOwner(currentOwner);
      const hidden = await dismissedIds(currentOwner);
      const cached = await readCachedUserNotifications();
      if (alive) setRow(latestUnreadReportReply(cached, hidden));
      const fresh = await refreshUserNotificationsOnce({ force: true });
      if (alive) setRow(latestUnreadReportReply(fresh, hidden));
    })();
    return () => { alive = false; };
  }, [active, refreshTick]);

  const dismiss = useCallback(() => {
    if (!row) return;
    hapticTap();
    const id = row.id;
    setRow(null);
    if (owner) void persistDismissed(owner, id);
  }, [owner, row]);

  const open = useCallback(() => {
    if (!row) return;
    hapticTap();
    const selected = row;
    setRow(null);
    if (owner) void persistDismissed(owner, selected.id);
    onOpen(selected);
  }, [onOpen, owner, row]);

  if (!row) return null;
  const label = triLang(lang as Lang, {
    ru: 'Команда ответила на ваше обращение',
    uk: 'Команда відповіла на ваше звернення',
    en: 'The team replied to your request',
    es: 'El equipo respondió a tu solicitud',
    'pt-BR': 'A equipe respondeu à sua solicitação',
    vi: 'Đội ngũ đã trả lời yêu cầu của bạn',
    id: 'Tim telah membalas laporanmu',
    tr: 'Ekip talebinize yanıt verdi',
    pl: 'Zespół odpowiedział na twoje zgłoszenie',
  });

  return (
    <Reanimated.View
      testID="home-report-reply-banner"
      entering={reduceMotion ? undefined : FadeInDown.duration(420).springify()}
      exiting={reduceMotion ? undefined : FadeOutUp.duration(240)}
      style={{ marginHorizontal: 8, marginBottom: 12, borderRadius: 18, overflow: 'hidden', backgroundColor: t.bgCard }}
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={label}
        activeOpacity={0.84}
        onPress={open}
        style={{ minHeight: 72, paddingLeft: 14, paddingRight: 52, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}
      >
        <View style={{ width: 42, height: 42, borderRadius: 15, backgroundColor: t.correctBg, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="chatbox-ellipses" size={22} color={t.correct} />
        </View>
        <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.body, lineHeight: f.body * 1.35, fontWeight: '800' }}>
          {label}
        </Text>
        <Ionicons name="chevron-forward" size={19} color={t.textMuted} />
      </TouchableOpacity>
      <TouchableOpacity
        testID="home-report-reply-banner-close"
        accessibilityRole="button"
        accessibilityLabel={triLang(lang as Lang, { ru: 'Скрыть', uk: 'Сховати', en: 'Dismiss', es: 'Ocultar', 'pt-BR': 'Ocultar', vi: 'Ẩn', id: 'Tutup', tr: 'Gizle', pl: 'Ukryj' })}
        onPress={dismiss}
        activeOpacity={0.72}
        style={{ position: 'absolute', top: 8, right: 7, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name="close" size={19} color={t.textMuted} />
      </TouchableOpacity>
    </Reanimated.View>
  );
}

export default memo(ReportReplyHomeBanner);
