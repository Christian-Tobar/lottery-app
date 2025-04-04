import { ElementRef, Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { Buffer } from 'buffer';
import { TicketDrawingService } from './ticket-drawing.service';

@Injectable({
  providedIn: 'root',
})
export class PdfticketService {
  public backImage: string | null = null;

  constructor(private ticketDrawingService: TicketDrawingService) {}

  private async generateBackgroundImage(
    ticketTitle: string,
    ticketDescription: string,
    ticketPrice: number,
    ticketDate: string,
    ticketContact: string,
    selectedOpportunity: number,
    selectedFigure: number
  ): Promise<string> {
    return new Promise((resolve) => {
      const newCanvas = document.createElement('canvas');
      const canvasRef = {
        nativeElement: newCanvas,
      } as ElementRef<HTMLCanvasElement>;

      this.ticketDrawingService.setupCanvas(canvasRef);

      this.ticketDrawingService.generateBackgroundImage(
        canvasRef,
        ticketTitle,
        ticketDescription,
        ticketPrice,
        ticketDate,
        ticketContact,
        selectedOpportunity,
        selectedFigure
      );

      setTimeout(() => {
        resolve(newCanvas.toDataURL('image/png'));
      }, 500); // Pequeño delay para asegurar que se renderice correctamente
    });
  }

  async generateTicketsPdf(series: any, tickets: any[]) {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'cm',
      format: 'letter',
    });

    if (!this.backImage) {
      this.backImage = await this.generateBackgroundImage(
        series.title,
        series.description,
        series.price,
        series.date,
        series.contact,
        series.opportunities,
        series.figures
      );
    }

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

      const rawData = JSON.stringify({ s: series.id, t: ticket.id });
      const qrData = Buffer.from(rawData).toString('base64');
      const qrImage = await QRCode.toDataURL(qrData, {
        color: {
          dark: '#000000',
          light: '#00000000',
        },
      });

      const margin = 0.2;
      doc.setLineWidth(0.05);
      doc.setDrawColor(0, 0, 0);
      doc.rect(
        x + margin,
        y + margin,
        ticketWidth - 2 * margin,
        ticketHeight - 2 * margin
      );

      if (this.backImage) {
        doc.addImage(this.backImage, 'PNG', x, y, ticketWidth, ticketHeight);
      }

      doc.addImage(
        qrImage,
        'PNG',
        x + ticketWidth - 2 - 0.05 - margin,
        y + 0.05 + margin,
        2,
        2
      );

      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      const numbersText = ticket.numbers.join('    ');
      const maxTextWidth = ticketWidth - 2;
      const textX = x + ticketWidth / 2;
      let textY = y + ticketHeight / 2 + 2;

      let splitText: string[] = doc.splitTextToSize(
        numbersText,
        maxTextWidth
      ) as string[];
      splitText = splitText.map((line: string) => line.trim()); // Elimina espacios extra

      if (splitText.length > 2) {
        splitText.splice(2);
      }
      textY -= (splitText.length - 1) * 0.7;
      doc.text(splitText, textX, textY, { align: 'center' });

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
