// ═══════════════════════════════════════════════════════════════════════════
// dialogs_scene_preview_fixtures.ts — моки для dev-входа /dev_dialogs_scene_preview («Сцена» «Диалогов»), только разработка.
//
// зачем (координатор 21.10; Сверка снимает состояния рядом с docs/design/v2-app/dialogs-scene-states.html): состояние берётся не «руками», а из ВХОДА настоящей
// функции pickDialogsSceneState — мок задаёт только то, что телефон знает (согласие, сеть, остаток, пройдено), поэтому проверяется и приоритет. Тексты диалогов,
// миры и собеседники — русские, дословно из эталона (константа D); собеседники в карточках — склонённые («с Мариной»). Ничего не читает из сети и хранилища.
// ═══════════════════════════════════════════════════════════════════════════
import type { Lang } from '../../../constants/i18n';
import type { DialogsSceneCardData } from './DialogsScenePanel';
import {
  dialogsSceneGoalsLabel, dialogsSceneText, type DialogsSceneDialogInfo,
} from './dialogs_scene_copy';
import { DIALOGS_SCENE_STATES, type DialogsSceneInput, type DialogsSceneState } from './dialogs_scene_state';

export const DIALOGS_SCENE_PREVIEW_STATES = DIALOGS_SCENE_STATES;
export type DialogsScenePreviewState = DialogsSceneState;

export function isDialogsScenePreviewState(value: unknown): value is DialogsScenePreviewState {
  return typeof value === 'string' && (DIALOGS_SCENE_PREVIEW_STATES as readonly string[]).includes(value);
}

export const DIALOGS_SCENE_PREVIEW_QUOTA_TOTAL = 30;
export const DIALOGS_SCENE_PREVIEW_TOTAL = 76;
/** Free: сколько раз в день можно ответить голосом (эталон: «голосом 3 раза в день»). */
export const DIALOGS_SCENE_PREVIEW_VOICE_PER_DAY = 3;

type WorldId = 'social' | 'work' | 'travel' | 'everyday';
const WORLD: Readonly<Record<WorldId, Readonly<{ label: string; icon: DialogsSceneDialogInfo['worldIcon'] }>>> = {
  social: { label: 'Общение', icon: 'people-outline' },
  work: { label: 'Дела', icon: 'briefcase-outline' },
  travel: { label: 'Поездки', icon: 'airplane-outline' },
  everyday: { label: 'Повседневное', icon: 'cafe-outline' },
};

type MockDialog = Readonly<{ id: string; world: WorldId; title: string; goals: number; first: string; who: string; whoInstrumental: string; initial: string }>;

const D: Readonly<Record<string, MockDialog>> = {
  social_01: { id: 'social_01', world: 'social', title: 'Поздороваться после знакомства', goals: 6, first: 'начать с приветствия', who: 'Мила', whoInstrumental: 'Милой', initial: 'М' },
  work_01: { id: 'work_01', world: 'work', title: 'Представиться коллеге', goals: 6, first: 'поздороваться', who: 'Марина', whoInstrumental: 'Мариной', initial: 'М' },
  travel_02: { id: 'travel_02', world: 'travel', title: 'Спросить код от двери', goals: 6, first: 'обратиться вежливо', who: 'Нико', whoInstrumental: 'Нико', initial: 'Н' },
  everyday_01: { id: 'everyday_01', world: 'everyday', title: 'Спросить совет', goals: 6, first: 'поздороваться', who: 'Ира', whoInstrumental: 'Ирой', initial: 'И' },
  social_19: { id: 'social_19', world: 'social', title: 'Урегулировать тонкий конфликт в группе', goals: 8, first: 'обратиться к группе', who: 'Мила', whoInstrumental: 'Милой', initial: 'М' },
};

function dialogInfo(id: keyof typeof D, goalsDone: number | null = null): DialogsSceneDialogInfo {
  const d = D[id];
  return { world: WORLD[d.world].label, worldIcon: WORLD[d.world].icon, who: d.whoInstrumental, title: d.title, goals: d.goals, goalsDone };
}

export type DialogsScenePreviewSetup = Readonly<{
  input: DialogsSceneInput;
  dialog: DialogsSceneDialogInfo;
  following: DialogsSceneDialogInfo;
  /** Дата обновления ответов месяца («1 ноября»); у Free в состоянии limit. */
  resetDate: Date;
}>;

const BASE_INPUT: DialogsSceneInput = {
  consent: true, offline: false, plus: false, quotaRemaining: 28, doneCount: 12, totalCount: DIALOGS_SCENE_PREVIEW_TOTAL, dayDone: false,
};

/** Вход функции состояния для каждого из восьми состояний; `plus` — тот же экран у Plus («∞ Без лимита»). */
export function dialogsScenePreviewSetup(state: DialogsScenePreviewState, plus = false): DialogsScenePreviewSetup {
  const patch: Partial<DialogsSceneInput> = (() => {
    switch (state) {
      case 'consent': return { consent: false };
      case 'offline': return { offline: true };
      case 'limit': return { quotaRemaining: 0 };
      case 'first': return { doneCount: 0 };
      case 'low': return { quotaRemaining: 3 };
      case 'all_done': return { doneCount: DIALOGS_SCENE_PREVIEW_TOTAL };
      case 'day_done': return { dayDone: true };
      case 'next': return {};
    }
  })();
  // у Plus остатка нет: «лимит» и «мало ответов» не бывают; остальные состояния — как у Free
  const input: DialogsSceneInput = plus ? { ...BASE_INPUT, ...patch, plus: true, quotaRemaining: null } : { ...BASE_INPUT, ...patch };
  return {
    input,
    dialog: dialogInfo('social_01'),
    following: dialogInfo('travel_02'),
    // 1 ноября 2026 — как в эталоне («Новые ответы 1 ноября»)
    resetDate: new Date(2026, 10, 1),
  };
}

/** Карточки панели под сценой (эталон dialogsPanel: четыре диалога, последний пройден). */
export function dialogsScenePreviewCards(lang: Lang): readonly DialogsSceneCardData[] {
  const [before = '', after = ''] = dialogsSceneText(lang, 'withWho', { who: '\u0000' }).split('\u0000');
  const make = (id: keyof typeof D, status: DialogsSceneCardData['status'], ring: string | null = null): DialogsSceneCardData => {
    const d = D[id];
    const w = WORLD[d.world];
    return {
      id: d.id, worldId: d.world, lockLine: null, world: w.label, worldIcon: w.icon, title: d.title,
      goalsLine: `${dialogsSceneGoalsLabel(lang, d.goals)} · ${dialogsSceneText(lang, 'firstGoal', { goal: d.first })}`,
      initials: [d.initial], whoBefore: before, whoName: d.whoInstrumental, whoAfter: after, status, ring,
    };
  };
  return [make('work_01', 'new'), make('travel_02', 'new'), make('social_19', 'new'), make('everyday_01', 'done')];
}

export const DIALOGS_SCENE_PREVIEW_WORLDS: readonly Readonly<{ id: string; label: string }>[] = [
  { id: 'all', label: 'Все' },
  ...(Object.keys(WORLD) as WorldId[]).map((id) => ({ id, label: WORLD[id].label })),
];
