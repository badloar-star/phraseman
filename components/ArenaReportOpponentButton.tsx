import React, { memo, useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from './ThemeContext';
import { submitArenaOpponentReport } from '../app/user_report';
import { hapticError, hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { triLang, type Lang } from '../constants/i18n';
import { emitAppEvent } from '../app/events';

/**
 * Пожаловаться на ник соперника после боя Арены.
 *
 * зачем: жалоба на игрока жила ТОЛЬКО в карточке профиля, а из Арены карточка
 * не открывается ни одним экраном — увидев оскорбительный ник в бою, человек
 * физически не мог пожаловаться. При этом uid соперника в клиент намеренно не
 * приходит, поэтому обычная ReportUserModal здесь не подходит: сервер находит
 * соперника сам по matchId + месту.
 *
 * Поставлено на экран результата, а не в бой: там таймер и случайный тап стоил
 * бы человеку матча, а после боя имя видно спокойно.
 *
 * Причина одна («оскорбительный ник»), как и в жалобе на игрока, поэтому
 * промежуточный экран выбора не нужен — тап сразу отправляет.
 */

interface Props {
  matchId: string;
  opponentSeat: 'a' | 'b';
  opponentName: string;
  lang: Lang;
  /** Приглушённый цвет экрана-хозяина: кнопка не должна спорить с наградами. */
  tone: string;
}

function ArenaReportOpponentButton({ matchId, opponentSeat, opponentName, lang, tone }: Props) {
  const { theme: t, f } = useTheme();
  const [sent, setSent] = useState(false);
  const busyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const send = async () => {
    // Защита от двойного тапа: поздний ответ не должен «воскрешать» кнопку.
    if (busyRef.current || sent) return;
    busyRef.current = true;
    hapticTap();
    // Оптимистично: подтверждение сразу, сеть догоняет фоном — как в жалобе
    // на игрока (ReportUserModal), чтобы поведение везде совпадало.
    setSent(true);
    hapticSuccess();
    try {
      const result = await submitArenaOpponentReport({ matchId, opponentSeat, opponentName });
      if (result === 'failed') throw new Error('arena_report_failed');
    } catch {
      setSent(false);
      busyRef.current = false;
      hapticError();
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Жалоба не отправилась',
        messageUk: 'Скаргу не надіслано',
        messageEs: 'No se pudo enviar el reporte',
      });
    }
  };

  const label = sent
    ? triLang(lang, {
      ru: 'Жалоба отправлена', uk: 'Скаргу надіслано', en: 'Report sent', es: 'Reporte enviado',
      'pt-BR': 'Denúncia enviada', vi: 'Đã gửi báo cáo', id: 'Laporan terkirim',
      tr: 'Şikayet gönderildi', pl: 'Zgłoszenie wysłane',
    })
    : triLang(lang, {
      ru: 'Пожаловаться на ник', uk: 'Поскаржитись на нік', en: 'Report the nickname', es: 'Reportar el apodo',
      'pt-BR': 'Denunciar o apelido', vi: 'Báo cáo biệt danh', id: 'Laporkan nama',
      tr: 'Takma adı bildir', pl: 'Zgłoś nick',
    });

  return (
    <TouchableOpacity
      testID="arena-report-opponent"
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: sent }}
      disabled={sent}
      onPress={() => void send()}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 }}
    >
      <Ionicons name={sent ? 'checkmark' : 'flag-outline'} size={14} color={sent ? t.correct : tone} />
      <Text style={{ color: sent ? t.correct : tone, fontSize: f.caption, fontWeight: '700' }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default memo(ArenaReportOpponentButton);
