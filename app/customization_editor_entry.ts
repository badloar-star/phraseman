import type { CustomizationAction, CustomizationTab } from './customization_draft';

export type CustomizationEditorEntryDecision = Readonly<{
  opensEditor: boolean;
  usesEditorLabel: boolean;
  /** Presentation-only action. It may differ solely to keep an unchanged editor CTA visible. */
  actionBarAction: CustomizationAction;
  /** Canonical economy/access action; never rewritten by this UI helper. */
  economicAction: CustomizationAction;
}>;

export function resolveCustomizationEditorEntry(input: Readonly<{
  activeTab: CustomizationTab;
  hasCustomAvatar: boolean;
  resolvedAction: CustomizationAction;
}>): CustomizationEditorEntryDecision {
  const action = input.resolvedAction;
  const editableAction = action.kind === 'unchanged'
    || action.kind === 'apply'
    || ((action.kind === 'buy-only' || action.kind === 'buy-and-apply') && action.target === 'avatar');
  const opensEditor = input.activeTab === 'avatars' && input.hasCustomAvatar && editableAction;

  if (!opensEditor) {
    return {
      opensEditor: false,
      usesEditorLabel: false,
      actionBarAction: action,
      economicAction: action,
    };
  }
  return {
    opensEditor: true,
    usesEditorLabel: true,
    // `unchanged` means no economic work, but ActionBar also interprets it as
    // hidden. Feed it a visible presentation action without mutating semantics.
    actionBarAction: action.kind === 'unchanged' ? { kind: 'apply' } : action,
    economicAction: action,
  };
}
