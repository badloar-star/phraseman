import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(
  path.join(__dirname, '..', 'components', 'paywall', 'PaywallPlanCards.tsx'),
  'utf8',
);

describe('legacy paywall lifetime offer disclosure', () => {
  it('shows only subscription cards initially and reveals Phraseman Pro on demand', () => {
    expect(source).toContain("import { View, Text, TouchableOpacity, Pressable, StyleSheet } from 'react-native';");
    expect(source).toContain('const [showLifetimeOffer, setShowLifetimeOffer] = React.useState(false);');
    expect(source).toContain("const lifetimeOfferExpanded = showLifetimeOffer || selected === 'lifetime';");
    expect(source).toContain('accessibilityState={{ expanded: lifetimeOfferExpanded, disabled: !!disabled }}');
    expect(source).toContain('accessibilityRole="radio"');
    expect(source).toContain('accessibilityState={{ selected: sel, disabled: !!disabled }}');
    expect(source).toContain('lifetimeAvailable && lifetimeOfferExpanded && renderCard(');
    expect(source).not.toContain('lifetimeAvailable && renderCard(');
  });

  it('does not leave an invisible lifetime selection after the offer is collapsed', () => {
    expect(source).toContain("if (!nextExpanded && selected === 'lifetime') onSelect('yearly');");
    expect(source).toContain('minHeight: 48');
  });
});
