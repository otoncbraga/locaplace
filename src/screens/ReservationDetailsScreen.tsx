import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useAuthContext } from '@/context/AuthContext';
import { colors } from '@/theme/colors';
import { Payment, Reservation, ReservationTimelineEvent } from '@/types';
import {
  appendTimelineEvent,
  createPayment,
  getClient,
  getSpace,
  listenPaymentsForReservation,
  listenReservation,
  serverTimestamp,
  updateReservation
} from '@/services/firestore';
import { PaymentList } from '@/components/PaymentList';
import { TimelineItem } from '@/components/TimelineItem';
import { StatCard } from '@/components/StatCard';
import { nanoid } from 'nanoid/non-secure';

interface RouteParams {
  reservationId: string;
}

type DetailsRoute = RouteProp<Record<string, RouteParams>, string>;

const statusOptions: Reservation['status'][] = [
  'pre-reserva',
  'confirmada',
  'cancelada',
  'finalizada'
];

const ReservationDetailsScreen: React.FC = () => {
  const { user } = useAuthContext();
  const route = useRoute<DetailsRoute>();
  const [reservation, setReservation] = useState<Reservation | undefined>();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clientName, setClientName] = useState('');
  const [spaceName, setSpaceName] = useState('');
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'PIX', note: '' });

  useEffect(() => {
    const { reservationId } = route.params;
    const unsubscribeReservation = listenReservation(reservationId, setReservation);
    const unsubscribePayments = listenPaymentsForReservation(reservationId, setPayments);
    return () => {
      unsubscribeReservation();
      unsubscribePayments();
    };
  }, [route.params]);

  useEffect(() => {
    if (!reservation) return;
    (async () => {
      const client = await getClient(reservation.clientId);
      const space = await getSpace(reservation.spaceId);
      setClientName(client?.cleanName || client?.displayName || 'Cliente');
      setSpaceName(space?.name || 'Espaço');
    })();
  }, [reservation]);

  const balance = useMemo(() => {
    if (!reservation) return 0;
    return Math.max(reservation.balance, 0);
  }, [reservation]);

  const handleAddPayment = async () => {
    if (!reservation || !user) return;
    const amount = Number(paymentForm.amount.replace(',', '.')) || 0;
    if (amount <= 0) return;
    await createPayment(user.uid, {
      reservationId: reservation.id,
      clientId: reservation.clientId,
      amount,
      method: paymentForm.method,
      timestamp: serverTimestamp(),
      note: paymentForm.note,
      source: 'manual'
    });
    await updateReservation(reservation.id, {
      amountPaid: reservation.amountPaid + amount,
      balance: Math.max(reservation.totalAmount - (reservation.amountPaid + amount), 0)
    });
    const event: ReservationTimelineEvent = {
      id: nanoid(),
      type: 'payment',
      content: `Pagamento manual de R$${amount.toFixed(2)}`,
      timestamp: serverTimestamp(),
      metadata: { amount }
    };
    await appendTimelineEvent(reservation.id, event);
    setPaymentForm({ amount: '', method: 'PIX', note: '' });
    setPaymentModalVisible(false);
  };

  const handleChangeStatus = async (status: Reservation['status']) => {
    if (!reservation) return;
    await updateReservation(reservation.id, { status });
    await appendTimelineEvent(reservation.id, {
      id: nanoid(),
      type: 'status',
      content: `Status atualizado para ${status}`,
      timestamp: serverTimestamp()
    });
    setStatusModalVisible(false);
  };

  if (!reservation) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.empty}>Carregando reserva...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Text style={styles.title}>Reserva #{reservation.id.slice(0, 8)}</Text>
        <Text style={styles.subtitle}>{clientName}</Text>
        <Text style={styles.subtitle}>Espaço: {spaceName}</Text>
        <View style={styles.statsRow}>
          <StatCard label="Valor total" value={`R$${reservation.totalAmount.toFixed(2)}`} />
          <StatCard label="Total pago" value={`R$${reservation.amountPaid.toFixed(2)}`} />
        </View>
        <StatCard label="Saldo a receber" value={`R$${balance.toFixed(2)}`} accentColor={colors.danger} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Período</Text>
          <Text style={styles.sectionSubtitle}>
            {reservation.checkIn} → {reservation.checkOut}
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Status atual</Text>
          <View style={styles.statusBadge(reservation.status)}>
            <Text style={styles.statusText}>{reservation.status.toUpperCase()}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setStatusModalVisible(true)}>
          <Text style={styles.secondaryText}>Alterar Status</Text>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pagamentos</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => setPaymentModalVisible(true)}>
            <Text style={styles.primaryText}>Adicionar Pagamento</Text>
          </TouchableOpacity>
        </View>
        <PaymentList payments={payments} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Timeline</Text>
        </View>
        {reservation.timeline?.length ? (
          reservation.timeline
            .slice()
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .map(event => <TimelineItem key={event.id} event={event} />)
        ) : (
          <Text style={styles.empty}>Nenhum evento registrado.</Text>
        )}
      </ScrollView>

      <Modal visible={paymentModalVisible} animationType="slide" onRequestClose={() => setPaymentModalVisible(false)}>
        <SafeAreaView style={styles.modalContent}>
          <Text style={styles.modalTitle}>Registrar pagamento</Text>
          <TextInput
            style={styles.input}
            placeholder="Valor"
            keyboardType="decimal-pad"
            value={paymentForm.amount}
            onChangeText={text => setPaymentForm(prev => ({ ...prev, amount: text }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Método (ex.: PIX)"
            value={paymentForm.method}
            onChangeText={text => setPaymentForm(prev => ({ ...prev, method: text }))}
          />
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Observação"
            value={paymentForm.note}
            multiline
            numberOfLines={3}
            onChangeText={text => setPaymentForm(prev => ({ ...prev, note: text }))}
          />
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setPaymentModalVisible(false)}>
              <Text style={styles.secondaryText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={handleAddPayment}>
              <Text style={styles.primaryText}>Salvar</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal visible={statusModalVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.statusModal}>
            <Text style={styles.modalTitle}>Selecionar status</Text>
            {statusOptions.map(status => (
              <TouchableOpacity key={status} style={styles.statusOption} onPress={() => handleChangeStatus(status)}>
                <Text style={styles.statusOptionText}>{status.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.secondaryButton, { marginTop: 16 }]} onPress={() => setStatusModalVisible(false)}>
              <Text style={styles.secondaryText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    padding: 16,
    paddingBottom: 0
  },
  subtitle: {
    paddingHorizontal: 16,
    color: colors.muted,
    marginTop: 4
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 16
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 24
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text
  },
  sectionSubtitle: {
    color: colors.muted,
    fontSize: 14
  },
  statusBadge: (status: Reservation['status']) => ({
    backgroundColor:
      status === 'confirmada'
        ? colors.success
        : status === 'cancelada'
        ? colors.danger
        : status === 'finalizada'
        ? colors.primaryDark
        : colors.border,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999
  }),
  statusText: {
    color: '#fff',
    fontWeight: '600'
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10
  },
  primaryText: {
    color: '#fff',
    fontWeight: '600'
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12
  },
  secondaryText: {
    color: colors.text,
    fontWeight: '500'
  },
  empty: {
    color: colors.muted,
    textAlign: 'center',
    marginTop: 24
  },
  modalContent: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 16,
    color: colors.text
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: 'top'
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32
  },
  statusModal: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%'
  },
  statusOption: {
    paddingVertical: 12
  },
  statusOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text
  }
});

export default ReservationDetailsScreen;
