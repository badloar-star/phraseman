// зачем: RN-порт source/src/surfaces/mobile/shared/ChoiceShell.tsx — общая геометрия
// для семейства «выбор» (VD/LC/SM): PromptZone → ResponseZone → FeedbackSheet →
// ActionDock. Оборачивает ActivityShell, чтобы полосы не двигались между состояниями.
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActivityShell } from './ActivityShell';
import { FeedbackNote } from './components';
import { useLab } from './LabState';
import { SPACE, STATE_META, type ModeAccent } from './tokens';

/** copy.* из фикстур Kimi: лейблы primary и строки статуса по шести состояниям. */
export interface StateCopy {
  readonly primaryActions: Record<string, string>;
  readonly statusMessages: Record<string, string>;
}

export interface ChoiceShellProps {
  readonly surfaceId: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly copy: StateCopy;
  /** PromptZone (сцена, плеер, бриф). Не размонтируется во время processing. */
  readonly promptZone: React.ReactNode;
  /** ResponseZone (варианты, пары). */
  readonly children: React.ReactNode;
  /** Заметка успеха (раскрытая фраза, контраст…). */
  readonly successNote?: string;
  /** Заметка needs_work — спокойная подсказка, никогда не «НЕВЕРНО». */
  readonly missHint: string;
  readonly recoveryNote?: string;
  readonly primaryPayload?: Record<string, unknown>;
  readonly primaryDisabled?: boolean;
  readonly secondaryAction?: { label: string; intent: string; payload?: unknown };
  readonly mode?: ModeAccent;
  readonly conditionChips?: React.ReactNode;
}

export const ChoiceShell = memo(function ChoiceShell(props: ChoiceShellProps) {
  const lab = useLab();
  const state = lab.canonicalState;
  const meta = STATE_META[state];

  return (
    <ActivityShell
      surfaceId={props.surfaceId}
      state={state}
      mode={props.mode}
      title={props.title}
      subtitle={props.subtitle}
      prompt={<View style={s.prompt}>{props.promptZone}</View>}
      statusMessage={props.copy.statusMessages[state] ?? ''}
      feedback={
        <FeedbackNote
          state={state}
          success={props.successNote ? `✓ ${props.successNote}` : undefined}
          needsWork={props.missHint}
          recovery={props.recoveryNote}
        />
      }
      primaryAction={{
        label: props.copy.primaryActions[state] ?? meta.label,
        intent: meta.primaryIntent,
        payload: { state, ...props.primaryPayload },
      }}
      primaryDisabled={props.primaryDisabled}
      secondaryAction={props.secondaryAction}
      conditionChips={props.conditionChips}
      onIntent={lab.logIntent}
    >
      {props.children}
    </ActivityShell>
  );
});

const s = StyleSheet.create({
  prompt: { gap: SPACE.s2 },
});
