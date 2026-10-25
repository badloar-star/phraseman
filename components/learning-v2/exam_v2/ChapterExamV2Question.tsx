// ChapterExamV2Question.tsx — один вопрос экзамена главы v2, точно по прототипу docs/design/v2-app/chapter-exam-v2-prototype.html.
// зачем (владелец утвердил прототип 25.10): три вида заданий — «Скажи по-английски» (ситуация; голос или «или напиши»), «Ответь
// собеседнику» (реплика пузырём), «Найди и исправь ошибку» (фраза с ошибкой, поле уже заполнено ею). Одна попытка: «Проверить» →
// плашка «Верно / Неверно. Правильно: …» → «Дальше». Размеры — из CSS прототипа (dp), цвета — токены темы (прототип снят с них).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import V2Pressable from '../../v2/V2Pressable';
import { useLv2Glass } from '../LearningV2Glass';
import { lv2TaskTokens } from '../learning_v2_task_theme_tokens';
import { useChapterExamV2Colors } from './chapter_exam_v2_colors';
import { useVoiceCapture } from '../../learning-v2-lab/kimi/use_voice_capture';
import { hapticError, hapticSuccess, hapticTap } from '../../../hooks/use-haptics';
import { checkChapterExamV2Answer, type ChapterExamV2Item } from '../../../modules/learning-v2/exam/chapter_exam_v2';
import { chapterExamV2Copy } from './chapter_exam_v2_copy';

const LOG = '[CHAPTER-EXAM-V2]';
// Вход элементов вопроса: `.enter` прототипа — 220 мс, cubic-bezier(.23,1,.32,1), сдвиг 8 dp.
const ENTER_MS = 220;

export type ChapterExamV2AnswerRecord = Readonly<{ itemId: string; grammarPoint: string; text: string; correct: boolean; typo: boolean; matched: string | null }>;

const TITLE: Readonly<Record<ChapterExamV2Item['type'], Readonly<{ icon: React.ComponentProps<typeof Ionicons>['name']; key: 'titleSituation' | 'titleDialogue' | 'titleFix' }>>> = {
  situation: { icon: 'chatbubble-outline', key: 'titleSituation' },
  dialogue: { icon: 'people-outline', key: 'titleDialogue' },
  fix: { icon: 'pencil-outline', key: 'titleFix' },
};

type Props = Readonly<{
  lang: string;
  item: ChapterExamV2Item;
  ordinal: number;
  /** Человек уже выбрал «или напиши» в этой попытке — ситуации дальше сразу с полем (не тапать каждый раз). */
  writeMode: boolean;
  bottomInset: number;
  onWriteMode: () => void;
  onAnswered: (answer: ChapterExamV2AnswerRecord) => void;
  onNext: () => void;
  /** Только dev-ссылка /dev_chapter_exam_v2_preview: вопрос открывается уже проверенным с этим ответом. В бою не передаётся. */
  initialAnswerText?: string | null;
}>;

export default function ChapterExamV2Question({ lang, item, ordinal, writeMode, bottomInset, onWriteMode, onAnswered, onNext, initialAnswerText = null }: Props) {
  const g = useLv2Glass();
  const t = lv2TaskTokens(g);
  const c = useChapterExamV2Colors();
  const reducedMotion = useReducedMotion();
  const locale = lang === 'uk' ? 'uk' : 'ru';
  const [draft, setDraft] = useState(item.type === 'fix' ? item.wrong ?? '' : '');
  const [typing, setTyping] = useState(false);
  const [answer, setAnswer] = useState<ChapterExamV2AnswerRecord | null>(null);
  const [micNote, setMicNote] = useState<string | null>(null);
  const answeredRef = useRef(false);
  const voice = useVoiceCapture({ targetText: item.accepted[0] ?? '', locale: 'en-US' });
  const showMic = item.type === 'situation' && !writeMode && !typing && answer === null;
  const enter = reducedMotion ? undefined : FadeInDown.duration(ENTER_MS).withInitialValues({ transform: [{ translateY: 8 }] });

  const submit = useCallback((text: string, via: 'text' | 'voice') => {
    if (answeredRef.current) return; // защита от двойного тапа: одна попытка на вопрос
    const value = text.trim();
    if (!value) {
      console.log(`${LOG} check:empty`, JSON.stringify({ itemId: item.id, via })); // guard-ok: ранний выход с причиной
      return;
    }
    answeredRef.current = true;
    const verdict = checkChapterExamV2Answer(item, value);
    const record: ChapterExamV2AnswerRecord = { itemId: item.id, grammarPoint: item.grammarPoint, text: value, correct: verdict.correct, typo: verdict.typo, matched: verdict.matched };
    console.log(`${LOG} check`, JSON.stringify({ n: ordinal, itemId: item.id, type: item.type, grammarPoint: item.grammarPoint, via, correct: verdict.correct, typo: verdict.typo })); // guard-ok: ветка и значение
    setDraft(value);
    setAnswer(record);
    onAnswered(record);
    void (verdict.correct ? hapticSuccess() : hapticError());
  }, [item, onAnswered, ordinal]);

  // зачем (координатор 25.10, склейка Сверки): состояния «верно / опечатка / неверно» снимаются по ссылке — ответ проверяется тем же submit
  useEffect(() => {
    if (initialAnswerText) submit(initialAnswerText, 'text');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: один раз на вход вопроса
  }, []);

  // Голос: распознали фразу после отпускания — сразу проверка («отпусти — проверю»).
  useEffect(() => {
    if (voice.status === 'permission_denied') setMicNote(chapterExamV2Copy(lang, 'micDenied'));
    else if (voice.status === 'unavailable') setMicNote(chapterExamV2Copy(lang, 'micUnavailable'));
    if (voice.status !== 'done' || !voice.result) return;
    const heard = voice.result.transcript.trim();
    console.log(`${LOG} voice:result`, JSON.stringify({ itemId: item.id, heardLength: heard.length })); // guard-ok: что пришло от распознавания (без текста речи)
    if (!heard) {
      setMicNote(chapterExamV2Copy(lang, 'micNothing'));
      voice.reset();
      return;
    }
    submit(heard, 'voice');
  }, [lang, item.id, submit, voice]);

  const ctaDisabled = answer === null && (showMic || !draft.trim());
  const pressCta = () => {
    if (answer) { onNext(); return; }
    if (!ctaDisabled) submit(draft, 'text');
  };
  const [titleIcon, titleKey] = [TITLE[item.type].icon, TITLE[item.type].key];
  const fieldInk = answer ? (answer.correct ? c.fieldGood : c.fieldBad) : c.text;
  const card = { backgroundColor: c.card, boxShadow: t.taskPlateShadow as never };

  return (
    <>
      <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Animated.View entering={enter} style={styles.hd}>
          <View style={[styles.tile, { backgroundColor: c.taskTile }]} accessible={false} importantForAccessibility="no-hide-descendants">
            <Ionicons name={titleIcon} size={21} color={c.taskIcon} />
          </View>
          <Text accessibilityRole="header" style={[styles.hdText, { color: c.text }]}>{chapterExamV2Copy(lang, titleKey)}</Text>
        </Animated.View>
        {item.type === 'situation' ? (
          <Animated.View entering={enter} style={[styles.sitc, { backgroundColor: c.situationFill }]}>
            <View style={styles.sitLabel}>
              <Ionicons name="chatbubble-ellipses-outline" size={14} color={c.situationLabel} />
              <Text style={[styles.sitLabelText, { color: c.situationLabel }]}>{chapterExamV2Copy(lang, 'situation')}</Text>
            </View>
            <Text style={[styles.sitText, { color: c.situationText }]}>{item.situation?.[locale] ?? item.situation?.ru ?? ''}</Text>
          </Animated.View>
        ) : null}
        {item.type === 'dialogue' ? (
          <>
            <Animated.View entering={enter} style={[styles.bub, card]}>
              <Text style={[styles.bubText, { color: c.text }]}>{item.partnerLine ?? ''}</Text>
            </Animated.View>
            <Animated.Text entering={enter} style={[styles.ask, { color: c.secondary }]}>{item.situation?.[locale] ?? item.situation?.ru ?? ''}</Animated.Text>
          </>
        ) : null}
        {item.type === 'fix' ? (
          <>
            <Animated.View entering={enter} style={[styles.wrongc, card]}>
              <Text style={[styles.wrongText, { color: c.text }]}>{item.wrong ?? ''}</Text>
            </Animated.View>
            <Animated.Text entering={enter} style={[styles.ask, { color: c.secondary }]}>{chapterExamV2Copy(lang, 'fixAsk')}</Animated.Text>
          </>
        ) : null}
        {showMic ? (
          <>
            <Animated.View entering={enter} style={[styles.ans, card]}>
              <Text style={[styles.dash, { color: c.placeholder }]}>{voice.status === 'listening' && voice.partial ? voice.partial : '— — — — — —'}</Text>
              <Text style={[styles.hint, { color: c.link }]}>{chapterExamV2Copy(lang, 'micHint')}</Text>
            </Animated.View>
            <Animated.View entering={enter} style={styles.micwrap}>
              {/* зачем: «удерживай и говори» — нужны нажал/отпустил, их V2Pressable не пропускает; сжатие .97 как у кнопок прототипа */}
              <Pressable
                testID="chapter-exam-v2-mic"
                accessibilityRole="button"
                accessibilityLabel={chapterExamV2Copy(lang, 'micLabel')}
                onPressIn={() => { hapticTap(); setMicNote(null); void voice.start(); }}
                onPressOut={() => voice.stop()}
                style={({ pressed }) => [styles.mic, { backgroundColor: c.ctaFill, boxShadow: t.taskPlateShadow as never, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
              >
                <Ionicons name="mic" size={28} color={c.ctaInk} />
              </Pressable>
              <Text style={[styles.mlab, { color: c.secondary }]}>{chapterExamV2Copy(lang, voice.status === 'listening' ? 'micListening' : 'micLabel')}</Text>
              <V2Pressable testID="chapter-exam-v2-write" onPress={() => { hapticTap(); voice.reset(); setTyping(true); setDraft(''); onWriteMode(); }} style={styles.alt}>
                <Text style={[styles.altText, { color: c.link }]}>{chapterExamV2Copy(lang, 'writeInstead')}</Text>
              </V2Pressable>
            </Animated.View>
            <Text accessibilityLiveRegion="polite" style={[styles.note, { color: c.secondary }]}>{micNote ?? ''}</Text>
          </>
        ) : (
          <Animated.View entering={enter} style={styles.field}>
            <TextInput
              testID="chapter-exam-v2-input"
              value={draft}
              onChangeText={setDraft}
              editable={answer === null}
              multiline
              autoFocus={item.type !== 'situation' || typing || writeMode}
              placeholder={chapterExamV2Copy(lang, 'placeholder')}
              placeholderTextColor={c.placeholder}
              autoCapitalize="sentences"
              autoCorrect={false}
              spellCheck={false}
              autoComplete="off"
              submitBehavior="blurAndSubmit"
              returnKeyType="done"
              onSubmitEditing={pressCta}
              selectionColor={c.caret}
              cursorColor={c.caret}
              accessibilityLabel={chapterExamV2Copy(lang, 'placeholder')}
              style={[styles.input, card, { color: fieldInk }]}
            />
          </Animated.View>
        )}
        {answer ? (
          <Animated.View entering={enter} style={[styles.plate, { backgroundColor: answer.correct ? c.goodPlate : c.badPlate }]} testID="chapter-exam-v2-verdict">
            {/* зачем (карта 4 · ТЕМЫ): цвет «верно/неверно» несёт значок, слова — цветом текста (жирным), иначе в светлых темах < 4,5 */}
            <Ionicons name={answer.correct ? 'checkmark' : 'close'} size={18} color={answer.correct ? c.goodIcon : c.badIcon} style={styles.plateIcon} />
            <Text style={[styles.plateText, { color: c.plateText }]}>
              <Text style={styles.bold}>{chapterExamV2Copy(lang, answer.correct ? 'correct' : 'wrong')}</Text>
              {answer.correct && answer.typo && answer.matched ? <>{` ${chapterExamV2Copy(lang, 'typo')} `}<Text style={styles.bold}>{answer.matched}</Text></> : null}
              {!answer.correct ? <>{` ${chapterExamV2Copy(lang, 'rightIs')} `}<Text style={styles.bold}>{item.accepted[0]}</Text></> : null}
            </Text>
          </Animated.View>
        ) : null}
      </ScrollView>
      <View style={[styles.foot, { backgroundColor: c.footer, paddingBottom: 38 + bottomInset }]}>
        <V2Pressable
          testID="chapter-exam-v2-cta"
          disabled={ctaDisabled}
          accessibilityState={{ disabled: ctaDisabled }}
          onPress={pressCta}
          style={[styles.cta, { backgroundColor: ctaDisabled ? c.ctaFillDisabled : c.ctaFill }]}
        >
          <Text style={[styles.ctaText, { color: ctaDisabled ? c.ctaInkDisabled : c.ctaInk }]}>{chapterExamV2Copy(lang, answer ? 'next' : 'check')}</Text>
        </V2Pressable>
      </View>
    </>
  );
}

// Размеры — 1:1 по CSS прототипа; кегли текста — шкала D145 16/13 (Ревизор 25.10: 12,5/14 → 13) (.scroll, .hd, .tile, .sitc, .bub, .ask, .wrongc, textarea, .ans, .mic, .plate, .foot, .cta).
const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingTop: 18, paddingHorizontal: 41, paddingBottom: 24 },
  hd: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  tile: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  hdText: { flexShrink: 1, fontSize: 22, lineHeight: 27, fontWeight: '700', letterSpacing: -0.2 },
  sitc: { marginTop: 16, borderRadius: 15, paddingVertical: 13, paddingHorizontal: 15, overflow: 'hidden' },
  sitLabel: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sitLabelText: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
  sitText: { marginTop: 4, fontSize: 16, lineHeight: 24 },
  bub: { alignSelf: 'flex-start', marginTop: 18, maxWidth: 290, paddingVertical: 12, paddingHorizontal: 16, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomRightRadius: 18, borderBottomLeftRadius: 6 },
  bubText: { fontSize: 19, lineHeight: 25, fontWeight: '700' },
  ask: { marginTop: 14, fontSize: 16, lineHeight: 23 },
  wrongc: { marginTop: 16, borderRadius: 16, padding: 16 },
  wrongText: { fontSize: 21, lineHeight: 28, fontWeight: '700' },
  field: { marginTop: 14 },
  input: { minHeight: 104, borderRadius: 16, paddingTop: 14, paddingBottom: 14, paddingHorizontal: 16, fontSize: 20, lineHeight: 27, fontWeight: '700', textAlignVertical: 'top' },
  ans: { marginTop: 16, borderRadius: 16, paddingTop: 20, paddingHorizontal: 16, paddingBottom: 14, alignItems: 'center' },
  dash: { fontSize: 22, letterSpacing: 3, textAlign: 'center' },
  hint: { marginTop: 12, fontSize: 13, lineHeight: 17, fontWeight: '700', textAlign: 'center' },
  micwrap: { marginTop: 22, alignItems: 'center', gap: 10 },
  mic: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  mlab: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
  alt: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  altText: { fontSize: 13, lineHeight: 20, fontWeight: '700' },
  note: { marginTop: 8, minHeight: 18, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  plate: { marginTop: 14, borderRadius: 16, paddingVertical: 13, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  plateIcon: { marginTop: 2 },
  plateText: { flexShrink: 1, fontSize: 16, lineHeight: 23 },
  bold: { fontWeight: '700' },
  foot: { paddingTop: 12, paddingHorizontal: 20 },
  cta: { height: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  ctaText: { fontSize: 16, fontWeight: '700' },
});
