export interface Ticket {
  id?: string;
  numbers: string[];
  printed: boolean;
}

export interface ValidatedTicket {
  id: string;
  numbers: string[];
  printed: boolean;
  seriesId: string;

  date: string;
  printBatchInfo?: {
    batchId: string;
    printedAt: string;
    ticketNumberInBatch: number;
    totalInBatch: number;
  };
}

export interface PrintBatch {
  id?: string; // Se mantiene opcional para evitar conflictos
  startIndex: number;
  endIndex: number;
  printedAt: string;
  ticketIds: string[];
}

export interface LotterySeries {
  id?: string;
  date: string;
  ticketTitle: string;
  ticketDescription: string;
  contact: string;
  opportunities: number | null;
  figures: number | null;
  tickets: Ticket[];
  fontColors: FontColors;
  ticketBackground: string;
  totalTickets?: number;
  printedTickets?: number;
  availableTickets?: number;
  gracePeriodValue: number | null;
  gracePeriodUnit: string;
  ticketLogo: boolean;
  startRectAreaY: number;
  endRectAreaY: number;
  createdAt?: string;
}

export interface FontColors {
  title: string;
  description: string;
  border: string;
  clause: string;
  opportunities: string;
  date: string;
  contact: string;
  qr: string;
}
