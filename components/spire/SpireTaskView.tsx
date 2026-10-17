// ═══════════════════════════════════════════════════════════════════════════
// SpireTaskView.tsx — одно задание ступени: выбор / сборка / пары (макет §4–5).
//
// зачем: пакет недели несёт три вида ответа (spire_pack_contract.ts, §4.4):
//   • choice — фраза и 4 варианта (угадай перевод / вставь слово / найди лишнее);
//   • translate — собери перевод из банка слов (готово, когда слов столько, сколько нужно);
//   • match / timeattack — несколько пунктов, у каждого свои варианты (пары).
// Вердикт считает раннер по отпечаткам, здесь только ввод и подсветка:
// «верно» — тон correct, «неверно» — тон wrong, верный вариант после ошибки — correct.
// Все варианты — полноширинные плиты ≥56dp; текст переносится, не обрезается.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAudio } from '../../hooks/use-audio';
import Ionicons from '@expo/vector-icons/Ionicons';
import { triLang } from '../../constants/i18n';
import { resolveSpireListenAudio } from '../../modules/spire/listen_audio';
import type { Lang } from '../../constants/i18n';
import type { SpirePackTask } from '../../modules/spire/pack_plan';
import type { SpireFeedback } from '../../app/spire/use_spire_step_runner';
import V2Pressable from '../v2/V2Pressable';
import { lv2Alpha } from '../learning-v2/LearningV2Glass';
import { useSpirePalette } from './useSpirePalette';
import { useSpireShadow } from './useSpireShadow';
import { spireGameText, type SpireGameStringKey } from './spire_game_strings';
import { localizeSpireOddityPrompt } from './spire_oddity_prompt';
import SpirePairsBoard from './SpirePairsBoard';

type Props = Readonly<{
  lang: Lang;
  task: SpirePackTask;
  feedback: SpireFeedback | null;
  disabled: boolean;
  onChoice: (index: number) => void;
  onTokens: (tokens: readonly string[]) => void;
  onItems: (selections: readonly number[]) => void;
  /** Язык обучения: для заданий «на слух» (PM-286) — на каком голосе телефона произнести фразу. */
  studyTarget?: string;
  /** «Пары»: верный вариант по каждому пункту (раннер по отпечаткам). Есть у всех пунктов — поле пар целиком, иначе прежний список по одному. */
  pairAnswers?: readonly (number | null)[];
}>;

const PROMPT_KEY: Record<string, SpireGameStringKey> = {
  guess_phrase: 'promptGuess',
  fill_gap: 'promptGap',
  find_oddity: 'promptOdd',
  translate_build: 'promptBuild',
  speed_match: 'promptMatch',
  listen_choose: 'promptListenChoose',
  listen_build: 'promptListenBuild',
};

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.map((v) => (typeof v === 'string' ? v : '')) : [];
}

type Tone = 'idle' | 'ok' | 'no';

function Option({ label, tone, disabled, onPress, testID }: Readonly<{ label: string; tone: Tone; disabled: boolean; onPress: () => void; testID: string }>) {
  const p = useSpirePalette(); const sh = useSpireShadow();
  // зачем (R1_DIFF_ONE_FIX, spire-008; образец kit.css `.opt.ok/.opt.no` rgba(…, .12)): подсветка ответа приглушённая — 12 %, а не 22 %
  const bg = tone === 'ok' ? lv2Alpha(p.correct, 0.12) : tone === 'no' ? lv2Alpha(p.wrong, 0.12) : p.card;
  return (
    <V2Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected: tone !== 'idle' }}
      style={[s.opt, { backgroundColor: bg }, sh.nested]}
      testID={testID}
    >
      <Text style={[s.optText, { color: p.text }]}>{label}</Text>
    </V2Pressable>
  );
}

function ChoiceTask({ task, feedback, disabled, onChoice }: Props) {
  const options = useMemo(() => strings(task.payload.options), [task]);
  const toneOf = (i: number): Tone => {
    if (!feedback) return 'idle';
    if (feedback.picked === i) return feedback.ok ? 'ok' : 'no';
    if (!feedback.ok && feedback.correctIndex === i) return 'ok';
    return 'idle';
  };
  return (
    <View style={s.stack}>
      {options.map((label, i) => (
        <Option key={`${task.taskId}:${i}`} label={label} tone={toneOf(i)} disabled={disabled} onPress={() => onChoice(i)} testID={`spire-opt-${i}`} />
      ))}
    </View>
  );
}

function BuildTask({ task, feedback, disabled, onTokens }: Props) {
  const p = useSpirePalette(); const sh = useSpireShadow();
  const bank = useMemo(() => strings(task.payload.wordBank), [task]);
  const need = Math.max(1, Number(task.payload.correctTokenCount) || 1);
  const [picked, setPicked] = useState<readonly number[]>([]);
  const add = useCallback((i: number) => {
    if (disabled || picked.includes(i)) return;
    const next = [...picked, i];
    setPicked(next);
    if (next.length === need) onTokens(next.map((k) => bank[k]));
  }, [bank, disabled, need, onTokens, picked]);
  const remove = useCallback((i: number) => {
    if (disabled) return;
    setPicked((cur) => cur.filter((k) => k !== i));
  }, [disabled]);
  const answerBg = feedback ? lv2Alpha(feedback.ok ? p.correct : p.wrong, 0.12) : p.card;
  return (
    <View style={s.stack}>
      <View style={[s.answer, { backgroundColor: answerBg }]} accessibilityLabel={picked.map((k) => bank[k]).join(' ')}>
        {picked.map((k) => (
          <V2Pressable key={`a${k}`} onPress={() => remove(k)} disabled={disabled} accessibilityRole="button" accessibilityLabel={bank[k]} style={[s.token, { backgroundColor: p.cardRaised }, sh.nested]}>
            <Text style={[s.tokenText, { color: p.text }]}>{bank[k]}</Text>
          </V2Pressable>
        ))}
      </View>
      <View style={s.bank}>
        {bank.map((word, i) => {
          const used = picked.includes(i);
          return (
            <V2Pressable
              key={`b${i}`}
              onPress={() => add(i)}
              disabled={disabled || used}
              accessibilityRole="button"
              accessibilityLabel={word}
              accessibilityState={{ disabled: disabled || used }}
              style={[s.token, { backgroundColor: p.control, opacity: used ? 0.3 : 1 }, sh.nested]}
              testID={`spire-word-${i}`}
            >
              <Text style={[s.tokenText, { color: p.text }]}>{word}</Text>
            </V2Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ItemsTask({ task, feedback, disabled, onItems }: Props) {
  const p = useSpirePalette(); const sh = useSpireShadow();
  const items = useMemo(() => (Array.isArray(task.payload.items) ? task.payload.items as Record<string, unknown>[] : []), [task]);
  const [chosen, setChosen] = useState<readonly number[]>([]);
  const index = Math.min(chosen.length, Math.max(0, items.length - 1));
  const item = items[index];
  const options = strings(item?.options);
  const pick = useCallback((i: number) => {
    if (disabled) return;
    const next = [...chosen, i];
    setChosen(next);
    if (next.length >= items.length) onItems(next);
  }, [chosen, disabled, items.length, onItems]);
  const toneOf = (i: number): Tone => {
    if (!feedback || chosen.length < items.length) return 'idle';
    if (chosen[index] === i) return feedback.ok ? 'ok' : 'no';
    return 'idle';
  };
  return (
    <View style={s.stack}>
      <View style={[s.itemHead, { backgroundColor: p.cardRaised }]}>
        <Text style={[s.itemPrompt, { color: p.text }]}>{typeof item?.prompt === 'string' ? item.prompt : '—'}</Text>
        <Text style={[s.itemCount, { color: p.textSecondary }]}>{`${Math.min(chosen.length + 1, items.length)} / ${items.length}`}</Text>
      </View>
      {options.map((label, i) => (
        <Option key={`${task.taskId}:${index}:${i}`} label={label} tone={toneOf(i)} disabled={disabled} onPress={() => pick(i)} testID={`spire-item-opt-${i}`} />
      ))}
    </View>
  );
}

// зачем (владелец 17.10: «пары все на экране»): поле пар — только когда верный вариант известен у каждого пункта;
// иначе (нет отпечатка, пустые пункты) — прежний список по одному слову, а не немой экран. Лог причины.
function MatchTask(props: Props) {
  const items = useMemo(() => (Array.isArray(props.task.payload.items) ? props.task.payload.items as Record<string, unknown>[] : []), [props.task]);
  const board = useMemo(() => items.map((it) => ({ prompt: typeof it.prompt === 'string' ? it.prompt : '—', options: strings(it.options) })), [items]);
  const answers = props.pairAnswers;
  const ready = items.length > 0 && !!answers && answers.length === items.length
    && answers.every((a, i) => typeof a === 'number' && a >= 0 && a < board[i].options.length);
  if (!ready) {
    console.warn('[SPIRE-PAIRS] fallback: list', JSON.stringify({ taskId: props.task.taskId, items: items.length, answers: answers ? answers.map((a) => (a === null ? 'null' : a)) : 'none' }));
    return <ItemsTask {...props} />;
  }
  return <SpirePairsBoard taskId={props.task.taskId} items={board} answers={answers as readonly number[]} disabled={props.disabled} onItems={props.onItems} />;
}

function SpireTaskView(props: Props) {
  const p = useSpirePalette(); const sh = useSpireShadow();
  const { lang, task } = props;
  const promptKey = PROMPT_KEY[task.mode] ?? 'promptGuess';
  const rawPhrase = typeof task.payload.phrase === 'string' ? task.payload.phrase
    : typeof task.payload.prompt === 'string' ? task.payload.prompt : '';
  // зачем (координатор 11.10): у «Найди лишнее» фраза — русский шаблон пула на «вы»; показываем строку на языке интерфейса.
  const phrase = task.mode === 'find_oddity' && rawPhrase ? localizeSpireOddityPrompt(rawPhrase, lang) : rawPhrase;
  const body = task.kind === 'translate' || task.kind === 'dictate'
    ? <BuildTask {...props} />
    : task.kind === 'match'
      ? <MatchTask {...props} />
      : task.kind === 'timeattack'
        ? <ItemsTask {...props} />
      : <ChoiceTask {...props} />;
  // зачем (PM-286, Ядро 01.10): у заданий «на слух» своей озвучки нет — фразу произносит голос
  // телефона (device-tts из пакета). Нечитаемый URI — не молчим: лог с причиной.
  const hasAudio = typeof task.payload.audioUri === 'string' && task.payload.audioUri.length > 0;
  // зачем (Ядро 01.10, сторож audio_never_permanently_silent): озвучка через общий арбитр звука —
  // уважает тумблер голоса, глушится записью микрофона и уступает другим экранам.
  const { speak, stop } = useAudio();
  const listen = useCallback(() => {
    const audio = resolveSpireListenAudio(task.payload, String(props.studyTarget ?? ''));
    if (!audio.ok) {
      console.warn('[SPIRE] listen: no audio', { taskId: task.taskId, reason: audio.reason, detail: audio.detail });
      return;
    }
    stop();
    speak(audio.text, undefined, { language: audio.speechLanguage });
  }, [props.studyTarget, speak, stop, task.payload, task.taskId]);
  const listenLabel = triLang(lang, { ru: 'Прослушать', uk: 'Прослухати', en: 'Listen', es: 'Escuchar', 'pt-BR': 'Ouvir', vi: 'Nghe', id: 'Dengarkan', tr: 'Dinle', pl: 'Posłuchaj' });
  return (
    <View testID="spire-task">
      {/* зачем (spire-gaps-states, «Задания»): подпись задания по центру с линиями-разделителями по бокам */}
      <View style={s.overRow}>
        <View style={[s.overLine, { backgroundColor: p.divider }]} />
        <Text style={[s.overline, { color: p.textSecondary }]}>{spireGameText(lang, promptKey).toUpperCase()}</Text>
        <View style={[s.overLine, { backgroundColor: p.divider }]} />
      </View>
      {phrase && task.kind !== 'match' && task.kind !== 'timeattack' ? (
        <View style={[s.question, { backgroundColor: p.cardRaised }, sh.plate]}>
          <View style={s.questionRow}>
            {/* зачем (Ядро 01.10): задание на слух — фраза до ответа скрыта (иначе это подсказка),
                после ответа показывается в разборе. */}
            {hasAudio && !props.feedback ? (
              <Text style={[s.phrase, s.phraseFlex, { color: p.textSecondary }]}>{listenLabel}</Text>
            ) : (
              <Text accessibilityRole="header" style={[s.phrase, s.phraseFlex, { color: p.text }]}>{phrase}</Text>
            )}
            {hasAudio ? (
              <V2Pressable onPress={listen} accessibilityRole="button" accessibilityLabel={listenLabel} style={[s.listen, { backgroundColor: p.card }, sh.nested]} testID="spire-task-listen">
                <Ionicons name="volume-high" size={22} color={p.text} />
              </V2Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
      <View style={s.body}>{body}</View>
    </View>
  );
}

const s = StyleSheet.create({
  overRow: { marginTop: 44, flexDirection: 'row', alignItems: 'center', gap: 12 },
  overLine: { flex: 1, height: 1 },
  overline: { fontSize: 13, lineHeight: 17, fontWeight: '700', letterSpacing: 2, textAlign: 'center', flexShrink: 1 },
  question: { marginTop: 18, minHeight: 96, borderRadius: 20, paddingHorizontal: 22, paddingVertical: 20, justifyContent: 'center' },
  phrase: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.3, textAlign: 'center' },
  questionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  phraseFlex: { flex: 1 },
  listen: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  body: { marginTop: 18 },
  stack: { gap: 13 },
  opt: { minHeight: 58, borderRadius: 16, paddingHorizontal: 22, paddingVertical: 12, justifyContent: 'center' },
  optText: { fontSize: 16, lineHeight: 21, fontWeight: '700', textAlign: 'center' },
  answer: { minHeight: 64, borderRadius: 16, padding: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  bank: { marginTop: 5, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  token: { minHeight: 44, borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center' },
  tokenText: { fontSize: 16, fontWeight: '700' },
  itemHead: { minHeight: 60, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemPrompt: { flex: 1, fontSize: 19, lineHeight: 24, fontWeight: '700' },
  itemCount: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
});

export default memo(SpireTaskView);
