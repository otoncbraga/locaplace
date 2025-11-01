import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { nanoid } from 'nanoid/non-secure';
import { Payment, Reservation, WhatsAppInsight } from '@/types';

export interface ParsedMessage {
  type: 'reservation' | 'payment' | 'none';
  reservation?: Partial<Reservation>;
  payment?: Partial<Payment>;
  summary: string;
}

export const analyzeConversation = (messages: string[]): ParsedMessage => {
  const text = messages.join(' ').toLowerCase();
  const reservationMatch = text.match(/(dia|de)\s*(\d{1,2})\s*(ao|até)\s*(\d{1,2})/);
  const paymentMatch = text.match(/(pix|depósito|paguei|enviei)\s*(de)?\s*R?\$?\s*(\d+[\.,]?\d{0,2})/);

  if (paymentMatch) {
    return {
      type: 'payment',
      payment: {
        amount: Number(paymentMatch[3].replace(',', '.')),
        method: 'PIX'
      },
      summary: `Pagamento detectado de R$${paymentMatch[3]}`
    };
  }

  if (reservationMatch) {
    return {
      type: 'reservation',
      reservation: {
        checkIn: reservationMatch[2],
        checkOut: reservationMatch[4],
        status: 'confirmada'
      } as Partial<Reservation>,
      summary: 'Possível reserva confirmada nas mensagens.'
    };
  }

  return { type: 'none', summary: 'Nenhum evento detectado.' };
};

export const buildInsight = (
  clientId: string,
  parsed: ParsedMessage,
  conversationId: string
): WhatsAppInsight => ({
  id: nanoid(),
  clientId,
  conversationId,
  summary: parsed.summary,
  status:
    parsed.type === 'reservation'
      ? 'reservation_detected'
      : parsed.type === 'payment'
      ? 'payment_detected'
      : 'no_updates',
  detectedReservation: parsed.reservation,
  detectedPayment: parsed.payment,
  lastMessageAt: new Date().toISOString()
});

export const formatRelativeDate = (isoDate: string) =>
  formatDistanceToNow(new Date(isoDate), { addSuffix: true, locale: ptBR });
