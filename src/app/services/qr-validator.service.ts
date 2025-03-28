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
      // 🔹 Decodificar QR desde Base64
      const decodedData = atob(qrData);
      const { s: seriesId, t: ticketId, h: hash } = JSON.parse(decodedData);

      console.log('📌 QR escaneado:', { seriesId, ticketId, hash });

      // 🔍 Obtener información de la serie
      const series = await this.firestoreService.getSeriesById(seriesId);
      if (!series) {
        console.error('❌ Serie no encontrada');
        return null;
      }

      // 🔍 Buscar boletos en caché o Firestore
      let tickets = this.seriesCache.get(seriesId);
      if (!tickets) {
        console.log('🔍 Cargando boletos desde Firestore...');
        tickets = await this.firestoreService.getTickets(seriesId);
        this.seriesCache.set(seriesId, tickets);
      }

      // 🔍 Buscar el ticket dentro de la serie
      const ticket = tickets.find((t) => t.id === ticketId);
      if (!ticket) {
        console.error('❌ Ticket no encontrado en la serie');
        return null;
      }

      // 🔍 Validar hash
      const generatedHash = await this.hashService.generateTicketHash(ticket);
      if (generatedHash !== hash) {
        console.log('❌ Hash incorrecto, boleto inválido');
        return null;
      }

      console.log('✅ Boleto válido');

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
      console.error('❌ Error al procesar el QR:', error);
      return null;
    }
  }
}
