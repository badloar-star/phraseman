import { starterAvatarDNA } from '../modules/avatar-dna/catalog';
import { parseAvatarDNA } from '../modules/avatar-dna/canonicalize';
import {
  avatarDNAEditorReducer,
  createAvatarDNAEditorState,
} from '../modules/avatar-dna/editor_reducer';

const initialDNA = () => {
  const starter = starterAvatarDNA('starter_warm_01');
  return parseAvatarDNA({
    ...starter,
    hair: { ...starter.hair, styleId: 'hair_02' },
  });
};

describe('Avatar DNA editor reducer', () => {
  it('keeps hidden hair in chosen DNA and exposes one undoable hood notice', () => {
    const initial = createAvatarDNAEditorState(initialDNA(), 'free');
    const next = avatarDNAEditorReducer(initial, {
      type: 'select-item',
      category: 'look',
      itemId: 'headwear.assassin_hood.01',
    });

    expect(next.present.chosenDNA.hair.styleId).toBe('hair_02');
    expect(next.present.resolved.visibilityPlan.hiddenSlots).toEqual(['hair.front', 'ears']);
    expect(next.present.notice).toEqual({
      kind: 'occlusion',
      hiddenSlots: ['ears', 'hair.front'],
      itemId: 'headwear.assassin_hood.01',
    });
    expect(avatarDNAEditorReducer(next, { type: 'undo' }).present.chosenDNA.wearables.headwearId).toBeNull();
  });

  it('undo and redo never create purchase intents', () => {
    const initial = createAvatarDNAEditorState(initialDNA(), 'free');
    const changed = avatarDNAEditorReducer(initial, {
      type: 'select-item',
      category: 'look',
      itemId: 'headwear.assassin_hood.01',
    });
    const undone = avatarDNAEditorReducer(changed, { type: 'undo' });
    const redone = avatarDNAEditorReducer(undone, { type: 'redo' });

    expect(changed.present.pendingPurchase).toBeNull();
    expect(undone.present.pendingPurchase).toBeNull();
    expect(redone.present.pendingPurchase).toBeNull();
    expect(redone.present.chosenDNA.wearables.headwearId).toBe('headwear.assassin_hood.01');
  });

  it('removes an optional hood without leaving a stale occlusion notice', () => {
    const initial = createAvatarDNAEditorState(initialDNA(), 'free');
    const hooded = avatarDNAEditorReducer(initial, {
      type: 'select-item', category: 'look', itemId: 'headwear.assassin_hood.01',
    });
    const unhooded = avatarDNAEditorReducer(hooded, {
      type: 'select-item', category: 'look', itemId: 'headwear.assassin_hood.01',
    });

    expect(unhooded.present.chosenDNA.wearables.headwearId).toBeNull();
    expect(unhooded.present.chosenDNA.hair.styleId).toBe('hair_02');
    expect(unhooded.present.resolved.visibilityPlan.hiddenSlots).toEqual([]);
    expect(unhooded.present.notice).toBeNull();
  });

  it('does not store camera navigation or notice dismissal as DNA history', () => {
    const initial = createAvatarDNAEditorState(initialDNA(), 'free');
    const changed = avatarDNAEditorReducer(initial, {
      type: 'select-item', category: 'look', itemId: 'headwear.assassin_hood.01',
    });
    const dismissed = avatarDNAEditorReducer(changed, { type: 'dismiss-notice' });
    const navigated = avatarDNAEditorReducer(dismissed, { type: 'set-camera', camera: 'studio' });

    expect(dismissed.present.notice).toBeNull();
    expect(dismissed.past).toHaveLength(1);
    expect(navigated.past).toHaveLength(1);
    expect(navigated.present.chosenDNA).toEqual(changed.present.chosenDNA);
    expect(navigated.present.pendingPurchase).toBeNull();
  });

  it('caps DNA history at forty snapshots and clears redo after a new edit', () => {
    let state = createAvatarDNAEditorState(initialDNA(), 'free');
    for (let index = 0; index < 45; index += 1) {
      state = avatarDNAEditorReducer(state, {
        type: 'select-item', category: 'look', itemId: 'headwear.assassin_hood.01',
      });
    }
    expect(state.past).toHaveLength(40);

    const undone = avatarDNAEditorReducer(state, { type: 'undo' });
    expect(undone.future).toHaveLength(1);
    const edited = avatarDNAEditorReducer(undone, {
      type: 'select-item', category: 'look', itemId: 'headwear.assassin_hood.01',
    });
    expect(edited.future).toHaveLength(0);
  });

  it('resets exactly to confirmed DNA and clears dirty history', () => {
    const initial = createAvatarDNAEditorState(initialDNA(), 'free');
    const changed = avatarDNAEditorReducer(initial, {
      type: 'select-item', category: 'look', itemId: 'headwear.assassin_hood.01',
    });
    const reset = avatarDNAEditorReducer(changed, { type: 'reset-to-confirmed' });

    expect(changed.dirty).toBe(true);
    expect(reset.dirty).toBe(false);
    expect(reset.present.chosenDNA).toEqual(initial.confirmedDNA);
    expect(reset.past).toEqual([]);
    expect(reset.future).toEqual([]);
    expect(reset.present.notice).toBeNull();
  });

  it('clamps guided steps and ignores unknown or cross-category items', () => {
    let state = createAvatarDNAEditorState(initialDNA(), 'guided');
    state = avatarDNAEditorReducer(state, { type: 'previous-step' });
    expect(state.guidedStep).toBe(0);
    for (let index = 0; index < 5; index += 1) {
      state = avatarDNAEditorReducer(state, { type: 'next-step' });
    }
    expect(state.guidedStep).toBe(3);

    const unknown = avatarDNAEditorReducer(state, {
      type: 'select-item', category: 'look', itemId: 'missing_item',
    });
    const wrongCategory = avatarDNAEditorReducer(state, {
      type: 'select-item', category: 'scene', itemId: 'headwear.assassin_hood.01',
    });
    expect(unknown).toBe(state);
    expect(wrongCategory).toBe(state);
  });
});
