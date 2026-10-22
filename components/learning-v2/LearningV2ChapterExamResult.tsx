// LearningV2ChapterExamResult.tsx — итог экзамена главы и разбор ошибок (макет chapter-exam-season.html, разделы 4–5).
// зачем (координатор 22.10, шаг 3): после 12-го вопроса — «X из 12», «Экзамен сдан» / «Почти получилось», точки верных; сдал —
// «Глава N+1 открыта» с обложкой и сценой; не сдал — объяснение и пауза на час. Разбор — карточка на каждую ошибку. Награду «+40»
// показываем только после подтверждения сервера (reward ≠ null): «празднуем фактом», владелец 22.10 — 40 монет за первую сдачу.
import React from 'react';
import { Image, PixelRatio, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import V2Pressable from '../v2/V2Pressable';
import { LinearGradient } from '../SafeLinearGradient';
import { useLv2Glass, lv2Alpha } from './LearningV2Glass';
import { lv2TaskTokens } from './learning_v2_task_theme_tokens';
import { learningV2ChapterIonIcon } from './icons/learningV2IonIcons';
import { seasonArtCached, seasonChapterHue } from './season/season_art';
import {
  learningV2ChapterExamFailedBody,
  learningV2ChapterExamResultCopy,
  learningV2ChapterExamReviewSubtitle,
} from './learning_v2_chapter_exam_result_copy';
import { learningV2ChapterSceneV1 } from '../../modules/learning-v2/content/session_titles_v1.generated';
import { CHAPTER_EXAM_QUESTION_COUNT_V1 } from '../../modules/learning-v2/exam/chapter_exam_v1';
import { useMyCoinRank } from '../../hooks/use_my_coin_rank';
import { coinRankSourceForSize } from '../../app/coin_rank_table_v1';

const WRONG_INK = '#B5651D'; // theme-exempt: зачёркнутый неверный ответ в разборе, эталон `.rv .you s` (как в шторке теории)
const WHITE = '#FFFFFF'; // theme-exempt: значок на обложке главы, эталон `.minicard { color: #fff }`

/** Ответ попытки для итога и разбора — живёт только в памяти экрана. */
export type ChapterExamAnswerDetailV1 = Readonly<{
  ordinal: number;
  interactionId: string;
  sessionOrdinal: number;
  correct: boolean;
  /** Название задания («Собери фразу»…) и значок режима — из разбора строки задания (№23). */
  taskName: string;
  taskIcon: React.ComponentProps<typeof Ionicons>['name'];
  situation: string | null;
  answerText: string | null;
  /** Правильный ответ — заполняется после конца экзамена только для ошибочных вопросов (learningV2ChapterExamCorrectAnswerV1). */
  correctAnswer: string | null;
  /** Объяснение из данных задания (авторский разбор ответа); нет — строка не рисуется. */
  explanation: string | null;
}>;

type ResultProps = Readonly<{
  lang: string;
  lessonOrdinal: number;
  chapterOrdinal: number;
  correct: number;
  passed: boolean;
  /** Эпизоды главы, засчитанные экзаменом без прохождения (макет «Эпизоды 13–16 главы 2 тоже открыты»); null — таких нет. */
  openedRange: Readonly<{ first: number; last: number }> | null;
  /** Монеты за первую сдачу — только когда сервер подтвердил начисление; null — плашки нет. */
  reward: number | null;
  answers: readonly ChapterExamAnswerDetailV1[];
  bottomInset: number;
  onToChapter: (chapterOrdinal: number) => void;
  onReview: () => void;
}>;

/** Раздел 4: итог. */
export function LearningV2ChapterExamResultView(p: ResultProps) {
  const g = useLv2Glass();
  const t = lv2TaskTokens(g);
  const mistakes = p.answers.filter((a) => !a.correct).length;
  const next = p.chapterOrdinal < 7 ? p.chapterOrdinal + 1 : null;
  const art = next ? seasonArtCached(seasonChapterHue(p.lessonOrdinal, next), 0, g.isLight ? 'light' : 'dark') : null;
  const scene = next && p.lang === 'ru' ? learningV2ChapterSceneV1(p.lessonOrdinal, next) : null;
  const opened = p.openedRange ? learningV2ChapterExamResultCopy(p.lang, 'openedAlso', { a: p.openedRange.first, b: p.openedRange.last, n: p.chapterOrdinal }) : null;
  const toChapter = p.passed && next ? next : p.chapterOrdinal;
  const coinRank = useMyCoinRank();
  return (
    <>
      <ScrollView style={styles.flex} contentContainerStyle={styles.res}>
        {p.passed ? (
          <View style={[styles.trophy, { backgroundColor: lv2Alpha(g.accent, 0.22) }]}>
            <Ionicons name="trophy" size={42} color={g.accentTextSafe} />
          </View>
        ) : null}
        <Text style={[styles.big, { color: g.text, marginTop: p.passed ? 16 : 20 }]}>{learningV2ChapterExamResultCopy(p.lang, 'score', { x: p.correct })}</Text>
        <Text style={[styles.title, { color: g.text }]}>{learningV2ChapterExamResultCopy(p.lang, p.passed ? 'passedTitle' : 'failedTitle')}</Text>
        <View style={styles.dots} accessibilityElementsHidden>
          {Array.from({ length: CHAPTER_EXAM_QUESTION_COUNT_V1 }, (_, i) => (
            // guard-ok: 12 неподвижных точек, порядок не меняется
            <View key={i} style={[styles.dot, { backgroundColor: i < p.correct ? g.accent : t.controlSoft }]} />
          ))}
        </View>
        {p.passed && p.reward !== null ? (
          <View style={[styles.rew, { backgroundColor: t.controlSoft }]} testID="chapter-exam-reward">
            <Image source={coinRankSourceForSize(coinRank ?? 0, 22, PixelRatio.get()).source} style={styles.coin} />
            <Text style={[styles.rewText, { color: g.text }]}>{`+${p.reward}`}</Text>
          </View>
        ) : null}
        {p.passed && next && art ? (
          <View style={[styles.unl, { backgroundColor: g.opaqueCard, boxShadow: t.taskPlateShadow as never }]}>
            <View style={styles.minicard}>
              <LinearGradient colors={[art.from, art.to]} start={{ x: 0.33, y: 0 }} end={{ x: 0.67, y: 1 }} style={StyleSheet.absoluteFill} />
              <Ionicons name={learningV2ChapterIonIcon(p.lessonOrdinal, next)} size={26} color={WHITE} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.unlTitle, { color: g.text }]}>{learningV2ChapterExamResultCopy(p.lang, 'unlocked', { n: next })}</Text>
              <Text style={[styles.unlSub, { color: g.secondary }]}>{[scene, opened].filter(Boolean).join(". ")}</Text>
            </View>
          </View>
        ) : null}
        {!p.passed ? <Text style={[styles.p, { color: g.secondary }]}>{learningV2ChapterExamFailedBody(p.lang, mistakes)}</Text> : null}
      </ScrollView>
      <View style={[styles.foot, { backgroundColor: t.footerSolid, paddingBottom: 34 + p.bottomInset }]}>
        {p.passed ? (
          <>
            <V2Pressable testID="chapter-exam-to-chapter" onPress={() => p.onToChapter(toChapter)} style={[styles.cta, { backgroundColor: t.ctaFill }]}>
              <Text style={[styles.ctaText, { color: t.ctaInk }]}>{learningV2ChapterExamResultCopy(p.lang, 'toChapter', { n: toChapter })}</Text>
            </V2Pressable>
            {mistakes > 0 ? (
              <V2Pressable testID="chapter-exam-review" onPress={p.onReview} style={[styles.second, { backgroundColor: t.controlSoft }]}>
                <Text style={[styles.ctaText, { color: g.text }]}>{learningV2ChapterExamResultCopy(p.lang, 'reviewOne', { k: mistakes })}</Text>
              </V2Pressable>
            ) : null}
          </>
        ) : (
          <>
            <V2Pressable testID="chapter-exam-review" onPress={p.onReview} style={[styles.cta, { backgroundColor: t.ctaFill }]}>
              <Text style={[styles.ctaText, { color: t.ctaInk }]}>{learningV2ChapterExamResultCopy(p.lang, 'review')}</Text>
            </V2Pressable>
            <V2Pressable testID="chapter-exam-to-chapter" onPress={() => p.onToChapter(toChapter)} style={[styles.second, { backgroundColor: t.controlSoft }]}>
              <Text style={[styles.ctaText, { color: g.text }]}>{learningV2ChapterExamResultCopy(p.lang, 'toChapter', { n: toChapter })}</Text>
            </V2Pressable>
          </>
        )}
      </View>
    </>
  );
}

type ReviewProps = Readonly<{
  lang: string;
  chapterOrdinal: number;
  answers: readonly ChapterExamAnswerDetailV1[];
  topInset: number;
  bottomInset: number;
  onBack: () => void;
  onRepeatEpisode: (sessionOrdinal: number) => void;
}>;

/** Раздел 5: разбор ошибок. */
export function LearningV2ChapterExamReviewView(p: ReviewProps) {
  const g = useLv2Glass();
  const t = lv2TaskTokens(g);
  const wrong = p.answers.filter((a) => !a.correct);
  const plate = { backgroundColor: g.opaqueCard, boxShadow: t.taskPlateShadow as never };
  return (
    <ScrollView style={styles.flex} contentContainerStyle={[styles.review, { paddingTop: p.topInset + 8, paddingBottom: 34 + p.bottomInset }]}>
      <V2Pressable testID="chapter-exam-review-back" accessibilityLabel={learningV2ChapterExamResultCopy(p.lang, 'review')} onPress={p.onBack} style={[styles.round, plate]}>
        <Ionicons name="chevron-back" size={20} color={g.text} />
      </V2Pressable>
      <Text style={[styles.reviewTitle, { color: g.text }]}>{learningV2ChapterExamResultCopy(p.lang, 'review')}</Text>
      <Text style={[styles.reviewSub, { color: g.secondary }]}>{learningV2ChapterExamReviewSubtitle(p.lang, p.chapterOrdinal, wrong.length)}</Text>
      {/* guard-ok: не больше 12 карточек — виртуализация не нужна */}
      {wrong.map((a) => (
        <View key={a.interactionId} style={[styles.rv, plate]}>
          <View style={styles.rvHead}>
            <Ionicons name={a.taskIcon} size={15} color={g.secondary} />
            <Text style={[styles.rvHeadText, { color: g.secondary }]}>{`${learningV2ChapterExamResultCopy(p.lang, 'questionLabel', { i: a.ordinal })} · ${a.taskName}`}</Text>
          </View>
          {a.situation ? <Text style={[styles.rvQ, { color: g.secondary }]}>{a.situation}</Text> : null}
          {a.answerText ? (
            <Text style={[styles.rvYou, { color: g.text }]}>
              {`${learningV2ChapterExamResultCopy(p.lang, 'yourAnswer')} `}
              <Text style={styles.strike}>{a.answerText}</Text>
            </Text>
          ) : null}
          {a.correctAnswer ? <Text style={[styles.rvOk, { color: g.good }]}>{a.correctAnswer}</Text> : null}
          {a.explanation ? <Text style={[styles.rvWhy, { color: g.secondary }]}>{a.explanation}</Text> : null}
          <V2Pressable onPress={() => p.onRepeatEpisode(a.sessionOrdinal)} style={[styles.rep, { backgroundColor: t.controlSoft }]}>
            <Ionicons name="refresh-outline" size={15} color={g.text} />
            <Text style={[styles.repText, { color: g.text }]}>{learningV2ChapterExamResultCopy(p.lang, 'repeatEpisode', { n: a.sessionOrdinal })}</Text>
          </V2Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

// Размеры — 1:1 по таблице «экзамен главы», разделы 4–5; текст 16/13 по D145.
const styles = StyleSheet.create({
  flex: { flex: 1 },
  res: { alignItems: 'center', paddingTop: 26, paddingHorizontal: 20, paddingBottom: 24 },
  trophy: { width: 88, height: 88, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  big: { fontSize: 46, lineHeight: 52, fontWeight: '800', letterSpacing: -1, textAlign: 'center' },
  title: { marginTop: 4, fontSize: 22, lineHeight: 28, fontWeight: '700', textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 6, marginTop: 16, justifyContent: 'center' },
  dot: { width: 14, height: 14, borderRadius: 7 },
  rew: { height: 40, paddingHorizontal: 16, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  coin: { width: 22, height: 22, borderRadius: 11 },
  rewText: { fontSize: 16, fontWeight: '800' },
  unl: { alignSelf: 'stretch', marginTop: 22, borderRadius: 22, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  minicard: { width: 56, height: 56, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginRight: 2, boxShadow: '0 10px 20px -10px rgba(0,0,0,0.5)' }, // theme-exempt: тень мини-обложки главы, эталон `.minicard` — чёрная в обеих темах
  unlTitle: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  unlSub: { marginTop: 2, fontSize: 13, lineHeight: 17 },
  p: { marginTop: 10, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  foot: { paddingTop: 12, paddingHorizontal: 20 },
  cta: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  second: { marginTop: 10, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 16, fontWeight: '700' },
  review: { paddingHorizontal: 20 },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  reviewTitle: { marginTop: 10, fontSize: 30, lineHeight: 36, fontWeight: '700' },
  reviewSub: { marginTop: 4, fontSize: 16, lineHeight: 21 },
  rv: { marginTop: 12, borderRadius: 20, paddingTop: 14, paddingBottom: 14, paddingHorizontal: 16 },
  rvHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rvHeadText: { flexShrink: 1, fontSize: 13, lineHeight: 17, fontWeight: '700' },
  rvQ: { marginTop: 6, fontSize: 16, lineHeight: 21 },
  rvYou: { marginTop: 10, fontSize: 16, lineHeight: 22 },
  strike: { color: WRONG_INK, textDecorationLine: 'line-through' },
  rvOk: { marginTop: 4, fontSize: 16, lineHeight: 23, fontWeight: '700' },
  rvWhy: { marginTop: 6, fontSize: 16, lineHeight: 21 },
  rep: { alignSelf: 'flex-start', marginTop: 12, height: 40, paddingHorizontal: 16, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 8 },
  repText: { fontSize: 16, fontWeight: '700' },
});
