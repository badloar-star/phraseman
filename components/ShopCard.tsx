// ════════════════════════════════════════════════════════════════════════════
// ShopCard.tsx — Карточка товара в магазине фразменов
// ════════════════════════════════════════════════════════════════════════════
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { ShopItem } from '@/app/types/shop';

interface ShopCardProps {
  item: ShopItem;
  isAffordable: boolean;
  onPress: () => void;
  isLoading?: boolean;
}

export function ShopCard({ item, isAffordable, onPress, isLoading = false }: ShopCardProps) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        !isAffordable && styles.disabled,
        isLoading && styles.loading,
      ]}
      onPress={onPress}
      disabled={!isAffordable || isLoading}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.icon}>{item.icon}</Text>
        <View style={styles.title}>
          <Text style={styles.titleText}>{item.titleRU}</Text>
          <Text style={styles.descriptionText}>{item.descriptionRU}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.priceTag}>
          <Text style={styles.priceIcon}>⭐</Text>
          <Text style={styles.priceText}>{item.price}</Text>
        </View>
        <Text
          style={[
            styles.status,
            isAffordable ? styles.statusAvailable : styles.statusNotAffordable,
          ]}
        >
          {isLoading ? '...' : isAffordable ? 'Купить' : 'Недостаточно'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabled: {
    opacity: 0.5,
  },
  loading: {
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  icon: {
    fontSize: 32,
    marginTop: 4,
  },
  title: {
    flex: 1,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFA50020',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  priceIcon: {
    fontSize: 14,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFA500',
  },
  status: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusAvailable: {
    backgroundColor: '#4CAF50',
    color: '#FFF',
  },
  statusNotAffordable: {
    backgroundColor: '#CCC',
    color: '#666',
  },
});
