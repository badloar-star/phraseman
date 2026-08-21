import { avatarCatalog } from './catalog';
import { canonicalizeAvatarDNA, parseAvatarDNA } from './canonicalize';
import type {
  AvatarCamera,
  AvatarCategory,
  AvatarDNA,
  AvatarDNAConflictNotice,
  AvatarDNAPurchaseIntent,
  AvatarItemManifest,
  AvatarSlot,
  ResolvedAvatarDNA,
} from './contracts';
import { resolveAvatarDNA } from './resolver';

export type AvatarDNAEditorMode = 'guided' | 'free';

type EditorPresent = Readonly<{
  chosenDNA: AvatarDNA;
  resolved: ResolvedAvatarDNA;
  notice: AvatarDNAConflictNotice | null;
  pendingPurchase: AvatarDNAPurchaseIntent | null;
}>;

export type AvatarDNAEditorState = Readonly<{
  mode: AvatarDNAEditorMode;
  guidedStep: 0 | 1 | 2 | 3;
  confirmedDNA: AvatarDNA;
  past: readonly AvatarDNA[];
  present: EditorPresent;
  future: readonly AvatarDNA[];
  dirty: boolean;
}>;

export type AvatarDNAEditorAction =
  | Readonly<{ type: 'select-item'; category: AvatarCategory; itemId: string }>
  | Readonly<{ type: 'set-camera'; camera: AvatarCamera }>
  | Readonly<{
    type: 'next-step' | 'previous-step' | 'undo' | 'redo' | 'dismiss-notice' | 'reset-to-confirmed';
  }>;

const HISTORY_LIMIT = 40;

const hasSlot = (item: AvatarItemManifest, slot: AvatarSlot): boolean => (
  item.layers.some((layer) => layer.slot === slot)
);

const toggleOptional = (current: string | null, itemId: string): string | null => (
  current === itemId ? null : itemId
);

const toggleListItem = (current: readonly string[], itemId: string): readonly string[] => (
  current.includes(itemId)
    ? current.filter((id) => id !== itemId)
    : [...current, itemId]
);

const chooseCatalogItem = (dna: AvatarDNA, item: AvatarItemManifest): AvatarDNA => {
  if (item.category === 'base') {
    if (item.id.startsWith('skin_')) {
      return parseAvatarDNA({ ...dna, base: { ...dna.base, skinToneId: item.id } });
    }
    if (hasSlot(item, 'face')) {
      return parseAvatarDNA({ ...dna, base: { ...dna.base, faceBaseId: item.id } });
    }
    if (hasSlot(item, 'body')) {
      return parseAvatarDNA({ ...dna, base: { ...dna.base, bodyBaseId: item.id } });
    }
  }

  if (item.category === 'face') {
    if (hasSlot(item, 'eyes')) return parseAvatarDNA({ ...dna, face: { ...dna.face, eyesId: item.id } });
    if (hasSlot(item, 'iris')) return parseAvatarDNA({ ...dna, face: { ...dna.face, irisColorId: item.id } });
    if (hasSlot(item, 'brows')) return parseAvatarDNA({ ...dna, face: { ...dna.face, browsId: item.id } });
    if (hasSlot(item, 'nose')) return parseAvatarDNA({ ...dna, face: { ...dna.face, noseId: item.id } });
    if (hasSlot(item, 'mouth')) return parseAvatarDNA({ ...dna, face: { ...dna.face, mouthId: item.id } });
    if (hasSlot(item, 'skin.detail')) return parseAvatarDNA({ ...dna, face: { ...dna.face, skinDetailIds: toggleListItem(dna.face.skinDetailIds, item.id) } });
    if (hasSlot(item, 'makeup')) return parseAvatarDNA({ ...dna, face: { ...dna.face, makeupIds: toggleListItem(dna.face.makeupIds, item.id) } });
    if (hasSlot(item, 'facial.hair')) return parseAvatarDNA({ ...dna, face: { ...dna.face, facialHairId: toggleOptional(dna.face.facialHairId, item.id) } });
  }

  if (item.category === 'hair') {
    if (item.layers.some((layer) => layer.slot === 'hair.back' || layer.slot === 'hair.side' || layer.slot === 'hair.front')) {
      return parseAvatarDNA({ ...dna, hair: { ...dna.hair, styleId: item.id } });
    }
    return parseAvatarDNA({ ...dna, hair: { ...dna.hair, colorId: item.id } });
  }

  if (item.category === 'look') {
    if (hasSlot(item, 'headwear.front') || hasSlot(item, 'hood.back')) return parseAvatarDNA({ ...dna, wearables: { ...dna.wearables, headwearId: toggleOptional(dna.wearables.headwearId, item.id) } });
    if (hasSlot(item, 'mask')) return parseAvatarDNA({ ...dna, wearables: { ...dna.wearables, maskId: toggleOptional(dna.wearables.maskId, item.id) } });
    if (hasSlot(item, 'eyewear')) return parseAvatarDNA({ ...dna, wearables: { ...dna.wearables, eyewearId: toggleOptional(dna.wearables.eyewearId, item.id) } });
    if (hasSlot(item, 'ear.accessory')) return parseAvatarDNA({ ...dna, wearables: { ...dna.wearables, earAccessoryId: toggleOptional(dna.wearables.earAccessoryId, item.id) } });
    if (hasSlot(item, 'neck.accessory')) return parseAvatarDNA({ ...dna, wearables: { ...dna.wearables, neckAccessoryId: toggleOptional(dna.wearables.neckAccessoryId, item.id) } });
    if (hasSlot(item, 'outfit') || hasSlot(item, 'outfit.back') || hasSlot(item, 'outfit.front')) return parseAvatarDNA({ ...dna, wearables: { ...dna.wearables, outfitId: item.id } });
  }

  if (item.category === 'scene') {
    if (hasSlot(item, 'background')) return parseAvatarDNA({ ...dna, scene: { ...dna.scene, backgroundId: item.id } });
    if (hasSlot(item, 'aura')) return parseAvatarDNA({ ...dna, scene: { ...dna.scene, auraId: toggleOptional(dna.scene.auraId, item.id) } });
    if (hasSlot(item, 'frame')) return parseAvatarDNA({ ...dna, scene: { ...dna.scene, frameId: toggleOptional(dna.scene.frameId, item.id) } });
    if (hasSlot(item, 'foreground.fx')) return parseAvatarDNA({ ...dna, scene: { ...dna.scene, foregroundFxId: toggleOptional(dna.scene.foregroundFxId, item.id) } });
  }

  throw new TypeError('avatar_editor_item_unsupported');
};

const presentFor = (
  chosenDNA: AvatarDNA,
  notice: AvatarDNAConflictNotice | null = null,
  resolved: ResolvedAvatarDNA = resolveAvatarDNA(chosenDNA, avatarCatalog),
): EditorPresent => ({
  chosenDNA: parseAvatarDNA(chosenDNA),
  resolved,
  notice,
  pendingPurchase: null,
});

const isDirty = (chosenDNA: AvatarDNA, confirmedDNA: AvatarDNA): boolean => (
  canonicalizeAvatarDNA(chosenDNA) !== canonicalizeAvatarDNA(confirmedDNA)
);

const noticeFor = (
  item: AvatarItemManifest,
  resolved: ResolvedAvatarDNA,
): AvatarDNAConflictNotice | null => {
  const hiddenSlots = item.occludes
    .filter((slot) => resolved.visibilityPlan.hiddenSlots.includes(slot))
    .sort();
  if (hiddenSlots.length === 0) return null;
  return {
    kind: 'occlusion',
    hiddenSlots,
    itemId: item.id,
  };
};

export const createAvatarDNAEditorState = (
  confirmedInput: unknown,
  mode: AvatarDNAEditorMode,
): AvatarDNAEditorState => {
  const confirmedDNA = parseAvatarDNA(confirmedInput);
  return {
    mode,
    guidedStep: 0,
    confirmedDNA,
    past: [],
    present: presentFor(confirmedDNA),
    future: [],
    dirty: false,
  };
};

export const avatarDNAEditorReducer = (
  state: AvatarDNAEditorState,
  action: AvatarDNAEditorAction,
): AvatarDNAEditorState => {
  if (action.type === 'set-camera') return state;
  if (action.type === 'dismiss-notice') {
    if (state.present.notice === null) return state;
    return { ...state, present: { ...state.present, notice: null, pendingPurchase: null } };
  }
  if (action.type === 'next-step' || action.type === 'previous-step') {
    if (state.mode !== 'guided') return state;
    const delta = action.type === 'next-step' ? 1 : -1;
    const guidedStep = Math.max(0, Math.min(3, state.guidedStep + delta)) as 0 | 1 | 2 | 3;
    return guidedStep === state.guidedStep ? state : { ...state, guidedStep };
  }
  if (action.type === 'reset-to-confirmed') {
    return {
      ...state,
      past: [],
      present: presentFor(state.confirmedDNA),
      future: [],
      dirty: false,
    };
  }
  if (action.type === 'undo') {
    if (state.past.length === 0) return state;
    const chosenDNA = state.past[state.past.length - 1];
    return {
      ...state,
      past: state.past.slice(0, -1),
      present: presentFor(chosenDNA),
      future: [state.present.chosenDNA, ...state.future].slice(0, HISTORY_LIMIT),
      dirty: isDirty(chosenDNA, state.confirmedDNA),
    };
  }
  if (action.type === 'redo') {
    if (state.future.length === 0) return state;
    const chosenDNA = state.future[0];
    return {
      ...state,
      past: [...state.past, state.present.chosenDNA].slice(-HISTORY_LIMIT),
      present: presentFor(chosenDNA),
      future: state.future.slice(1),
      dirty: isDirty(chosenDNA, state.confirmedDNA),
    };
  }

  if (action.type !== 'select-item') return state;
  const item = avatarCatalog.items.find((candidate) => candidate.id === action.itemId);
  if (!item || item.category !== action.category) return state;
  try {
    const chosenDNA = chooseCatalogItem(state.present.chosenDNA, item);
    if (canonicalizeAvatarDNA(chosenDNA) === canonicalizeAvatarDNA(state.present.chosenDNA)) {
      return state;
    }
    const resolved = resolveAvatarDNA(chosenDNA, avatarCatalog);
    return {
      ...state,
      past: [...state.past, state.present.chosenDNA].slice(-HISTORY_LIMIT),
      present: presentFor(chosenDNA, noticeFor(item, resolved), resolved),
      future: [],
      dirty: isDirty(chosenDNA, state.confirmedDNA),
    };
  } catch {
    return state;
  }
};
