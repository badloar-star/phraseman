// ─── Витрина движения · шард «Learning V2 · 7 одобренных режимов» ───
// зачем: владелец потребовал раздел в DEV Hub, где можно прогнать каждый из
// семи одобренных режимов упражнений (docs/v2/mockups/index.html, раздел
// "Режимы") и глазами сверить с макетом — та же вёрстка, те же анимации.
// Каждый пункт монтирует РЕАЛЬНЫЙ компонент режима (modules/learning-v2/modes)
// с демо-данными на статичном интерактивном хосте: тап по варианту/чипу даёт
// настоящий success/needs_work переход через ту же машину состояний
// (LearningV2ModePhaseV1), что и в боевом плеере — не бутафория с fixed phase.
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ShowcaseSection } from '../types';
import { cs } from '../showcase_copy';
import { useTheme } from '../../../ThemeContext';
import LearningV2ModeRouterV1, {
  MODE_MOCKUP_LABEL_BY_FAMILY_V1,
} from '../../../../modules/learning-v2/modes/mode_router_v1';
import ScriptedRepeatCompareModeV1 from '../../../../modules/learning-v2/modes/scripted_repeat_compare_mode_v1';
import type {
  LearningV2ModeCommonPropsV1,
  LearningV2ModeOptionV1,
  LearningV2ModePhaseV1,
} from '../../../../modules/learning-v2/modes/mode_contract_v1';
import type { LearningV2ActivityFamilyCode } from '../../../../modules/learning-v2/telemetry';

/**
 * Демо-хост: воспроизводит ту же локальную state machine, что и
 * app/learning_v2_direct_session_player_v1.tsx (idle → active → success/
 * needs_work), но без сети/телеметрии/прогресса — только для визуальной
 * сверки анимаций с макетом. correctResponseId зашит в демо-данных ниже,
 * не приходит с сервера (витрина не мутирует прогресс/деньги).
 */
function useLearningV2ModeShowcaseHostV1(
  family: LearningV2ActivityFamilyCode,
  options: readonly LearningV2ModeOptionV1[],
  correctResponseId: string,
  inputMode: 'single_choice' | 'ordered_tokens',
) {
  const [phase, setPhase] = useState<LearningV2ModePhaseV1>('idle');
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [orderedResponseIds, setOrderedResponseIds] = useState<readonly string[]>([]);
  const [wrongNudge, setWrongNudge] = useState<{ responseId: string | null; token: number }>({
    responseId: null,
    token: 0,
  });
  const [resolved, setResolved] = useState(false);

  const reset = useCallback(() => {
    setPhase('idle');
    setSelectedChoiceId(null);
    setOrderedResponseIds([]);
    setWrongNudge({ responseId: null, token: 0 });
    setResolved(false);
  }, []);

  const onPick = useCallback((responseId: string) => {
    setSelectedChoiceId(responseId);
    setPhase('active');
  }, []);

  const onAppendToken = useCallback((responseId: string) => {
    setOrderedResponseIds((current) => [...current, responseId]);
    setPhase('active');
  }, []);

  const onUndoToken = useCallback(() => {
    setOrderedResponseIds((current) => current.slice(0, -1));
  }, []);

  const evaluateDemo = useCallback(() => {
    const answer = inputMode === 'single_choice' ? selectedChoiceId : orderedResponseIds.join(' ');
    const isCorrect = inputMode === 'single_choice'
      ? selectedChoiceId === correctResponseId
      : orderedResponseIds.length === options.length && orderedResponseIds.join(' ') === correctResponseId;
    if (isCorrect) {
      setResolved(true);
      setPhase('success');
      return;
    }
    // зачем: тот же точечный wrong_option_nudge, что в боевом плеере — не
    // общий shake экрана (запрет владельца из docs/v2/04, раздел Motion tokens).
    const badId = inputMode === 'single_choice' ? selectedChoiceId : orderedResponseIds[orderedResponseIds.length - 1] ?? null;
    setWrongNudge((current) => ({ responseId: badId, token: current.token + 1 }));
    setPhase('needs_work');
    void answer;
  }, [correctResponseId, inputMode, options.length, orderedResponseIds, selectedChoiceId]);

  const canSubmit = inputMode === 'single_choice' ? selectedChoiceId !== null : orderedResponseIds.length > 0;

  return { phase, selectedChoiceId, orderedResponseIds, wrongNudge, resolved, canSubmit, onPick, onAppendToken, onUndoToken, evaluateDemo, reset };
}

/** Общая обвязка для 6 текстовых режимов (не голосового). */
function LearningV2ModeShowcaseDemoV1({
  family,
  prompt,
  options,
  correctResponseId,
  inputMode,
  explanation,
}: {
  readonly family: LearningV2ActivityFamilyCode;
  readonly prompt: string;
  readonly options: readonly LearningV2ModeOptionV1[];
  readonly correctResponseId: string;
  readonly inputMode: 'single_choice' | 'ordered_tokens';
  readonly explanation: string;
}) {
  const { theme: t } = useTheme();
  const host = useLearningV2ModeShowcaseHostV1(family, options, correctResponseId, inputMode);
  const props: LearningV2ModeCommonPropsV1 = useMemo(
    () => ({
      family,
      phase: host.phase,
      prompt,
      options,
      selectedChoiceId: host.selectedChoiceId,
      orderedResponseIds: host.orderedResponseIds,
      wrongNudge: host.wrongNudge,
      reducedMotion: false,
      resolved: host.resolved,
      explanation: host.phase === 'needs_work' ? explanation : null,
      onPick: host.onPick,
      onAppendToken: host.onAppendToken,
      onUndoToken: host.onUndoToken,
      onPlaySelectableAudio: () => {},
      onPlayFullPhraseAudio: null,
      onSubmit: host.evaluateDemo,
      canSubmit: host.canSubmit,
    }),
    [family, host, prompt, options, explanation],
  );
  // зачем: компонент режима сам не рендерит "Проверить"/"Сброс" — эта кнопка
  // в боевом плеере живёт в ActionDock снаружи (app/learning_v2_direct_
  // session_player_v1.tsx). Без своего мини-дока демо было бы статичным —
  // не давало бы тапом реально прогнать success/needs_work переход.
  return (
    <View style={styles.stage}>
      <LearningV2ModeRouterV1 {...props} />
      <View style={styles.demoDock}>
        <Pressable
          onPress={host.phase === 'success' ? host.reset : host.evaluateDemo}
          disabled={host.phase !== 'success' && !host.canSubmit}
          accessibilityRole="button"
          accessibilityLabel={host.phase === 'success' ? cs('lv2mode_demo_reset') : cs('lv2mode_demo_check')}
          accessibilityState={{ disabled: host.phase !== 'success' && !host.canSubmit }}
          style={[
            styles.demoDockButton,
            {
              backgroundColor:
                host.phase === 'success'
                  ? t.bgSurface2
                  : host.canSubmit
                    ? t.accent
                    : t.bgSurface,
            },
          ]}
        >
          <Text
            style={[
              styles.demoDockButtonText,
              { color: host.phase === 'success' ? t.textPrimary : host.canSubmit ? t.correctText : t.textMuted },
            ]}
          >
            {host.phase === 'success' ? cs('lv2mode_demo_reset') : cs('lv2mode_demo_check')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Голосовой режим — отдельный демо-хост: не рендерит через общий роутер
 * (см. mode_router_v1.tsx), voiceStatus здесь статично 'idle' — реальный
 * hold-to-talk жест живёт в app/learning_v2_direct_session_player_v1.tsx и
 * умышленно не дублируется в витрине (риск конфликта с настоящим микрофоном). */
function ScriptedRepeatCompareShowcaseDemoV1() {
  const options: readonly LearningV2ModeOptionV1[] = [];
  const props = {
    family: 'scripted_repeat_compare' as const,
    phase: 'idle' as LearningV2ModePhaseV1,
    prompt: cs('lv2mode_repeat_compare_prompt'),
    options,
    selectedChoiceId: null,
    orderedResponseIds: [],
    wrongNudge: { responseId: null, token: 0 },
    reducedMotion: false,
    resolved: false,
    explanation: null,
    onPick: () => {},
    onAppendToken: () => {},
    onUndoToken: () => {},
    onPlaySelectableAudio: () => {},
    onPlayFullPhraseAudio: null,
    onSubmit: () => {},
    canSubmit: false,
    voiceStatus: 'idle' as const,
    transcript: '',
    instruction: cs('lv2mode_repeat_compare_instruction'),
  };
  return (
    <View style={styles.stage}>
      <ScriptedRepeatCompareModeV1 {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { paddingVertical: 4 },
  demoDock: { marginTop: 14 },
  demoDockButton: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoDockButtonText: { fontWeight: '800', fontSize: 15 },
});

const DETAIL = (family: LearningV2ActivityFamilyCode) => MODE_MOCKUP_LABEL_BY_FAMILY_V1[family];

export const SECTION: ShowcaseSection = {
  id: 'learning_v2_modes',
  order: 61,
  title: cs('lv2modes_section_title'),
  items: [
    {
      id: 'learning-v2-mode-phrase-builder-hybrid',
      title: cs('lv2mode_phrase_builder_title'),
      detail: DETAIL('phrase_builder'),
      kind: 'render',
      render: () => (
        <LearningV2ModeShowcaseDemoV1
          family="phrase_builder"
          prompt={cs('lv2mode_phrase_builder_prompt')}
          options={[
            { responseId: 'nice', text: 'Nice' },
            { responseId: 'to', text: 'to' },
            { responseId: 'meet', text: 'meet' },
            { responseId: 'you', text: 'you' },
            { responseId: 'meets', text: 'meets' },
            { responseId: 'meeting', text: 'meeting' },
          ]}
          correctResponseId="nice to meet you"
          inputMode="ordered_tokens"
          explanation={cs('lv2mode_phrase_builder_explanation')}
        />
      ),
    },
    {
      id: 'learning-v2-mode-listen-choose-hybrid',
      title: cs('lv2mode_listen_choose_title'),
      detail: DETAIL('listen_choose'),
      kind: 'render',
      render: () => (
        <LearningV2ModeShowcaseDemoV1
          family="listen_choose"
          prompt={cs('lv2mode_listen_choose_prompt')}
          options={[
            { responseId: 'nice-to-meet-you', text: 'Nice to meet you' },
            { responseId: 'my-name-is-anna', text: 'My name is Anna' },
            { responseId: 'see-you-later', text: 'See you later' },
          ]}
          correctResponseId="nice-to-meet-you"
          inputMode="single_choice"
          explanation={cs('lv2mode_listen_choose_explanation')}
        />
      ),
    },
    {
      id: 'learning-v2-mode-sound-contrast-hybrid',
      title: cs('lv2mode_sound_contrast_title'),
      detail: DETAIL('sound_contrast'),
      kind: 'render',
      render: () => (
        <LearningV2ModeShowcaseDemoV1
          family="sound_contrast"
          prompt={cs('lv2mode_sound_contrast_prompt')}
          options={[
            { responseId: 'ship', text: 'ship  /ʃɪp/' },
            { responseId: 'sheep', text: 'sheep  /ʃiːp/' },
          ]}
          correctResponseId="sheep"
          inputMode="single_choice"
          explanation={cs('lv2mode_sound_contrast_explanation')}
        />
      ),
    },
    {
      id: 'learning-v2-mode-listen-build-dictation-hybrid',
      title: cs('lv2mode_listen_build_title'),
      detail: DETAIL('listen_build_dictation'),
      kind: 'render',
      render: () => (
        <LearningV2ModeShowcaseDemoV1
          family="listen_build_dictation"
          prompt={cs('lv2mode_listen_build_prompt')}
          options={[
            { responseId: 'my', text: 'My' },
            { responseId: 'name', text: 'name' },
            { responseId: 'is', text: 'is' },
            { responseId: 'anna', text: 'Anna' },
            { responseId: 'names', text: 'names' },
            { responseId: 'am', text: 'am' },
          ]}
          correctResponseId="my name is anna"
          inputMode="ordered_tokens"
          explanation={cs('lv2mode_listen_build_explanation')}
        />
      ),
    },
    {
      id: 'learning-v2-mode-context-gap-grammar-hybrid',
      title: cs('lv2mode_context_gap_title'),
      detail: DETAIL('context_gap_grammar'),
      kind: 'render',
      render: () => (
        <LearningV2ModeShowcaseDemoV1
          family="context_gap_grammar"
          prompt={cs('lv2mode_context_gap_prompt')}
          options={[
            { responseId: 'is', text: 'Is' },
            { responseId: 'are', text: 'Are' },
            { responseId: 'do', text: 'Do' },
          ]}
          correctResponseId="are"
          inputMode="single_choice"
          explanation={cs('lv2mode_context_gap_explanation')}
        />
      ),
    },
    {
      id: 'learning-v2-mode-speed-match-hybrid',
      title: cs('lv2mode_speed_match_title'),
      detail: DETAIL('speed_match'),
      kind: 'render',
      render: () => (
        <LearningV2ModeShowcaseDemoV1
          family="speed_match"
          prompt={cs('lv2mode_speed_match_prompt')}
          options={[
            { responseId: 'are-you-tired', text: 'Are you tired?' },
            { responseId: 'is-you-tired', text: 'Is you tired?' },
            { responseId: 'do-you-tired', text: 'Do you tired?' },
          ]}
          correctResponseId="are-you-tired"
          inputMode="single_choice"
          explanation={cs('lv2mode_speed_match_explanation')}
        />
      ),
    },
    {
      id: 'learning-v2-mode-scripted-repeat-compare-hybrid',
      title: cs('lv2mode_repeat_compare_title'),
      detail: `${DETAIL('scripted_repeat_compare')} · ${cs('lv2mode_repeat_compare_mic_note')}`,
      kind: 'render',
      render: () => <ScriptedRepeatCompareShowcaseDemoV1 />,
    },
  ],
};
