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
  contact: string;
  opportunities: number;
  figures: number;
  tickets: Ticket[];
  selectedColor: string;
  totalTickets?: number;
  printedTickets?: number;
  availableTickets?: number;
  createdAt?: string;
}
