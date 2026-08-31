/**
 * QuestSheetModal — модал задания: что нужно сделать, какие подарки ждут,
 * сколько осталось времени, и кнопка действия.
 *
 * зачем (владелец, 2026-08-31): человек должен за один взгляд понять задачу и
 * увидеть награду — поэтому подарки показаны крупно и первыми после текста,
 * а не спрятаны в подпись. Кнопка ведёт прямо в нужный раздел («Создать
 * набор» открывает создание набора), чтобы не искать путь самому.
 *
 * Дизайн: тон вместо обводок, скругление 20 — как GlobalBroadcastModal.
 * Оптимистичность: «Забрать» гасит кнопку и меняет состояние сразу, сеть
 * догоняет; отказ откатывает и называет причину.
 */
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { triLang } from '../constants/i18n';
import type { QuestKind, QuestReward, QuestSnapshot } from '../app/quests_client';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import DuoPressable from './DuoPressable';
import { questRewardIcon } from './QuestTaskCard';

export type QuestSheetAction = 'open_target' | 'claim' | 'close';

export type QuestSheetModalProps = Readonly<{
  quest: QuestSnapshot | null;
  visible: boolean;
  busy?: boolean;
  errorRu?: string | null;
  onClose: () => void;
  /** Переход в раздел, где задание выполняется. */
  onOpenTarget: (quest: QuestSnapshot) => void;
  onClaim: (quest: QuestSnapshot) => void;
}>;

/** Название вида награды в правильной форме числа. */
function rewardLabel(reward: QuestReward, lang: Parameters<typeof triLang>[0]): string {
  const n = reward.amount;
  const plural = (one: string, few: string, many: string): string => {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
  };
  switch (reward.kind) {
    case 'pearls':
      return triLang(lang, {
        ru: plural('жемчужина', 'жемчужины', 'жемчужин'), uk: 'перлин', en: 'pearls',
        es: 'perlas', 'pt-BR': 'pérolas', vi: 'ngọc trai', id: 'mutiara', tr: 'inci', pl: 'pereł',
      });
    case 'runes':
      return triLang(lang, {
        ru: plural('руна', 'руны', 'рун'), uk: 'рун', en: 'runes',
        es: 'runas', 'pt-BR': 'runas', vi: 'rune', id: 'rune', tr: 'rün', pl: 'run',
      });
    case 'spins':
      return triLang(lang, {
        ru: plural('спин', 'спина', 'спинов'), uk: 'спінів', en: 'spins',
        es: 'giros', 'pt-BR': 'giros', vi: 'lượt quay', id: 'putaran', tr: 'çevirme', pl: 'losowań',
      });
    case 'plus_days':
      return triLang(lang, {
        ru: plural('день Plus', 'дня Plus', 'дней Plus'), uk: 'днів Plus', en: 'days of Plus',
        es: 'días de Plus', 'pt-BR': 'dias de Plus', vi: 'ngày Plus', id: 'hari Plus', tr: 'gün Plus', pl: 'dni Plus',
      });
    case 'energy_full':
      return triLang(lang, {
        ru: 'полная энергия', uk: 'повна енергія', en: 'full energy',
        es: 'energía completa', 'pt-BR': 'energia cheia', vi: 'đầy năng lượng', id: 'energi penuh', tr: 'tam enerji', pl: 'pełna energia',
      });
    case 'freeze':
      return triLang(lang, {
        ru: plural('заморозка', 'заморозки', 'заморозок'), uk: 'заморожень', en: 'streak freezes',
        es: 'congelaciones', 'pt-BR': 'congelamentos', vi: 'đóng băng', id: 'pembekuan', tr: 'dondurma', pl: 'zamrożeń',
      });
    default:
      return '';
  }
}

/** Надпись на кнопке действия — ведёт туда, где задание выполняется. */
function actionLabel(kind: QuestKind, lang: Parameters<typeof triLang>[0]): string {
  switch (kind) {
    case 'community_pack_submit':
      return triLang(lang, { ru: 'Создать набор', uk: 'Створити набір', en: 'Create a set', es: 'Crear un set', 'pt-BR': 'Criar um conjunto', vi: 'Tạo bộ thẻ', id: 'Buat set', tr: 'Set oluştur', pl: 'Utwórz zestaw' });
    case 'invite_friend':
      return triLang(lang, { ru: 'Пригласить друга', uk: 'Запросити друга', en: 'Invite a friend', es: 'Invitar a un amigo', 'pt-BR': 'Convidar um amigo', vi: 'Mời bạn bè', id: 'Undang teman', tr: 'Arkadaş davet et', pl: 'Zaproś znajomego' });
    case 'spin_wheel':
      return triLang(lang, { ru: 'К колесу', uk: 'До колеса', en: 'To the wheel', es: 'A la ruleta', 'pt-BR': 'Para a roleta', vi: 'Đến vòng quay', id: 'Ke roda', tr: 'Çarka git', pl: 'Do koła' });
    case 'watch_video':
      return triLang(lang, { ru: 'Смотреть видео', uk: 'Дивитися відео', en: 'Watch videos', es: 'Ver vídeos', 'pt-BR': 'Assistir vídeos', vi: 'Xem video', id: 'Tonton video', tr: 'Video izle', pl: 'Oglądaj wideo' });
    case 'arena_matches':
      return triLang(lang, { ru: 'На Арену', uk: 'На Арену', en: 'To the Arena', es: 'A la Arena', 'pt-BR': 'Para a Arena', vi: 'Đến Đấu trường', id: 'Ke Arena', tr: 'Arenaya', pl: 'Na Arenę' });
    case 'flashcards_reviewed':
      return triLang(lang, { ru: 'К карточкам', uk: 'До карток', en: 'To flashcards', es: 'A las tarjetas', 'pt-BR': 'Para os cartões', vi: 'Đến thẻ', id: 'Ke kartu', tr: 'Kartlara', pl: 'Do fiszek' });
    default:
      return triLang(lang, { ru: 'Начать', uk: 'Почати', en: 'Start', es: 'Empezar', 'pt-BR': 'Começar', vi: 'Bắt đầu', id: 'Mulai', tr: 'Başla', pl: 'Zacznij' });
  }
}

/** Остаток времени крупными единицами: «2 дня 4 часа», «46 минут». */
function formatTimeLeft(msLeft: number, lang: Parameters<typeof triLang>[0]): string {
  if (msLeft <= 0) {
    return triLang(lang, { ru: 'Время вышло', uk: 'Час вийшов', en: 'Time is up', es: 'Se acabó el tiempo', 'pt-BR': 'O tempo acabou', vi: 'Hết giờ', id: 'Waktu habis', tr: 'Süre doldu', pl: 'Czas minął' });
  }
  const totalMinutes = Math.floor(msLeft / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const d = triLang(lang, { ru: 'д', uk: 'д', en: 'd', es: 'd', 'pt-BR': 'd', vi: 'n', id: 'h', tr: 'g', pl: 'd' });
  const h = triLang(lang, { ru: 'ч', uk: 'год', en: 'h', es: 'h', 'pt-BR': 'h', vi: 'g', id: 'j', tr: 's', pl: 'godz' });
  const m = triLang(lang, { ru: 'мин', uk: 'хв', en: 'min', es: 'min', 'pt-BR': 'min', vi: 'ph', id: 'mnt', tr: 'dk', pl: 'min' });
  if (days > 0) return `${days}${d} ${hours}${h}`;
  if (hours > 0) return `${hours}${h} ${minutes}${m}`;
  return `${minutes}${m}`;
}

function QuestSheetModal({
  quest, visible, busy = false, errorRu = null, onClose, onOpenTarget, onClaim,
}: QuestSheetModalProps) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const reduceMotion = useReduceMotion();

  const rise = useRef(new Animated.Value(0)).current;
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Таймер тикает только пока модал открыт — фоновых таймеров правило запрещает.
  useEffect(() => {
    if (!visible) return undefined;
    setNowMs(Date.now());
    const timer = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [visible]);

  useEffect(() => {
    if (!visible) { rise.setValue(0); return; }
    if (reduceMotion) { rise.setValue(1); return; }
    Animated.timing(rise, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [reduceMotion, rise, visible]);

  const ready = quest?.phase === 'ready';
  const expired = quest?.phase === 'expired';
  const claimed = quest?.phase === 'claimed';

  const msLeft = quest && quest.expiresAtMs > 0 ? quest.expiresAtMs - nowMs : 0;

  const progressPct = quest && quest.target > 0
    ? Math.min(100, Math.round((quest.progress / quest.target) * 100))
    : 0;

  const unitSuffix = useMemo(() => {
    if (!quest) return '';
    switch (quest.unit) {
      case 'minutes': return triLang(lang, { ru: 'мин', uk: 'хв', en: 'min', es: 'min', 'pt-BR': 'min', vi: 'phút', id: 'mnt', tr: 'dk', pl: 'min' });
      case 'runes': return triLang(lang, { ru: 'рун', uk: 'рун', en: 'runes', es: 'runas', 'pt-BR': 'runas', vi: 'rune', id: 'rune', tr: 'rün', pl: 'run' });
      case 'days': return triLang(lang, { ru: 'дн', uk: 'дн', en: 'd', es: 'd', 'pt-BR': 'd', vi: 'ngày', id: 'hari', tr: 'gün', pl: 'dni' });
      case 'xp': return 'XP';
      default: return '';
    }
  }, [lang, quest]);

  const handleClaim = useCallback(() => {
    if (!quest || busy) return;
    hapticSuccess();
    onClaim(quest);
  }, [busy, onClaim, quest]);

  const handleOpenTarget = useCallback(() => {
    if (!quest || busy) return;
    hapticTap();
    onOpenTarget(quest);
  }, [busy, onOpenTarget, quest]);

  if (!quest) return null;

  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={[styles.root, { paddingBottom: bottomInset }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={triLang(lang, {
            ru: 'Закрыть задание', uk: 'Закрити завдання', en: 'Close quest',
            es: 'Cerrar misión', 'pt-BR': 'Fechar missão', vi: 'Đóng nhiệm vụ',
            id: 'Tutup misi', tr: 'Görevi kapat', pl: 'Zamknij zadanie',
          })}
        />

        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: t.bgCard, opacity: rise, transform: [{ translateY }] },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: t.bgSurface2 }]} />

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.header}>
              <View style={[styles.headerIcon, { backgroundColor: ready ? t.accent : t.bgSurface }]}>
                <Ionicons name={ready ? 'gift' : 'flag'} size={28} color={ready ? t.correctText : t.accent} accessible={false} />
              </View>
              {quest.expiresAtMs > 0 && !claimed ? (
                <View style={[styles.timeChip, { backgroundColor: t.bgSurface }]}>
                  <Ionicons name="time-outline" size={15} color={msLeft <= 3_600_000 ? t.accent : t.textMuted} accessible={false} />
                  <Text style={[styles.timeText, { color: msLeft <= 3_600_000 ? t.accent : t.textMuted, fontSize: f.label }]}>
                    {formatTimeLeft(msLeft, lang)}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text testID="quest-sheet-title" style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>
              {quest.title}
            </Text>
            <Text testID="quest-sheet-body" style={[styles.body, { color: t.textSecond, fontSize: f.body }]}>
              {quest.body}
            </Text>

            {quest.target > 1 && !claimed ? (
              <View style={styles.progressBlock}>
                <View style={styles.progressRow}>
                  <Text style={[styles.progressValue, { color: t.textPrimary, fontSize: f.bodyLg }]}>
                    {`${quest.progress} / ${quest.target}${unitSuffix ? ` ${unitSuffix}` : ''}`}
                  </Text>
                  <Text style={[styles.progressPct, { color: t.textMuted, fontSize: f.label }]}>{`${progressPct}%`}</Text>
                </View>
                <View style={[styles.track, { backgroundColor: t.bgSurface2 }]}>
                  <View style={[styles.fill, { width: `${progressPct}%`, backgroundColor: t.accent }]} />
                </View>
              </View>
            ) : null}

            <Text style={[styles.rewardsHeading, { color: t.textMuted, fontSize: f.label }]}>
              {triLang(lang, {
                ru: 'Что получишь', uk: 'Що отримаєш', en: 'What you get',
                es: 'Lo que recibirás', 'pt-BR': 'O que você recebe', vi: 'Bạn sẽ nhận',
                id: 'Yang kamu dapat', tr: 'Ne kazanacaksın', pl: 'Co otrzymasz',
              })}
            </Text>
            <View style={styles.rewardsRow}>
              {quest.rewards.map((reward, index) => {
                const icon = questRewardIcon(reward.kind, themeMode);
                return (
                  <View
                    key={`${reward.kind}-${index}`}
                    style={[styles.rewardCard, { backgroundColor: t.bgSurface }]}
                    accessible
                    accessibilityLabel={`${reward.amount} ${rewardLabel(reward, lang)}`}
                  >
                    {icon ? (
                      <Image source={icon} style={styles.rewardArt} contentFit="contain" accessible={false} />
                    ) : (
                      <Ionicons name="star" size={34} color={t.accent} accessible={false} />
                    )}
                    <Text style={[styles.rewardAmount, { color: t.textPrimary, fontSize: f.bodyLg }]}>
                      {reward.kind === 'plus_days' ? `${reward.amount}` : `+${reward.amount}`}
                    </Text>
                    <Text style={[styles.rewardName, { color: t.textMuted, fontSize: f.caption }]} numberOfLines={2}>
                      {rewardLabel(reward, lang)}
                    </Text>
                  </View>
                );
              })}
            </View>

            {errorRu ? (
              <View style={[styles.errorBox, { backgroundColor: t.bgSurface }]}>
                <Ionicons name="alert-circle" size={18} color={t.accent} accessible={false} />
                <Text style={[styles.errorText, { color: t.textPrimary, fontSize: f.label }]}>{errorRu}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            {claimed ? (
              <View style={[styles.doneRow, { backgroundColor: t.bgSurface }]}>
                <Ionicons name="checkmark-circle" size={20} color={t.accent} accessible={false} />
                <Text style={[styles.doneText, { color: t.textPrimary, fontSize: f.body }]}>
                  {triLang(lang, {
                    ru: 'Награда получена', uk: 'Нагороду отримано', en: 'Reward claimed',
                    es: 'Recompensa recibida', 'pt-BR': 'Recompensa recebida', vi: 'Đã nhận thưởng',
                    id: 'Hadiah diterima', tr: 'Ödül alındı', pl: 'Nagroda odebrana',
                  })}
                </Text>
              </View>
            ) : expired ? (
              <View style={[styles.doneRow, { backgroundColor: t.bgSurface }]}>
                <Ionicons name="time-outline" size={20} color={t.textMuted} accessible={false} />
                <Text style={[styles.doneText, { color: t.textMuted, fontSize: f.body }]}>
                  {triLang(lang, {
                    ru: 'Срок вышел', uk: 'Термін вийшов', en: 'The deadline passed',
                    es: 'El plazo terminó', 'pt-BR': 'O prazo acabou', vi: 'Đã hết hạn',
                    id: 'Batas waktu lewat', tr: 'Süre doldu', pl: 'Termin minął',
                  })}
                </Text>
              </View>
            ) : (
              <DuoPressable
                testID={ready ? 'quest-claim-button' : 'quest-open-target-button'}
                disabled={busy}
                onPress={ready ? handleClaim : handleOpenTarget}
                edgeColor={t.bgSurface2}
                edgeHeight={4}
                wrapStyle={styles.btnWrap}
                style={[styles.btn, { backgroundColor: t.accent, borderRadius: 14 }]}
              >
                <Text style={{ color: t.correctText, fontWeight: '800', fontSize: f.bodyLg }}>
                  {ready
                    ? triLang(lang, {
                      ru: 'Забрать награду', uk: 'Забрати нагороду', en: 'Claim reward',
                      es: 'Reclamar recompensa', 'pt-BR': 'Resgatar recompensa', vi: 'Nhận thưởng',
                      id: 'Ambil hadiah', tr: 'Ödülü al', pl: 'Odbierz nagrodę',
                    })
                    : actionLabel(quest.kind, lang)}
                </Text>
              </DuoPressable>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.62)' },
  sheet: {
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingTop: 10, paddingHorizontal: 20, paddingBottom: 16,
    maxHeight: '86%',
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 14 },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  headerIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  timeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  timeText: { fontWeight: '800', fontVariant: ['tabular-nums'] /* guard-ok: обратный отсчёт */ },
  title: { fontWeight: '900', lineHeight: 30, marginBottom: 8 },
  body: { lineHeight: 23, marginBottom: 18 },
  progressBlock: { gap: 8, marginBottom: 20 },
  progressRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  progressValue: { fontWeight: '800', fontVariant: ['tabular-nums'] /* guard-ok: счётчик прогресса */ },
  progressPct: { fontWeight: '700', fontVariant: ['tabular-nums'] /* guard-ok: процент */ },
  track: { height: 8, borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  rewardsHeading: { fontWeight: '800', marginBottom: 10 },
  rewardsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  rewardCard: {
    minWidth: 96, flexGrow: 1, flexBasis: 96,
    borderRadius: 18, paddingVertical: 14, paddingHorizontal: 10,
    alignItems: 'center', gap: 4,
  },
  rewardArt: { width: 38, height: 38 },
  rewardAmount: { fontWeight: '900', fontVariant: ['tabular-nums'] /* guard-ok: величина награды */ },
  rewardName: { fontWeight: '600', textAlign: 'center' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, padding: 12, marginTop: 16 },
  errorText: { flex: 1, fontWeight: '700', lineHeight: 19 },
  footer: { paddingTop: 16 },
  btnWrap: { width: '100%' },
  btn: { minHeight: 54, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  doneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 54, borderRadius: 14 },
  doneText: { fontWeight: '800' },
});

export default memo(QuestSheetModal);
