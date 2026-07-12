export type ModalPresentationState = { presented: boolean; closeRun: number };

export type ModalTransition =
  | { kind: 'open'; state: ModalPresentationState }
  | { kind: 'close'; run: number; state: ModalPresentationState }
  | { kind: 'idle'; state: ModalPresentationState };

export function nextModalTransition(state: ModalPresentationState, visible: boolean): ModalTransition {
  if (visible) return { kind: 'open', state: { presented: true, closeRun: state.closeRun + 1 } };
  if (!state.presented) return { kind: 'idle', state };
  const run = state.closeRun + 1;
  return { kind: 'close', run, state: { presented: true, closeRun: run } };
}

export function completeModalClose(state: ModalPresentationState, run: number): ModalPresentationState {
  return state.closeRun === run ? { ...state, presented: false } : state;
}
