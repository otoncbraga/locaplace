import * as Contacts from 'expo-contacts';
import { Client } from '@/types';

const CLIENT_SUFFIX = 'cliente';

const normalizeContactName = (name: string) =>
  name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

const stripClientSuffix = (name: string) =>
  name.replace(/\s*cliente$/i, '').trim();

export const loadClientContacts = async (): Promise<Contacts.Contact[]> => {
  const { status } = await Contacts.requestPermissionsAsync();
  if (status !== Contacts.PermissionStatus.GRANTED) {
    throw new Error('Permissão para acessar contatos negada.');
  }
  const { data } = await Contacts.getContactsAsync({
    fields: [Contacts.Fields.PhoneNumbers]
  });
  return data.filter(contact => {
    if (!contact.name) return false;
    const normalized = normalizeContactName(contact.name);
    return normalized.endsWith(CLIENT_SUFFIX);
  });
};

export const transformContactToClient = (contact: Contacts.Contact): Omit<Client, 'id'> => {
  const phone = contact.phoneNumbers?.[0]?.number ?? '';
  const displayName = contact.name ?? '';
  return {
    displayName,
    cleanName: stripClientSuffix(displayName),
    phone,
    docId: undefined,
    notes: contact.notes,
    stats: { totalReservations: 0, totalPaid: 0 },
    source: 'contacts_sync'
  };
};
