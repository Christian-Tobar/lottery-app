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

    this.qrImage.onload = () => {
      console.log('QR Image loaded');
    };
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
    ticketTitle: string,
    ticketDescription: string,
    ticketPrice: number,
    ticketDate: string,
    ticketContact: string,
    selectedOpportunity: number,
    selectedFigure: number
  ) {
    if (!canvas) return;

    const ctx = canvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const width = this.CANVAS_WIDTH;
    const height = this.CANVAS_HEIGHT;
    const margin = 25; // Margen alrededor del borde

    ctx.clearRect(0, 0, width, height);

    // Fondo del boleto
    ctx.fillStyle = '#f9f6ec'; // Color crema de fondo
    ctx.fillRect(0, 0, width, height);

    // Borde negro con margen
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.strokeRect(margin, margin, width - 2 * margin, height - 2 * margin);

    // Cargar y dibujar el código QR en la esquina superior derecha
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

    // Configuración del texto
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center'; // Centramos el texto

    // **DIBUJAR TÍTULO**
    ctx.font = 'bold 80px Arial';
    const maxTitleWidth = qrX - 2 * margin; // Espacio disponible antes del QR
    const lineHeight = 60; // Espaciado entre líneas para el título
    const titleLines = this.wrapText(ctx, ticketTitle, maxTitleWidth);

    // Posición centrada entre el margen y el QR
    const textCenterX = (margin + qrX) / 2;
    const titleStartY = qrY + 95; // Ajuste para mantener alineación con el QR

    titleLines.forEach((line, index) => {
      ctx.fillText(line, textCenterX, titleStartY + index * lineHeight);
    });

    // **DIBUJAR DESCRIPCIÓN**
    let descriptionFontSize = 48; // Tamaño inicial de la fuente para la descripción
    const descriptionMaxWidth = maxTitleWidth; // El ancho de la descripción es el mismo que el del título
    let descriptionLineHeight = 45; // Este es el interlineado inicial
    let descriptionStartY = titleStartY + titleLines.length * lineHeight; // Espaciado justo debajo del título

    // Función para dividir la descripción en líneas de acuerdo al ancho máximo
    let descriptionLines = this.wrapTextForDescription(
      ctx,
      ticketDescription,
      descriptionMaxWidth,
      descriptionFontSize
    );

    // Calcular el total de la altura que ocupa la descripción
    let descriptionHeight = descriptionLines.length * descriptionLineHeight;

    // Espacio disponible debajo de la descripción
    const availableSpace = qrY + qrSize + 80 - descriptionStartY; // Espacio disponible para la descripción

    // Si la altura de la descripción excede el espacio disponible, reducimos el tamaño de la fuente
    while (descriptionHeight > availableSpace && descriptionFontSize > 20) {
      descriptionFontSize -= 2; // Reducir el tamaño de la fuente para la descripción
      ctx.font = `normal ${descriptionFontSize}px Arial`; // Actualizamos la fuente con el nuevo tamaño
      descriptionLineHeight = descriptionFontSize * 0.95; // Ajustar el interlineado también en función del tamaño de la fuente

      // Volver a calcular las líneas de la descripción con el nuevo tamaño de fuente
      descriptionLines = this.wrapTextForDescription(
        ctx,
        ticketDescription,
        descriptionMaxWidth,
        descriptionFontSize
      );

      descriptionHeight = descriptionLines.length * descriptionLineHeight; // Nuevamente calcular la altura total
    }

    // Dibuja la descripción con el tamaño de fuente ajustado
    descriptionLines.forEach((line, index) => {
      ctx.fillText(
        line,
        textCenterX,
        descriptionStartY + index * descriptionLineHeight
      );
    });

    // **DIBUJAR "VALOR" Y MONTO**
    const valueTextY = qrY + qrSize + 30; // Espaciado debajo del QR
    const valueAmountY = valueTextY + 60; // Espaciado para el monto

    ctx.font = 'bold 45px Arial'; // Fuente para "VALOR"
    ctx.fillText('VALOR', qrX + qrSize / 2, valueTextY);

    const formattedPrice = `$${Number(ticketPrice).toLocaleString('es-CO')}`;

    // Ajustar dinámicamente el tamaño de la fuente para el monto
    let fontSize = 60; // Tamaño inicial de la fuente
    ctx.font = `bold ${fontSize}px Arial`; // Fuente para el monto

    // Comprobar si el texto se sale del área del QR
    let textWidth = ctx.measureText(formattedPrice).width;
    while (textWidth > qrSize && fontSize > 20) {
      fontSize -= 5; // Reducir el tamaño de la fuente si el texto es demasiado grande
      ctx.font = `bold ${fontSize}px Arial`; // Actualizar la fuente con el nuevo tamaño
      textWidth = ctx.measureText(formattedPrice).width; // Medir el nuevo ancho del texto
    }

    // Dibujar el monto formateado
    ctx.fillText(formattedPrice, qrX + qrSize / 2, valueAmountY);

    // **DIBUJAR FECHA DE SORTEO Y CONTACTO**
    const drawDateAndContactY = valueAmountY; // Espaciado debajo del monto

    const drawDate = `Fecha de sorteo: ${ticketDate}`;
    const drawContact = `Contacto: ${ticketContact}`;

    // Establecemos el tamaño de la fuente
    const dateAndContactFontSize = 30;
    ctx.font = `normal ${dateAndContactFontSize}px Arial`; // Fuente normal para la fecha y contacto

    // Medimos el ancho total de la línea combinada (fecha y contacto)
    const combinedText = drawDate + ' | ' + drawContact;

    // Dibujamos el texto combinado (fecha y contacto) en una sola línea, alineado con el monto
    ctx.fillText(
      combinedText,
      textCenterX, // Centramos en el mismo eje X que el monto
      drawDateAndContactY
    );

    // **DIBUJAR OPORTUNIDADES COMO "X"**
    const totalOpportunities = selectedOpportunity; // Número de oportunidades seleccionadas
    const figuresPerOpportunity = selectedFigure; // Número de cifras por oportunidad
    const opportunityPlaceholder = 'X'.repeat(figuresPerOpportunity); // Genera "XX", "XXXX", etc.

    if (totalOpportunities > 0) {
      const availableHeight = height - valueAmountY + 30; // Espacio disponible debajo del monto hasta el borde inferior
      const availableWidth = width - 2 * margin; // Ancho total disponible

      let fontSize = 100; // Tamaño inicial de la fuente
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.textAlign = 'center';

      let opportunitiesArray = Array(totalOpportunities).fill(
        opportunityPlaceholder
      );
      let firstLine = '';
      let secondLine = '';

      // **Determinar cuántas caben en la primera línea**
      while (opportunitiesArray.length > 0) {
        let testLine =
          (firstLine ? firstLine + '  ' : '') + opportunitiesArray[0];
        let testWidth = ctx.measureText(testLine).width;

        if (testWidth <= availableWidth) {
          firstLine = testLine;
          opportunitiesArray.shift();
        } else {
          break;
        }
      }

      // **El resto se va a la segunda línea**
      secondLine = opportunitiesArray.join('  ');

      // **Si la segunda línea también es demasiado larga, reducir fuente**
      while (
        ctx.measureText(secondLine).width > availableWidth &&
        fontSize > 20
      ) {
        fontSize -= 5;
        ctx.font = `bold ${fontSize}px Arial`;
      }

      // **Cálculo para centrar las líneas verticalmente**
      const lineSpacing = fontSize * 1.2; // Espaciado entre líneas
      const totalTextHeight = secondLine ? lineSpacing : 0; // Si hay segunda línea, usar doble espaciado
      const centerY = valueAmountY + availableHeight / 2 - totalTextHeight / 2;

      // **Dibujar las líneas**
      if (firstLine) ctx.fillText(firstLine, width / 2, centerY);
      if (secondLine)
        ctx.fillText(secondLine, width / 2, centerY + lineSpacing);
    }
  }

  /**
   * Función para dividir texto en múltiples líneas si no cabe en un ancho dado.
   * Función adaptada para la descripción, manteniendo la misma fuente y tamaño.
   */
  private wrapTextForDescription(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    fontSize: number
  ) {
    const words = text.split(/\s+/); // Separar las palabras por espacios
    let line = '';
    const lines: string[] = [];

    ctx.font = `normal ${fontSize}px Arial`; // Establecer el tamaño de fuente adecuado

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const testWidth = ctx.measureText(testLine).width;

      if (testWidth > maxWidth && line.trim().length > 0) {
        lines.push(line); // Si la línea excede el ancho, agregarla
        line = words[i] + ' '; // Comenzar nueva línea con la palabra actual
      } else {
        line = testLine; // Continuar agregando la palabra a la línea actual
      }
    }

    if (line.trim().length > 0) {
      lines.push(line); // Agregar la última línea
    }

    return lines;
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
    ticketTitle: string,
    ticketDescription: string,
    ticketPrice: number,
    ticketDate: string,
    ticketContact: string,
    selectedOpportunity: number,
    selectedFigure: number
  ) {
    if (!ctx) return;

    const width = this.CANVAS_WIDTH;
    const height = this.CANVAS_HEIGHT;
    const margin = 25; // Margen alrededor del borde

    ctx.clearRect(0, 0, width, height);

    // Fondo del boleto
    ctx.fillStyle = '#f9f6ec'; // Color crema de fondo
    ctx.fillRect(0, 0, width, height);

    // Borde negro con margen
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.strokeRect(margin, margin, width - 2 * margin, height - 2 * margin);

    // Cargar y dibujar el código QR en la esquina superior derecha
    const qrSize = 250;
    const qrX = width - margin - qrSize;
    const qrY = margin;

    if (this.qrImage.complete) {
      // ctx.drawImage(this.qrImage, qrX, qrY, qrSize, qrSize);
    }

    // Configuración del texto
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center'; // Centramos el texto

    // **DIBUJAR TÍTULO**
    ctx.font = 'bold 80px Arial';
    const maxTitleWidth = qrX - 2 * margin; // Espacio disponible antes del QR
    const lineHeight = 60; // Espaciado entre líneas para el título
    const titleLines = this.wrapText(ctx, ticketTitle, maxTitleWidth);

    // Posición centrada entre el margen y el QR
    const textCenterX = (margin + qrX) / 2;
    const titleStartY = qrY + 95; // Ajuste para mantener alineación con el QR

    titleLines.forEach((line, index) => {
      ctx.fillText(line, textCenterX, titleStartY + index * lineHeight);
    });

    // **DIBUJAR DESCRIPCIÓN**
    let descriptionFontSize = 48; // Tamaño inicial de la fuente para la descripción
    const descriptionMaxWidth = maxTitleWidth; // El ancho de la descripción es el mismo que el del título
    let descriptionLineHeight = 45; // Este es el interlineado inicial
    let descriptionStartY = titleStartY + titleLines.length * lineHeight; // Espaciado justo debajo del título

    // Función para dividir la descripción en líneas de acuerdo al ancho máximo
    let descriptionLines = this.wrapTextForDescription(
      ctx,
      ticketDescription,
      descriptionMaxWidth,
      descriptionFontSize
    );

    // Calcular el total de la altura que ocupa la descripción
    let descriptionHeight = descriptionLines.length * descriptionLineHeight;

    // Espacio disponible debajo de la descripción
    const availableSpace = qrY + qrSize + 80 - descriptionStartY; // Espacio disponible para la descripción

    // Si la altura de la descripción excede el espacio disponible, reducimos el tamaño de la fuente
    while (descriptionHeight > availableSpace && descriptionFontSize > 20) {
      descriptionFontSize -= 2; // Reducir el tamaño de la fuente para la descripción
      ctx.font = `normal ${descriptionFontSize}px Arial`; // Actualizamos la fuente con el nuevo tamaño
      descriptionLineHeight = descriptionFontSize * 0.95; // Ajustar el interlineado también en función del tamaño de la fuente

      // Volver a calcular las líneas de la descripción con el nuevo tamaño de fuente
      descriptionLines = this.wrapTextForDescription(
        ctx,
        ticketDescription,
        descriptionMaxWidth,
        descriptionFontSize
      );

      descriptionHeight = descriptionLines.length * descriptionLineHeight; // Nuevamente calcular la altura total
    }

    // Dibuja la descripción con el tamaño de fuente ajustado
    descriptionLines.forEach((line, index) => {
      ctx.fillText(
        line,
        textCenterX,
        descriptionStartY + index * descriptionLineHeight
      );
    });

    // **DIBUJAR "VALOR" Y MONTO**
    const valueTextY = qrY + qrSize + 30; // Espaciado debajo del QR
    const valueAmountY = valueTextY + 60; // Espaciado para el monto

    ctx.font = 'bold 45px Arial'; // Fuente para "VALOR"
    ctx.fillText('VALOR', qrX + qrSize / 2, valueTextY);

    const formattedPrice = `$${Number(ticketPrice).toLocaleString('es-CO')}`;

    // Ajustar dinámicamente el tamaño de la fuente para el monto
    let fontSize = 60; // Tamaño inicial de la fuente
    ctx.font = `bold ${fontSize}px Arial`; // Fuente para el monto

    // Comprobar si el texto se sale del área del QR
    let textWidth = ctx.measureText(formattedPrice).width;
    while (textWidth > qrSize && fontSize > 20) {
      fontSize -= 5; // Reducir el tamaño de la fuente si el texto es demasiado grande
      ctx.font = `bold ${fontSize}px Arial`; // Actualizar la fuente con el nuevo tamaño
      textWidth = ctx.measureText(formattedPrice).width; // Medir el nuevo ancho del texto
    }

    // Dibujar el monto formateado
    ctx.fillText(formattedPrice, qrX + qrSize / 2, valueAmountY);

    // **DIBUJAR FECHA DE SORTEO Y CONTACTO**
    const drawDateAndContactY = valueAmountY; // Espaciado debajo del monto

    const drawDate = `Fecha de sorteo: ${ticketDate}`;
    const drawContact = `Contacto: ${ticketContact}`;

    // Establecemos el tamaño de la fuente
    const dateAndContactFontSize = 30;
    ctx.font = `normal ${dateAndContactFontSize}px Arial`; // Fuente normal para la fecha y contacto

    // Medimos el ancho total de la línea combinada (fecha y contacto)
    const combinedText = drawDate + ' | ' + drawContact;

    // Dibujamos el texto combinado (fecha y contacto) en una sola línea, alineado con el monto
    ctx.fillText(
      combinedText,
      textCenterX, // Centramos en el mismo eje X que el monto
      drawDateAndContactY
    );
  }

  generateBackgroundImage(
    canvas: ElementRef<HTMLCanvasElement>,
    ticketTitle: string,
    ticketDescription: string,
    ticketPrice: number,
    ticketDate: string,
    ticketContact: string,
    selectedOpportunity: number,
    selectedFigure: number
  ) {
    if (!canvas) return;

    const ctx = canvas.nativeElement.getContext('2d');
    if (!ctx) return;

    // Guardar estado actual del canvas
    ctx.save();

    // Dibujar el boleto sin QR y sin oportunidades
    this.drawTicketWithoutQRAndOpportunities(
      ctx,
      ticketTitle,
      ticketDescription,
      ticketPrice,
      ticketDate,
      ticketContact,
      selectedOpportunity,
      selectedFigure
    );

    // Guardar la imagen de fondo
    this.backgroundImage = canvas.nativeElement.toDataURL('image/png');

    // Restaurar estado del canvas
    ctx.restore();
  }
}
