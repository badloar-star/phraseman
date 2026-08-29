import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (...parts: string[]) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');

describe('avatar Yin Yang UI contract', () => {
  it('shows only the short Yin and Yang labels in the side selector', () => {
    const controls = read('components', 'customization', 'CustomizationControls.tsx');
    const screen = read('app', 'avatar_select.tsx');

    expect(controls).toContain("{ id: 'yin' as const, label: 'Инь' }");
    expect(controls).toContain("{ id: 'yang' as const, label: 'Янь' }");
    expect(controls).not.toMatch(/Инь[^\n]{0,30}ч[её]рн/iu);
    expect(controls).not.toMatch(/Янь[^\n]{0,30}светл/iu);
    expect(controls).not.toContain('цена в рунах');
    expect(controls).not.toContain('цена в жемчугах');
    expect(controls).toContain('accessibilityRole="tab"');
    expect(controls).toContain('accessibilityState={{ selected }}');
    for (const phrase of [
      "'pt-BR': 'Yin, visual preto, pagamento com runas'",
      "vi: 'Yin, diện mạo màu đen, thanh toán bằng rune'",
      "id: 'Yin, tampilan hitam, bayar dengan rune'",
      "tr: 'Yin, siyah görünüm, rünlerle ödeme'",
      "pl: 'Yin, czarny wygląd, płatność runami'",
      "'pt-BR': 'Yang, visual claro, pagamento com pérolas'",
      "vi: 'Yang, diện mạo sáng, thanh toán bằng ngọc trai'",
      "id: 'Yang, tampilan terang, bayar dengan mutiara'",
      "tr: 'Yang, açık görünüm, incilerle ödeme'",
      "pl: 'Yang, jasny wygląd, płatność perłami'",
    ]) expect(screen).toContain(phrase);
  });

  it('renders the canonical currency glyph for cards and actions', () => {
    const controls = read('components', 'customization', 'CustomizationControls.tsx');
    const card = read('components', 'customization', 'CustomizationCatalogCard.tsx');
    const screen = read('app', 'avatar_select.tsx');

    expect(controls).toContain("price.currency === 'runes'");
    expect(controls).toContain('<RuneGlyph');
    expect(card).toContain("a.kind === 'runes'");
    expect(card).toContain('<RuneGlyph');
    expect(card).toContain("tierCurrency === 'runes'");
    expect(screen).toContain("avatarSide === 'yin' ? getCustomAvatarRuneCost(item.avatar)");
    expect(controls).toContain('t.correctText');
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
