// ═══════════════════════════════════════════════════════════════════════════
// tournament_review.tsx — разбор ответов после турнира.
//
// зачем (владелец 2026-07-27): «после турнира можно смотреть свои ответы,
// ошибки и правильные варианты, чтобы проанализировать» — как было в арене,
// но в дизайне Learning V2.
//
// Устройство: сервер отдаёт разбор только когда турнир окончен и только СВОЙ
// (во время игры это была бы подсказка). Ошибки идут первыми — ради них экран
// и открывают; верные ответы ниже, чтобы можно было перечитать удачные.
//
// Layout stability: карточки фиксированной геометрии, счётчик сверху не
// прыгает — до ответа сервера показываем скелетон нужного размера.
// ═══════════════════════════════════════════════════════════════════════════

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { safeRouterBack } from './navigation_back';
import TapScale from '../components/TapScale';
import {
  radius,
  useTournamentPalette,
  type TournamentV2,
} from '../components/tournament/tournament_theme';
import { V2Card, V2Counter, V2Cta } from '../components/tournament/tournament_v2_ui';
import { StarGlyph } from '../components/tournament/TournamentFx';
import { TournamentAudioButton } from '../components/tournament/TournamentAudioButton';
import { loadRoundReview, type ReviewItem } from './tournament_client';

/** Человеческие названия режимов — те же, что видит владелец в админке. */
const MODE_LABEL: Record<string, string> = {
  guess_phrase: 'Живая ситуация',
  fill_gap: 'Пропущенное слово',
  find_oddity: 'Так не говорят',
  translate_build: 'Собери фразу',
  listen_choose: 'Выбор на слух',
  sound_contrast: 'Пары звуков',
  listen_build: 'Диктант',
  speed_match: 'Пары на скорость',
};

export default function TournamentReviewScreen() {
  const P = useTournamentPalette();
  const styles = useMemo(() => makeStyles(P), [P]);
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const params = useLocalSearchParams<{ roomId?: string }>();
  const roomId = typeof params.roomId === 'string' ? params.roomId : null;

  const [items, setItems] = useState<ReviewItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  const goBack = useCallback(() => safeRouterBack(router, '/(tabs)/tournaments' as any), [router]);

  useEffect(() => {
    if (!roomId) { setFailed(true); return; }
    let alive = true;
    void loadRoundReview(roomId)
      .then((response) => { if (alive) setItems(response?.items ?? []); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [roomId]);

  // Ошибки первыми: ради них экран и открывают. Внутри группы — по порядку игры.
  const ordered = useMemo(() => {
    if (!items) return [];
    const wrong = items.filter((item) => !item.correct);
    const right = items.filter((item) => item.correct);
    return [...wrong, ...right];
  }, [items]);

  const correctCount = items?.filter((item) => item.correct).length ?? 0;
  const total = items?.length ?? 0;
  const mistakes = total - correctCount;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TapScale
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel="Назад"
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color={P.text} />
          </TapScale>
          <Text style={styles.title} allowFontScaling={false}>Разбор</Text>
          <View style={styles.headerRight}>
            <V2Counter value={`${correctCount}/${total || '—'}`} tone="stars" />
          </View>
        </View>

        {failed ? (
          <V2Card pad={22}>
            <Text style={styles.emptyTitle}>Разбор недоступен</Text>
            <Text style={styles.emptyText}>
              Он появляется после окончания турнира и только для его участников.
            </Text>
            <View style={styles.emptyAction}>
              <V2Cta tone="ghost" onPress={goBack}>К турнирам</V2Cta>
            </View>
          </V2Card>
        ) : items === null ? (
          // Скелетон нужного размера: первый кадр совпадает с финальной
          // геометрией, карточки ниже не «прыгают» при загрузке.
          <View style={styles.skeletonList}>
            {[0, 1, 2].map((key) => <View key={key} style={styles.skeletonCard} />)}
          </View>
        ) : total === 0 ? (
          <V2Card pad={22}>
            <Text style={styles.emptyTitle}>Ответов нет</Text>
            <Text style={styles.emptyText}>
              В этом турнире вы не успели ответить ни на один вопрос.
            </Text>
          </V2Card>
        ) : (
          <>
            <View style={styles.summary}>
              <Text style={styles.summaryText}>
                {mistakes === 0
                  ? 'Все ответы верные'
                  : `Ошибок: ${mistakes} — они первыми в списке`}
              </Text>
            </View>
            {ordered.map((item, index) => (
              <Animated.View
                key={`${item.taskId}-${index}`}
                entering={FadeIn.duration(200).delay(Math.min(index, 6) * 40)}
              >
                <ReviewCard item={item} />
              </Animated.View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ── Карточка одного вопроса ─────────────────────────────────────────────────

const ReviewCard = memo(function ReviewCard({ item }: { item: ReviewItem }) {
  const P = useTournamentPalette();
  const styles = useMemo(() => makeStyles(P), [P]);

  const isAudio = item.mode === 'listen_choose'
    || item.mode === 'sound_contrast'
    || item.mode === 'listen_build';
  const isBuild = item.mode === 'translate_build' || item.mode === 'listen_build';

  // Что игрок дал: индекс варианта или собранные слова.
  const givenIndex = typeof item.given === 'number' ? item.given
    : (item.given as { selectedIndex?: number } | null)?.selectedIndex;
  const givenTokens = Array.isArray(item.given)
    ? (item.given as string[])
    : (item.given as { tokens?: string[] } | null)?.tokens;

  return (
    <V2Card pad={18} style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.mode} allowFontScaling={false}>
          {MODE_LABEL[item.mode] || item.mode}
        </Text>
        <View style={[styles.verdict, { backgroundColor: item.correct ? P.accentSoft : P.dangerSoft }]}>
          <Ionicons
            name={item.correct ? 'checkmark' : 'close'}
            size={14}
            color={item.correct ? P.accent : P.danger}
          />
          <Text style={[styles.verdictText, { color: item.correct ? P.accent : P.danger }]}>
            {item.correct ? 'верно' : 'мимо'}
          </Text>
        </View>
      </View>

      {/* В аудио-задании после турнира текст УЖЕ можно показать — игра
          окончена, и разбор без фразы бесполезен. Плюс кнопка переслушать. */}
      {isAudio ? (
        <View style={styles.audioRow}>
          <TournamentAudioButton audioUri={item.audioUri} autoPlay={false} size={56} />
          <Text style={styles.phrase}>{item.phrase}</Text>
        </View>
      ) : (
        <Text style={styles.phrase}>{item.phrase}</Text>
      )}

      {isBuild ? (
        <View style={styles.answers}>
          {givenTokens && givenTokens.length > 0 ? (
            <AnswerRow
              label="Вы собрали"
              value={givenTokens.join(' ')}
              tone={item.correct ? 'ok' : 'bad'}
              styles={styles}
              P={P}
            />
          ) : (
            <AnswerRow label="Вы собрали" value="— не успели" tone="muted" styles={styles} P={P} />
          )}
          {!item.correct && item.correctTokens.length > 0 ? (
            <AnswerRow
              label="Правильно"
              value={item.correctTokens.join(' ')}
              tone="ok"
              styles={styles}
              P={P}
            />
          ) : null}
        </View>
      ) : (
        <View style={styles.answers}>
          {item.options.map((option, index) => {
            const isCorrect = index === item.correctIndex;
            const isGiven = index === givenIndex;
            // Показываем ВСЕ варианты: видно не только верный, но и куда
            // именно увела ловушка — ради этого разбор и открывают.
            const tone = isCorrect ? 'ok' : isGiven ? 'bad' : 'muted';
            return (
              <AnswerRow
                key={`${option}-${index}`}
                label={isGiven ? 'Ваш ответ' : isCorrect ? 'Правильно' : ''}
                value={option}
                tone={tone}
                styles={styles}
                P={P}
              />
            );
          })}
          {givenIndex === undefined || givenIndex === null || givenIndex < 0 ? (
            <Text style={styles.skipped}>Ответа не было — время вышло</Text>
          ) : null}
        </View>
      )}
    </V2Card>
  );
});

const AnswerRow = memo(function AnswerRow({
  label, value, tone, styles, P,
}: {
  label: string;
  value: string;
  tone: 'ok' | 'bad' | 'muted';
  styles: ReturnType<typeof makeStyles>;
  P: TournamentV2;
}) {
  const color = tone === 'ok' ? P.accent : tone === 'bad' ? P.danger : P.muted;
  const background = tone === 'ok' ? P.accentSoft : tone === 'bad' ? P.dangerSoft : 'transparent';
  return (
    <View style={[styles.answerRow, { backgroundColor: background }]}>
      <Text style={[styles.answerValue, { color: tone === 'muted' ? P.muted : P.text }]}>
        {value}
      </Text>
      {label ? (
        <Text style={[styles.answerLabel, { color }]} allowFontScaling={false}>{label}</Text>
      ) : null}
    </View>
  );
});

const makeStyles = (P: TournamentV2) => StyleSheet.create({
  root: { flex: 1, backgroundColor: P.bg },
  content: { paddingHorizontal: 16, gap: 12 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  backButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '900', letterSpacing: -0.3, color: P.text },
  headerRight: { marginLeft: 'auto' },

  summary: { paddingHorizontal: 4, paddingBottom: 2 },
  summaryText: { fontSize: 14, fontWeight: '700', color: P.muted },

  card: { gap: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mode: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: P.ghost,
  },
  verdict: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  verdictText: { fontSize: 12.5, fontWeight: '800' },

  audioRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  phrase: { flex: 1, fontSize: 18, fontWeight: '800', color: P.text, lineHeight: 24 },

  answers: { gap: 6 },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radius.sm + 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  answerValue: { flex: 1, fontSize: 15, fontWeight: '700' },
  answerLabel: { fontSize: 12, fontWeight: '800' },
  skipped: { fontSize: 13, fontWeight: '700', color: P.ghost, paddingHorizontal: 4, paddingTop: 2 },

  skeletonList: { gap: 12 },
  skeletonCard: { height: 168, borderRadius: radius.lg - 2, backgroundColor: P.card, opacity: 0.5 },

  emptyTitle: { fontSize: 19, fontWeight: '900', color: P.text },
  emptyText: { fontSize: 14, fontWeight: '700', color: P.muted, marginTop: 6, lineHeight: 20 },
  emptyAction: { marginTop: 16 },
});
