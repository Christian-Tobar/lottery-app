import { Injectable } from '@angular/core';
import { FirestoreService } from './firestore.service';
import { Ticket, ValidatedTicket } from '../models/models';

type QrValidationResult =
  | { valid: true; ticket: ValidatedTicket }
  | {
      valid: false;
      reason: 'malformed' | 'series-not-found' | 'ticket-not-found';
    };

@Injectable({
  providedIn: 'root',
})
export class QrValidatorService {
  private seriesCache = new Map<string, Ticket[]>(); // Caché de series y boletos

  constructor(private firestoreService: FirestoreService) {}

  async validateQr(qrData: string): Promise<QrValidationResult> {
    try {
      const decodedData = atob(qrData);
      const parsed = JSON.parse(decodedData);
      const { s: seriesId, t: ticketId } = parsed;

      if (!seriesId || !ticketId) {
        return { valid: false, reason: 'malformed' };
      }

      const series = await this.firestoreService.getSeriesById(seriesId);
      if (!series) {
        return { valid: false, reason: 'series-not-found' };
      }

      let tickets = this.seriesCache.get(seriesId);
      if (!tickets) {
        tickets = await this.firestoreService.getTickets(seriesId);
        this.seriesCache.set(seriesId, tickets);
      }

      const ticket = tickets.find((t) => t.id === ticketId);
      if (!ticket) {
        return { valid: false, reason: 'ticket-not-found' };
      }

      return {
        valid: true,
        ticket: {
          id: ticket.id!,
          numbers: ticket.numbers,
          printed: ticket.printed,
          seriesId: series.id!,
          date: series.date,
        },
      };
    } catch (error) {
      return { valid: false, reason: 'malformed' };
    }
  }
}
