// ═══════════════════════════════════════════════════════════════════════════
// DialogsScene.tsx — «Сцена» «Диалогов» целиком: выбор состояния, тексты, картинка героя, цвета темы.
//
// зачем (владелец 21.10 «и так же диалоги»; координатор: вариант A одобрен; эталоны dialogs-scene-concepts.html (v2) и dialogs-scene-states.html): раздел передаёт
// только то, что телефон уже знает (согласие, сеть, остаток ответов, пройденные диалоги, диалог засчитан сегодня, следующий диалог) — новых чтений базы нет.
// Здесь решение собирается в один кадр: pickDialogsSceneState → buildDialogsSceneCopy → resolveDialogsSceneArt → dialogsSceneColors из токенов выбранной темы.
// Журнал [DIALOGS-SCENE]: решение с причиной, картинка с источником, контраст текста на сцене (значения). Шапка (назад, энергия, аватар) — слоты раздела.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect, useMemo, useRef } from 'react';

import type { Lang } from '../../../constants/i18n';
import { useTheme } from '../../ThemeContext';
import { useLv2Glass } from '../../learning-v2/LearningV2Glass';
import DialogsSceneStage from './DialogsSceneStage';
import { resolveDialogsSceneArt } from './dialogs_scene_art';
import { buildDialogsSceneCopy, type DialogsSceneDialogInfo } from './dialogs_scene_copy';
import { pickDialogsSceneState, type DialogsSceneInput, type DialogsSceneState } from './dialogs_scene_state';
import { dialogsSceneColors, dialogsSceneContrast, DIALOGS_SCENE_MIN_TEXT_CONTRAST } from './dialogs_scene_tokens';

const LOG = '[DIALOGS-SCENE]';

export type DialogsSceneProps = Readonly<{
  lang: Lang;
  input: DialogsSceneInput;
  /** Диалог, на котором стоит сцена; null — каталога ещё нет. */
  dialog: DialogsSceneDialogInfo | null;
  /** Диалог после засчитанного сегодня (состояние day_done). */
  following: DialogsSceneDialogInfo | null;
  quotaTotal: number;
  resetDate: Date | null;
  voicePerDay: number | null;
  /** Id собеседника текущего диалога — нужен, только если героем выбран собеседник (dialogs_scene_art). */
  personaId?: string | null;
  topInset: number;
  topStart?: React.ReactNode;
  topEnd?: React.ReactNode;
  onCta: (state: DialogsSceneState) => void;
  onRound: (state: DialogsSceneState) => void;
}>;

function DialogsScene(p: DialogsSceneProps) {
  const g = useLv2Glass();
  const { liquidGlassAppearance } = useTheme();
  const { consent, offline, plus, quotaRemaining, doneCount, totalCount, dayDone } = p.input;
  const decision = useMemo(
    () => pickDialogsSceneState({ consent, offline, plus, quotaRemaining, doneCount, totalCount, dayDone }),
    [consent, offline, plus, quotaRemaining, doneCount, totalCount, dayDone],
  );
  const colors = useMemo(() => dialogsSceneColors(g), [g]);
  const art = useMemo(() => resolveDialogsSceneArt(decision.state, liquidGlassAppearance, p.personaId ?? null), [decision.state, liquidGlassAppearance, p.personaId]);
  const copy = useMemo(() => buildDialogsSceneCopy({
    lang: p.lang, state: decision.state, plus, dialog: p.dialog, following: p.following, quotaRemaining, quotaTotal: p.quotaTotal,
    resetDate: p.resetDate, voicePerDay: p.voicePerDay, doneCount, totalCount,
  }), [p.lang, decision.state, plus, p.dialog, p.following, quotaRemaining, p.quotaTotal, p.resetDate, p.voicePerDay, doneCount, totalCount]);

  const logKeyRef = useRef('');
  useEffect(() => {
    const key = `${decision.state}|${decision.reason}`;
    if (logKeyRef.current === key) return;
    logKeyRef.current = key;
    console.log(LOG, 'decision', JSON.stringify({ state: decision.state, reason: decision.reason, input: p.input, dialog: p.dialog ? p.dialog.title : null })); // guard-ok: одна строка на смену решения
  }, [decision, p.dialog, p.input]);
  useEffect(() => {
    const c = dialogsSceneContrast(g, colors);
    const low = c.text < DIALOGS_SCENE_MIN_TEXT_CONTRAST || c.secondary < DIALOGS_SCENE_MIN_TEXT_CONTRAST;
    console.log(LOG, 'art', JSON.stringify({ state: decision.state, name: art.name, origin: art.origin, kind: art.kind, tone: liquidGlassAppearance, hasBase: art.base !== null, contrast: { text: Number(c.text.toFixed(2)), secondary: Number(c.secondary.toFixed(2)), seam: Number(c.seam.toFixed(2)) }, belowMin: low })); // guard-ok: смена картинки или темы
  }, [art, colors, decision.state, g, liquidGlassAppearance]);

  return (
    <DialogsSceneStage
      state={decision.state}
      colors={colors}
      copy={copy}
      art={art.base}
      artAccent={art.accent}
      artDim={decision.state === 'offline' || decision.state === 'limit'}
      topInset={p.topInset}
      topStart={p.topStart}
      topEnd={p.topEnd}
      onCta={() => p.onCta(decision.state)}
      onRound={() => p.onRound(decision.state)}
    />
  );
}

export default memo(DialogsScene);
