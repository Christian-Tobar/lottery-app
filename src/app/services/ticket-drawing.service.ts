import { ElementRef, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TicketDrawingService {
  private qrImage = new Image();
  backgroundImage: string | null = null;

  readonly CM_TO_PX = 300 / 2.54;
  readonly CANVAS_WIDTH = Math.round(10.795 * this.CM_TO_PX);
  readonly CANVAS_HEIGHT = Math.round(5.588 * this.CM_TO_PX);
  readonly SCALE_FACTOR = 0.4;

  constructor() {
    this.qrImage.crossOrigin = 'anonymous';
    this.qrImage.src = 'assets/images/CodigoQR.png';

    /*
    this.qrImage.onload = () => {
      console.log('QR Image loaded');
    };
    */
  }

  setupCanvas(canvas: ElementRef<HTMLCanvasElement>) {
    if (!canvas) return;

    const canvasEl = canvas.nativeElement;
    const scale = window.devicePixelRatio || 1;

    // Mantener alta resolución en el renderizado
    canvasEl.width = this.CANVAS_WIDTH * scale;
    canvasEl.height = this.CANVAS_HEIGHT * scale;

    // Reducción del tamaño visual en pantalla
    canvasEl.style.width = `${this.CANVAS_WIDTH * this.SCALE_FACTOR}px`;
    canvasEl.style.height = `${this.CANVAS_HEIGHT * this.SCALE_FACTOR}px`;

    const ctx = canvasEl.getContext('2d');
    if (ctx) {
      ctx.scale(scale, scale);
    }
  }

  drawTicket(
    canvas: ElementRef<HTMLCanvasElement>,
    fontColor: string,
    ticketDate: string, // Formato esperado: "DD/MM/YYYY"
    ticketContact: string,
    selectedOpportunity: number,
    selectedFigure: number
  ) {
    if (!canvas) return;

    const context = canvas.nativeElement.getContext('2d');
    if (!context) return;
    const ctx = context;

    const width = this.CANVAS_WIDTH;
    const height = this.CANVAS_HEIGHT;
    const margin = 25;

    ctx.clearRect(0, 0, width, height);

    // Fondo
    ctx.fillStyle = '#f9f6ec';
    ctx.fillRect(0, 0, width, height);

    // Borde
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.strokeRect(margin, margin, width - 2 * margin, height - 2 * margin);

    // QR en esquina superior derecha
    const qrSize = 250;
    const qrX = width - margin - qrSize;
    const qrY = margin;

    if (this.qrImage.complete) {
      ctx.drawImage(this.qrImage, qrX, qrY, qrSize, qrSize);
    } else {
      this.qrImage.onload = () => {
        ctx.drawImage(this.qrImage, qrX, qrY, qrSize, qrSize);
      };
    }

    // === FECHA DEBAJO DEL QR ===
    const [day, month, year] = ticketDate.split('/');
    const monthNames = [
      'ENE',
      'FEB',
      'MAR',
      'ABR',
      'MAY',
      'JUN',
      'JUL',
      'AGO',
      'SEP',
      'OCT',
      'NOV',
      'DIC',
    ];
    const monthStr = monthNames[parseInt(month) - 1];
    const dayStr = parseInt(day).toString().padStart(2, '0');
    const yearStr = year;

    const dateXCenter = qrX + qrSize / 2;
    const maxDateWidth = qrSize - 20;

    function adjustFontSize(
      text: string,
      initialSize: number,
      maxWidth: number
    ): number {
      let size = initialSize;
      ctx.font = `bold ${size}px Arial`;
      while (ctx.measureText(text).width > maxWidth && size > 10) {
        size -= 1;
        ctx.font = `bold ${size}px Arial`;
      }
      return size;
    }

    // Tamaños un poco más grandes
    const monthFontSize = adjustFontSize(monthStr, 55, maxDateWidth);
    const dayFontSize = adjustFontSize(dayStr, 100, maxDateWidth);
    const yearFontSize = adjustFontSize(yearStr, 50, maxDateWidth);

    const boxX = qrX + 25;
    const boxY = qrY + qrSize + 50;
    const boxW = qrSize - 55;
    const boxH = monthFontSize + dayFontSize + yearFontSize + 50;
    const radius = 20;

    // === DIBUJAR RECUADRO CON BORDES REDONDEADOS ===
    ctx.beginPath();
    ctx.moveTo(boxX + radius, boxY);
    ctx.lineTo(boxX + boxW - radius, boxY);
    ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + radius);
    ctx.lineTo(boxX + boxW, boxY + boxH - radius);
    ctx.quadraticCurveTo(
      boxX + boxW,
      boxY + boxH,
      boxX + boxW - radius,
      boxY + boxH
    );
    ctx.lineTo(boxX + radius, boxY + boxH);
    ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - radius);
    ctx.lineTo(boxX, boxY + radius);
    ctx.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);
    ctx.stroke();

    // === TÍTULO ENCIMA DEL RECUADRO ===
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.fillText('FECHA SORTEO', dateXCenter, boxY - 10);

    const dateStartY = qrY + qrSize + 20;
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';

    ctx.font = `bold ${monthFontSize}px Arial`;
    ctx.fillText(monthStr, dateXCenter, dateStartY + 100);

    ctx.font = `bold ${dayFontSize}px Arial`;
    ctx.fillText(dayStr, dateXCenter, dateStartY + 85 + dayFontSize + 5);

    ctx.font = `bold ${yearFontSize}px Arial`;
    ctx.fillText(
      yearStr,
      dateXCenter,
      dateStartY + dayFontSize + 90 + yearFontSize + 5
    );

    // === Oportunidades estilo "caras de dado" ===
    const opportunityPlaceholder = 'X'.repeat(selectedFigure);

    const areaX = margin + 20;
    const areaY = margin + 20;
    const areaW = qrX - areaX - 20; // hasta el inicio del QR
    const areaH = height - margin * 2 - 20;

    const centerX = areaX + areaW / 2;
    const centerY = areaY + areaH / 2;

    const drawSingleOpportunity = (x: number, y: number) => {
      ctx.font = `bold 100px Arial`;
      ctx.fillStyle = fontColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic'; // importante para usar ascent/descent

      const metrics = ctx.measureText(opportunityPlaceholder);
      const textHeight =
        metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

      // Ajustamos Y para centrar el texto verticalmente
      const correctedY =
        y + metrics.actualBoundingBoxAscent - textHeight / 2 - 7;

      ctx.fillText(opportunityPlaceholder, x, correctedY);
    };

    const drawPositions: Record<number, () => void> = {
      1: () => drawSingleOpportunity(centerX, centerY),
      2: () => {
        drawSingleOpportunity(centerX, areaY + areaH * 0.25);
        drawSingleOpportunity(centerX, areaY + areaH * 0.75);
      },
      3: () => {
        drawSingleOpportunity(centerX, areaY + areaH * 0.2);
        drawSingleOpportunity(centerX, centerY);
        drawSingleOpportunity(centerX, areaY + areaH * 0.8);
      },
      4: () => {
        drawSingleOpportunity(areaX + areaW * 0.25, areaY + areaH * 0.25);
        drawSingleOpportunity(areaX + areaW * 0.75, areaY + areaH * 0.25);
        drawSingleOpportunity(areaX + areaW * 0.25, areaY + areaH * 0.75);
        drawSingleOpportunity(areaX + areaW * 0.75, areaY + areaH * 0.75);
      },
      5: () => {
        drawPositions[4]();
        drawSingleOpportunity(centerX, centerY);
      },
      6: () => {
        drawSingleOpportunity(areaX + areaW * 0.3, areaY + areaH * 0.2);
        drawSingleOpportunity(areaX + areaW * 0.3, centerY);
        drawSingleOpportunity(areaX + areaW * 0.3, areaY + areaH * 0.8);
        drawSingleOpportunity(areaX + areaW * 0.7, areaY + areaH * 0.2);
        drawSingleOpportunity(areaX + areaW * 0.7, centerY);
        drawSingleOpportunity(areaX + areaW * 0.7, areaY + areaH * 0.8);
      },
    };

    const draw = drawPositions[selectedOpportunity];
    if (draw) {
      draw();
    } else {
      // Para más de 6 oportunidades: distribuir en grilla
      const cols = Math.ceil(Math.sqrt(selectedOpportunity));
      const rows = Math.ceil(selectedOpportunity / cols);
      const spacingX = areaW / (cols + 1);
      const spacingY = areaH / (rows + 1);
      let count = 0;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (count >= selectedOpportunity) break;
          const x = areaX + spacingX * (c + 1);
          const y = areaY + spacingY * (r + 1);
          drawSingleOpportunity(x, y);
          count++;
        }
      }
    }
  }

  /**
   * Función para dividir texto en múltiples líneas si no cabe en un ancho dado.
   */
  private wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
  ) {
    const words = text.split(/(\s+)/); // Mantiene los espacios en la separación
    let line = '';
    const lines: string[] = [];
    const maxLines = 2; // Límite de líneas permitidas

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i]; // Agregar palabra/espacio
      const testWidth = ctx.measureText(testLine).width;

      if (testWidth > maxWidth && line.trim().length > 0) {
        lines.push(line); // No hacer trim para mantener los espacios correctamente
        line = words[i].trimStart(); // Eliminar espacio inicial en nueva línea

        if (lines.length === maxLines) {
          //this.ticketTitle = lines.join(''); // Bloquear el exceso de texto en la UI
          return lines;
        }
      } else {
        line = testLine;
      }
    }

    if (line.trim().length > 0 && lines.length < maxLines) {
      lines.push(line);
    }

    //this.ticketTitle = lines.join(''); // Actualizar el título con solo 2 líneas
    return lines;
  }

  drawTicketWithoutQRAndOpportunities(
    ctx: CanvasRenderingContext2D,
    ticketDate: string,
    ticketContact: string
  ) {
    if (!ctx) return;

    const width = this.CANVAS_WIDTH;
    const height = this.CANVAS_HEIGHT;
    const margin = 25; // Margen alrededor del borde

    ctx.clearRect(0, 0, width, height);

    // Fondo
    ctx.fillStyle = '#f9f6ec';
    ctx.fillRect(0, 0, width, height);

    // Borde
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.strokeRect(margin, margin, width - 2 * margin, height - 2 * margin);

    // QR en esquina superior derecha
    const qrSize = 250;
    const qrX = width - margin - qrSize;
    const qrY = margin;

    // === FECHA DEBAJO DEL QR ===
    const [day, month, year] = ticketDate.split('/');
    const monthNames = [
      'ENE',
      'FEB',
      'MAR',
      'ABR',
      'MAY',
      'JUN',
      'JUL',
      'AGO',
      'SEP',
      'OCT',
      'NOV',
      'DIC',
    ];
    const monthStr = monthNames[parseInt(month) - 1];
    const dayStr = parseInt(day).toString().padStart(2, '0');
    const yearStr = year;

    const dateXCenter = qrX + qrSize / 2;
    const maxDateWidth = qrSize - 20;

    function adjustFontSize(
      text: string,
      initialSize: number,
      maxWidth: number
    ): number {
      let size = initialSize;
      ctx.font = `bold ${size}px Arial`;
      while (ctx.measureText(text).width > maxWidth && size > 10) {
        size -= 1;
        ctx.font = `bold ${size}px Arial`;
      }
      return size;
    }

    // Tamaños un poco más grandes
    const monthFontSize = adjustFontSize(monthStr, 55, maxDateWidth);
    const dayFontSize = adjustFontSize(dayStr, 100, maxDateWidth);
    const yearFontSize = adjustFontSize(yearStr, 50, maxDateWidth);

    const boxX = qrX + 25;
    const boxY = qrY + qrSize + 50;
    const boxW = qrSize - 55;
    const boxH = monthFontSize + dayFontSize + yearFontSize + 50;
    const radius = 20;

    // === DIBUJAR RECUADRO CON BORDES REDONDEADOS ===
    ctx.beginPath();
    ctx.moveTo(boxX + radius, boxY);
    ctx.lineTo(boxX + boxW - radius, boxY);
    ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + radius);
    ctx.lineTo(boxX + boxW, boxY + boxH - radius);
    ctx.quadraticCurveTo(
      boxX + boxW,
      boxY + boxH,
      boxX + boxW - radius,
      boxY + boxH
    );
    ctx.lineTo(boxX + radius, boxY + boxH);
    ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - radius);
    ctx.lineTo(boxX, boxY + radius);
    ctx.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);
    ctx.stroke();

    // === TÍTULO ENCIMA DEL RECUADRO ===
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.fillText('FECHA SORTEO', dateXCenter, boxY - 10);

    const dateStartY = qrY + qrSize + 20;
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';

    ctx.font = `bold ${monthFontSize}px Arial`;
    ctx.fillText(monthStr, dateXCenter, dateStartY + 100);

    ctx.font = `bold ${dayFontSize}px Arial`;
    ctx.fillText(dayStr, dateXCenter, dateStartY + 85 + dayFontSize + 5);

    ctx.font = `bold ${yearFontSize}px Arial`;
    ctx.fillText(
      yearStr,
      dateXCenter,
      dateStartY + dayFontSize + 90 + yearFontSize + 5
    );
  }

  generateBackgroundImage(
    canvas: ElementRef<HTMLCanvasElement>,
    ticketDate: string,
    ticketContact: string
  ) {
    if (!canvas) return;

    const ctx = canvas.nativeElement.getContext('2d');
    if (!ctx) return;

    // Guardar estado actual del canvas
    ctx.save();

    // Dibujar el boleto sin QR y sin oportunidades
    this.drawTicketWithoutQRAndOpportunities(ctx, ticketDate, ticketContact);

    // Guardar la imagen de fondo
    this.backgroundImage = canvas.nativeElement.toDataURL('image/png');

    // Restaurar estado del canvas
    ctx.restore();
  }
}
