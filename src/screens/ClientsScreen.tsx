import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuthContext } from '@/context/AuthContext';
import { colors } from '@/theme/colors';
import { Client } from '@/types';
import { listenClients, upsertClient } from '@/services/firestore';
import { loadClientContacts, transformContactToClient } from '@/services/contacts';

const blankClient: Omit<Client, 'id'> = {
  displayName: '',
  cleanName: '',
  phone: '',
  docId: '',
  notes: '',
  stats: { totalReservations: 0, totalPaid: 0 },
  source: 'manual'
};

const ClientsScreen: React.FC = () => {
  const { user } = useAuthContext();
  const [clients, setClients] = useState<Client[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState(blankClient);
  const [selected, setSelected] = useState<Client | null>(null);
  const [loadingSync, setLoadingSync] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = listenClients(user.uid, setClients);
    return unsubscribe;
  }, [user]);

  const openModal = (client?: Client) => {
    if (client) {
      setSelected(client);
      setForm({
        displayName: client.displayName,
        cleanName: client.cleanName,
        phone: client.phone,
        docId: client.docId ?? '',
        notes: client.notes ?? '',
        stats: client.stats ?? { totalReservations: 0, totalPaid: 0 },
        source: client.source
      });
    } else {
      setSelected(null);
      setForm(blankClient);
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!user) return;
    const payload = {
      ...form,
      cleanName: form.cleanName || form.displayName,
      source: selected?.source ?? 'manual'
    };
    await upsertClient(user.uid, { ...payload, id: selected?.id });
    setModalVisible(false);
  };

  const handleSyncContacts = async () => {
    if (!user) return;
    try {
      setLoadingSync(true);
      const contacts = await loadClientContacts();
      await Promise.all(
        contacts.map(contact => upsertClient(user.uid, transformContactToClient(contact)))
      );
      Alert.alert('Sincronização concluída', 'Contatos importados com sucesso.');
    } catch (error) {
      Alert.alert('Erro ao sincronizar', (error as Error).message);
    } finally {
      setLoadingSync(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Clientes</Text>
          <Text style={styles.subtitle}>Gerencie seus contatos e histórico de reservas.</Text>
        </View>
        <View>
          <TouchableOpacity style={styles.primaryButton} onPress={() => openModal()}>
            <Text style={styles.primaryText}>Adicionar Manual</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryButton, loadingSync && { opacity: 0.7 }]}
            onPress={handleSyncContacts}
            disabled={loadingSync}
          >
            <Text style={styles.secondaryText}>
              {loadingSync ? 'Sincronizando...' : 'Sincronizar Contatos'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={clients}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 32 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => openModal(item)}>
            <Text style={styles.cardTitle}>{item.cleanName || item.displayName}</Text>
            <Text style={styles.cardSubtitle}>{item.phone}</Text>
            <View style={styles.cardRow}>
              <View>
                <Text style={styles.cardMeta}>Reservas: {item.stats?.totalReservations ?? 0}</Text>
                <Text style={styles.cardMeta}>Total pago: R${item.stats?.totalPaid ?? 0}</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.source.toUpperCase()}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum cliente cadastrado.</Text>}
      />

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={styles.modalContent}>
          <Text style={styles.modalTitle}>{selected ? 'Editar Cliente' : 'Novo Cliente'}</Text>
          <TextInput
            style={styles.input}
            placeholder="Nome para exibição"
            value={form.displayName}
            onChangeText={text => setForm(prev => ({ ...prev, displayName: text }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Nome limpo"
            value={form.cleanName}
            onChangeText={text => setForm(prev => ({ ...prev, cleanName: text }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Telefone / WhatsApp"
            keyboardType="phone-pad"
            value={form.phone}
            onChangeText={text => setForm(prev => ({ ...prev, phone: text }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Documento (CPF)"
            value={form.docId ?? ''}
            onChangeText={text => setForm(prev => ({ ...prev, docId: text }))}
          />
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Observações"
            value={form.notes ?? ''}
            multiline
            numberOfLines={4}
            onChangeText={text => setForm(prev => ({ ...prev, notes: text }))}
          />
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.secondaryText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={handleSave}>
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
  subtitle: {
    color: colors.muted,
    marginTop: 4
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 8
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
    borderRadius: 10
  },
  secondaryText: {
    color: colors.text,
    fontWeight: '500'
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
  cardRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  cardMeta: {
    fontSize: 14,
    color: colors.text
  },
  badge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999
  },
  badgeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12
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
    minHeight: 110,
    textAlignVertical: 'top'
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  }
});

export default ClientsScreen;
