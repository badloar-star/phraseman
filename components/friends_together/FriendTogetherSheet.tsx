import React, { memo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import HybridSheetShell from '../modal_fx/HybridSheetShell';
import AvatarView from '../AvatarView';
import PressableHybrid from '../PressableHybrid';
import { FlowText } from '../text-integrity';
import { useTheme } from '../ThemeContext';
import { useLv2Glass } from '../learning-v2/LearningV2Glass';
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
}

export interface FriendTogetherSheetProps {
  visible: boolean;
  onClose: () => void;
  onDismissed?: () => void;
  friendName: string;
  friendUid: string;
  friendAvatar: string;
  friendAura?: string;
  myAvatar: string;
  streak: number;
  highFived: boolean;
  together: FriendTogetherDisplay | null;
  onNudge: (() => void) | null;
  onHighFive: () => void;
  onDelete: ((requestDismiss: () => void) => void) | null;
  /** Q41 (координатор 01.10): «Заблокировать» — под «Удалить из друзей». */
  onBlock?: ((requestDismiss: () => void) => void) | null;
}

const FRIENDSHIP_LEVELS: readonly Record<Lang, string>[] = [
  { ru: 'Знакомые', uk: 'Знайомі', en: 'Acquaintances', es: 'Conocidos', 'pt-BR': 'Conhecidos', vi: 'Người quen', id: 'Kenalan', tr: 'Tanışıklar', pl: 'Znajomi' },
  { ru: 'Приятели', uk: 'Товариші', en: 'Pals', es: 'Compañeros', 'pt-BR': 'Companheiros', vi: 'Bạn đồng hành', id: 'Rekan', tr: 'Yoldaşlar', pl: 'Kumple' },
  { ru: 'Друзья', uk: 'Друзі', en: 'Friends', es: 'Amigos', 'pt-BR': 'Amigos', vi: 'Bạn bè', id: 'Teman', tr: 'Arkadaşlar', pl: 'Przyjaciele' },
  { ru: 'Близкие', uk: 'Близькі', en: 'Close friends', es: 'Cercanos', 'pt-BR': 'Próximos', vi: 'Thân thiết', id: 'Teman dekat', tr: 'Yakınlar', pl: 'Bliscy' },
  { ru: 'Лучшие', uk: 'Найкращі', en: 'Best friends', es: 'Mejores amigos', 'pt-BR': 'Melhores amigos', vi: 'Bạn thân', id: 'Sahabat', tr: 'En iyi arkadaşlar', pl: 'Najlepsi przyjaciele' },
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
    en: `${days} ${days === 1 ? 'day' : 'days'} together`,
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
  friendAura,
  myAvatar,
  streak,
  highFived,
  together,
  onNudge,
  onHighFive,
  onDelete,
  onBlock = null,
}: FriendTogetherSheetProps) {
  const { f } = useTheme();
  const g = useLv2Glass();
  const { lang } = useLang();
  const L = (ru: string, uk: string, en: string, es: string, ptBr: string, vi: string, id: string, tr: string, pl: string) =>
    triLang(lang, { ru, uk, en, es, 'pt-BR': ptBr, vi, id, tr, pl });
  const isGold = together?.level !== undefined && together.level >= 4;
  const nudgeDisabled = Boolean(together?.nudged || together?.learnedToday);
  const progress = together?.progressPercent === null || together?.progressPercent === undefined
    ? null
    : Math.max(0, Math.min(100, together.progressPercent));
  const closeLabel = L('Закрыть', 'Закрити', 'Close', 'Cerrar', 'Fechar', 'Đóng', 'Tutup', 'Kapat', 'Zamknij');
  const progressLabel = L('Прогресс до следующего уровня', 'Прогрес до наступного рівня', 'Progress to the next level', 'Progreso al siguiente nivel', 'Progresso até o próximo nível', 'Tiến độ đến cấp tiếp theo', 'Progres ke level berikutnya', 'Sonraki seviyeye ilerleme', 'Postęp do następnego poziomu');
  const nudgeLabel = together?.nudged
    ? L('Уже приглашены сегодня', 'Вже запрошені сьогодні', 'Already invited today', 'Ya invitado hoy', 'Já convidado hoje', 'Đã mời hôm nay', 'Sudah diundang hari ini', 'Bugün zaten davet edildi', 'Już zaproszono dziś')
    : together?.learnedToday
      ? L('Ты уже занимался(ась) сегодня', 'Ти вже займався(лась) сьогодні', 'You already studied today', 'Ya estudiaste hoy', 'Você já estudou hoje', 'Bạn đã học hôm nay', 'Kamu sudah belajar hari ini', 'Bugün zaten çalıştın', 'Dziś już się uczyłeś')
      : L('Позвать учиться', 'Покликати вчитися', 'Invite to study', 'Invitar a estudiar', 'Convidar para estudar', 'Mời cùng học', 'Ajak belajar', 'Çalışmaya çağır', 'Zaproś do nauki');
  const highFiveLabel = highFived
    ? L('Дай пять отправлено', 'П’ять відправлено', 'High five sent', 'Choca esos cinco enviado', 'Toca aqui enviado', 'Đập tay đã gửi', 'Tos sudah dikirim', 'Çak gönderildi', 'Piątka wysłana')
    : L('Дать пять', 'Дати п’ять', 'High five', 'Chocar los cinco', 'Toca aqui', 'Đập tay', 'Beri tos', 'Çak', 'Przybij piątkę');
  const blockLabel = L('Заблокировать', 'Заблокувати', 'Block', 'Bloquear', 'Bloquear', 'Chặn', 'Blokir', 'Engelle', 'Zablokuj');
  const deleteLabel = L('Удалить из друзей', 'Видалити з друзів', 'Remove from friends', 'Eliminar de amigos', 'Remover dos amigos', 'Xóa khỏi bạn bè', 'Hapus dari teman', 'Arkadaşlardan kaldır', 'Usuń ze znajomych');
  const incomingLabel = L('Друг зовёт тебя заниматься сегодня.', 'Друг кличе тебе займатися сьогодні.', 'Your friend is inviting you to study today.', 'Tu amistad te invita a estudiar hoy.', 'Seu amigo convida você para estudar hoje.', 'Bạn của bạn mời bạn học hôm nay.', 'Temanmu mengajakmu belajar hari ini.', 'Arkadaşın seni bugün çalışmaya çağırıyor.', 'Twój znajomy zaprasza Cię dziś do nauki.');

  // зачем: недельные очки и место в рейтинге не являются частью Together UI.
  // Осталась только серия дней, одной крупной строкой без контейнера и без подписи
  // мелким шрифтом (оба приёма запрещены правилами владельца).
  const streakLabel = L('Серия дней', 'Серія днів', 'Day streak', 'Racha de días', 'Sequência de dias', 'Chuỗi ngày', 'Rangkaian hari', 'Gün serisi', 'Seria dni');

  return (
    <HybridSheetShell visible={visible} onClose={onClose} onDismissed={onDismissed} closeLabel={closeLabel} backdropAccessible={false} testID="friend-together-sheet" material="liquid-glass-opaque" glowColor={isGold ? g.text : g.cta}>
      {({ requestDismiss }) => (
        <>
          <View style={styles.header}>
            <FlowText testID="friend-together-sheet-title" provenance="user" accessibilityRole="header" style={{ color: g.text, fontSize: f.h3, fontWeight: '700', flex: 1 }}>
              {friendName}
            </FlowText>
            <PressableHybrid testID="friend-together-sheet-close" onPress={requestDismiss} hitSlop={8} accessibilityRole="button" accessibilityLabel={closeLabel} variant="secondary" style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={g.secondary} />
            </PressableHybrid>
          </View>
          <ScrollView decelerationRate="fast" style={styles.scroll} nestedScrollEnabled showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            {together && (
              <View testID="friend-together-sheet-together-hero" style={styles.hero}>
                <View style={styles.pairRow}>
                  <AvatarView avatar={myAvatar} size={64} />
                  <View style={[styles.link, { backgroundColor: isGold ? g.text : g.cta }]} />
                  <AvatarView avatar={friendAvatar} size={64} auraId={friendAura} />
                </View>
                <FlowText testID="friend-together-sheet-level" provenance="authored" style={{ color: isGold ? g.text : g.accentText, fontSize: f.h3, fontWeight: '700', textAlign: 'center' }}>
                  {friendshipLevelName(together.level, lang)}
                </FlowText>
                <FlowText testID="friend-together-sheet-days" provenance="authored" style={{ color: g.text, fontSize: 34, fontWeight: '700', textAlign: 'center' }}>
                  {formatTogetherDays(lang, together.days)}
                </FlowText>
                {progress !== null && (
                  <View testID="friend-together-sheet-progress" accessibilityRole="progressbar" accessibilityLabel={progressLabel} accessibilityValue={{ min: 0, max: 100, now: progress }} style={styles.progressArea}>
                    <View style={[styles.progressTrack, { backgroundColor: g.opaqueControl }]}>
                      <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: isGold ? g.text : g.cta }]} />
                    </View>
                    {together.nextLevelName && (
                      <FlowText testID="friend-together-sheet-next-level" provenance="authored" style={{ color: g.secondary, fontSize: f.sub, fontWeight: '400' }}>
                        {friendshipLevelName(together.level + 1, lang)}
                      </FlowText>
                    )}
                  </View>
                )}
              </View>
            )}

            <View testID="friend-together-sheet-streak" accessibilityLabel={`${streakLabel}: ${streak}`} style={styles.streakRow}>
              <Ionicons name="flame" size={26} color={isGold ? g.text : g.accentText} />
              <FlowText testID="friend-together-sheet-streak-value" provenance="authored" style={{ color: g.text, fontSize: 32, fontWeight: '700' }}>
                {streak}
              </FlowText>
            </View>

            {together?.incomingNudge && <FlowText testID="friend-together-sheet-status-nudge" provenance="authored" accessibilityRole="text" accessibilityLabel={incomingLabel} style={[styles.status, { color: g.text, backgroundColor: g.opaqueControl, fontSize: f.body, fontWeight: '400' }]}>{incomingLabel}</FlowText>}

            <View style={styles.actions}>
              {together && onNudge && <PressableHybrid testID="friend-together-sheet-nudge" onPress={() => onNudge()} disabled={nudgeDisabled} accessibilityLabel={nudgeLabel} variant={nudgeDisabled ? 'secondary' : 'primary'} style={[styles.actionBtn, { backgroundColor: nudgeDisabled ? g.buttonFill : g.cta }]} contentStyle={styles.actionContent}><FlowText testID="friend-together-sheet-nudge-label" provenance="authored" style={{ color: nudgeDisabled ? g.secondary : buttonForegroundForBackground(g.accentText), fontSize: f.body, fontWeight: '700' }}>{nudgeLabel}</FlowText></PressableHybrid>}
              <PressableHybrid testID="friend-together-sheet-high-five" onPress={() => onHighFive()} accessibilityLabel={highFiveLabel} accessibilityState={{ selected: highFived }} variant="secondary" style={[styles.actionBtn, { backgroundColor: g.buttonFill }]} contentStyle={styles.actionContent}><FlowText testID="friend-together-sheet-high-five-label" provenance="authored" style={{ color: g.text, fontSize: f.body, fontWeight: '700' }}>{highFiveLabel}</FlowText></PressableHybrid>
              {onDelete && <PressableHybrid testID="friend-together-sheet-delete" onPress={() => onDelete(requestDismiss)} accessibilityLabel={deleteLabel} variant="secondary" style={[styles.actionBtn, styles.deleteAction, { backgroundColor: g.badFill }]} contentStyle={styles.actionContent}><FlowText testID="friend-together-sheet-delete-label" provenance="authored" style={{ color: g.bad, fontSize: f.body, fontWeight: '700' }}>{deleteLabel}</FlowText></PressableHybrid>}
              {onBlock && <PressableHybrid testID="friend-together-sheet-block" onPress={() => onBlock(requestDismiss)} accessibilityLabel={blockLabel} variant="secondary" style={[styles.actionBtn, styles.deleteAction]} contentStyle={styles.actionContent}><FlowText testID="friend-together-sheet-block-label" provenance="authored" style={{ color: g.bad, fontSize: f.body, fontWeight: '400' }}>{blockLabel}</FlowText></PressableHybrid>}
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
