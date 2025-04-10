import { ElementRef, Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { Buffer } from 'buffer';
import { TicketDrawingService } from './ticket-drawing.service';

@Injectable({
  providedIn: 'root',
})
export class PdfticketService {
  // Cache de imágenes de fondo del boleto por ID de serie
  private backgroundCache = new Map<string, string>();

  constructor(private ticketDrawingService: TicketDrawingService) {}

  // GENERA UNA IMAGEN DE FONDO PERSONALIZADA PARA EL BOLETO
  private async generateBackgroundImage(
    ticketTitle: string,
    ticketDescription: string,
    ticketDate: string,
    ticketContact: string,
    ticketLogo: boolean,
    gracePeriodValue: number,
    gracePeriodUnit: string
  ): Promise<string> {
    return new Promise((resolve) => {
      const newCanvas = document.createElement('canvas');

      // Simula un ElementRef para pasar al servicio de dibujo
      const canvasRef = {
        nativeElement: newCanvas,
      } as ElementRef<HTMLCanvasElement>;

      // Inicializa el canvas y dibuja el fondo personalizado
      this.ticketDrawingService.setupCanvas(canvasRef);
      this.ticketDrawingService.generateBackgroundImage(
        canvasRef,
        ticketTitle,
        ticketDescription,
        ticketDate,
        ticketContact,
        ticketLogo,
        gracePeriodValue,
        gracePeriodUnit
      );

      // Se espera un momento para asegurar el renderizado del canvas
      setTimeout(() => {
        resolve(newCanvas.toDataURL('image/png'));
      }, 500);
    });
  }

  // GENERA UN PDF CON BOLETOS ESPECÍFICOS DE UNA SERIE
  async generateTicketsPdf(series: any, tickets: any[]) {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'cm',
      format: 'letter',
    });

    const seriesId = series.id;

    // Obtener imagen de fondo desde caché, o generar una nueva si no existe
    let backgroundImage = this.backgroundCache.get(seriesId);
    if (!backgroundImage) {
      backgroundImage = await this.generateBackgroundImage(
        series.ticketTitle,
        series.ticketDescription,
        series.date,
        series.contact,
        series.ticketLogo,
        series.gracePeriodValue,
        series.gracePeriodUnit
      );
      this.backgroundCache.set(seriesId, backgroundImage);
    }

    const ticketWidth = 10.795;
    const ticketHeight = 5.588;
    let x = 0;
    let y = 0;
    let ticketCounter = 0;

    for (const ticket of tickets) {
      // Cada página del PDF contiene hasta 10 boletos
      if (ticketCounter >= 10) {
        doc.addPage();
        x = 0;
        y = 0;
        ticketCounter = 0;
      }

      // Codificar info del boleto en base64 para el QR
      const rawData = JSON.stringify({ s: series.id, t: ticket.id });
      const qrData = Buffer.from(rawData).toString('base64');

      // Generar código QR
      const qrImage = await QRCode.toDataURL(qrData, {
        color: {
          dark: '#000000',
          light: '#00000000',
        },
      });

      // Dibujo del borde del boleto y fondo
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

      // Dibuja el QR en la esquina superior derecha
      doc.addImage(
        qrImage,
        'PNG',
        x + ticketWidth - 2 - 0.05 - margin,
        y + 0.05 + margin,
        2,
        2
      );

      // ÁREA PARA LOS NÚMEROS DEL BOLETO
      const selectedOpportunity = ticket.numbers.length;
      const areaX = x + margin;
      const areaY = y + this.mapValueFromAToB(series.startRectAreaY);
      const areaW = ticketWidth - 2 - margin * 2;
      const areaH = Math.abs(
        this.mapValueFromAToB(series.endRectAreaY) -
          this.mapValueFromAToB(series.startRectAreaY)
      );
      const centerX = areaX + areaW / 2;
      const centerY = areaY + areaH / 2;

      // Dibuja un rectángulo rojo para marcar el área

      // doc.setDrawColor(255, 0, 0); // rojo
      // doc.setLineWidth(0.03);
      // doc.rect(areaX, areaY, areaW, areaH);

      // Cálculo del tamaño dinámico de fuente
      const estimatedCols = Math.ceil(Math.sqrt(selectedOpportunity));
      const estimatedRows = Math.ceil(selectedOpportunity / estimatedCols);
      const spacingX = areaW / (estimatedCols + 1);
      const spacingY = areaH / (estimatedRows + 1);

      const maxFontSizeX = spacingX * 9;
      const maxFontSizeY = spacingY * 9;
      const dynamicFontSize = Math.min(maxFontSizeX, maxFontSizeY) * 2.83465;

      // Se reduce el tamaño de fuente en los layouts tipo dado (4 a 6 números)
      let fontSizeFactor = 1;
      if (selectedOpportunity >= 4 && selectedOpportunity <= 6) {
        fontSizeFactor = 0.8;
      }

      doc.setFontSize(dynamicFontSize * fontSizeFactor);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(series.selectedColor);

      // FUNCIÓN PARA DIBUJAR UN NÚMERO CENTRADO
      const drawSingleNumber = (cx: number, cy: number, value: string) => {
        doc.text(value, cx, cy, { align: 'center', baseline: 'middle' });
      };

      // POSICIONES PREDEFINIDAS DE NÚMEROS TIPO DADO
      const drawPositions: Record<number, () => void> = {
        1: () => drawSingleNumber(centerX, centerY, ticket.numbers[0]),
        2: () => {
          drawSingleNumber(centerX, areaY + areaH * 0.25, ticket.numbers[0]);
          drawSingleNumber(centerX, areaY + areaH * 0.75, ticket.numbers[1]);
        },
        3: () => {
          drawSingleNumber(
            areaX + areaW * 0.2,
            areaY + areaH * 0.2,
            ticket.numbers[0]
          );
          drawSingleNumber(centerX, centerY, ticket.numbers[1]);
          drawSingleNumber(
            areaX + areaW * 0.8,
            areaY + areaH * 0.8,
            ticket.numbers[2]
          );
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
        // Cuando hay más de 6 números, se dibujan en una cuadrícula
        const cols = Math.ceil(Math.sqrt(selectedOpportunity));
        const rows = Math.ceil(selectedOpportunity / cols);
        const spacingX = areaW / (cols + 1);
        const spacingY = areaH / (rows + 1);
        let count = 0;

        const maxFontSizeX = spacingX * 0.6;
        const maxFontSizeY = spacingY * 0.6;
        const maxFontSize = Math.min(maxFontSizeX, maxFontSizeY) * 2.83465;

        doc.setFontSize(maxFontSize);

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

      // Ajuste de posición para el siguiente boleto
      ticketCounter++;
      if (ticketCounter % 2 === 0) {
        x = 0;
        y += ticketHeight;
      } else {
        x += ticketWidth;
      }
    }

    // Guarda el archivo PDF con el id de la serie
    doc.save(`boletos_${series.id}.pdf`);
  }

  // Mapea un valor entre dos rangos
  mapValueFromAToB(value: number): number {
    const fromMin = 25;
    const fromMax = 635;
    const toMin = 0.2;
    const toMax = 5.388;

    return ((value - fromMin) * (toMax - toMin)) / (fromMax - fromMin) + toMin;
  }
}
