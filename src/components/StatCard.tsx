import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';

interface StatCardProps {
  label: string;
  value: string;
  accentColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, accentColor = colors.primary }) => (
  <View style={[styles.card, { borderColor: accentColor }]}> 
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: 12
  },
  label: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 4
  },
  value: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text
  }
});
