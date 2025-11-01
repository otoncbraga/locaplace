import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Payment } from '@/types';
import { colors } from '@/theme/colors';

interface PaymentListProps {
  payments: Payment[];
}

export const PaymentList: React.FC<PaymentListProps> = ({ payments }) => (
  <FlatList
    data={payments}
    keyExtractor={item => item.id}
    renderItem={({ item }) => (
      <View style={styles.item}>
        <View>
          <Text style={styles.amount}>R${item.amount.toFixed(2)}</Text>
          <Text style={styles.method}>{item.method}</Text>
        </View>
        <View style={styles.meta}>
          <Text style={styles.timestamp}>{new Date(item.timestamp).toLocaleString()}</Text>
          <Text style={styles.source}>{item.source.toUpperCase()}</Text>
        </View>
      </View>
    )}
    ListEmptyComponent={<Text style={styles.empty}>Nenhum pagamento registrado.</Text>}
  />
);

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  amount: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text
  },
  method: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 4
  },
  meta: {
    alignItems: 'flex-end'
  },
  timestamp: {
    fontSize: 12,
    color: colors.muted
  },
  source: {
    marginTop: 6,
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500'
  },
  empty: {
    textAlign: 'center',
    color: colors.muted,
    marginTop: 24
  }
});
