import React, { memo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import HybridSheetShell from '../modal_fx/HybridSheetShell';
import AvatarView from '../AvatarView';
import PressableHybrid from '../PressableHybrid';
import { FlowText } from '../text-integrity';
import { useTheme } from '../ThemeContext';
import { useLang } from '../LangContext';
import { type Lang, triLang } from '../../constants/i18n';
import { buttonForegroundForBackground } from '../../constants/color_contrast';

export interface FriendTogetherDisplay {
  days: number;
  level: number;
  progressPercent: number | null;
  nextLevelName: string | null;
  nudged: boolean;
  learnedToday: boolean;
  incomingNudge: boolean;
  giftReady: boolean;
}

export interface FriendTogetherSheetProps {
  visible: boolean;
  onClose: () => void;
  onDismissed?: () => void;
  friendName: string;
  friendUid: string;
  friendAvatar: string;
  friendTotalXp: number;
  friendAura?: string;
  myAvatar: string;
  myTotalXp: number;
  streak: number;
  highFived: boolean;
  together: FriendTogetherDisplay | null;
  onNudge: (() => void) | null;
  onGift: (requestDismiss: () => void) => void;
  onHighFive: () => void;
  onDelete: ((requestDismiss: () => void) => void) | null;
}

const FRIENDSHIP_LEVELS: readonly Record<Lang, string>[] = [
  { ru: 'Знакомые', uk: 'Знайомі', es: 'Conocidos', 'pt-BR': 'Conhecidos', vi: 'Người quen', id: 'Kenalan', tr: 'Tanışıklar', pl: 'Znajomi' },
  { ru: 'Приятели', uk: 'Товариші', es: 'Compañeros', 'pt-BR': 'Companheiros', vi: 'Bạn đồng hành', id: 'Rekan', tr: 'Yoldaşlar', pl: 'Kumple' },
  { ru: 'Друзья', uk: 'Друзі', es: 'Amigos', 'pt-BR': 'Amigos', vi: 'Bạn bè', id: 'Teman', tr: 'Arkadaşlar', pl: 'Przyjaciele' },
  { ru: 'Близкие', uk: 'Близькі', es: 'Cercanos', 'pt-BR': 'Próximos', vi: 'Thân thiết', id: 'Teman dekat', tr: 'Yakınlar', pl: 'Bliscy' },
  { ru: 'Лучшие', uk: 'Найкращі', es: 'Mejores amigos', 'pt-BR': 'Melhores amigos', vi: 'Bạn thân', id: 'Sahabat', tr: 'En iyi arkadaşlar', pl: 'Najlepsi przyjaciele' },
];

function slavicDayForm(days: number, one: string, few: string, many: string): string {
  const lastTwo = days % 100;
  const last = days % 10;
  if (last === 1 && lastTwo !== 11) return one;
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return few;
  return many;
}

export function friendshipLevelName(level: number, lang: Lang): string {
  const index = Math.max(0, Math.min(FRIENDSHIP_LEVELS.length - 1, Math.trunc(level) - 1));
  return triLang(lang, FRIENDSHIP_LEVELS[index]);
}

export function formatTogetherDays(lang: Lang, days: number): string {
  return triLang(lang, {
    ru: `${days} ${slavicDayForm(days, 'день', 'дня', 'дней')} вместе`,
    uk: `${days} ${slavicDayForm(days, 'день', 'дні', 'днів')} разом`,
    es: `${days} ${days === 1 ? 'día' : 'días'} juntos`,
    'pt-BR': `${days} ${days === 1 ? 'dia' : 'dias'} juntos`,
    vi: `${days} ngày cùng nhau`,
    id: `${days} hari bersama`,
    tr: `${days} gün birlikte`,
    pl: `${days} ${days === 1 ? 'dzień' : 'dni'} razem`,
  });
}

function FriendTogetherSheet({
  visible,
  onClose,
  onDismissed,
  friendName,
  friendAvatar,
  friendTotalXp,
  friendAura,
  myAvatar,
  myTotalXp,
  streak,
  highFived,
  together,
  onNudge,
  onGift,
  onHighFive,
  onDelete,
}: FriendTogetherSheetProps) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const L = (ru: string, uk: string, es: string, ptBr: string, vi: string, id: string, tr: string, pl: string) =>
    triLang(lang, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });
  const isGold = together?.level !== undefined && together.level >= 4;
  const nudgeDisabled = Boolean(together?.nudged || together?.learnedToday);
  const progress = together?.progressPercent === null || together?.progressPercent === undefined
    ? null
    : Math.max(0, Math.min(100, together.progressPercent));
  const closeLabel = L('Закрыть', 'Закрити', 'Cerrar', 'Fechar', 'Đóng', 'Tutup', 'Kapat', 'Zamknij');
  const progressLabel = L('Прогресс до следующего уровня', 'Прогрес до наступного рівня', 'Progreso al siguiente nivel', 'Progresso até o próximo nível', 'Tiến độ đến cấp tiếp theo', 'Progres ke level berikutnya', 'Sonraki seviyeye ilerleme', 'Postęp do następnego poziomu');
  const nudgeLabel = together?.nudged
    ? L('Уже приглашены сегодня', 'Вже запрошені сьогодні', 'Ya invitado hoy', 'Já convidado hoje', 'Đã mời hôm nay', 'Sudah diundang hari ini', 'Bugün zaten davet edildi', 'Już zaproszono dziś')
    : together?.learnedToday
      ? L('Вы уже занимались сегодня', 'Ви вже займалися сьогодні', 'Ya estudiaste hoy', 'Você já estudou hoje', 'Bạn đã học hôm nay', 'Kamu sudah belajar hari ini', 'Bugün zaten çalıştın', 'Dziś już się uczyłeś')
      : L('Позвать учиться', 'Покликати вчитися', 'Invitar a estudiar', 'Convidar para estudar', 'Mời cùng học', 'Ajak belajar', 'Çalışmaya çağır', 'Zaproś do nauki');
  const giftLabel = L('Отправить подарок', 'Надіслати подарунок', 'Enviar regalo', 'Enviar presente', 'Gửi quà tặng', 'Kirim hadiah', 'Hediye gönder', 'Wyślij prezent');
  const highFiveLabel = highFived
    ? L('Дай пять отправлено', 'П’ять відправлено', 'Choca esos cinco enviado', 'Toca aqui enviado', 'Đập tay đã gửi', 'Tos sudah dikirim', 'Çak gönderildi', 'Piątka wysłana')
    : L('Дать пять', 'Дати п’ять', 'Chocar los cinco', 'Toca aqui', 'Đập tay', 'Beri tos', 'Çak', 'Przybij piątkę');
  const deleteLabel = L('Удалить из друзей', 'Видалити з друзів', 'Eliminar de amigos', 'Remover dos amigos', 'Xóa khỏi bạn bè', 'Hapus dari teman', 'Arkadaşlardan kaldır', 'Usuń ze znajomych');
  const incomingLabel = L('Друг зовёт вас заниматься сегодня.', 'Друг кличе вас займатися сьогодні.', 'Tu amistad te invita a estudiar hoy.', 'Seu amigo convida você para estudar hoje.', 'Bạn của bạn mời bạn học hôm nay.', 'Temanmu mengajakmu belajar hari ini.', 'Arkadaşın seni bugün çalışmaya çağırıyor.', 'Twój znajomy zaprasza Cię dziś do nauki.');

  // зачем: владелец 2026-08-23 — «XP за неделю / место в рейтинге» лишние и некрасивые.
  // Осталась только серия дней, одной крупной строкой без контейнера и без подписи
  // мелким шрифтом (оба приёма запрещены правилами владельца).
  const streakLabel = L('Серия дней', 'Серія днів', 'Racha de días', 'Sequência de dias', 'Chuỗi ngày', 'Rangkaian hari', 'Gün serisi', 'Seria dni');

  return (
    <HybridSheetShell visible={visible} onClose={onClose} onDismissed={onDismissed} closeLabel={closeLabel} backdropAccessible={false} testID="friend-together-sheet" glowColor={isGold ? t.gold : t.accent}>
      {({ requestDismiss }) => (
        <>
          <View style={styles.header}>
            <FlowText testID="friend-together-sheet-title" provenance="user" accessibilityRole="header" style={{ color: t.textPrimary, fontSize: f.h3, fontWeight: '700', flex: 1 }}>
              {friendName}
            </FlowText>
            <PressableHybrid testID="friend-together-sheet-close" onPress={requestDismiss} hitSlop={8} accessibilityRole="button" accessibilityLabel={closeLabel} variant="secondary" style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={t.textMuted} />
            </PressableHybrid>
          </View>
          <ScrollView style={styles.scroll} nestedScrollEnabled showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            {together && (
              <View testID="friend-together-sheet-together-hero" style={styles.hero}>
                <View style={styles.pairRow}>
                  <AvatarView avatar={myAvatar} totalXP={myTotalXp} size={64} />
                  <View style={[styles.link, { backgroundColor: isGold ? t.gold : t.accent }]} />
                  <AvatarView avatar={friendAvatar} totalXP={friendTotalXp} size={64} auraId={friendAura} />
                </View>
                <FlowText testID="friend-together-sheet-level" provenance="authored" style={{ color: isGold ? t.gold : t.accent, fontSize: f.h3, fontWeight: '700', textAlign: 'center' }}>
                  {friendshipLevelName(together.level, lang)}
                </FlowText>
                <FlowText testID="friend-together-sheet-days" provenance="authored" style={{ color: t.textPrimary, fontSize: 34, fontWeight: '700', textAlign: 'center' }}>
                  {formatTogetherDays(lang, together.days)}
                </FlowText>
                {progress !== null && (
                  <View testID="friend-together-sheet-progress" accessibilityRole="progressbar" accessibilityLabel={progressLabel} accessibilityValue={{ min: 0, max: 100, now: progress }} style={styles.progressArea}>
                    <View style={[styles.progressTrack, { backgroundColor: t.bgSurface2 }]}>
                      <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: isGold ? t.gold : t.accent }]} />
                    </View>
                    {together.nextLevelName && (
                      <FlowText testID="friend-together-sheet-next-level" provenance="authored" style={{ color: t.textSecond, fontSize: f.sub, fontWeight: '400' }}>
                        {friendshipLevelName(together.level + 1, lang)}
                      </FlowText>
                    )}
                  </View>
                )}
              </View>
            )}

            <View testID="friend-together-sheet-streak" accessibilityLabel={`${streakLabel}: ${streak}`} style={styles.streakRow}>
              <Ionicons name="flame" size={26} color={isGold ? t.gold : t.accent} />
              <FlowText testID="friend-together-sheet-streak-value" provenance="authored" style={{ color: t.textPrimary, fontSize: 32, fontWeight: '700' }}>
                {streak}
              </FlowText>
            </View>

            {together?.incomingNudge && <FlowText testID="friend-together-sheet-status-nudge" provenance="authored" accessibilityRole="text" accessibilityLabel={incomingLabel} style={[styles.status, { color: t.textPrimary, backgroundColor: t.bgSurface2, fontSize: f.body, fontWeight: '400' }]}>{incomingLabel}</FlowText>}

            <View style={styles.actions}>
              {together && onNudge && <PressableHybrid testID="friend-together-sheet-nudge" onPress={() => onNudge()} disabled={nudgeDisabled} accessibilityLabel={nudgeLabel} variant={nudgeDisabled ? 'secondary' : 'primary'} style={[styles.actionBtn, { backgroundColor: nudgeDisabled ? t.bgSurface2 : t.accent }]} contentStyle={styles.actionContent}><FlowText testID="friend-together-sheet-nudge-label" provenance="authored" style={{ color: nudgeDisabled ? t.textSecond : buttonForegroundForBackground(t.accent), fontSize: f.body, fontWeight: '700' }}>{nudgeLabel}</FlowText></PressableHybrid>}
              <PressableHybrid testID="friend-together-sheet-gift" onPress={() => onGift(requestDismiss)} accessibilityLabel={giftLabel} variant="secondary" style={[styles.actionBtn, { backgroundColor: t.bgSurface2 }]} contentStyle={styles.actionContent}><FlowText testID="friend-together-sheet-gift-label" provenance="authored" style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>{giftLabel}</FlowText></PressableHybrid>
              <PressableHybrid testID="friend-together-sheet-high-five" onPress={() => onHighFive()} accessibilityLabel={highFiveLabel} accessibilityState={{ selected: highFived }} variant="secondary" style={[styles.actionBtn, { backgroundColor: t.bgSurface2 }]} contentStyle={styles.actionContent}><FlowText testID="friend-together-sheet-high-five-label" provenance="authored" style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>{highFiveLabel}</FlowText></PressableHybrid>
              {onDelete && <PressableHybrid testID="friend-together-sheet-delete" onPress={() => onDelete(requestDismiss)} accessibilityLabel={deleteLabel} variant="secondary" style={[styles.actionBtn, styles.deleteAction, { backgroundColor: t.wrongBg }]} contentStyle={styles.actionContent}><FlowText testID="friend-together-sheet-delete-label" provenance="authored" style={{ color: t.wrong, fontSize: f.body, fontWeight: '700' }}>{deleteLabel}</FlowText></PressableHybrid>}
            </View>
          </ScrollView>
        </>
      )}
    </HybridSheetShell>
  );
}

export default memo(FriendTogetherSheet);

const styles = StyleSheet.create({
  header: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginTop: 2, marginBottom: 12 },
  closeBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  scroll: { flexShrink: 1 },
  body: { paddingBottom: 8, gap: 10 },
  hero: { gap: 10, paddingBottom: 6 },
  pairRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 4 },
  link: { width: 54, height: 8, borderRadius: 4 },
  progressArea: { gap: 8, marginTop: 4 },
  progressTrack: { height: 14, borderRadius: 7, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 7 },
  streakRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 6 },
  status: { width: '100%', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14 },
  actions: { flexDirection: 'column', gap: 10, marginTop: 4 },
  actionBtn: { width: '100%', minHeight: 52, paddingHorizontal: 16, borderRadius: 16 },
  actionContent: { minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  deleteAction: { marginTop: 8 },
});
