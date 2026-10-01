import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Reanimated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import AnimatedCountUpText from '../AnimatedCountUpText';
import { triLang, type Lang } from '../../constants/i18n';
import { pluralWord } from '../../constants/plural';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useTheme } from '../ThemeContext';
import { useLv2Glass } from '../learning-v2/LearningV2Glass';
import {
  type MistakeRewardsSnapshot,
  type MistakeTitleId,
} from '../../modules/mistake-practice/rewards_model';

/**
 * Финал сессии ошибок (макет финала А, утверждён владельцем 2026-09-14).
 *
 * Кольцо результата, три награды крупно, исправленные фразы со штампом
 * «Навсегда», серия исправлений и новое звание. Всё рисуется из
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
  ru: { perfect: 'Сессия без единого промаха', done: 'Сессия завершена', of: 'из', runes: 'рун', fixedLabel: 'исправлено', forever: 'Навсегда', streak: 'Серия исправлений', days: { one: "день", few: "дня", many: "дней" }, newTitle: 'Новое звание', more: 'Ещё', finish: 'Забрать', titles: { attentive: 'Внимательный', proofreader: 'Корректор', editor: 'Редактор', master: 'Мастер' } },
  uk: { perfect: 'Сесія без жодного промаху', done: 'Сесію завершено', of: 'з', runes: 'рун', fixedLabel: 'виправлено', forever: 'Назавжди', streak: 'Серія виправлень', days: { one: "день", few: "дні", many: "днів" }, newTitle: 'Нове звання', more: 'Ще', finish: 'Забрати', titles: { attentive: 'Уважний', proofreader: 'Коректор', editor: 'Редактор', master: 'Майстер' } },
  en: { perfect: 'A session without a single miss', done: 'Session complete', of: 'of', runes: 'runes', fixedLabel: 'fixed', forever: 'For good', streak: 'Fixing streak', days: { one: "day", few: "days", many: "days" }, newTitle: 'New title', more: 'More', finish: 'Collect', titles: { attentive: 'Attentive', proofreader: 'Proofreader', editor: 'Editor', master: 'Master' } },
  es: { perfect: 'Sesión sin un solo fallo', done: 'Sesión completada', of: 'de', runes: 'monedas', fixedLabel: 'corregidos', forever: 'Para siempre', streak: 'Racha de correcciones', days: { one: "día", few: "días", many: "días" }, newTitle: 'Nuevo título', more: 'Más', finish: 'Recoger', titles: { attentive: 'Atento', proofreader: 'Corrector', editor: 'Editor', master: 'Maestro' } },
  'pt-BR': { perfect: 'Sessão sem nenhum erro', done: 'Sessão concluída', of: 'de', runes: 'monedas', fixedLabel: 'corrigidos', forever: 'Para sempre', streak: 'Sequência de correções', days: { one: "dia", few: "dias", many: "dias" }, newTitle: 'Novo título', more: 'Mais', finish: 'Receber', titles: { attentive: 'Atento', proofreader: 'Revisor', editor: 'Editor', master: 'Mestre' } },
  vi: { perfect: 'Buổi học không sai lần nào', done: 'Đã hoàn thành', of: 'trên', runes: 'rune', fixedLabel: 'đã sửa', forever: 'Mãi mãi', streak: 'Chuỗi ngày sửa lỗi', days: { one: "ngày", few: "ngày", many: "ngày" }, newTitle: 'Danh hiệu mới', more: 'Thêm', finish: 'Nhận', titles: { attentive: 'Chăm chú', proofreader: 'Người soát lỗi', editor: 'Biên tập', master: 'Bậc thầy' } },
  id: { perfect: 'Sesi tanpa satu pun kesalahan', done: 'Sesi selesai', of: 'dari', runes: 'rune', fixedLabel: 'diperbaiki', forever: 'Selamanya', streak: 'Rentetan perbaikan', days: { one: "hari", few: "hari", many: "hari" }, newTitle: 'Gelar baru', more: 'Lagi', finish: 'Ambil', titles: { attentive: 'Teliti', proofreader: 'Korektor', editor: 'Editor', master: 'Master' } },
  tr: { perfect: 'Tek hatasız bir oturum', done: 'Oturum tamamlandı', of: '/', runes: 'rün', fixedLabel: 'düzeltildi', forever: 'Kalıcı', streak: 'Düzeltme serisi', days: { one: "gün", few: "gün", many: "gün" }, newTitle: 'Yeni unvan', more: 'Devam', finish: 'Al', titles: { attentive: 'Dikkatli', proofreader: 'Düzeltmen', editor: 'Editör', master: 'Usta' } },
  pl: { perfect: 'Sesja bez jednej pomyłki', done: 'Sesja zakończona', of: 'z', runes: 'run', fixedLabel: 'poprawione', forever: 'Na zawsze', streak: 'Seria poprawek', days: { one: "dzień", few: "dni", many: "dni" }, newTitle: 'Nowy tytuł', more: 'Jeszcze', finish: 'Odbierz', titles: { attentive: 'Uważny', proofreader: 'Korektor', editor: 'Redaktor', master: 'Mistrz' } },
});

function ResultRing({ share, gold, children }: Readonly<{ share: number; gold: boolean; children: React.ReactNode }>) {
  const g = useLv2Glass();
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
        <Circle cx={66} cy={66} r={RADIUS} stroke={g.opaqueControl} strokeWidth={11} fill="none" />
        <AnimatedCircle
          cx={66}
          cy={66}
          r={RADIUS}
          stroke={gold ? g.text : g.cta}
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
  lang, answered, total, perfect, runes, fixed, rewards, newTitle, onDone, onMore,
}: Props) {
  // зачем (practice.html «Завершение → Работа над ошибками»): финал на токенах Liquid Glass темы; награды/данные прежние.
  const { f } = useTheme();
  const g = useLv2Glass();
  const copy = useMemo(() => copyFor(lang), [lang]);
  const share = total > 0 ? Math.min(1, answered / total) : 0;

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <ResultRing share={share} gold={perfect}>
          <AnimatedCountUpText
            value={answered}
            style={[styles.ringNum, { color: g.text }]}
            accessibilityLabel={`${answered} ${copy.of} ${total}`}
          />
          <Text style={[styles.ringSub, { color: g.secondary, fontSize: f.sub }]}>{copy.of} {total}</Text>
        </ResultRing>
        <Text style={[styles.title, { color: g.text, fontSize: f.h3 }]}>
          {perfect ? copy.perfect : copy.done}
        </Text>
      </View>

      <View style={styles.rewardGrid}>
        <View style={[styles.rewardTile, { backgroundColor: g.opaqueControl }]}>
          <AnimatedCountUpText value={runes} style={[styles.rewardNum, { color: g.text }]} accessibilityLabel={`${runes} ${copy.runes}`} />
          <Text style={[styles.rewardLabel, { color: g.secondary, fontSize: f.sub }]}>{copy.runes}</Text>
        </View>
        <View style={[styles.rewardTile, { backgroundColor: g.opaqueControl }]}>
          <AnimatedCountUpText value={fixed.length} style={[styles.rewardNum, { color: g.text }]} accessibilityLabel={`${fixed.length} ${copy.fixedLabel}`} />
          <Text style={[styles.rewardLabel, { color: g.secondary, fontSize: f.sub }]}>{copy.fixedLabel}</Text>
        </View>
      </View>

      {/* Ошибки, ушедшие навсегда именно сейчас — «уезжают» на полку. */}
      {fixed.map((item) => (
        <View key={item.mistakeId} style={[styles.fixedRow, { backgroundColor: g.opaqueCard }]}>
          <View style={[styles.fixedMark, { backgroundColor: g.opaqueControl }]}>
            <Ionicons name="star" size={18} color={g.text} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.fixedPhrase, { color: g.text, fontSize: f.body }]}>{item.phrase}</Text>
            {item.meaning ? (
              <Text style={[styles.fixedMeaning, { color: g.secondary, fontSize: f.sub }]}>{item.meaning}</Text>
            ) : null}
          </View>
          <View style={[styles.stamp, { backgroundColor: g.accent }]}>
            <Text style={[styles.stampText, { color: g.accentInk }]}>{copy.forever}</Text>
          </View>
        </View>
      ))}

      {rewards && rewards.streakDays > 0 ? (
        <View style={[styles.card, { backgroundColor: g.opaqueCard }]}>
          <View style={styles.cardRow}>
            <View style={[styles.cardMedal, { backgroundColor: g.opaqueControl }]}>
              <Ionicons name="flame" size={22} color={g.text} />
            </View>
            <Text style={[styles.cardTitle, { color: g.text, fontSize: f.body, flex: 1 }]}>{copy.streak}</Text>
            <Text style={[styles.cardNum, { color: g.text }]}>{rewards.streakDays}<Text style={{ fontSize: f.sub, color: g.secondary }}> {pluralWord(lang, rewards.streakDays, copy.days)}</Text></Text>
          </View>
        </View>
      ) : null}

      {newTitle ? (
        <View style={[styles.card, { backgroundColor: g.opaqueControl }]}>
          <View style={styles.cardRow}>
            <View style={[styles.cardMedal, { backgroundColor: g.accent }]}>
              <Ionicons name="ribbon" size={24} color={g.ctaInk} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.cardTitle, { color: g.text, fontSize: f.body }]}>{copy.newTitle}</Text>
              <Text style={[styles.titleName, { color: g.text, fontSize: f.bodyLg }]}>{copy.titles[newTitle]}</Text>
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
            style={({ pressed }) => [styles.secondary, { backgroundColor: g.opaqueControl, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
          >
            <Text style={{ color: g.text, fontSize: f.body, fontWeight: '800' }}>{copy.more}</Text>
          </Pressable>
        ) : null}
        <Pressable
          testID="mistake-finale-done"
          accessibilityRole="button"
          onPress={onDone}
          style={({ pressed }) => [styles.primary, { backgroundColor: g.accent, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
        >
          <Text style={{ color: g.accentInk, fontSize: f.body, fontWeight: '800' }}>{copy.finish}</Text>
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
  fixedRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 18, padding: 12, minHeight: 68 },
  fixedMark: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  fixedPhrase: { fontWeight: '800', flexShrink: 1 },
  fixedMeaning: { fontWeight: '700', marginTop: 2, flexShrink: 1 },
  stamp: { height: 30, borderRadius: 10, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  stampText: { fontWeight: '900', fontSize: 13 },
  card: { borderRadius: 20, padding: 16, gap: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardMedal: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontWeight: '900' },
  cardNum: { fontSize: 26, fontWeight: '900', letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  cardHint: { fontWeight: '700', lineHeight: 20 },
  titleName: { fontWeight: '900', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  secondary: { flex: 1, minHeight: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  primary: { flex: 1, minHeight: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});

export default memo(MistakeSessionFinale);
