export type AppointmentDetail = {
  id: string;
  service: string;
  styleId?: string;
  status: 'upcoming' | 'pending_approval' | 'in_progress' | 'assumed_finished' | 'completed' | 'cancelled';
  date: string;
  time: string;
  duration: string;
  clientName: string;
  clientPhone: string;
  location: string;
  price: number;
  hairType: string;
  notes: string;
  depositPaid: boolean;
  depositAmount: number;
};
