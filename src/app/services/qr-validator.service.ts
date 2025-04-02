import { Injectable } from '@angular/core';
import { FirestoreService } from './firestore.service';
import { HashService } from './hash.service';
import { Ticket, ValidatedTicket } from '../models/models';

@Injectable({
  providedIn: 'root',
})
export class QrValidatorService {
  private seriesCache = new Map<string, Ticket[]>(); // Caché de series y boletos

  constructor(
    private firestoreService: FirestoreService,
    private hashService: HashService
  ) {}

  async validateQr(qrData: string): Promise<ValidatedTicket | null> {
    try {
      // Decodificar QR desde Base64
      const decodedData = atob(qrData);
      const { s: seriesId, t: ticketId, h: hash } = JSON.parse(decodedData);

      // Obtener información de la serie
      const series = await this.firestoreService.getSeriesById(seriesId);
      if (!series) {
        return null;
      }

      // Buscar boletos en caché o Firestore
      let tickets = this.seriesCache.get(seriesId);
      if (!tickets) {
        tickets = await this.firestoreService.getTickets(seriesId);
        this.seriesCache.set(seriesId, tickets);
      }

      // Buscar el ticket dentro de la serie
      const ticket = tickets.find((t) => t.id === ticketId);
      if (!ticket) {
        return null;
      }

      // Validar hash
      const generatedHash = await this.hashService.generateTicketHash(ticket);
      if (generatedHash !== hash) {
        return null;
      }

      return {
        id: ticket.id!,
        numbers: ticket.numbers,
        printed: ticket.printed,
        seriesId: series.id!,
        title: series.title,
        price: series.price,
        date: series.date,
      };
    } catch (error) {
      return null;
    }
  }
}
