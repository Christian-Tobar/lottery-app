import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';

@Injectable({
  providedIn: 'root',
})
export class PdfticketService {
  constructor() {}

  /**
   * Genera un PDF con los boletos organizados en una cuadrícula de 10 por página (2 columnas, 5 filas).
   */
  generateTicketsPdf(series: any, tickets: any[]) {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'cm',
      format: 'letter',
    });

    const ticketWidth = 10.795; // cm (21.59 cm / 2)
    const ticketHeight = 5.588; // cm (27.94 cm / 5)
    let x = 0;
    let y = 0;
    let ticketCounter = 0;

    tickets.forEach((ticket, index) => {
      if (ticketCounter >= 10) {
        doc.addPage();
        x = 0;
        y = 0;
        ticketCounter = 0;
      }

      // Dibujar borde del boleto con línea delgada
      doc.setLineWidth(0.05);
      doc.rect(x, y, ticketWidth, ticketHeight);

      // Información del boleto
      doc.setFontSize(10);
      doc.text(series.title, x + 0.5, y + 1);
      doc.text(`Número(s): ${ticket.numbers.join(', ')}`, x + 0.5, y + 2);
      doc.text(`Precio: ${series.price} USD`, x + 0.5, y + 3);
      doc.text(`Fecha: ${series.date}`, x + 0.5, y + 4);
      doc.text(`Contacto: 123-456-789`, x + 0.5, y + 5);

      // Avanzar al siguiente boleto de izquierda a derecha
      ticketCounter++;
      if (ticketCounter % 2 === 0) {
        x = 0;
        y += ticketHeight;
      } else {
        x += ticketWidth;
      }
    });

    doc.save(`boletos_${series.id}.pdf`);
  }
}
