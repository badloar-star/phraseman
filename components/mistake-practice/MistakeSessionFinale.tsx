import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Reanimated, { useAnimatedProps, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import AnimatedCountUpText from '../AnimatedCountUpText';
import { triLang, type Lang } from '../../constants/i18n';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useTheme } from '../ThemeContext';
import {
  MISTAKE_WEEK_GOAL,
  type MistakeRewardsSnapshot,
  type MistakeTitleId,
} from '../../modules/mistake-practice/rewards_model';

/**
 * Финал сессии ошибок (макет финала А, утверждён владельцем 2026-09-14).
 *
 * Кольцо результата, три награды крупно, исправленные фразы со штампом
 * «Навсегда», серия исправлений, цель недели и новое звание. Всё рисуется из
 * УЖЕ посчитанных локальных данных — экран ничего не ждёт от сервера
 * (Optimistic UI): начисление догоняет фоном.
 */

const RADIUS = 55;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const AnimatedCircle = Reanimated.createAnimatedComponent(Circle);

export type MistakeFinaleFixed = Readonly<{ mistakeId: string; phrase: string; meaning: string | null }>;

type Props = {
  lang: Lang;
  /** Сколько ошибок закрыто из скольких. */
  answered: number;
  total: number;
  perfect: boolean;
  xp: number;
  runes: number;
  /** Ошибки, ушедшие навсегда именно в этой сессии. */
  fixed: readonly MistakeFinaleFixed[];
  rewards: MistakeRewardsSnapshot | null;
  /** Звание, поднятое этой сессией (null — не поднялось). */
  newTitle: MistakeTitleId | null;
  onDone: () => void;
  onMore?: () => void;
};

const copyFor = (lang: Lang) => triLang(lang, {
  ru: { perfect: 'Сессия без единого промаха', done: 'Сессия завершена', of: 'из', xp: 'XP', runes: 'рун', fixedLabel: 'исправлено', forever: 'Навсегда', streak: 'Серия исправлений', days: 'дн.', weekGoal: 'Цель недели', chest: 'За цель — сундук с рунами и полной энергией', newTitle: 'Новое звание', more: 'Ещё', finish: 'Забрать', titles: { attentive: 'Внимательный', proofreader: 'Корректор', editor: 'Редактор', master: 'Мастер' } },
  uk: { perfect: 'Сесія без жодного промаху', done: 'Сесію завершено', of: 'з', xp: 'XP', runes: 'рун', fixedLabel: 'виправлено', forever: 'Назавжди', streak: 'Серія виправлень', days: 'дн.', weekGoal: 'Ціль тижня', chest: 'За ціль — скриня з рунами та повною енергією', newTitle: 'Нове звання', more: 'Ще', finish: 'Забрати', titles: { attentive: 'Уважний', proofreader: 'Коректор', editor: 'Редактор', master: 'Майстер' } },
  en: { perfect: 'A session without a single miss', done: 'Session complete', of: 'of', xp: 'XP', runes: 'runes', fixedLabel: 'fixed', forever: 'For good', streak: 'Fixing streak', days: 'd', weekGoal: 'Weekly goal', chest: 'Reach it for a chest of runes and full energy', newTitle: 'New title', more: 'More', finish: 'Collect', titles: { attentive: 'Attentive', proofreader: 'Proofreader', editor: 'Editor', master: 'Master' } },
  es: { perfect: 'Sesión sin un solo fallo', done: 'Sesión completada', of: 'de', xp: 'XP', runes: 'runas', fixedLabel: 'corregidos', forever: 'Para siempre', streak: 'Racha de correcciones', days: 'd', weekGoal: 'Meta de la semana', chest: 'Al lograrla, un cofre con runas y energía llena', newTitle: 'Nuevo título', more: 'Más', finish: 'Recoger', titles: { attentive: 'Atento', proofreader: 'Corrector', editor: 'Editor', master: 'Maestro' } },
  'pt-BR': { perfect: 'Sessão sem nenhum erro', done: 'Sessão concluída', of: 'de', xp: 'XP', runes: 'runas', fixedLabel: 'corrigidos', forever: 'Para sempre', streak: 'Sequência de correções', days: 'd', weekGoal: 'Meta da semana', chest: 'Ao alcançar, um baú com runas e energia cheia', newTitle: 'Novo título', more: 'Mais', finish: 'Receber', titles: { attentive: 'Atento', proofreader: 'Revisor', editor: 'Editor', master: 'Mestre' } },
  vi: { perfect: 'Buổi học không sai lần nào', done: 'Đã hoàn thành', of: 'trên', xp: 'XP', runes: 'rune', fixedLabel: 'đã sửa', forever: 'Mãi mãi', streak: 'Chuỗi ngày sửa lỗi', days: 'ngày', weekGoal: 'Mục tiêu tuần', chest: 'Đạt được để nhận rương rune và đầy năng lượng', newTitle: 'Danh hiệu mới', more: 'Thêm', finish: 'Nhận', titles: { attentive: 'Chăm chú', proofreader: 'Người soát lỗi', editor: 'Biên tập', master: 'Bậc thầy' } },
  id: { perfect: 'Sesi tanpa satu pun kesalahan', done: 'Sesi selesai', of: 'dari', xp: 'XP', runes: 'rune', fixedLabel: 'diperbaiki', forever: 'Selamanya', streak: 'Rentetan perbaikan', days: 'hr', weekGoal: 'Target minggu ini', chest: 'Capai untuk peti rune dan energi penuh', newTitle: 'Gelar baru', more: 'Lagi', finish: 'Ambil', titles: { attentive: 'Teliti', proofreader: 'Korektor', editor: 'Editor', master: 'Master' } },
  tr: { perfect: 'Tek hatasız bir oturum', done: 'Oturum tamamlandı', of: '/', xp: 'XP', runes: 'rün', fixedLabel: 'düzeltildi', forever: 'Kalıcı', streak: 'Düzeltme serisi', days: 'gün', weekGoal: 'Haftalık hedef', chest: 'Ulaş ve rün sandığı ile tam enerji kazan', newTitle: 'Yeni unvan', more: 'Devam', finish: 'Al', titles: { attentive: 'Dikkatli', proofreader: 'Düzeltmen', editor: 'Editör', master: 'Usta' } },
  pl: { perfect: 'Sesja bez jednej pomyłki', done: 'Sesja zakończona', of: 'z', xp: 'XP', runes: 'run', fixedLabel: 'poprawione', forever: 'Na zawsze', streak: 'Seria poprawek', days: 'dni', weekGoal: 'Cel tygodnia', chest: 'Za cel skrzynia z runami i pełna energia', newTitle: 'Nowy tytuł', more: 'Jeszcze', finish: 'Odbierz', titles: { attentive: 'Uważny', proofreader: 'Korektor', editor: 'Redaktor', master: 'Mistrz' } },
});

function ResultRing({ share, gold, children }: Readonly<{ share: number; gold: boolean; children: React.ReactNode }>) {
  const { theme: t } = useTheme();
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue(reduceMotion ? share : 0);
  useEffect(() => {
    progress.value = reduceMotion ? share : withTiming(share, { duration: 1100 });
  }, [progress, reduceMotion, share]);
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));
  return (
    <View style={styles.ring}>
      <Svg width={156} height={156} viewBox="0 0 132 132" style={styles.ringSvg}>
        <Circle cx={66} cy={66} r={RADIUS} stroke={t.bgSurface2} strokeWidth={11} fill="none" />
        <AnimatedCircle
          cx={66}
          cy={66}
          r={RADIUS}
          stroke={gold ? t.gold : t.accent}
          strokeWidth={11}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          animatedProps={animatedProps}
        />
      </Svg>
      <View style={styles.ringLabel}>{children}</View>
    </View>
  );
}

function MistakeSessionFinale({
  lang, answered, total, perfect, xp, runes, fixed, rewards, newTitle, onDone, onMore,
}: Props) {
  const { theme: t, f } = useTheme();
  const copy = useMemo(() => copyFor(lang), [lang]);
  const share = total > 0 ? Math.min(1, answered / total) : 0;

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <ResultRing share={share} gold={perfect}>
          <AnimatedCountUpText
            value={answered}
            style={[styles.ringNum, { color: t.textPrimary }]}
            accessibilityLabel={`${answered} ${copy.of} ${total}`}
          />
          <Text style={[styles.ringSub, { color: t.textMuted, fontSize: f.sub }]}>{copy.of} {total}</Text>
        </ResultRing>
        <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h3 }]}>
          {perfect ? copy.perfect : copy.done}
        </Text>
      </View>

      <View style={styles.rewardGrid}>
        <View style={[styles.rewardTile, { backgroundColor: t.goldBg }]}>
          <AnimatedCountUpText value={xp} style={[styles.rewardNum, { color: t.gold }]} accessibilityLabel={`${xp} ${copy.xp}`} />
          <Text style={[styles.rewardLabel, { color: t.textMuted, fontSize: f.sub }]}>{copy.xp}</Text>
        </View>
        <View style={[styles.rewardTile, { backgroundColor: t.goldBg }]}>
          <AnimatedCountUpText value={runes} style={[styles.rewardNum, { color: t.gold }]} accessibilityLabel={`${runes} ${copy.runes}`} />
          <Text style={[styles.rewardLabel, { color: t.textMuted, fontSize: f.sub }]}>{copy.runes}</Text>
        </View>
        <View style={[styles.rewardTile, { backgroundColor: t.accentBg }]}>
          <AnimatedCountUpText value={fixed.length} style={[styles.rewardNum, { color: t.accent }]} accessibilityLabel={`${fixed.length} ${copy.fixedLabel}`} />
          <Text style={[styles.rewardLabel, { color: t.textMuted, fontSize: f.sub }]}>{copy.fixedLabel}</Text>
        </View>
      </View>

      {/* Ошибки, ушедшие навсегда именно сейчас — «уезжают» на полку. */}
      {fixed.map((item) => (
        <View key={item.mistakeId} style={[styles.fixedRow, { backgroundColor: t.bgCard }]}>
          <View style={[styles.fixedMark, { backgroundColor: t.goldBg }]}>
            <Ionicons name="star" size={18} color={t.gold} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.fixedPhrase, { color: t.textPrimary, fontSize: f.body }]} numberOfLines={1}>{item.phrase}</Text>
            {item.meaning ? (
              <Text style={[styles.fixedMeaning, { color: t.textMuted, fontSize: f.sub }]} numberOfLines={1}>{item.meaning}</Text>
            ) : null}
          </View>
          <View style={[styles.stamp, { backgroundColor: t.gold }]}>
            <Text style={[styles.stampText, { color: t.textOnGold }]}>{copy.forever}</Text>
          </View>
        </View>
      ))}

      {rewards && rewards.streakDays > 0 ? (
        <View style={[styles.card, { backgroundColor: t.bgCard }]}>
          <View style={styles.cardRow}>
            <View style={[styles.cardMedal, { backgroundColor: t.goldBg }]}>
              <Ionicons name="flame" size={22} color={t.gold} />
            </View>
            <Text style={[styles.cardTitle, { color: t.textPrimary, fontSize: f.body, flex: 1 }]}>{copy.streak}</Text>
            <Text style={[styles.cardNum, { color: t.gold }]}>{rewards.streakDays}<Text style={{ fontSize: f.sub, color: t.textMuted }}> {copy.days}</Text></Text>
          </View>
        </View>
      ) : null}

      {rewards ? (
        <View style={[styles.card, { backgroundColor: t.bgCard }]}>
          <View style={styles.cardRow}>
            <Text style={[styles.cardTitle, { color: t.textPrimary, fontSize: f.body, flex: 1 }]}>{copy.weekGoal}</Text>
            <Text style={[styles.cardNum, { color: t.accent }]}>
              {Math.min(rewards.correctedThisWeek, MISTAKE_WEEK_GOAL)}
              <Text style={{ fontSize: f.sub, color: t.textMuted }}>/{MISTAKE_WEEK_GOAL}</Text>
            </Text>
          </View>
          <View style={[styles.goalTrack, { backgroundColor: t.bgSurface2 }]}>
            <View style={[styles.goalFill, { backgroundColor: t.accent, width: `${Math.min(100, (rewards.correctedThisWeek / MISTAKE_WEEK_GOAL) * 100)}%` }]} />
          </View>
          <Text style={[styles.cardHint, { color: t.textMuted, fontSize: f.sub }]}>{copy.chest}</Text>
        </View>
      ) : null}

      {newTitle ? (
        <View style={[styles.card, { backgroundColor: t.goldBg }]}>
          <View style={styles.cardRow}>
            <View style={[styles.cardMedal, { backgroundColor: t.gold }]}>
              <Ionicons name="ribbon" size={24} color={t.textOnGold} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.cardTitle, { color: t.textPrimary, fontSize: f.body }]}>{copy.newTitle}</Text>
              <Text style={[styles.titleName, { color: t.gold, fontSize: f.bodyLg }]}>{copy.titles[newTitle]}</Text>
            </View>
          </View>
        </View>
      ) : null}

      <View style={styles.actions}>
        {onMore ? (
          <Pressable
            testID="mistake-finale-more"
            accessibilityRole="button"
            onPress={onMore}
            style={({ pressed }) => [styles.secondary, { backgroundColor: t.bgSurface2, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
          >
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>{copy.more}</Text>
          </Pressable>
        ) : null}
        <Pressable
          testID="mistake-finale-done"
          accessibilityRole="button"
          onPress={onDone}
          style={({ pressed }) => [styles.primary, { backgroundColor: t.accent, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
        >
          <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '800' }}>{copy.finish}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40, gap: 12 },
  hero: { alignItems: 'center', gap: 10, paddingVertical: 4 },
  ring: { width: 156, height: 156, alignItems: 'center', justifyContent: 'center' },
  ringSvg: { position: 'absolute', transform: [{ rotate: '-90deg' }] },
  ringLabel: { alignItems: 'center' },
  ringNum: { fontSize: 44, fontWeight: '900', letterSpacing: -1.2, fontVariant: ['tabular-nums'] },
  ringSub: { fontWeight: '700', marginTop: 2 },
  title: { fontWeight: '900', textAlign: 'center', letterSpacing: -0.4 },
  rewardGrid: { flexDirection: 'row', gap: 10 },
  rewardTile: { flex: 1, borderRadius: 20, paddingVertical: 14, alignItems: 'center', gap: 4 },
  rewardNum: { fontSize: 30, fontWeight: '900', letterSpacing: -0.8, fontVariant: ['tabular-nums'] },
  rewardLabel: { fontWeight: '800' },
  fixedRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, padding: 12, minHeight: 68 },
  fixedMark: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  fixedPhrase: { fontWeight: '800' },
  fixedMeaning: { fontWeight: '700', marginTop: 2 },
  stamp: { height: 30, borderRadius: 10, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  stampText: { fontWeight: '900', fontSize: 13 },
  card: { borderRadius: 20, padding: 16, gap: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardMedal: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontWeight: '900' },
  cardNum: { fontSize: 26, fontWeight: '900', letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  cardHint: { fontWeight: '700', lineHeight: 20 },
  titleName: { fontWeight: '900', marginTop: 2 },
  goalTrack: { height: 10, borderRadius: 5, overflow: 'hidden' },
  goalFill: { height: 10, borderRadius: 5 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  secondary: { flex: 1, minHeight: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  primary: { flex: 1, minHeight: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});

export default memo(MistakeSessionFinale);
