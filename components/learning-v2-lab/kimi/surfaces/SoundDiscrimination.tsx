// зачем: дословный RN-порт source/src/surfaces/mobile/SoundDiscrimination.tsx —
// различение минимальных пар на слух. Варианты по условиям: оффлайн → чип состояния
// загрузки + постановка пака в очередь; разрешение отклонено → панель микрофона;
// recovery ничего не теряет. Акцент режима — listen.
import React, { memo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActivityShell } from '../ActivityShell';
import { Chip, FeedbackNote, OptionGrid, SignalButton } from '../components';
import { soundDiscriminationFixture } from '../fixtures/core';
import { useLab } from '../LabState';
import { GraphemeText, IntentButton } from '../primitives';
import { C, LEADING, RADIUS, SPACE, STATE_META, TEXT, WEIGHT } from '../tokens';

export const SoundDiscrimination = memo(function SoundDiscrimination() {
  const lab = useLab();
  const surfaceId = 'sound-discrimination';
  const vm = soundDiscriminationFixture;
  const state = lab.canonicalState;
  const meta = STATE_META[state];

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  const { online, permission } = lab.conditions;
  const reveal = state === 'success' || state === 'needs_work';
  const permissionBlocked = permission === 'denied';
  const showPermissionPanel =
    permissionBlocked && (state === 'recovery' || state === 'prompt' || state === 'active');

  return (
    <ActivityShell
      surfaceId={surfaceId}
      state={state}
      mode="listen"
      title={vm.title}
      subtitle={`${vm.signalLabel} · слушай внимательно`}
      prompt={<GraphemeText text={vm.promptLabel} maxGraphemes={120} style={s.promptText} />}
      statusMessage={
        permissionBlocked && state === 'recovery'
          ? vm.permissionPanel.title
          : (vm.copy.statusMessages[state] ?? '')
      }
      feedback={
        <View style={s.feedbackStack}>
          <FeedbackNote
            state={state}
            success={`✓ ${vm.successNote}`}
            needsWork={`↺ ${vm.needsWorkHint}`}
          />
          {showPermissionPanel ? (
            <View style={s.permPanel} accessibilityRole="alert">
              <GraphemeText text={vm.permissionPanel.title} maxGraphemes={60} style={s.permTitle} />
              <GraphemeText text={vm.permissionPanel.body} maxGraphemes={180} style={s.permBody} />
              <IntentButton
                surfaceId={surfaceId}
                intent="permission.open_settings"
                payload={{ simulated: true }}
                onIntent={lab.logIntent}
                variant="secondary"
                accessibilityLabel={vm.permissionPanel.actionLabel}
              >
                {vm.permissionPanel.actionLabel}
              </IntentButton>
            </View>
          ) : null}
        </View>
      }
      primaryAction={{
        label: vm.copy.primaryActions[state] ?? meta.label,
        intent: meta.primaryIntent,
        payload: { selectedOptionId, state, online, permission },
      }}
      secondaryAction={{ label: 'Why these three?', intent: 'activity.explain', payload: { state } }}
      onIntent={lab.logIntent}
    >
      <View style={s.body}>
        <SignalButton surfaceId={surfaceId} label={vm.signalLabel} disabled={state === 'processing'} />
        {!online ? (
          <View style={s.offline}>
            <Chip text={`⬇ ${vm.offlineChip}`} tone="warn" />
            <IntentButton
              surfaceId={surfaceId}
              intent="pack.queue_download"
              payload={{ packId: 'audio-pack-minimal-pairs', simulated: true }}
              onIntent={lab.logIntent}
              variant="ghost"
              accessibilityLabel={vm.downloadActionLabel}
            >
              {vm.downloadActionLabel}
            </IntentButton>
          </View>
        ) : null}
        <OptionGrid
          surfaceId={surfaceId}
          options={vm.options}
          correctOptionId={vm.correctOptionId}
          selectedId={selectedOptionId}
          onSelected={setSelectedOptionId}
          enabled={state === 'active'}
          reveal={reveal}
        />
      </View>
    </ActivityShell>
  );
});

const s = StyleSheet.create({
  body: { gap: SPACE.s4 },
  promptText: { fontSize: TEXT.md, color: C.fgPrimary, lineHeight: TEXT.md * LEADING.snug },
  offline: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: SPACE.s3 },
  feedbackStack: { gap: SPACE.s2 },
  permPanel: {
    gap: SPACE.s2,
    paddingVertical: SPACE.s3,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.md,
    backgroundColor: '#2A1B2B',
    alignItems: 'flex-start',
  },
  permTitle: { fontWeight: WEIGHT.bold, fontSize: TEXT.md, color: C.wrong },
  permBody: { fontSize: TEXT.sm, lineHeight: TEXT.sm * LEADING.snug, color: C.fgSecondary },
});
