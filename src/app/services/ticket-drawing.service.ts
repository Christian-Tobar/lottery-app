import { ElementRef, Injectable } from '@angular/core';
import { FontColors } from '../models/models';
import QRCode from 'qrcode';

@Injectable({
  providedIn: 'root',
})
export class TicketDrawingService {
  private whatsappIcon = new Image();
  private logoImage = new Image();

  private cachedQRCode: HTMLImageElement | null = null;
  private cachedQRData: string | null = null;
  private cachedQRColor: string | null = null;

  private opportunityRect: {
    startY: number;
    endY: number;
  } | null = null;

  // DISEÑO COMPLETO DEL FONDO
  backgroundImage: string | null = null;

  // IMAGENES DE FONDO PREESTABLECIDAS
  private backgroundImages: { [key: string]: HTMLImageElement } = {};

  readonly CM_TO_PX = 300 / 2.54;
  readonly CANVAS_WIDTH = Math.round(10.795 * this.CM_TO_PX);
  readonly CANVAS_HEIGHT = Math.round(5.588 * this.CM_TO_PX);
  readonly SCALE_FACTOR = 0.4;

  constructor() {
    this.whatsappIcon.crossOrigin = 'anonymous';
    this.whatsappIcon.src = 'assets/whatsapp.png';

    this.logoImage.crossOrigin = 'anonymous';
    this.logoImage.src = 'assets/logo.png';

    this.preloadBackgroundImages([
      'assets/images/bg1.jpg',
      'assets/images/bg2.jpg',
      'assets/images/bg3.jpg',
      'assets/images/bg4.jpg',
      'assets/images/bg5.jpg',
      'assets/images/bg6.jpg',
      'assets/images/bg7.jpg',
      'assets/images/bg8.jpg',
    ]);
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

  async drawTicket(
    canvas: ElementRef<HTMLCanvasElement>,
    fontColors: FontColors,
    ticketBackground: string,
    ticketTitle: string,
    ticketDescription: string,
    ticketDate: string, // "DD/MM/YYYY"
    ticketContact: string,
    ticketLogo: boolean,
    selectedOpportunity: number | null,
    selectedFigure: number | null
  ) {
    // Si el canvas no existe, salimos sin hacer nada
    if (!canvas) return;

    // Obtenemos el contexto 2D del canvas
    const context = canvas.nativeElement.getContext('2d');
    // Si no se puede obtener el contexto, salimos
    if (!context) return;
    const ctx = context;

    // Definimos dimensiones del canvas
    const width = this.CANVAS_WIDTH;
    const height = this.CANVAS_HEIGHT;
    const margin = 25; // Margen alrededor del canvas

    // Limpiamos todo el contenido previo del canvas
    ctx.clearRect(0, 0, width, height);

    // DIBUJAR FONDO DEL TICKET
    if (ticketBackground?.startsWith('#')) {
      // Si es un color hexadecimal
      ctx.fillStyle = ticketBackground;
      ctx.fillRect(0, 0, width, height);
    } else {
      // Si es una imagen (nombre/ruta)
      const bgImage = this.backgroundImages[ticketBackground];
      if (bgImage) {
        if (bgImage.complete) {
          ctx.drawImage(bgImage, 0, 0, width, height);
        } else {
          bgImage.onload = () => {
            ctx.drawImage(bgImage, 0, 0, width, height);
          };
        }
      }
    }

    // DIBUJAR BORDE DEL TICKET
    ctx.strokeStyle = fontColors.border; // Color del borde
    ctx.lineWidth = 4; // Grosor del borde
    ctx.strokeRect(margin, margin, width - 2 * margin, height - 2 * margin); // Dibujamos el rectángulo interior con margen

    // DIBUJAR CÓDIGO QR EN LA ESQUINA SUPERIOR DERECHA
    const qrSize = 250; // Tamaño del QR
    const qrX = width - margin - qrSize; // Posición X (alineado a la derecha con margen)
    const qrY = margin; // Posición Y (parte superior con margen)

    // Usar el caché de QR generado
    const qrCode = await this.generateQRCode(
      'Codigo QR de ejemplo', // Aquí usas el contenido del QR, por ejemplo, `ticketContact`
      fontColors.qr || '#000000'
    );
    ctx.drawImage(qrCode, qrX, qrY, qrSize, qrSize);

    // DIBUJAR BLOQUE DE FECHA
    const posX = width - 250; // Posición horizontal absoluta
    const posY = 295; // Posición vertical absoluta
    const boxWidth = 200; // Ancho del recuadro

    // Dividimos la fecha en día, mes y año (esperamos formato DD/MM/YYYY)
    const [day, month, year] = ticketDate.split('/');

    // Array con abreviaturas de los meses
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

    // Convertimos valores a texto
    const monthStr = monthNames[parseInt(month) - 1]; // Mes como texto
    const dayStr = parseInt(day).toString().padStart(2, '0'); // Día con dos dígitos
    const yearStr = year; // Año tal cual

    // FUNCIÓN PARA AJUSTAR EL TAMAÑO DE FUENTE AUTOMÁTICAMENTE SEGÚN EL ANCHO DISPONIBLE
    function adjustFontSize(
      text: string,
      initialSize: number,
      maxWidth: number
    ): number {
      let size = initialSize;
      ctx.font = `bold ${size}px Arial`;
      while (ctx.measureText(text).width > maxWidth && size > 10) {
        size--;
        ctx.font = `bold ${size}px Arial`;
      }
      return size;
    }

    // Calculamos tamaños óptimos para cada parte de la fecha
    const maxDateWidth = boxWidth - 20; // Margen interno del recuadro
    const monthFontSize = adjustFontSize(monthStr, 55, maxDateWidth);
    const dayFontSize = adjustFontSize(dayStr, 100, maxDateWidth);
    const yearFontSize = adjustFontSize(yearStr, 50, maxDateWidth);

    // Calculamos la altura del recuadro en base a los textos
    const boxHeight = monthFontSize + dayFontSize + yearFontSize + 60;
    const radius = 20; // Radio de las esquinas redondeadas
    const centerX = posX + boxWidth / 2; // Centro del recuadro en X

    // DIBUJAR EL RECUADRO DE FECHA CON ESQUINAS REDONDEADAS
    ctx.beginPath();
    ctx.moveTo(posX + radius, posY);
    ctx.lineTo(posX + boxWidth - radius, posY);
    ctx.quadraticCurveTo(posX + boxWidth, posY, posX + boxWidth, posY + radius);
    ctx.lineTo(posX + boxWidth, posY + boxHeight - radius);
    ctx.quadraticCurveTo(
      posX + boxWidth,
      posY + boxHeight,
      posX + boxWidth - radius,
      posY + boxHeight
    );
    ctx.lineTo(posX + radius, posY + boxHeight);
    ctx.quadraticCurveTo(
      posX,
      posY + boxHeight,
      posX,
      posY + boxHeight - radius
    );
    ctx.lineTo(posX, posY + radius);
    ctx.quadraticCurveTo(posX, posY, posX + radius, posY);
    ctx.strokeStyle = fontColors.date; // Color del borde
    ctx.lineWidth = 4; // Grosor del borde
    ctx.stroke(); // Dibuja el contorno

    // TÍTULO "FECHA SORTEO" ENCIMA DEL RECUADRO
    ctx.font = 'bold 24px Arial'; // Estilo de fuente
    ctx.fillStyle = fontColors.date; // Color de texto
    ctx.textAlign = 'center'; // Alineado al centro

    ctx.fillText('FECHA SORTEO', centerX, posY - 10); // Dibujamos el título justo encima del recuadro

    // DIBUJAR EL TEXTO DE LA FECHA (MES, DÍA, AÑO)
    let y = posY + 80; // Posición vertical inicial dentro del recuadro

    ctx.font = `bold ${monthFontSize}px Arial`;
    ctx.fillText(monthStr, centerX, y); // Mes en letras
    y += monthFontSize + 35; //Posición vertical

    ctx.font = `bold ${dayFontSize}px Arial`;
    ctx.fillText(dayStr, centerX, y); // Día
    y += dayFontSize - 40; // Posición vertical

    ctx.font = `bold ${yearFontSize}px Arial`;
    ctx.fillText(yearStr, centerX, y); // Año

    // CONTACTO CON ÍCONO DE WHATSAPP

    // Configuración visual
    const iconSize = 26; // Tamaño del ícono
    const spacing = 10; // Espacio entre ícono y texto
    const fontSize = 25; // Tamaño de la fuente del texto

    // Posiciones absolutas
    const contactY = height - margin - 25; // Posición vertical en el canvas
    const contactXCenter = width - 150; // Posición horizontal central del bloque (texto + ícono)

    // Aplicar estilos al contexto
    ctx.font = `bold ${fontSize}px Arial`; // Fuente
    ctx.fillStyle = fontColors.contact; // Color del texto
    ctx.textAlign = 'center'; // Alinear el texto al centro

    // Medir el ancho total del bloque (ícono + espacio + texto)
    const textWidth = ctx.measureText(ticketContact).width;
    const totalBlockWidth = iconSize + spacing + textWidth;

    // Calcular la posición inicial del ícono para que todo quede centrado
    const iconX = contactXCenter - totalBlockWidth / 2;
    const iconY = contactY - iconSize + 4; // Ajuste vertical fino

    // Calcular posición del texto a la derecha del ícono
    const textX = iconX + iconSize + spacing;

    // Dibujar el ícono (si ya está cargado)
    if (this.whatsappIcon.complete) {
      this.drawTintedImage(
        ctx,
        this.whatsappIcon,
        iconX,
        iconY - 5,
        iconSize,
        iconSize,
        fontColors.contact
      );
    } else {
      this.whatsappIcon.onload = () => {
        this.drawTintedImage(
          ctx,
          this.whatsappIcon,
          iconX,
          iconY - 5,
          iconSize,
          iconSize,
          fontColors.contact
        );
      };
    }

    // Dibujar el texto del contacto
    ctx.fillText(ticketContact, textX + textWidth / 2, contactY - 5);

    // DIBUJAR LOGO EN POSICIÓN FIJA

    // Posición absoluta en el canvas
    const logoX = 40; // Distancia desde el borde izquierdo
    const logoY = 40; // Distancia desde el borde superior
    const logoSize = 180; // Tamaño del logo (ancho y alto en píxeles)

    // Imagen del logo (debe estar precargada en algún momento)
    const logoImage = this.logoImage; // <-- Asegurate de que esta imagen exista

    // Dibujar el logo si corresponde
    if (ticketLogo) {
      if (logoImage?.complete) {
        // Si la imagen ya cargó, se dibuja directamente
        ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);
      } else {
        // Si aún no cargó, se espera a que termine de cargar
        logoImage.onload = () => {
          ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);
        };
      }
    }

    // TÍTULO EN LA PARTE SUPERIOR

    // Tamaño de fuente para el título
    ctx.font = `bold 60px Arial`;
    ctx.fillStyle = fontColors.title;
    const titleLineHeight = 50; // Altura de línea para separar cada línea del título
    const titleMarginTop = 120; // Margen superior absoluto desde donde empieza el título

    // Coordenadas absolutas que delimitan el espacio horizontal del título
    const titleStartX = ticketLogo ? 40 + 180 + 20 : 40; // Si hay logo, empezar más a la derecha
    const titleEndX = width - 40 - 250 - 10; // Reservamos espacio para el QR a la derecha

    // Ancho máximo disponible para el título
    const titleMaxWidth = titleEndX - titleStartX;

    // Alinear texto desde el centro para poder centrar cada línea manualmente
    ctx.textAlign = 'center';

    // FUNCIONALIDAD PARA CORTAR TEXTO EN LÍNEAS
    const splitTitleIntoLines = (
      text: string,
      maxWidth: number,
      maxLines: number
    ): string[] => {
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = '';

      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const testLine = currentLine + word + ' ';
        const testWidth = ctx.measureText(testLine).width;

        if (lines.length === maxLines - 1) {
          // Solo se permite una línea más
          if (testWidth <= maxWidth) {
            currentLine = testLine;
          } else {
            break;
          }
        } else if (testWidth > maxWidth) {
          // La línea se llenó, guardar y empezar nueva
          lines.push(currentLine.trim());
          currentLine = word + ' ';
        } else {
          currentLine = testLine;
        }
      }

      // Agregar última línea si no está vacía
      if (lines.length < maxLines && currentLine.trim() !== '') {
        lines.push(currentLine.trim());
      }

      return lines;
    };

    // Cortar el título en máximo 2 líneas según el espacio disponible
    const titleLines = splitTitleIntoLines(ticketTitle, titleMaxWidth, 2);

    // Coordenada central del bloque donde debe alinearse el texto horizontalmente
    const titleCenterX = titleStartX + titleMaxWidth / 2;

    // DIBUJAR CADA LÍNEA DEL TÍTULO
    titleLines.forEach((line, index) => {
      const y = titleMarginTop + index * titleLineHeight;
      ctx.fillText(line, titleCenterX, y); // Dibujar línea centrada horizontalmente
    });

    // DESCRIPCIÓN
    const descStartX = ticketLogo ? logoX + logoSize + 20 : margin + 30; // X inicial, ajusta si hay logo
    const descEndX = width - margin - 250 - 10; // X final, antes del QR

    let descriptionFontSize = 48; // Tamaño inicial de fuente
    let descriptionLineHeight = 45; // Espacio entre líneas
    const descriptionMaxWidth = descEndX - descStartX; // Ancho máximo de texto
    const descriptionStartY =
      titleMarginTop + titleLines.length * titleLineHeight; // Y inicial, debajo del título

    ctx.textAlign = 'center'; // Alineación al centro
    ctx.font = `normal ${descriptionFontSize}px Arial`; // Fuente inicial

    let descriptionLines = this.wrapTextForDescription(
      // Cortar en líneas
      ctx,
      ticketDescription,
      descriptionMaxWidth,
      descriptionFontSize
    );

    let descriptionHeight = descriptionLines.length * descriptionLineHeight; // Altura total del texto
    const availableDescriptionHeight = 120; // Altura máxima permitida

    while (
      // Reducir fuente si no cabe
      descriptionHeight > availableDescriptionHeight &&
      descriptionFontSize > 20
    ) {
      descriptionFontSize -= 2; // Disminuir tamaño de fuente
      descriptionLineHeight = descriptionFontSize * 0.95; // Ajustar altura de línea
      ctx.font = `normal ${descriptionFontSize}px Arial`; // Actualizar fuente

      descriptionLines = this.wrapTextForDescription(
        // Recalcular líneas
        ctx,
        ticketDescription,
        descriptionMaxWidth,
        descriptionFontSize
      );
      descriptionHeight = descriptionLines.length * descriptionLineHeight; // Recalcular altura
    }

    // Dibujar líneas finales
    ctx.font = `normal ${descriptionFontSize}px Arial`; // Asegurar fuente final
    ctx.fillStyle = fontColors.description; // Color

    const descCenterX = descStartX + descriptionMaxWidth / 2;

    descriptionLines.forEach((line: string, index: number) => {
      const y = descriptionStartY + index * descriptionLineHeight;
      ctx.fillText(line, descCenterX, y); // <-- centrado en el espacio horizontal disponible
    });

    // Si hay una figura seleccionada y una cantidad de oportunidades válida
    if (selectedFigure != null && selectedOpportunity != null) {
      // REGISTRO DE POSICIONES Y
      // Variables para almacenar la posición más baja de cada sección
      let logoBottomY: number | null = null;
      let titleBottomY: number | null = null;
      let descriptionBottomY: number | null = null;
      let showFinePrint = false; // Flag para mostrar letra menuda al final del ticket

      // Si hay logo, calcular su posición inferior
      if (ticketLogo) {
        logoBottomY = logoY + logoSize;
      }

      // Si hay líneas de título, calcular la posición inferior del título
      if (titleLines.length > 0) {
        titleBottomY =
          titleMarginTop + (titleLines.length - 1) * titleLineHeight;
      }

      // Si hay líneas de descripción, calcular su posición inferior
      if (descriptionLines.length > 0) {
        descriptionBottomY =
          descriptionStartY +
          (descriptionLines.length - 1) * descriptionLineHeight;
      }

      // Agrupar los elementos cuya posición Y es válida (no null)
      const values = [
        { name: 'Logo', y: logoBottomY },
        { name: 'Título', y: titleBottomY },
        { name: 'Descripción', y: descriptionBottomY },
      ].filter((item) => item.y !== null) as { name: string; y: number }[];

      // Inicializar lowestY con el margen por defecto
      let lowestY = margin;

      // Si hay elementos válidos, obtener la posición Y más baja
      if (values.length > 0) {
        const lowest = values.reduce((a, b) => (a.y > b.y ? a : b));
        lowestY = lowest.y;
      }

      // DEFINIR ÁREA PARA OPORTUNIDADES

      const rectStartY = lowestY; // Inicio del rectángulo (después del último elemento)
      const rectEndY = showFinePrint ? height - margin - 45 : height - margin; // Fin del rectángulo (antes de la letra menuda si aplica)
      const rectHeight = rectEndY - rectStartY; // Altura del rectángulo
      const rectWidth = width - 250 - 2 * margin; // Ancho del rectángulo (con margen aplicado)

      // Guardas las coordenadas verticales del rectangulo
      this.setOpportunityRect(rectStartY, rectEndY);

      // Layouts predefinidos para 1 a 6 oportunidades
      const layouts: Record<number, [number, number][]> = {
        1: [[0.5, 0.5]], // Centrado
        2: [
          [0.5, 0.25],
          [0.5, 0.75],
        ],
        3: [
          [0.25, 0.25],
          [0.5, 0.5],
          [0.75, 0.75],
        ],
        4: [
          [0.25, 0.25],
          [0.75, 0.25],
          [0.25, 0.75],
          [0.75, 0.75],
        ],
        5: [
          [0.25, 0.25],
          [0.75, 0.25],
          [0.5, 0.5],
          [0.25, 0.75],
          [0.75, 0.75],
        ],
        6: [
          [0.28, 0.25],
          [0.72, 0.25],
          [0.28, 0.5],
          [0.72, 0.5],
          [0.28, 0.75],
          [0.72, 0.75],
        ],
      };

      // Generar el texto de oportunidad con cantidad de "X"
      const opportunityText = 'X'.repeat(selectedFigure);

      // Obtener layout según la cantidad de oportunidades seleccionadas
      const layout = layouts[selectedOpportunity] || [];

      // Calcular tamaño de fuente dinámico (como en PDF)
      const estimatedCols = Math.ceil(Math.sqrt(selectedOpportunity));
      const estimatedRows = Math.ceil(selectedOpportunity / estimatedCols);
      const spacingX = rectWidth / (estimatedCols + 1);
      const spacingY = rectHeight / (estimatedRows + 1);

      const maxFontSizeX = spacingX * 0.6;
      const maxFontSizeY = spacingY * 0.6;
      let dynamicFontSize = Math.min(maxFontSizeX, maxFontSizeY);

      // Reducir tamaño para layouts tipo dado
      let fontSizeFactor = 1;
      if (selectedOpportunity >= 4 && selectedOpportunity <= 6) {
        fontSizeFactor = 0.98;
      }
      dynamicFontSize *= fontSizeFactor;

      // GUARDAMOS ESTADO PARA AISLAR ESTILOS
      ctx.save();

      // ESTILOS PARA LAS FIGURAS
      ctx.font = `bold ${dynamicFontSize}px Arial`; // Tamaño de fuente dinámico
      ctx.fillStyle = fontColors.opportunities; // Color configurado para texto
      ctx.textAlign = 'center'; // Centrado horizontal
      ctx.textBaseline = 'middle'; // Centrado vertical

      // DIBUJAR LAS OPORTUNIDADES
      layout.forEach(([xRatio, yRatio]) => {
        // Calcular posición absoluta en el canvas según proporción
        const x = margin + xRatio * rectWidth;
        const y = rectStartY + yRatio * rectHeight;

        // Dibujar el texto de oportunidad en esa posición
        ctx.fillText(opportunityText, x, y);
      });

      // RESTAURAMOS ESTADO ORIGINAL DEL CONTEXTO
      ctx.restore(); // Evita que afecte a otros elementos fuera de este bloque
    }
  }

  wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ) {
    const words = text.split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
  }

  drawTicketWithoutQRAndOpportunities(
    ctx: CanvasRenderingContext2D,
    fontColors: FontColors,
    ticketTitle: string,
    ticketBackground: string,
    ticketDescription: string,
    ticketDate: string, // "DD/MM/YYYY"
    ticketContact: string,
    ticketLogo: boolean,
    gracePeriodValue: number | null,
    gracePeriodUnit: string
  ) {
    if (!ctx) return;

    const width = this.CANVAS_WIDTH;
    const height = this.CANVAS_HEIGHT;
    const margin = 25; // Margen alrededor del borde

    ctx.clearRect(0, 0, width, height);

    // DIBUJAR FONDO DEL TICKET
    if (ticketBackground?.startsWith('#')) {
      // Si es un color hexadecimal
      ctx.fillStyle = ticketBackground;
      ctx.fillRect(0, 0, width, height);
    } else {
      // Si es una imagen (nombre/ruta)
      const bgImage = this.backgroundImages[ticketBackground];
      if (bgImage) {
        if (bgImage.complete) {
          ctx.drawImage(bgImage, 0, 0, width, height);
        } else {
          bgImage.onload = () => {
            ctx.drawImage(bgImage, 0, 0, width, height);
          };
        }
      }
    }

    // DIBUJAR BORDE DEL TICKET
    ctx.strokeStyle = fontColors.border; // Color del borde
    ctx.lineWidth = 4; // Grosor del borde
    ctx.strokeRect(margin, margin, width - 2 * margin, height - 2 * margin); // Dibujamos el rectángulo interior con margen

    // DIBUJAR BLOQUE DE FECHA
    const posX = width - 250; // Posición horizontal absoluta
    const posY = 295; // Posición vertical absoluta
    const boxWidth = 200; // Ancho del recuadro

    // Dividimos la fecha en día, mes y año (esperamos formato DD/MM/YYYY)
    const [day, month, year] = ticketDate.split('/');

    // Array con abreviaturas de los meses
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

    // Convertimos valores a texto
    const monthStr = monthNames[parseInt(month) - 1]; // Mes como texto
    const dayStr = parseInt(day).toString().padStart(2, '0'); // Día con dos dígitos
    const yearStr = year; // Año tal cual

    // FUNCIÓN PARA AJUSTAR EL TAMAÑO DE FUENTE AUTOMÁTICAMENTE SEGÚN EL ANCHO DISPONIBLE
    function adjustFontSize(
      text: string,
      initialSize: number,
      maxWidth: number
    ): number {
      let size = initialSize;
      ctx.font = `bold ${size}px Arial`;
      while (ctx.measureText(text).width > maxWidth && size > 10) {
        size--;
        ctx.font = `bold ${size}px Arial`;
      }
      return size;
    }

    // Calculamos tamaños óptimos para cada parte de la fecha
    const maxDateWidth = boxWidth - 20; // Margen interno del recuadro
    const monthFontSize = adjustFontSize(monthStr, 55, maxDateWidth);
    const dayFontSize = adjustFontSize(dayStr, 100, maxDateWidth);
    const yearFontSize = adjustFontSize(yearStr, 50, maxDateWidth);

    // Calculamos la altura del recuadro en base a los textos
    const boxHeight = monthFontSize + dayFontSize + yearFontSize + 60;
    const radius = 20; // Radio de las esquinas redondeadas
    const centerX = posX + boxWidth / 2; // Centro del recuadro en X

    // === DIBUJAR EL RECUADRO DE FECHA CON ESQUINAS REDONDEADAS ===
    ctx.beginPath();
    ctx.moveTo(posX + radius, posY);
    ctx.lineTo(posX + boxWidth - radius, posY);
    ctx.quadraticCurveTo(posX + boxWidth, posY, posX + boxWidth, posY + radius);
    ctx.lineTo(posX + boxWidth, posY + boxHeight - radius);
    ctx.quadraticCurveTo(
      posX + boxWidth,
      posY + boxHeight,
      posX + boxWidth - radius,
      posY + boxHeight
    );
    ctx.lineTo(posX + radius, posY + boxHeight);
    ctx.quadraticCurveTo(
      posX,
      posY + boxHeight,
      posX,
      posY + boxHeight - radius
    );
    ctx.lineTo(posX, posY + radius);
    ctx.quadraticCurveTo(posX, posY, posX + radius, posY);
    ctx.strokeStyle = fontColors.date; // Color del borde
    ctx.lineWidth = 4; // Grosor del borde
    ctx.stroke(); // Dibuja el contorno

    // TÍTULO "FECHA SORTEO" ENCIMA DEL RECUADRO
    ctx.font = 'bold 24px Arial'; // Estilo de fuente
    ctx.fillStyle = fontColors.date; // Color de texto
    ctx.textAlign = 'center'; // Alineado al centro

    ctx.fillText('FECHA SORTEO', centerX, posY - 10); // Dibujamos el título justo encima del recuadro

    // DIBUJAR EL TEXTO DE LA FECHA (MES, DÍA, AÑO)
    let y = posY + 80; // Posición vertical inicial dentro del recuadro

    ctx.font = `bold ${monthFontSize}px Arial`;
    ctx.fillText(monthStr, centerX, y); // Mes en letras
    y += monthFontSize + 35; //Posición vertical

    ctx.font = `bold ${dayFontSize}px Arial`;
    ctx.fillText(dayStr, centerX, y); // Día
    y += dayFontSize - 40; // Posición vertical

    ctx.font = `bold ${yearFontSize}px Arial`;
    ctx.fillText(yearStr, centerX, y); // Año

    // CONTACTO CON ÍCONO DE WHATSAPP

    // Configuración visual
    const iconSize = 26; // Tamaño del ícono
    const spacing = 10; // Espacio entre ícono y texto
    const fontSize = 25; // Tamaño de la fuente del texto

    // Posiciones absolutas
    const contactY = height - margin - 25; // Posición vertical en el canvas
    const contactXCenter = width - 150; // Posición horizontal central del bloque (texto + ícono)

    // Aplicar estilos al contexto
    ctx.font = `bold ${fontSize}px Arial`; // Fuente
    ctx.fillStyle = fontColors.contact; // Color del texto
    ctx.textAlign = 'center'; // Alinear el texto al centro

    // Medir el ancho total del bloque (ícono + espacio + texto)
    const textWidth = ctx.measureText(ticketContact).width;
    const totalBlockWidth = iconSize + spacing + textWidth;

    // Calcular la posición inicial del ícono para que todo quede centrado
    const iconX = contactXCenter - totalBlockWidth / 2;
    const iconY = contactY - iconSize + 4; // Ajuste vertical fino

    // Calcular posición del texto a la derecha del ícono
    const textX = iconX + iconSize + spacing;

    // Dibujar el ícono (si ya está cargado)
    if (this.whatsappIcon.complete) {
      this.drawTintedImage(
        ctx,
        this.whatsappIcon,
        iconX,
        iconY - 5,
        iconSize,
        iconSize,
        fontColors.contact
      );
    } else {
      this.whatsappIcon.onload = () => {
        this.drawTintedImage(
          ctx,
          this.whatsappIcon,
          iconX,
          iconY - 5,
          iconSize,
          iconSize,
          fontColors.contact
        );
      };
    }

    // Dibujar el texto del contacto
    ctx.fillText(ticketContact, textX + textWidth / 2, contactY - 5);

    // DIBUJAR LOGO EN POSICIÓN FIJA

    // Posición absoluta en el canvas
    const logoX = 40; // Distancia desde el borde izquierdo
    const logoY = 40; // Distancia desde el borde superior
    const logoSize = 180; // Tamaño del logo (ancho y alto en píxeles)

    // Imagen del logo (debe estar precargada en algún momento)
    const logoImage = this.logoImage; // <-- Asegurate de que esta imagen exista

    // Dibujar el logo si corresponde
    if (ticketLogo) {
      if (logoImage?.complete) {
        // Si la imagen ya cargó, se dibuja directamente
        ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);
      } else {
        // Si aún no cargó, se espera a que termine de cargar
        logoImage.onload = () => {
          ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);
        };
      }
    }

    // TÍTULO EN LA PARTE SUPERIOR

    // Tamaño de fuente para el título
    ctx.font = `bold 60px Arial`;
    ctx.fillStyle = fontColors.title;
    const titleLineHeight = 50; // Altura de línea para separar cada línea del título
    const titleMarginTop = 120; // Margen superior absoluto desde donde empieza el título

    // Coordenadas absolutas que delimitan el espacio horizontal del título
    const titleStartX = ticketLogo ? 40 + 180 + 20 : 40; // Si hay logo, empezar más a la derecha
    const titleEndX = width - 40 - 250 - 10; // Reservamos espacio para el QR a la derecha

    // Ancho máximo disponible para el título
    const titleMaxWidth = titleEndX - titleStartX;

    // Alinear texto desde el centro para poder centrar cada línea manualmente
    ctx.textAlign = 'center';

    // FUNCIONALIDAD PARA CORTAR TEXTO EN LÍNEAS
    const splitTitleIntoLines = (
      text: string,
      maxWidth: number,
      maxLines: number
    ): string[] => {
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = '';

      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const testLine = currentLine + word + ' ';
        const testWidth = ctx.measureText(testLine).width;

        if (lines.length === maxLines - 1) {
          // Solo se permite una línea más
          if (testWidth <= maxWidth) {
            currentLine = testLine;
          } else {
            break;
          }
        } else if (testWidth > maxWidth) {
          // La línea se llenó, guardar y empezar nueva
          lines.push(currentLine.trim());
          currentLine = word + ' ';
        } else {
          currentLine = testLine;
        }
      }

      // Agregar última línea si no está vacía
      if (lines.length < maxLines && currentLine.trim() !== '') {
        lines.push(currentLine.trim());
      }

      return lines;
    };

    // Cortar el título en máximo 2 líneas según el espacio disponible
    const titleLines = splitTitleIntoLines(ticketTitle, titleMaxWidth, 2);

    // Coordenada central del bloque donde debe alinearse el texto horizontalmente
    const titleCenterX = titleStartX + titleMaxWidth / 2;

    // DIBUJAR CADA LÍNEA DEL TÍTULO
    titleLines.forEach((line, index) => {
      const y = titleMarginTop + index * titleLineHeight;
      ctx.fillText(line, titleCenterX, y); // Dibujar línea centrada horizontalmente
    });

    // === DESCRIPCIÓN ===
    const descStartX = ticketLogo ? logoX + logoSize + 20 : margin + 30; // X inicial, ajusta si hay logo
    const descEndX = width - margin - 250 - 10; // X final, antes del QR

    let descriptionFontSize = 48; // Tamaño inicial de fuente
    let descriptionLineHeight = 45; // Espacio entre líneas
    const descriptionMaxWidth = descEndX - descStartX; // Ancho máximo de texto
    const descriptionStartY =
      titleMarginTop + titleLines.length * titleLineHeight; // Y inicial, debajo del título

    ctx.textAlign = 'center'; // Alineación al centro
    ctx.font = `normal ${descriptionFontSize}px Arial`; // Fuente inicial

    let descriptionLines = this.wrapTextForDescription(
      // Cortar en líneas
      ctx,
      ticketDescription,
      descriptionMaxWidth,
      descriptionFontSize
    );

    let descriptionHeight = descriptionLines.length * descriptionLineHeight; // Altura total del texto
    const availableDescriptionHeight = 120; // Altura máxima permitida

    while (
      // Reducir fuente si no cabe
      descriptionHeight > availableDescriptionHeight &&
      descriptionFontSize > 20
    ) {
      descriptionFontSize -= 2; // Disminuir tamaño de fuente
      descriptionLineHeight = descriptionFontSize * 0.95; // Ajustar altura de línea
      ctx.font = `normal ${descriptionFontSize}px Arial`; // Actualizar fuente

      descriptionLines = this.wrapTextForDescription(
        // Recalcular líneas
        ctx,
        ticketDescription,
        descriptionMaxWidth,
        descriptionFontSize
      );
      descriptionHeight = descriptionLines.length * descriptionLineHeight; // Recalcular altura
    }

    // Dibujar líneas finales
    ctx.font = `normal ${descriptionFontSize}px Arial`; // Asegurar fuente final
    ctx.fillStyle = fontColors.description; // Color

    const descCenterX = descStartX + descriptionMaxWidth / 2;

    descriptionLines.forEach((line: string, index: number) => {
      const y = descriptionStartY + index * descriptionLineHeight;
      ctx.fillText(line, descCenterX, y); // <-- centrado en el espacio horizontal disponible
    });
  }

  generateBackgroundImage(
    canvas: ElementRef<HTMLCanvasElement>,
    fontColors: FontColors,
    ticketBackground: string,
    ticketTitle: string,
    ticketDescription: string,
    ticketDate: string, // "DD/MM/YYYY"
    ticketContact: string,
    ticketLogo: boolean,
    gracePeriodValue: number | null,
    gracePeriodUnit: string
  ) {
    if (!canvas) return;

    const ctx = canvas.nativeElement.getContext('2d');
    if (!ctx) return;

    // Guardar estado actual del canvas
    ctx.save();

    // Dibujar el boleto sin QR y sin oportunidades
    this.drawTicketWithoutQRAndOpportunities(
      ctx,
      fontColors,
      ticketTitle,
      ticketBackground,
      ticketDescription,
      ticketDate,
      ticketContact,
      ticketLogo,
      gracePeriodValue,
      gracePeriodUnit
    );

    // Guardar la imagen de fondo
    this.backgroundImage = canvas.nativeElement.toDataURL('image/png');

    // Restaurar estado del canvas
    ctx.restore();
  }

  wrapTextForDescription(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    fontSize: number
  ): string[] {
    const words = text.split(/\s+/);
    let line = '';
    const lines: string[] = [];

    ctx.font = `normal ${fontSize}px Arial`;

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const testWidth = ctx.measureText(testLine).width;

      if (testWidth > maxWidth && line.trim().length > 0) {
        lines.push(line.trim());
        line = words[i] + ' ';
      } else {
        line = testLine;
      }
    }

    if (line.trim().length > 0) {
      lines.push(line.trim());
    }

    return lines;
  }

  drawTicketBack(
    canvasRef: ElementRef<HTMLCanvasElement>,
    fontColors: FontColors,
    background: string,
    ticketClause: string,
    gracePeriodUnit: string,
    gracePeriodValue: number | null,
    rotate: boolean = true
  ) {
    if (!canvasRef) return;
    const context = canvasRef.nativeElement.getContext('2d');
    if (!context) return;
    const ctx = context;

    const width = this.CANVAS_WIDTH;
    const height = this.CANVAS_HEIGHT;
    const margin = 25;

    if (rotate) {
      ctx.save();
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.clearRect(0, 0, width, height);

    // Fondo
    if (background?.startsWith('#')) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
    } else {
      const bgImage = this.backgroundImages[background];
      if (bgImage) {
        if (bgImage.complete) {
          ctx.drawImage(bgImage, 0, 0, width, height);
        } else {
          bgImage.onload = () => {
            ctx.drawImage(bgImage, 0, 0, width, height);
          };
        }
      }
    }

    // Borde
    ctx.strokeStyle = fontColors.border;
    ctx.lineWidth = 4;
    ctx.strokeRect(margin, margin, width - 2 * margin, height - 2 * margin);

    const areaHeight = height - 2 * margin;
    const textHorizontalPadding = 40;
    const maxFontSize = 24;
    const minFontSize = 8;

    const wrapText = (text: string, fontSize: number): string[] => {
      ctx.font = `${fontSize}px Arial`;
      const words = text.split(' ');
      const lines: string[] = [];
      let line = '';
      const maxLineWidth = width - 2 * (margin + textHorizontalPadding);

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxLineWidth && n > 0) {
          lines.push(line.trim());
          line = words[n] + ' ';
        } else {
          line = testLine;
        }
      }
      lines.push(line.trim());
      return lines;
    };

    const getLines = (text: string, fontSize: number): string[] => {
      const paragraphs = text.split('\n');
      const wrappedLines: string[] = [];

      for (const paragraph of paragraphs) {
        const wrappedParagraph = wrapText(paragraph, fontSize);
        wrappedLines.push(...wrappedParagraph);
      }
      return wrappedLines;
    };

    const titleFontSize = 28;
    const title = '¡IMPORTANTE!';

    let fontSize = maxFontSize;
    let lines: string[] = [];

    while (fontSize >= minFontSize) {
      lines = getLines(ticketClause, fontSize);
      const totalTextHeight = lines.length * fontSize * 1.2;
      if (totalTextHeight <= areaHeight) break;
      fontSize--;
    }

    const lineHeight = fontSize * 1.2;
    const textHeight = lines.length * lineHeight;
    let y = margin + (areaHeight - textHeight) / 2 + lineHeight / 2;

    // Título
    if (ticketClause !== '') {
      ctx.font = `bold ${titleFontSize}px Arial`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillStyle = fontColors.clause;
      ctx.fillText(title, width / 2, y - lineHeight * 0.05);
      y += lineHeight * 2;
    }

    // Texto principal
    ctx.font = `${fontSize}px Arial`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillStyle = fontColors.clause;

    for (const line of lines) {
      ctx.fillText(line, width / 2, y);
      y += lineHeight;
    }

    // Caducidad
    if (
      gracePeriodValue != null &&
      gracePeriodValue > 0 &&
      gracePeriodUnit != null &&
      gracePeriodUnit.trim() !== ''
    ) {
      const unitNormalized = gracePeriodUnit.toLowerCase().trim();
      const singularUnits: Record<string, string> = {
        días: 'día',
        horas: 'hora',
      };

      const numericValue = Number(gracePeriodValue);
      const unitStr =
        numericValue === 1 && singularUnits[unitNormalized]
          ? singularUnits[unitNormalized]
          : unitNormalized;

      const noticeText = `CADUCIDAD DEL BOLETO: ${gracePeriodValue} ${unitStr} a partir de la fecha y hora del sorteo.`;

      const noticeFontSize = 24;
      const noticeLines = getLines(noticeText, noticeFontSize);

      ctx.font = `${noticeFontSize}px Arial`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillStyle = fontColors.clause;
      for (const line of noticeLines) {
        ctx.fillText(line, width / 2, y + 20);
        y += noticeFontSize * 1.2;
      }
    }

    ctx.restore();
  }

  preloadBackgroundImages(urls: string[]) {
    urls.forEach((url) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = url;
      this.backgroundImages[url] = img;
    });
  }

  private async generateQRCode(
    data: string,
    color: string
  ): Promise<HTMLImageElement> {
    // Verificar si el QR ya ha sido generado con los mismos parámetros
    if (
      this.cachedQRCode &&
      this.cachedQRData === data &&
      this.cachedQRColor === color
    ) {
      return this.cachedQRCode; // Usar el QR caché
    }

    // Si no existe el caché, generamos un nuevo QR
    const qrDataUrl = await QRCode.toDataURL(data, {
      margin: 3,
      width: 250,
      color: {
        dark: color,
        light: '#ffffff00', // fondo transparente
      },
    });

    const img = new Image();
    img.src = qrDataUrl;
    await new Promise((resolve) => (img.onload = resolve));

    // Actualizar el caché
    this.cachedQRCode = img;
    this.cachedQRData = data;
    this.cachedQRColor = color;

    return img;
  }

  drawTintedImage(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string
  ) {
    // Dibujar la imagen en un canvas auxiliar
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.drawImage(img, 0, 0, width, height);

    // Extraer los píxeles de la imagen
    const imageData = tempCtx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Convertir color hex a RGB
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    // Reemplazar color manteniendo la transparencia
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha > 0) {
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
      }
    }

    tempCtx.putImageData(imageData, 0, 0);

    // Dibujar la imagen teñida en el canvas original
    ctx.drawImage(tempCanvas, x, y, width, height);
  }

  private setOpportunityRect(startY: number, endY: number) {
    this.opportunityRect = { startY, endY };
  }

  getOpportunityRect() {
    return this.opportunityRect;
  }
}
