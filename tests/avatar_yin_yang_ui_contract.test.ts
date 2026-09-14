import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (...parts: string[]) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');

describe('single light avatar UI contract', () => {
  it('removes the Yin and Yang selector and its accessibility copy', () => {
    const controls = read('components', 'customization', 'CustomizationControls.tsx');
    const screen = read('app', 'avatar_select.tsx');
    const editor = read('components', 'customization', 'AvatarEditorSheet.tsx');

    for (const source of [controls, screen, editor]) {
      expect(source).not.toContain('YinYangControl');
      expect(source).not.toContain('avatar-side-');
      expect(source).not.toContain('Инь');
      expect(source).not.toContain('Янь');
    }
  });

  it('routes avatar cards and editor purchases through white art and pearls only', () => {
    const screen = read('app', 'avatar_select.tsx');
    const catalog = read('app', 'customization_catalog.ts');
    const validation = read('app', 'customization_purchase_validation.ts');
    const editor = read('components', 'customization', 'AvatarEditorSheet.tsx');

    expect(screen).toContain("tierCurrency={item.kind === 'custom-avatar' ? 'pearls' : undefined}");
    expect(screen).not.toContain('getCustomAvatarRuneCost');
    expect(screen).not.toContain('avatarSide');
    expect(catalog).toContain("? { kind: 'shards' as const, cost: getCustomAvatarPurchaseCost(avatar) }");
    expect(catalog).not.toContain("kind: 'runes' as const, cost: getCustomAvatarRuneCost");
    expect(validation).toContain("if (currency !== 'pearls') return false");
    expect(editor).toContain('logoColor="white"');
    expect(editor).not.toContain('onLogoColorChange');
  });

  it('keeps one primary action by removing edit from the hero', () => {
    const hero = read('components', 'customization', 'CustomizationHero.tsx');

    expect(hero).not.toContain('onEdit');
    expect(hero).not.toContain('editLabel');
    expect(hero).not.toContain('customization-hero-edit-chip');
  });

  it('takes editor confirmation price from the resolved action', () => {
    const editor = read('components', 'customization', 'AvatarEditorSheet.tsx');
    const screen = read('app', 'avatar_select.tsx');

    expect(editor).toContain('confirmPrice');
    expect(editor).toContain('confirmLabel');
    expect(editor).toContain('busy');
    expect(editor).not.toContain('CUSTOM_AVATAR_RESTYLE_COST');
    expect(screen).toContain('const editorResolvedAction = resolveCustomizationAction');
    expect(screen).toContain('const editorActionPrice: CustomizationPriceValue | null');
    expect(screen).toContain('confirmPrice={editorActionPrice}');
    expect(screen).toContain('onConfirm={handleEditorConfirm}');
    expect(screen).not.toContain('pendingApplyAfterEditor');
    expect(screen).toContain("ru: 'Не хватает рун'");
    expect(screen).toContain("ru: 'Не хватает жемчуга'");
    expect(screen).toContain("router.push('/runes_wallet')");
    expect(screen).toContain("pathname: '/shards_shop'");
    expect(screen).toContain('subscribeRunesSnapshot');
    expect(screen).toContain("onAppEvent('shards_balance_updated'");
    expect(screen).toContain('resolveCustomizationPurchaseCta');
    expect(screen).not.toContain('runeShortage');
    expect(screen).not.toContain('!runeShortage &&');
  });

  it('uses one flat accessible Pressable surface for the editor CTA', () => {
    const editor = read('components', 'customization', 'AvatarEditorSheet.tsx');
    const screen = read('app', 'avatar_select.tsx');

    expect(editor).toContain("import { Pressable, StyleSheet, Text, View } from 'react-native'");
    expect(editor).toContain('testID="avatar-editor-confirm"');
    expect(editor).toContain('minHeight: 56');
    expect(editor).toContain('backgroundColor: t.accent');
    expect(editor).toContain('color: t.correctText');
    expect(editor).toContain('<CustomizationPrice price={props.confirmPrice} color={t.correctText} />');
    expect(editor).toContain('accessibilityState={{ disabled: props.busy }}');
    expect(editor).toContain('accessibilityLabel={props.confirmAccessibilityLabel}');
    expect(screen).toContain('confirmAccessibilityLabel={editorConfirmAccessibilityLabel}');
    expect(editor).not.toContain('DuoPressable');
    expect(editor).not.toContain('edgeColor=');
    expect(editor).not.toContain('edgeHeight=');
  });

  it('keeps the active Avatar100 editor CTA visible without overriding blockers', () => {
    const screen = read('app', 'avatar_select.tsx');
    const entry = read('app', 'customization_editor_entry.ts');

    expect(screen).toContain('resolveCustomizationEditorEntry');
    expect(screen).toContain('const actionBarAction = editorEntryDecision.actionBarAction');
    expect(screen).toContain('action={actionBarAction}');
    const handleActionIndex = screen.indexOf('const handleAction');
    expect(screen.indexOf('if (bottomOpensEditor)', handleActionIndex)).toBeLessThan(
      screen.indexOf("if (resolvedAction.kind === 'unchanged') return", handleActionIndex),
    );
    expect(entry).toContain("action.kind === 'unchanged' ? { kind: 'apply' } : action");
    for (const blocker of ['open-plus', 'explain-pro-reward', 'explain-level', 'explain-reward']) {
      expect(entry).not.toContain(`action.kind === '${blocker}' ||`);
    }
  });
});
