import { PropsWithChildren, useState } from 'react';
import { Animated, StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/components/ThemeContext';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { configureAccordionLayout } from '@/constants/layoutAnimation';
import { useAccordionChevronStyle } from '@/hooks/useAccordionFaqStyle';

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const { theme } = useTheme();
  const { rotate, chevronOpacity, chevronScale } = useAccordionChevronStyle(isOpen, 'right');

  return (
    <ThemedView>
      <TouchableOpacity
        style={styles.heading}
        onPress={() => {
          configureAccordionLayout();
          setIsOpen((v) => !v);
        }}
        activeOpacity={0.8}>
        <Animated.View style={{ opacity: chevronOpacity, transform: [{ rotate }, { scale: chevronScale }] }}>
          <IconSymbol
            name="chevron.right"
            size={18}
            weight="medium"
            color={theme.textSecond}
          />
        </Animated.View>

        <ThemedText type="defaultSemiBold">{title}</ThemedText>
      </TouchableOpacity>
      {isOpen && <ThemedView style={styles.content}>{children}</ThemedView>}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  content: {
    marginTop: 6,
    marginLeft: 24,
  },
});
