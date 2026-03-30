import React from 'react';
import { View } from 'react-native';
import { useScreen } from '../hooks/use-screen';

// Ограничивает ширину контента на планшетах и Galaxy Fold (развёрнутый).
// На телефонах ширина ≤ contentMaxW — занимает всю ширину.
// Используй внутри SafeAreaView вместо прямых дочерних элементов.

export default function ContentWrap({ children }: { children: React.ReactNode }) {
  const { contentMaxW } = useScreen();
  return (
    <View style={{ flex: 1, maxWidth: contentMaxW, width: '100%', alignSelf: 'center' }}>
      {children}
    </View>
  );
}
