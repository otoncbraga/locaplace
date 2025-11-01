import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Client,
  Payment,
  Reservation,
  ReservationTimelineEvent,
  Space,
  WhatsAppInsight
} from '@/types';

const COLLECTIONS = {
  spaces: 'spaces',
  clients: 'clients',
  reservations: 'reservations',
  payments: 'payments',
  whatsappInsights: 'whatsappInsights'
} as const;

export const spacesCollection = collection(db, COLLECTIONS.spaces);
export const clientsCollection = collection(db, COLLECTIONS.clients);
export const reservationsCollection = collection(db, COLLECTIONS.reservations);
export const paymentsCollection = collection(db, COLLECTIONS.payments);
export const whatsappInsightsCollection = collection(db, COLLECTIONS.whatsappInsights);

export const listenSpaces = (userId: string, callback: (spaces: Space[]) => void) => {
  const q = query(spacesCollection, where('ownerId', '==', userId), orderBy('name'));
  return onSnapshot(q, snapshot => {
    const spaces = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) as Space[];
    callback(spaces);
  });
};

export const listenClients = (userId: string, callback: (clients: Client[]) => void) => {
  const q = query(clientsCollection, where('ownerId', '==', userId), orderBy('cleanName'));
  return onSnapshot(q, snapshot => {
    const clients = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) as Client[];
    callback(clients);
  });
};

export const listenReservations = (
  userId: string,
  callback: (reservations: Reservation[]) => void
) => {
  const q = query(reservationsCollection, where('ownerId', '==', userId), orderBy('checkIn', 'desc'));
  return onSnapshot(q, snapshot => {
    const reservations = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) as Reservation[];
    callback(reservations);
  });
};

export const listenReservation = (
  reservationId: string,
  callback: (reservation: Reservation | undefined) => void
) => {
  return onSnapshot(doc(reservationsCollection, reservationId), snapshot => {
    if (!snapshot.exists()) {
      callback(undefined);
      return;
    }
    callback({ id: snapshot.id, ...snapshot.data() } as Reservation);
  });
};

export const listenPayments = (userId: string, callback: (payments: Payment[]) => void) => {
  const q = query(paymentsCollection, where('ownerId', '==', userId), orderBy('timestamp', 'desc'));
  return onSnapshot(q, snapshot => {
    const payments = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) as Payment[];
    callback(payments);
  });
};

export const listenPaymentsForReservation = (
  reservationId: string,
  callback: (payments: Payment[]) => void
) => {
  const q = query(paymentsCollection, where('reservationId', '==', reservationId), orderBy('timestamp', 'desc'));
  return onSnapshot(q, snapshot => {
    const payments = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) as Payment[];
    callback(payments);
  });
};

export const listenInsights = (userId: string, callback: (insights: WhatsAppInsight[]) => void) => {
  const q = query(whatsappInsightsCollection, where('ownerId', '==', userId), orderBy('lastMessageAt', 'desc'));
  return onSnapshot(q, snapshot => {
    const insights = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) as WhatsAppInsight[];
    callback(insights);
  });
};

export const markInsight = async (
  insightId: string,
  updates: Partial<WhatsAppInsight> & { processedStatus?: 'applied' | 'ignored'; processedAt?: string }
) => {
  await updateDoc(doc(whatsappInsightsCollection, insightId), updates);
};

export const upsertSpace = async (ownerId: string, space: Omit<Space, 'id'> & { id?: string }) => {
  if (space.id) {
    const ref = doc(spacesCollection, space.id);
    await updateDoc(ref, { ...space, ownerId });
    return space.id;
  }
  const docRef = await addDoc(spacesCollection, { ...space, ownerId });
  return docRef.id;
};

export const upsertClient = async (ownerId: string, client: Omit<Client, 'id'> & { id?: string }) => {
  if (client.id) {
    const ref = doc(clientsCollection, client.id);
    await updateDoc(ref, { ...client, ownerId });
    return client.id;
  }
  const existing = await query(
    clientsCollection,
    where('ownerId', '==', ownerId),
    where('phone', '==', client.phone)
  );
  // If a client with the same phone exists, update it.
  // Firestore does not support direct get on query without getDocs.
  // We intentionally use dynamic import to reduce bundle size.
  const { getDocs } = await import('firebase/firestore');
  const snapshot = await getDocs(existing);
  if (!snapshot.empty) {
    const docSnap = snapshot.docs[0];
    await updateDoc(docSnap.ref, { ...client, ownerId });
    return docSnap.id;
  }
  const docRef = await addDoc(clientsCollection, { ...client, ownerId });
  return docRef.id;
};

export const deleteSpace = async (spaceId: string) => deleteDoc(doc(spacesCollection, spaceId));

export const createReservation = async (
  ownerId: string,
  reservation: Omit<Reservation, 'id' | 'timeline'> & { timeline?: ReservationTimelineEvent[] }
) => {
  const timeline = reservation.timeline ?? [];
  const docRef = await addDoc(reservationsCollection, {
    ...reservation,
    ownerId,
    timeline
  });
  return docRef.id;
};

export const updateReservation = async (
  reservationId: string,
  updates: Partial<Reservation>
) => {
  await updateDoc(doc(reservationsCollection, reservationId), updates);
};

export const appendTimelineEvent = async (
  reservationId: string,
  event: ReservationTimelineEvent
) => {
  await updateDoc(doc(reservationsCollection, reservationId), {
    timeline: arrayUnion(event)
  });
};

export const createPayment = async (ownerId: string, payment: Omit<Payment, 'id'>) => {
  const docRef = await addDoc(paymentsCollection, { ...payment, ownerId });
  return docRef.id;
};

export const getReservation = async (reservationId: string) => {
  const snapshot = await getDoc(doc(reservationsCollection, reservationId));
  if (!snapshot.exists()) return undefined;
  return { id: snapshot.id, ...snapshot.data() } as Reservation;
};

export const getClient = async (clientId: string) => {
  const snapshot = await getDoc(doc(clientsCollection, clientId));
  if (!snapshot.exists()) return undefined;
  return { id: snapshot.id, ...snapshot.data() } as Client;
};

export const getSpace = async (spaceId: string) => {
  const snapshot = await getDoc(doc(spacesCollection, spaceId));
  if (!snapshot.exists()) return undefined;
  return { id: snapshot.id, ...snapshot.data() } as Space;
};

export const serverTimestamp = () => Timestamp.now().toDate().toISOString();
