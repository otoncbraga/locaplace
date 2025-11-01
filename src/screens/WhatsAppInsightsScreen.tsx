import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuthContext } from '@/context/AuthContext';
import { colors } from '@/theme/colors';
import { Client, Reservation, Space, WhatsAppInsight } from '@/types';
import {
  createPayment,
  createReservation,
  listenClients,
  listenInsights,
  listenSpaces,
  markInsight,
  serverTimestamp
} from '@/services/firestore';
import { formatRelativeDate } from '@/services/whatsapp';
import { nanoid } from 'nanoid/non-secure';

const WhatsAppInsightsScreen: React.FC = () => {
  const { user } = useAuthContext();
  const [insights, setInsights] = useState<WhatsAppInsight[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsubInsights = listenInsights(user.uid, setInsights);
    const unsubClients = listenClients(user.uid, setClients);
    const unsubSpaces = listenSpaces(user.uid, setSpaces);
    return () => {
      unsubInsights();
      unsubClients();
      unsubSpaces();
    };
  }, [user]);

  const getClientName = (clientId: string) =>
    clients.find(client => client.id === clientId)?.cleanName || 'Cliente';
  const getSpaceName = (spaceId?: string) => spaces.find(space => space.id === spaceId)?.name;

  const handleConfirm = async (insight: WhatsAppInsight) => {
    if (!user) return;
    if (!insight.detectedReservation) {
      Alert.alert('Sem reserva detectada', 'Não há informações suficientes para criar a reserva.');
      return;
    }
    if (!insight.detectedReservation.spaceId) {
      Alert.alert('Espaço não identificado', 'Associe o espaço manualmente antes de confirmar.');
      return;
    }
    if (!insight.detectedReservation.clientId) {
      Alert.alert('Cliente não identificado', 'Associe o cliente manualmente antes de confirmar.');
      return;
    }

    const reservationData = insight.detectedReservation as Required<
      Pick<Reservation, 'clientId' | 'spaceId' | 'checkIn' | 'checkOut'>
    > &
      Partial<Reservation>;

    const totalAmount = insight.detectedReservation.totalAmount ?? 0;
    const amountPaid = insight.detectedPayment?.amount ?? 0;

    const timeline = [
      {
        id: nanoid(),
        type: 'message' as const,
        content: 'Reserva confirmada automaticamente pelo WhatsApp',
        timestamp: serverTimestamp()
      },
      ...(amountPaid
        ? [
            {
              id: nanoid(),
              type: 'payment' as const,
              content: `Pagamento detectado de R$${amountPaid.toFixed(2)}`,
              timestamp: serverTimestamp(),
              metadata: { amount: amountPaid }
            }
          ]
        : [])
    ];

    const reservationId = await createReservation(user.uid, {
      clientId: reservationData.clientId,
      spaceId: reservationData.spaceId,
      checkIn: reservationData.checkIn,
      checkOut: reservationData.checkOut,
      totalAmount,
      amountPaid,
      balance: Math.max(totalAmount - amountPaid, 0),
      status: 'confirmada',
      origin: 'whatsapp',
      notes: insight.summary,
      timeline
    });

    if (amountPaid > 0) {
      await createPayment(user.uid, {
        reservationId,
        clientId: reservationData.clientId,
        amount: amountPaid,
        method: insight.detectedPayment?.method ?? 'PIX',
        timestamp: serverTimestamp(),
        note: 'Pagamento detectado via WhatsApp',
        source: 'whatsapp'
      });
    }

    await markInsight(insight.id, {
      processedStatus: 'applied',
      processedAt: serverTimestamp()
    });
    Alert.alert('Reserva criada', 'A reserva foi registrada com sucesso.');
  };

  const handleIgnore = async (insight: WhatsAppInsight) => {
    await markInsight(insight.id, {
      processedStatus: 'ignored',
      processedAt: serverTimestamp()
    });
  };

  const pendingInsights = useMemo(
    () => insights.filter(item => !(item as any).processedStatus),
    [insights]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>WhatsApp Insights</Text>
        <Text style={styles.subtitle}>
          Revise as sugestões automáticas geradas a partir das conversas.
        </Text>
      </View>
      <FlatList
        data={pendingInsights}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{getClientName(item.clientId)}</Text>
            <Text style={styles.cardSubtitle}>{item.summary}</Text>
            <Text style={styles.cardMeta}>Última mensagem {formatRelativeDate(item.lastMessageAt)}</Text>
            {item.detectedReservation?.spaceId ? (
              <Text style={styles.cardMeta}>Espaço: {getSpaceName(item.detectedReservation.spaceId)}</Text>
            ) : null}
            {item.detectedPayment?.amount ? (
              <Text style={styles.cardMeta}>
                Pagamento sugerido: R${item.detectedPayment.amount?.toFixed(2)}
              </Text>
            ) : null}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => handleIgnore(item)}>
                <Text style={styles.secondaryText}>Ignorar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={() => handleConfirm(item)}>
                <Text style={styles.primaryText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum insight pendente.</Text>}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  header: {
    padding: 16
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text
  },
  subtitle: {
    marginTop: 8,
    color: colors.muted
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
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
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 12
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
    borderRadius: 10
  },
  secondaryText: {
    color: colors.text,
    fontWeight: '500'
  },
  empty: {
    textAlign: 'center',
    color: colors.muted,
    marginTop: 48
  }
});

export default WhatsAppInsightsScreen;
