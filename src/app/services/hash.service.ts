import { Injectable } from '@angular/core';
import * as CryptoJS from 'crypto-js';

@Injectable({
  providedIn: 'root',
})
export class HashService {
  constructor() {}

  private secretKey = 'TuClaveSecreta123'; // Cambia esto y mantenlo seguro

  /**
   * Genera un hash seguro basado en la información del boleto.
   */
  generateTicketHash(ticket: any): string {
    const ticketData = `${ticket.id}-${ticket.seriesId}-${ticket.numbers.join(
      ','
    )}-${ticket.price}-${ticket.date}`;
    return CryptoJS.HmacSHA256(ticketData, this.secretKey).toString();
  }
}
