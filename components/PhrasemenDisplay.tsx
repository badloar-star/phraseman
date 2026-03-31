// ════════════════════════════════════════════════════════════════════════════
// PhrasemenDisplay.tsx — Компонент для отображения баланса фразменов
// ════════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { getPhrasemenBalance } from '@/app/phrasemen_system';

interface PhrasemenDisplayProps {
  refreshTrigger?: number;
  style?: any;
}

export function PhrasemenDisplay({ refreshTrigger, style }: PhrasemenDisplayProps) {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBalance = async () => {
      try {
        setLoading(true);
        const current = await getPhrasemenBalance();
        setBalance(current);
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    loadBalance();
  }, [refreshTrigger]);

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.icon}>⭐</Text>
      <Text style={styles.balance}>{balance}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFA500',
    borderRadius: 8,
    gap: 4,
  },
  icon: {
    fontSize: 18,
  },
  balance: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
