import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthContext } from '@/context/AuthContext';
import { colors } from '@/theme/colors';
import { Client, Reservation, ReservationTimelineEvent, Space } from '@/types';
import {
  createPayment,
  createReservation,
  listenClients,
  listenReservations,
  listenSpaces,
  serverTimestamp
} from '@/services/firestore';
import { nanoid } from 'nanoid/non-secure';

const statusFilters: Reservation['status'][] = [
  'pre-reserva',
  'confirmada',
  'cancelada',
  'finalizada'
];

type ReservationNavigation = NativeStackNavigationProp<any>;

const ReservationsScreen: React.FC = () => {
  const { user } = useAuthContext();
  const navigation = useNavigation<ReservationNavigation>();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [filter, setFilter] = useState<Reservation['status'] | 'todas'>('todas');
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({
    clientId: '',
    spaceId: '',
    checkIn: '',
    checkOut: '',
    totalAmount: '',
    amountPaid: '',
    notes: ''
  });

  useEffect(() => {
    if (!user) return;
    const unsubReservations = listenReservations(user.uid, setReservations);
    const unsubClients = listenClients(user.uid, setClients);
    const unsubSpaces = listenSpaces(user.uid, setSpaces);
    return () => {
      unsubReservations();
      unsubClients();
      unsubSpaces();
    };
  }, [user]);

  const filteredReservations = useMemo(() => {
    if (filter === 'todas') return reservations;
    return reservations.filter(reservation => reservation.status === filter);
  }, [reservations, filter]);

  const getClientName = (clientId: string) =>
    clients.find(client => client.id === clientId)?.cleanName || 'Cliente';
  const getSpaceName = (spaceId: string) => spaces.find(space => space.id === spaceId)?.name || 'Espaço';

  const resetForm = () =>
    setForm({ clientId: '', spaceId: '', checkIn: '', checkOut: '', totalAmount: '', amountPaid: '', notes: '' });

  const handleCreateReservation = async () => {
    if (!user) return;
    if (!form.clientId || !form.spaceId || !form.checkIn || !form.checkOut) {
      return;
    }
    const totalAmount = Number(form.totalAmount.replace(',', '.')) || 0;
    const amountPaid = Number(form.amountPaid.replace(',', '.')) || 0;

    const timeline: ReservationTimelineEvent[] = [
      {
        id: nanoid(),
        type: 'status',
        content: 'Reserva criada manualmente',
        timestamp: serverTimestamp()
      }
    ];

    if (amountPaid > 0) {
      timeline.push({
        id: nanoid(),
        type: 'payment',
        content: `Pagamento inicial de R$${amountPaid.toFixed(2)}`,
        timestamp: serverTimestamp(),
        metadata: { amount: amountPaid }
      });
    }

    const reservationId = await createReservation(user.uid, {
      clientId: form.clientId,
      spaceId: form.spaceId,
      checkIn: form.checkIn,
      checkOut: form.checkOut,
      totalAmount,
      amountPaid,
      balance: Math.max(totalAmount - amountPaid, 0),
      status: amountPaid > 0 ? 'confirmada' : 'pre-reserva',
      origin: 'manual',
      notes: form.notes,
      timeline
    });

    if (amountPaid > 0) {
      await createPayment(user.uid, {
        reservationId,
        clientId: form.clientId,
        amount: amountPaid,
        method: 'PIX',
        timestamp: serverTimestamp(),
        note: 'Pagamento inicial',
        source: 'manual'
      });
    }

    setModalVisible(false);
    resetForm();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reservas</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.primaryText}>Nova Reserva</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'todas' && styles.filterChipActive]}
          onPress={() => setFilter('todas')}
        >
          <Text style={[styles.filterText, filter === 'todas' && styles.filterTextActive]}>Todas</Text>
        </TouchableOpacity>
        {statusFilters.map(status => (
          <TouchableOpacity
            key={status}
            style={[styles.filterChip, filter === status && styles.filterChipActive]}
            onPress={() => setFilter(status)}
          >
            <Text style={[styles.filterText, filter === status && styles.filterTextActive]}>
              {status.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={filteredReservations}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 48 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('ReservationDetails', { reservationId: item.id })}
          >
            <Text style={styles.cardTitle}>{getClientName(item.clientId)}</Text>
            <Text style={styles.cardSubtitle}>{getSpaceName(item.spaceId)}</Text>
            <Text style={styles.cardMeta}>
              {item.checkIn} → {item.checkOut}
            </Text>
            <Text style={styles.cardMeta}>Valor total: R${item.totalAmount.toFixed(2)}</Text>
            <Text style={styles.cardMeta}>Pago: R${item.amountPaid.toFixed(2)}</Text>
            <View style={styles.badge(item.status)}>
              <Text style={styles.badgeText}>{item.status.toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Nenhuma reserva cadastrada.</Text>}
      />

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={styles.modalContent}>
          <Text style={styles.modalTitle}>Nova Reserva</Text>
          <Text style={styles.label}>Cliente</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={form.clientId}
              onValueChange={value => setForm(prev => ({ ...prev, clientId: value }))}
            >
              <Picker.Item label="Selecione um cliente" value="" />
              {clients.map(client => (
                <Picker.Item key={client.id} label={client.cleanName || client.displayName} value={client.id} />
              ))}
            </Picker>
          </View>
          <Text style={styles.label}>Espaço</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={form.spaceId}
              onValueChange={value => setForm(prev => ({ ...prev, spaceId: value }))}
            >
              <Picker.Item label="Selecione um espaço" value="" />
              {spaces.map(space => (
                <Picker.Item key={space.id} label={space.name} value={space.id} />
              ))}
            </Picker>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Check-in (ex.: 2024-04-12)"
            value={form.checkIn}
            onChangeText={text => setForm(prev => ({ ...prev, checkIn: text }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Check-out (ex.: 2024-04-15)"
            value={form.checkOut}
            onChangeText={text => setForm(prev => ({ ...prev, checkOut: text }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Valor total"
            keyboardType="decimal-pad"
            value={form.totalAmount}
            onChangeText={text => setForm(prev => ({ ...prev, totalAmount: text }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Valor pago"
            keyboardType="decimal-pad"
            value={form.amountPaid}
            onChangeText={text => setForm(prev => ({ ...prev, amountPaid: text }))}
          />
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Observações"
            value={form.notes}
            multiline
            numberOfLines={3}
            onChangeText={text => setForm(prev => ({ ...prev, notes: text }))}
          />
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.secondaryText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={handleCreateReservation}>
              <Text style={styles.primaryText}>Salvar</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text
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
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  filterChipActive: {
    backgroundColor: colors.primary
  },
  filterText: {
    color: colors.text,
    fontWeight: '500'
  },
  filterTextActive: {
    color: '#fff'
  },
  card: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text
  },
  cardSubtitle: {
    marginTop: 6,
    color: colors.muted
  },
  cardMeta: {
    marginTop: 4,
    color: colors.text,
    fontSize: 13
  },
  badge: (status: Reservation['status']) => ({
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor:
      status === 'confirmada'
        ? colors.success
        : status === 'cancelada'
        ? colors.danger
        : status === 'finalizada'
        ? colors.primaryDark
        : colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999
  }),
  badgeText: {
    color: '#fff',
    fontWeight: '600'
  },
  empty: {
    textAlign: 'center',
    marginTop: 48,
    color: colors.muted
  },
  modalContent: {
    flex: 1,
    padding: 24,
    backgroundColor: colors.background
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 16,
    color: colors.text
  },
  label: {
    fontWeight: '600',
    marginBottom: 6,
    color: colors.text
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    marginBottom: 16
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
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginRight: 12
  },
  secondaryText: {
    color: colors.text,
    fontWeight: '500'
  }
});

export default ReservationsScreen;
