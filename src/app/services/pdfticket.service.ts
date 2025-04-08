import { ElementRef, Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { Buffer } from 'buffer';
import { TicketDrawingService } from './ticket-drawing.service';

@Injectable({
  providedIn: 'root',
})
export class PdfticketService {
  // Cache de imágenes de fondo por ID de serie (mejora el rendimiento)
  private backgroundCache = new Map<string, string>();

  constructor(private ticketDrawingService: TicketDrawingService) {}

  /**
   * Genera una imagen de fondo personalizada para el boleto
   * @param ticketDate Fecha del sorteo
   * @param ticketContact Información de contacto
   */
  private async generateBackgroundImage(
    ticketDate: string,
    ticketContact: string
  ): Promise<string> {
    return new Promise((resolve) => {
      const newCanvas = document.createElement('canvas');

      // Simula un ElementRef para pasar al servicio de dibujo
      const canvasRef = {
        nativeElement: newCanvas,
      } as ElementRef<HTMLCanvasElement>;

      // Inicializa el canvas y dibuja el fondo
      this.ticketDrawingService.setupCanvas(canvasRef);
      this.ticketDrawingService.generateBackgroundImage(
        canvasRef,
        ticketDate,
        ticketContact
      );

      // Se espera un momento para asegurar el renderizado del canvas
      setTimeout(() => {
        resolve(newCanvas.toDataURL('image/png'));
      }, 500);
    });
  }

  /**
   * Genera un PDF con todos los boletos de una serie.
   * @param series Información de la serie (fecha, color, contacto, etc.)
   * @param tickets Lista de boletos con números únicos y IDs
   */
  async generateTicketsPdf(series: any, tickets: any[]) {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'cm',
      format: 'letter',
    });

    const seriesId = series.id;

    // Obtener imagen de fondo de la cache o generar una nueva
    let backgroundImage = this.backgroundCache.get(seriesId);
    if (!backgroundImage) {
      backgroundImage = await this.generateBackgroundImage(
        series.date,
        series.contact
      );
      this.backgroundCache.set(seriesId, backgroundImage);
    }

    const ticketWidth = 10.795;
    const ticketHeight = 5.588;
    let x = 0;
    let y = 0;
    let ticketCounter = 0;

    for (const ticket of tickets) {
      // Cada hoja del PDF contiene hasta 10 boletos
      if (ticketCounter >= 10) {
        doc.addPage();
        x = 0;
        y = 0;
        ticketCounter = 0;
      }

      // Codificamos la info del boleto en base64 para generar el QR
      const rawData = JSON.stringify({ s: series.id, t: ticket.id });
      const qrData = Buffer.from(rawData).toString('base64');

      const qrImage = await QRCode.toDataURL(qrData, {
        color: {
          dark: '#000000',
          light: '#00000000',
        },
      });

      // === Dibujo general del ticket ===
      const margin = 0.2;
      doc.setLineWidth(0.05);
      doc.setDrawColor(0, 0, 0);

      doc.rect(
        x + margin,
        y + margin,
        ticketWidth - 2 * margin,
        ticketHeight - 2 * margin
      );

      doc.addImage(backgroundImage, 'PNG', x, y, ticketWidth, ticketHeight);

      doc.addImage(
        qrImage,
        'PNG',
        x + ticketWidth - 2 - 0.05 - margin,
        y + 0.05 + margin,
        2,
        2
      );

      // === Números del boleto ===
      const selectedOpportunity = ticket.numbers.length;
      const areaX = x - 0.4;
      const areaY = y + 0.5;
      const areaW = ticketWidth - 1;
      const areaH = ticketHeight - 1;
      const centerX = areaX + areaW / 2;
      const centerY = areaY + areaH / 2;

      doc.setFontSize(30);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(series.selectedColor);

      // Dibuja un número centrado
      const drawSingleNumber = (cx: number, cy: number, value: string) => {
        doc.text(value, cx, cy, { align: 'center', baseline: 'middle' });
      };

      // Posiciones predefinidas tipo dado
      const drawPositions: Record<number, () => void> = {
        1: () => drawSingleNumber(centerX, centerY, ticket.numbers[0]),
        2: () => {
          drawSingleNumber(centerX, areaY + areaH * 0.25, ticket.numbers[0]);
          drawSingleNumber(centerX, areaY + areaH * 0.75, ticket.numbers[1]);
        },
        3: () => {
          drawSingleNumber(centerX, areaY + areaH * 0.2, ticket.numbers[0]);
          drawSingleNumber(centerX, centerY, ticket.numbers[1]);
          drawSingleNumber(centerX, areaY + areaH * 0.8, ticket.numbers[2]);
        },
        4: () => {
          drawSingleNumber(
            areaX + areaW * 0.25,
            areaY + areaH * 0.25,
            ticket.numbers[0]
          );
          drawSingleNumber(
            areaX + areaW * 0.75,
            areaY + areaH * 0.25,
            ticket.numbers[1]
          );
          drawSingleNumber(
            areaX + areaW * 0.25,
            areaY + areaH * 0.75,
            ticket.numbers[2]
          );
          drawSingleNumber(
            areaX + areaW * 0.75,
            areaY + areaH * 0.75,
            ticket.numbers[3]
          );
        },
        5: () => {
          drawPositions[4]();
          drawSingleNumber(centerX, centerY, ticket.numbers[4]);
        },
        6: () => {
          drawSingleNumber(
            areaX + areaW * 0.3,
            areaY + areaH * 0.2,
            ticket.numbers[0]
          );
          drawSingleNumber(areaX + areaW * 0.3, centerY, ticket.numbers[1]);
          drawSingleNumber(
            areaX + areaW * 0.3,
            areaY + areaH * 0.8,
            ticket.numbers[2]
          );
          drawSingleNumber(
            areaX + areaW * 0.7,
            areaY + areaH * 0.2,
            ticket.numbers[3]
          );
          drawSingleNumber(areaX + areaW * 0.7, centerY, ticket.numbers[4]);
          drawSingleNumber(
            areaX + areaW * 0.7,
            areaY + areaH * 0.8,
            ticket.numbers[5]
          );
        },
      };

      // Lógica de dibujo de números
      if (drawPositions[selectedOpportunity]) {
        drawPositions[selectedOpportunity]();
      } else {
        // Si hay más de 6 números, los organizamos en una cuadrícula
        const cols = Math.ceil(Math.sqrt(selectedOpportunity));
        const rows = Math.ceil(selectedOpportunity / cols);
        const spacingX = areaW / (cols + 1);
        const spacingY = areaH / (rows + 1);
        let count = 0;

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (count >= selectedOpportunity) break;
            const cx = areaX + spacingX * (c + 1);
            const cy = areaY + spacingY * (r + 1);
            drawSingleNumber(cx, cy, ticket.numbers[count]);
            count++;
          }
        }
      }

      // Posicionamiento del siguiente boleto en el PDF
      ticketCounter++;
      if (ticketCounter % 2 === 0) {
        x = 0;
        y += ticketHeight;
      } else {
        x += ticketWidth;
      }
    }

    // Guardar el archivo PDF con el ID de la serie
    doc.save(`boletos_${series.id}.pdf`);
  }
}
