// «Вместе» — карточка друга (bottom sheet), макет 4.2: имя, уровень, связка
// аватаров, одно число «N дней вместе», полоса до следующего уровня с его
// именем, три кнопки (Позвать/Сегодня · Подарок · Дуэль). Никаких списков
// перков и процентов — то же ограничение, что в макете.
// зачем: каркас — ReferralSheetShell (тот же паттерн шторки, что и «Награда за
// друга»), а не HybridAlertShell — это не кульминация-награда, а карточка-обзор.
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import ReferralSheetShell from '../referral_sheet_shell';
import AvatarView from '../AvatarView';
import DuoPressable from '../DuoPressable';
import PressableHybrid from '../PressableHybrid';
import { useTheme } from '../ThemeContext';
import { useLang } from '../LangContext';
import { triLang } from '../../constants/i18n';
import { LEVEL_NAMES } from '../../app/friends_together/together_days';

export interface FriendTogetherSheetProps {
  visible: boolean;
  onClose: () => void;
  friendName: string;
  friendUid: string;
  friendAvatar: string;
  friendTotalXp: number;
  friendAura?: string;
  myAvatar: string;
  myTotalXp: number;
  days: number;
  level: number;
  /** Прогресс 0..100 до следующего уровня; null — уже максимум (Лучшие). */
  progressPercent: number | null;
  nextLevelName: string | null;
  nudged: boolean;
  onNudge: () => void;
  onGift: () => void;
  /** null — маршрута дуэли с другом ещё нет, кнопка скрыта. */
  onDuel: (() => void) | null;
}

function FriendTogetherSheet({
  visible,
  onClose,
  friendName,
  friendAvatar,
  friendTotalXp,
  friendAura,
  myAvatar,
  myTotalXp,
  days,
  level,
  progressPercent,
  nextLevelName,
  nudged,
  onNudge,
  onGift,
  onDuel,
}: FriendTogetherSheetProps) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const L = (ru: string, uk: string, es: string, ptBr: string, vi: string, id: string, tr: string, pl: string) =>
    triLang(lang as any, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });

  const levelName = LEVEL_NAMES[Math.max(1, Math.min(LEVEL_NAMES.length - 1, level))] || '';
  const isGold = level >= 4;

  const nudgeLabel = nudged
    ? L('Сегодня', 'Сьогодні', 'Hoy', 'Hoje', 'Hôm nay', 'Hari ini', 'Bugün', 'Dziś')
    : L('Позвать', 'Покликати', 'Llamar', 'Chamar', 'Gọi', 'Panggil', 'Çağır', 'Zawołaj');
  const giftLabel = L('Подарок', 'Подарунок', 'Regalo', 'Presente', 'Quà tặng', 'Hadiah', 'Hediye', 'Prezent');
  const duelLabel = L('Дуэль', 'Дуель', 'Duelo', 'Duelo', 'Đấu tay đôi', 'Duel', 'Düello', 'Pojedynek');
  const closeLabel = L('Закрыть', 'Закрити', 'Cerrar', 'Fechar', 'Đóng', 'Tutup', 'Kapat', 'Zamknij');
  const daysWord = L('дней вместе', 'днів разом', 'días juntos', 'dias juntos', 'ngày cùng nhau', 'hari bersama', 'gün birlikte', 'dni razem');

  return (
    <ReferralSheetShell
      visible={visible}
      onClose={onClose}
      title={friendName}
      closeLabel={closeLabel}
      testID="friend-together-sheet"
    >
      <View style={styles.body}>
        <View style={styles.pairRow}>
          <AvatarView avatar={myAvatar} totalXP={myTotalXp} size={64} />
          <View style={[styles.link, { backgroundColor: isGold ? t.gold : t.accent }]} />
          <AvatarView avatar={friendAvatar} totalXP={friendTotalXp} size={64} auraId={friendAura} />
        </View>

        <View style={[styles.levelPill, { backgroundColor: isGold ? t.goldBg : t.accentBg, alignSelf: 'center' }]}>
          <Text style={{ color: isGold ? t.gold : t.accent, fontSize: f.sub, fontWeight: '700' }}>{levelName}</Text>
        </View>

        <View style={styles.bigRow}>
          <Text style={{ color: t.textPrimary, fontSize: 34, fontWeight: '700', letterSpacing: -0.4 }}>{days}</Text>
          <Text style={{ color: t.textPrimary, fontSize: f.h3, fontWeight: '700', marginLeft: 8 }}>{daysWord}</Text>
        </View>

        {progressPercent !== null && (
          <View style={styles.progressRow}>
            <View style={[styles.progressTrack, { backgroundColor: t.bgSurface2 }]}>
              <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, progressPercent))}%`, backgroundColor: isGold ? t.gold : t.accent }]} />
            </View>
            {!!nextLevelName && (
              <View style={[styles.levelPill, { backgroundColor: t.bgSurface2 }]}>
                <Text style={{ color: t.textSecond, fontSize: f.sub, fontWeight: '700' }}>{nextLevelName}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.actions}>
          <PressableHybrid
            testID="friend-together-sheet-nudge"
            onPress={onNudge}
            disabled={nudged}
            variant="secondary"
            style={styles.actionBtn}
          >
            <Ionicons name={nudged ? 'checkmark' : 'notifications-outline'} size={18} color={t.accent} />
            <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '700' }}>{nudgeLabel}</Text>
          </PressableHybrid>
          <PressableHybrid
            testID="friend-together-sheet-gift"
            onPress={onGift}
            variant="secondary"
            style={styles.actionBtn}
          >
            <Ionicons name="gift-outline" size={18} color={t.accent} />
            <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '700' }}>{giftLabel}</Text>
          </PressableHybrid>
          {onDuel && (
            <PressableHybrid
              testID="friend-together-sheet-duel"
              onPress={onDuel}
              variant="secondary"
              style={styles.actionBtn}
            >
              <Ionicons name="flash-outline" size={18} color={t.accent} />
              <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '700' }}>{duelLabel}</Text>
            </PressableHybrid>
          )}
        </View>
      </View>
    </ReferralSheetShell>
  );
}

export default memo(FriendTogetherSheet);

const styles = StyleSheet.create({
  body: { paddingBottom: 8, gap: 4 },
  pairRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
  },
  link: {
    width: 54,
    height: 8,
    borderRadius: 4,
  },
  levelPill: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  bigRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginTop: 10,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  progressTrack: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 50,
    paddingHorizontal: 8,
  },
});
