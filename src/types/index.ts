export type SourceType = 'manual' | 'contacts_sync' | 'whatsapp' | 'whatsapp_auto';

export interface Space {
  id: string;
  name: string;
  description: string;
  capacity: number;
  baseDailyPrice: number;
  active: boolean;
}

export interface ClientStats {
  totalReservations: number;
  totalPaid: number;
}

export interface Client {
  id: string;
  displayName: string;
  cleanName: string;
  phone: string;
  docId?: string;
  notes?: string;
  stats?: ClientStats;
  source: SourceType;
}

export type ReservationStatus = 'pre-reserva' | 'confirmada' | 'cancelada' | 'finalizada';
export type ReservationOrigin = 'manual' | 'whatsapp';

export interface ReservationTimelineEvent {
  id: string;
  type: 'message' | 'payment' | 'status';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface Reservation {
  id: string;
  clientId: string;
  spaceId: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  status: ReservationStatus;
  origin: ReservationOrigin;
  notes?: string;
  timeline: ReservationTimelineEvent[];
}

export type PaymentSource = 'manual' | 'whatsapp';

export interface Payment {
  id: string;
  reservationId: string;
  clientId: string;
  amount: number;
  method: string;
  timestamp: string;
  note?: string;
  source: PaymentSource;
}

export interface WhatsAppInsight {
  id: string;
  clientId: string;
  conversationId: string;
  summary: string;
  status: 'reservation_detected' | 'payment_detected' | 'no_updates';
  detectedReservation?: Partial<Reservation>;
  detectedPayment?: Partial<Payment>;
  lastMessageAt: string;
}

export interface AuthUser {
  uid: string;
  email: string | null;
}
