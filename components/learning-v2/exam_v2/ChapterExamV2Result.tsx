// ChapterExamV2Result.tsx — итог экзамена главы v2, разбор ошибок и «Повтори эти темы», точно по прототипу chapter-exam-v2-prototype.html.
// зачем (владелец утвердил прототип 25.10): сдал — «X из 10», «Экзамен сдан», точки, «+40» (первая сдача), «Глава N открыта. <сцена>.
// Начнём с эпизода E», «К главе N» и «Разбор ошибок»; не сдал — «Где споткнулся» (до 3 тем с эпизодами и числом ошибок), «Повторить эти
// темы» и «Пересдать через N мин». «Повтори эти темы» — эпизоды слабых тем: повторил все — «Пересдать экзамен» сразу.
import React from 'react';
import { Image, PixelRatio, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import V2Pressable from '../../v2/V2Pressable';
import { useLv2Glass, lv2Alpha } from '../LearningV2Glass';
import { useChapterExamV2Colors } from './chapter_exam_v2_colors';
import { lv2TaskTokens } from '../learning_v2_task_theme_tokens';
import { learningV2ChapterIonIcon } from '../icons/learningV2IonIcons';
import { learningV2ChapterExamFailedTitle, learningV2ChapterExamResultCopy } from '../learning_v2_chapter_exam_result_copy';
import { learningV2ChapterSceneV1 } from '../../../modules/learning-v2/content/session_titles_v1.generated';
import { useMyCoinRank } from '../../../hooks/use_my_coin_rank';
import { coinRankSourceForSize } from '../../../app/coin_rank_table_v1';
import type { ChapterExamV2Bank, ChapterExamV2Item, ChapterExamV2Result, ChapterExamV2WeakPoint } from '../../../modules/learning-v2/exam/chapter_exam_v2';
import type { ChapterExamV2AnswerRecord } from './ChapterExamV2Question';
import { chapterExamV2Copy, chapterExamV2EpisodesWord, chapterExamV2ErrorsWord } from './chapter_exam_v2_copy';

const ENTER_MS = 220;

const labelOf = (bank: ChapterExamV2Bank, lang: string, grammarPoint: string): string => {
  const point = bank.grammarPoints.find((p) => p.id === grammarPoint);
  return (lang === 'uk' ? point?.label.uk : point?.label.ru) ?? point?.label.ru ?? grammarPoint;
};

function useEnter() {
  const reducedMotion = useReducedMotion();
  return reducedMotion ? undefined : FadeInDown.duration(ENTER_MS).withInitialValues({ transform: [{ translateY: 8 }] });
}

type ResultProps = Readonly<{
  lang: string;
  bank: ChapterExamV2Bank;
  result: ChapterExamV2Result;
  answers: readonly ChapterExamV2AnswerRecord[];
  /** Первый эпизод, с которого начнём (точка старта после сдачи); null — не сдал или конец курса. */
  startEpisode: number | null;
  reward: number | null;
  retryMinutes: number | null;
  bottomInset: number;
  onToChapter: (chapterOrdinal: number) => void;
  onMistakes: () => void;
  onReview: () => void;
}>;

export function ChapterExamV2ResultView(p: ResultProps) {
  const g = useLv2Glass();
  const t = lv2TaskTokens(g);
  const c = useChapterExamV2Colors();
  const card = { backgroundColor: c.card, boxShadow: t.taskPlateShadow as never };
  const enter = useEnter();
  const coinRank = useMyCoinRank();
  const { correct, total, passed, weakPoints } = p.result;
  const wrong = p.answers.filter((a) => !a.correct).length;
  const next = p.bank.chapterOrdinal < 7 ? p.bank.chapterOrdinal + 1 : null;
  const scene = next ? learningV2ChapterSceneV1(p.bank.lessonOrdinal, next) : null;
  const start = p.startEpisode !== null ? learningV2ChapterExamResultCopy(p.lang, 'openedAlso', { a: p.startEpisode }) : null;
  return (
    <>
      <ScrollView style={styles.flex} contentContainerStyle={styles.res} showsVerticalScrollIndicator={false}>
        {passed ? (
          <Animated.View entering={enter} style={[styles.trophy, { backgroundColor: c.trophyFill }]}>
            <Ionicons name="trophy" size={42} color={c.trophyIcon} />
          </Animated.View>
        ) : null}
        <Animated.Text entering={enter} style={[styles.big, { color: c.score, marginTop: passed ? 16 : 20 }]}>{chapterExamV2Copy(p.lang, 'scoreOf', { c: correct, t: total })}</Animated.Text>
        <Animated.Text entering={enter} style={[styles.rtitle, { color: c.text }]}>{passed ? learningV2ChapterExamResultCopy(p.lang, 'passedTitle') : learningV2ChapterExamFailedTitle(p.lang, correct)}</Animated.Text>
        <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {Array.from({ length: total }, (_, i) => (
            // guard-ok: 10 неподвижных точек, порядок не меняется
            <View key={i} style={[styles.dot, { backgroundColor: i < correct ? c.dotOn : c.dotOff }]} />
          ))}
        </View>
        {passed && p.reward !== null ? (
          <Animated.View entering={enter} style={[styles.rew, { backgroundColor: c.chip }]} testID="chapter-exam-v2-reward">
            <Image source={coinRankSourceForSize(coinRank ?? 0, 22, PixelRatio.get()).source} style={styles.coin} accessible={false} />
            <Text style={[styles.rewText, { color: c.text }]}>{`+${p.reward}`}</Text>
          </Animated.View>
        ) : null}
        {passed && next ? (
          <Animated.View entering={enter} style={[styles.unl, card]}>
            <View style={[styles.mini, { backgroundColor: c.chapterTile }]}>
              <Ionicons name={learningV2ChapterIonIcon(p.bank.lessonOrdinal, next)} size={26} color={c.chapterIcon} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.unlT, { color: c.text }]}>{learningV2ChapterExamResultCopy(p.lang, 'unlocked', { n: next })}</Text>
              <Text style={[styles.unlS, { color: c.secondary }]}>{[scene, start].filter(Boolean).join('. ')}</Text>
            </View>
          </Animated.View>
        ) : null}
        {!passed ? (
          <Animated.View entering={enter} style={styles.where}>
            <Text style={[styles.whereH, { color: c.secondary }]}>{chapterExamV2Copy(p.lang, 'whereStumbled')}</Text>
            <View style={[styles.topics, card]}>
              {weakPoints.map((w, i) => (
                <View key={w.grammarPoint} style={[styles.tp, i > 0 ? { boxShadow: `0 -1px 0 ${lv2Alpha(c.divider, 0.14)}` as never } : null]}>
                  <View style={styles.flexShrink}>
                    <Text style={[styles.tpText, { color: c.text }]}>{labelOf(p.bank, p.lang, w.grammarPoint)}</Text>
                    {w.episodeOrdinals.length > 0 ? <Text style={[styles.tpEp, { color: c.secondary }]}>{chapterExamV2EpisodesWord(p.lang, w.episodeOrdinals)}</Text> : null}
                  </View>
                  <Text style={[styles.tpR, { color: c.topicErrors }]}>{chapterExamV2ErrorsWord(p.lang, w.errors)}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        ) : null}
        {!passed && wrong > 0 ? (
          <V2Pressable testID="chapter-exam-v2-mistakes" onPress={p.onMistakes} style={styles.link}>
            <Text style={[styles.linkText, { color: c.link }]}>{chapterExamV2Copy(p.lang, 'mistakesLink', { k: wrong })}</Text>
          </V2Pressable>
        ) : null}
      </ScrollView>
      <View style={[styles.rfoot, { backgroundColor: c.footer, paddingBottom: 32 + p.bottomInset }]}>
        {passed ? (
          <>
            <V2Pressable testID="chapter-exam-v2-to-chapter" onPress={() => p.onToChapter(next ?? p.bank.chapterOrdinal)} style={[styles.cta, { backgroundColor: c.ctaFill }]}>
              <Ionicons name="play" size={18} color={c.ctaInk} />
              <Text style={[styles.ctaText, { color: c.ctaInk }]}>{learningV2ChapterExamResultCopy(p.lang, 'toChapter', { n: next ?? p.bank.chapterOrdinal })}</Text>
            </V2Pressable>
            {wrong > 0 ? (
              <V2Pressable testID="chapter-exam-v2-mistakes" onPress={p.onMistakes} style={[styles.second, { backgroundColor: c.chip }]}>
                <Text style={[styles.ctaText, { color: c.text }]}>{chapterExamV2Copy(p.lang, wrong === 1 ? 'mistakeOneLink' : 'mistakesLink', { k: wrong })}</Text>
              </V2Pressable>
            ) : null}
          </>
        ) : (
          <>
            <V2Pressable testID="chapter-exam-v2-review" onPress={p.onReview} style={[styles.cta, { backgroundColor: c.ctaFill }]}>
              <Ionicons name="refresh" size={18} color={c.ctaInk} />
              <Text style={[styles.ctaText, { color: c.ctaInk }]}>{chapterExamV2Copy(p.lang, 'reviewTopics')}</Text>
            </V2Pressable>
            <View style={[styles.second, { backgroundColor: c.chip }]} accessibilityState={{ disabled: true }}>
              <Text style={[styles.ctaText, { color: c.secondary }]}>{chapterExamV2Copy(p.lang, 'retryIn', { m: p.retryMinutes ?? 60 })}</Text>
            </View>
          </>
        )}
      </View>
    </>
  );
}

type MistakesProps = Readonly<{
  lang: string;
  items: readonly ChapterExamV2Item[];
  answers: readonly ChapterExamV2AnswerRecord[];
  bottomInset: number;
  onBack: () => void;
}>;

export function ChapterExamV2MistakesView(p: MistakesProps) {
  const g = useLv2Glass();
  const t = lv2TaskTokens(g);
  const c = useChapterExamV2Colors();
  const card = { backgroundColor: c.card, boxShadow: t.taskPlateShadow as never };
  const enter = useEnter();
  const locale = p.lang === 'uk' ? 'uk' : 'ru';
  const wrong = p.answers.map((a, i) => ({ a, n: i + 1, q: p.items.find((it) => it.id === a.itemId) ?? null })).filter((x) => !x.a.correct && x.q);
  const promptOf = (q: ChapterExamV2Item): string => {
    const sit = q.situation?.[locale] ?? q.situation?.ru ?? '';
    if (q.type === 'situation') return sit;
    if (q.type === 'dialogue') return `«${q.partnerLine ?? ''}» — ${sit}`;
    return chapterExamV2Copy(p.lang, 'fixPrompt', { w: q.wrong ?? '' });
  };
  return (
    <>
      <ScrollView style={styles.flex} contentContainerStyle={[styles.res, styles.stretch]} showsVerticalScrollIndicator={false}>
        <Animated.Text entering={enter} style={[styles.rtitle, styles.left, { color: c.text }]}>{chapterExamV2Copy(p.lang, 'mistakesTitle')}</Animated.Text>
        {wrong.map(({ a, n, q }) => (
          // guard-ok: не больше 10 карточек — виртуализация не нужна
          <Animated.View key={a.itemId} entering={enter} style={[styles.mist, card]}>
            <Text style={[styles.mistQ, { color: c.secondary }]}>{learningV2ChapterExamResultCopy(p.lang, 'questionLabel', { i: n })}</Text>
            <Text style={[styles.mistP, { color: c.secondary }]}>{q ? promptOf(q) : ''}</Text>
            <Text style={[styles.mistY, { color: c.text }]}>
              {`${learningV2ChapterExamResultCopy(p.lang, 'yourAnswer')} `}
              <Text style={[styles.bold, { color: c.fieldBad }]}>{a.text}</Text>
            </Text>
            <Text style={[styles.mistC, { color: c.fieldGood }]}>{q?.accepted[0] ?? ''}</Text>
          </Animated.View>
        ))}
      </ScrollView>
      <View style={[styles.rfoot, { backgroundColor: c.footer, paddingBottom: 38 + p.bottomInset }]}>
        <V2Pressable testID="chapter-exam-v2-mistakes-back" onPress={p.onBack} style={[styles.cta, { backgroundColor: c.ctaFill }]}>
          <Text style={[styles.ctaText, { color: c.ctaInk }]}>{chapterExamV2Copy(p.lang, 'toResult')}</Text>
        </V2Pressable>
      </View>
    </>
  );
}

type ReviewProps = Readonly<{
  lang: string;
  bank: ChapterExamV2Bank;
  weakPoints: readonly ChapterExamV2WeakPoint[];
  /** Эпизоды, пройденные после провала (отметка плеера). */
  done: readonly number[];
  bottomInset: number;
  onEpisode: (episode: number) => void;
  onRetake: () => void;
  onBack: () => void;
}>;

export function ChapterExamV2ReviewView(p: ReviewProps) {
  const g = useLv2Glass();
  const t = lv2TaskTokens(g);
  const c = useChapterExamV2Colors();
  const card = { backgroundColor: c.card, boxShadow: t.taskPlateShadow as never };
  const enter = useEnter();
  const episodes = [...new Set(p.weakPoints.flatMap((w) => w.episodeOrdinals))].sort((a, b) => a - b);
  const allDone = episodes.every((e) => p.done.includes(e));
  const canRetake = allDone || episodes.length === 0;
  return (
    <>
      <ScrollView style={styles.flex} contentContainerStyle={[styles.res, styles.stretch]} showsVerticalScrollIndicator={false}>
        <Animated.Text entering={enter} style={[styles.rtitle, styles.left, { color: c.text }]}>{chapterExamV2Copy(p.lang, 'reviewTitle')}</Animated.Text>
        <Animated.View entering={enter} style={[styles.topics, styles.reviewList, card]}>
          {episodes.length === 0 ? <View style={styles.tp}><Text style={[styles.tpText, { color: c.text }]}>{chapterExamV2Copy(p.lang, 'noEpisodes')}</Text></View> : null}
          {episodes.map((e, i) => {
            const ok = p.done.includes(e);
            const topics = p.weakPoints.filter((w) => w.episodeOrdinals.includes(e)).map((w) => labelOf(p.bank, p.lang, w.grammarPoint)).join(' · ');
            return (
              <V2Pressable
                key={e}
                testID={`chapter-exam-v2-episode-${e}`}
                disabled={ok}
                accessibilityState={{ disabled: ok }}
                onPress={() => p.onEpisode(e)}
                style={[styles.epr, i > 0 ? { boxShadow: `0 -1px 0 ${lv2Alpha(c.divider, 0.14)}` as never } : null]}
              >
                <View style={[styles.eprN, { backgroundColor: c.taskTile }]}><Text style={[styles.eprNText, { color: c.text }]}>{e}</Text></View>
                <View style={styles.eprM}>
                  <Text style={[styles.eprT, { color: c.text }]}>{chapterExamV2EpisodesWord(p.lang, [e])}</Text>
                  <Text style={[styles.eprS, { color: c.secondary }]}>{topics}</Text>
                </View>
                <Ionicons name={ok ? 'checkmark' : 'chevron-forward'} size={22} color={ok ? c.doneCheck : c.secondary} />
              </V2Pressable>
            );
          })}
        </Animated.View>
      </ScrollView>
      <View style={[styles.rfoot, { backgroundColor: c.footer, paddingBottom: 32 + p.bottomInset }]}>
        <V2Pressable testID="chapter-exam-v2-retake" disabled={!canRetake} accessibilityState={{ disabled: !canRetake }} onPress={p.onRetake} style={[styles.cta, { backgroundColor: canRetake ? c.ctaFill : c.ctaFillDisabled }]}>
          <Ionicons name="play" size={18} color={canRetake ? c.ctaInk : c.ctaInkDisabled} />
          <Text style={[styles.ctaText, { color: canRetake ? c.ctaInk : c.ctaInkDisabled }]}>{chapterExamV2Copy(p.lang, 'retake')}</Text>
        </V2Pressable>
        <V2Pressable testID="chapter-exam-v2-review-back" onPress={p.onBack} style={[styles.second, { backgroundColor: c.chip }]}>
          <Text style={[styles.ctaText, { color: c.text }]}>{chapterExamV2Copy(p.lang, 'toResult')}</Text>
        </V2Pressable>
      </View>
    </>
  );
}

// Размеры — 1:1 по CSS прототипа; кегли текста — шкала D145 16/13 (Ревизор 25.10: 14/15/17 → 13/16, межстрочные как в прототипе) (.res, .trophy, .big, .rtitle, .dots, .rew, .unl, .mini, .where, .topics, .tp, .link, .mist, .epr, .rfoot, .second).
const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  res: { alignItems: 'center', paddingTop: 26, paddingHorizontal: 20, paddingBottom: 24 },
  stretch: { alignItems: 'stretch' },
  left: { textAlign: 'left' },
  trophy: { width: 88, height: 88, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  big: { fontSize: 46, lineHeight: 52, fontWeight: '800', letterSpacing: -1, textAlign: 'center' },
  rtitle: { marginTop: 4, fontSize: 22, lineHeight: 28, fontWeight: '700', textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 6, marginTop: 16, justifyContent: 'center' },
  dot: { width: 14, height: 14, borderRadius: 7 },
  rew: { height: 40, paddingHorizontal: 16, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  coin: { width: 22, height: 22, borderRadius: 11 },
  rewText: { fontSize: 16, fontWeight: '800' },
  unl: { alignSelf: 'stretch', marginTop: 22, borderRadius: 22, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  mini: { width: 56, height: 56, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  unlT: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  unlS: { marginTop: 2, fontSize: 13, lineHeight: 17 },
  where: { alignSelf: 'stretch', marginTop: 22 },
  whereH: { marginBottom: 8, fontSize: 13, lineHeight: 17, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  topics: { borderRadius: 20, paddingVertical: 2, paddingHorizontal: 16 },
  reviewList: { marginTop: 16, paddingVertical: 4, paddingHorizontal: 6 },
  tp: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 13 },
  tpText: { fontSize: 16, lineHeight: 21 },
  tpEp: { marginTop: 2, fontSize: 13, lineHeight: 17 },
  tpR: { fontSize: 13, fontWeight: '700' },
  link: { marginTop: 14, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  linkText: { fontSize: 16, lineHeight: 20, fontWeight: '700' },
  mist: { marginTop: 12, borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16 },
  mistQ: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
  mistP: { marginTop: 4, fontSize: 16, lineHeight: 21 },
  mistY: { marginTop: 10, fontSize: 16, lineHeight: 21 },
  mistC: { marginTop: 4, fontSize: 16, lineHeight: 23, fontWeight: '700' },
  bold: { fontWeight: '700' },
  epr: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14 },
  eprN: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  eprNText: { fontSize: 16, fontWeight: '800' },
  eprM: { flex: 1, minWidth: 0, gap: 2 },
  eprT: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  eprS: { fontSize: 13, lineHeight: 17 },
  rfoot: { paddingTop: 12, paddingHorizontal: 20 },
  cta: { height: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  second: { marginTop: 10, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 16, fontWeight: '700' },
});
