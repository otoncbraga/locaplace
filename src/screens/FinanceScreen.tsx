import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuthContext } from '@/context/AuthContext';
import { colors } from '@/theme/colors';
import { Payment, Reservation } from '@/types';
import { listenPayments, listenReservations } from '@/services/firestore';
import { StatCard } from '@/components/StatCard';
import { PaymentList } from '@/components/PaymentList';

const FinanceScreen: React.FC = () => {
  const { user } = useAuthContext();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsubscribePayments = listenPayments(user.uid, setPayments);
    const unsubscribeReservations = listenReservations(user.uid, setReservations);
    return () => {
      unsubscribePayments();
      unsubscribeReservations();
    };
  }, [user]);

  const totalReceived = useMemo(
    () => payments.reduce((sum, payment) => sum + payment.amount, 0),
    [payments]
  );

  const totalFuture = useMemo(
    () => reservations.reduce((sum, reservation) => sum + Math.max(reservation.balance, 0), 0),
    [reservations]
  );

  const lastPayments = useMemo(() => payments.slice(0, 10), [payments]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Text style={styles.title}>Caixa</Text>
        <Text style={styles.subtitle}>Acompanhe as entradas confirmadas e futuras.</Text>

        <View style={styles.statsRow}>
          <StatCard label="Entradas recebidas" value={`R$${totalReceived.toFixed(2)}`} />
          <StatCard
            label="Entradas futuras"
            value={`R$${totalFuture.toFixed(2)}`}
            accentColor={colors.primaryDark}
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Últimos pagamentos</Text>
        </View>
        <PaymentList payments={lastPayments} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text
  },
  subtitle: {
    color: colors.muted,
    marginTop: 4,
    marginBottom: 24
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24
  },
  sectionHeader: {
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text
  }
});

export default FinanceScreen;
