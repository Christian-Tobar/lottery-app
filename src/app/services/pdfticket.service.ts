import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import { HashService } from './hash.service';
import QRCode from 'qrcode';
import { Buffer } from 'buffer';

@Injectable({
  providedIn: 'root',
})
export class PdfticketService {
  constructor(private hashService: HashService) {}

  /**
   * Genera un PDF con los boletos organizados en una cuadrícula de 10 por página (2 columnas, 5 filas).
   */
  async generateTicketsPdf(series: any, tickets: any[]) {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'cm',
      format: 'letter',
    });

    const ticketWidth = 10.795;
    const ticketHeight = 5.588;
    let x = 0;
    let y = 0;
    let ticketCounter = 0;

    for (const ticket of tickets) {
      if (ticketCounter >= 10) {
        doc.addPage();
        x = 0;
        y = 0;
        ticketCounter = 0;
      }

      // 🔹 Generamos el hash
      const hash = this.hashService.generateTicketHash(ticket);

      // 🔹 Creamos los datos del QR y los convertimos a Base64
      const rawData = JSON.stringify({
        s: series.id, // 's' en vez de 'seriesId'
        t: ticket.id, // 't' en vez de 'ticketId'
        h: hash, // 'h' en vez de 'hash'
      });
      const qrData = Buffer.from(rawData).toString('base64');

      // 🔹 Generamos el código QR como imagen
      const qrImage = await QRCode.toDataURL(qrData);

      // 🔹 Dibujamos el borde del boleto
      doc.setLineWidth(0.05);
      doc.rect(x, y, ticketWidth, ticketHeight);

      // 🔹 Agregamos la información del boleto
      doc.setFontSize(10);
      doc.text(series.title, x + 0.5, y + 1);
      doc.text(`Número(s): ${ticket.numbers.join(', ')}`, x + 0.5, y + 2);
      doc.text(`Precio: ${series.price} USD`, x + 0.5, y + 3);
      doc.text(`Fecha: ${series.date}`, x + 0.5, y + 4);
      doc.text(`Contacto: 123-456-789`, x + 0.5, y + 5);

      // 🔹 Agregamos el QR al boleto
      doc.addImage(qrImage, 'PNG', x + 7, y + 1, 3, 3); // Ajustamos posición y tamaño

      ticketCounter++;
      if (ticketCounter % 2 === 0) {
        x = 0;
        y += ticketHeight;
      } else {
        x += ticketWidth;
      }
    }

    doc.save(`boletos_${series.id}.pdf`);
  }
}
