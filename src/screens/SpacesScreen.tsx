import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuthContext } from '@/context/AuthContext';
import { colors } from '@/theme/colors';
import { Space } from '@/types';
import { deleteSpace, listenSpaces, upsertSpace } from '@/services/firestore';

const defaultSpace: Omit<Space, 'id'> = {
  name: '',
  description: '',
  capacity: 0,
  baseDailyPrice: 0,
  active: true
};

const SpacesScreen: React.FC = () => {
  const { user } = useAuthContext();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [selected, setSelected] = useState<Space | null>(null);
  const [form, setForm] = useState(defaultSpace);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = listenSpaces(user.uid, setSpaces);
    return unsubscribe;
  }, [user]);

  const openModal = (space?: Space) => {
    if (space) {
      setSelected(space);
      setForm({
        name: space.name,
        description: space.description,
        capacity: space.capacity,
        baseDailyPrice: space.baseDailyPrice,
        active: space.active
      });
    } else {
      setSelected(null);
      setForm(defaultSpace);
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  const handleSave = async () => {
    if (!user) return;
    await upsertSpace(user.uid, { ...form, id: selected?.id });
    setModalVisible(false);
  };

  const handleDelete = (space: Space) => {
    Alert.alert('Excluir espaço', `Tem certeza que deseja excluir ${space.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => deleteSpace(space.id)
      }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Espaços</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
          <Text style={styles.addButtonText}>Adicionar Espaço</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={spaces}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => openModal(item)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSubtitle}>{item.description}</Text>
              <Text style={styles.cardMeta}>Capacidade: {item.capacity} pessoas</Text>
              <Text style={styles.cardMeta}>Diária base: R${item.baseDailyPrice.toFixed(2)}</Text>
            </View>
            <View style={styles.statusBadge(item.active)}>
              <Text style={styles.statusText}>{item.active ? 'Ativo' : 'Inativo'}</Text>
            </View>
            <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item)}>
              <Text style={styles.deleteText}>Excluir</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum espaço cadastrado.</Text>}
      />

      <Modal visible={modalVisible} animationType="slide" onRequestClose={closeModal}>
        <SafeAreaView style={styles.modalContent}>
          <Text style={styles.modalTitle}>{selected ? 'Editar Espaço' : 'Novo Espaço'}</Text>
          <TextInput
            style={styles.input}
            placeholder="Nome"
            value={form.name}
            onChangeText={text => setForm(prev => ({ ...prev, name: text }))}
          />
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Descrição"
            multiline
            numberOfLines={3}
            value={form.description}
            onChangeText={text => setForm(prev => ({ ...prev, description: text }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Capacidade"
            keyboardType="numeric"
            value={String(form.capacity)}
            onChangeText={text => setForm(prev => ({ ...prev, capacity: Number(text) || 0 }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Preço diário base"
            keyboardType="decimal-pad"
            value={String(form.baseDailyPrice)}
            onChangeText={text =>
              setForm(prev => ({ ...prev, baseDailyPrice: Number(text.replace(',', '.')) || 0 }))
            }
          />
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Espaço ativo</Text>
            <Switch
              value={form.active}
              onValueChange={value => setForm(prev => ({ ...prev, active: value }))}
            />
          </View>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={closeModal}>
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
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600'
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text
  },
  cardSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: colors.muted
  },
  cardMeta: {
    marginTop: 4,
    color: colors.text,
    fontSize: 13
  },
  statusBadge: (active: boolean) => ({
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: active ? colors.success : colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999
  }),
  statusText: {
    color: '#fff',
    fontWeight: '600'
  },
  deleteButton: {
    position: 'absolute',
    top: 16,
    right: 16
  },
  deleteText: {
    color: colors.danger,
    fontWeight: '500'
  },
  empty: {
    textAlign: 'center',
    color: colors.muted,
    marginTop: 48
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: 'top'
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24
  },
  switchLabel: {
    fontSize: 16,
    color: colors.text
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    alignItems: 'center',
    marginRight: 12
  },
  secondaryText: {
    color: colors.text,
    fontWeight: '500'
  },
  primaryButton: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    alignItems: 'center'
  },
  primaryText: {
    color: '#fff',
    fontWeight: '600'
  }
});

export default SpacesScreen;
