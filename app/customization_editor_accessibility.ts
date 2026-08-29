export type CustomizationEditorAccessibilityPrice = Readonly<{
  currency: 'runes' | 'pearls';
  amount: number;
}>;

export function customizationEditorConfirmAccessibilityLabel(
  action: string,
  price: CustomizationEditorAccessibilityPrice | null,
  currencyLabels: Readonly<{ runes: string; pearls: string }>,
): string {
  if (!price) return action;
  const amount = Math.max(0, Math.floor(Number(price.amount) || 0));
  return `${action}, ${amount} ${currencyLabels[price.currency]}`;
}
