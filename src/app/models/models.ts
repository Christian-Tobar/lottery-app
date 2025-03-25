export interface Ticket {
  id?: string;
  numbers: string[];
  printed: boolean;
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
  title: string;
  price: number;
  date: string;
  opportunities: number;
  figures: number;
  tickets: Ticket[];
  totalTickets?: number;
  printedTickets?: number;
  availableTickets?: number;
}
