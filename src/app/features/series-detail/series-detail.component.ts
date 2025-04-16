import { Component, ElementRef, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FirestoreService } from '../../services/firestore.service';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { MATERIAL_COMPONENTS } from '../../core/material.components';
import { MatDialog } from '@angular/material/dialog';
import { FormControl } from '@angular/forms';
import { PrintBatch, Ticket } from '../../models/models';
import { PdfticketService } from '../../services/pdfticket.service';
import { TicketDrawingService } from '../../services/ticket-drawing.service';

interface NumberedPrintBatch extends PrintBatch {
  batchNumber: number;
}

@Component({
  selector: 'app-series-detail',
  standalone: true,
  imports: [MATERIAL_COMPONENTS, CommonModule],
  templateUrl: './series-detail.component.html',
  styleUrl: './series-detail.component.scss',
})
export class SeriesDetailComponent {
  private route = inject(ActivatedRoute);
  private firestoreService = inject(FirestoreService);
  private pdfticket = inject(PdfticketService);
  private ticketDrawingService = inject(TicketDrawingService);

  ticketFrontImage = signal<string | null>(null);
  ticketBackImage = signal<string | null>(null);

  ticketBackAvailable = false;

  series = signal<any>(null);
  isLoading = signal(true);
  availableTickets: Ticket[] = [];
  selectedTicketCount = new FormControl(1);
  printBatches: NumberedPrintBatch[] = [];
  dialog = inject(MatDialog);

  constructor() {
    this.loadSeries();
  }

  /**
   * Carga la serie y sus detalles basicos.
   */
  async loadSeries() {
    const seriesId = this.route.snapshot.paramMap.get('id');
    if (!seriesId) return;

    const loadedSeries = await this.firestoreService.getSeriesById(seriesId);
    if (!loadedSeries) {
      this.isLoading.set(false);
      return;
    }

    this.series.set(loadedSeries);
    await this.loadTicketImage(loadedSeries);
    await this.loadPrintBatches(seriesId);

    this.isLoading.set(false);
  }

  /**
   * Maneja la impresión de boletos nuevos.
   */
  async printNewTickets() {
    const series = this.series();
    if (!series) return;

    const userInput = window.prompt(
      `¿Cuántos boletos deseas imprimir? (Disponibles: ${series.availableTickets})`,
      '1'
    );

    if (!userInput) return; // El usuario canceló
    const count = parseInt(userInput, 10);

    if (isNaN(count) || count <= 0) {
      alert('Por favor, ingresa un número válido de boletos.');
      return;
    }

    if (count > series.availableTickets) {
      alert(`Solo hay ${series.availableTickets} boletos disponibles.`);
      return;
    }

    this.isLoading.set(true);

    // Obtener el último índice impreso
    const lastPrintedIndex = await this.firestoreService.getLastPrintedIndex(
      series.id
    );
    const startIndex = lastPrintedIndex + 1;
    const endIndex = startIndex + count - 1;

    // Obtener todos los boletos
    const tickets = await this.firestoreService.getTickets(series.id);

    // Seleccionar los boletos desde el último índice impreso
    const ticketsToPrint = tickets.slice(startIndex - 1, endIndex);

    if (ticketsToPrint.length === 0) {
      alert('No hay suficientes boletos disponibles para imprimir.');
      this.isLoading.set(false);
      return;
    }

    this.pdfticket.generateTicketsPdf(series, ticketsToPrint);

    // Registrar la tanda de impresión
    await this.firestoreService.registerPrintBatch(
      series.id,
      startIndex,
      endIndex,
      ticketsToPrint.map((ticket) => ticket.id!)
    );

    // Refrescar datos
    await this.loadSeries();
    this.isLoading.set(false);
  }

  /**
   * Carga las tandas de boletos impresos.
   */
  async loadPrintBatches(seriesId: string) {
    // Cargar y ordenar las tandas por fecha (más reciente primero)
    const rawBatches = await this.firestoreService.getPrintBatches(seriesId);
    const sortedBatches = rawBatches.sort(
      (a, b) =>
        new Date(b.printedAt).getTime() - new Date(a.printedAt).getTime()
    );

    // Enumerar las tandas: Tanda 1 = más antigua
    this.printBatches = sortedBatches.map((batch, index, arr) => ({
      ...batch,
      batchNumber: arr.length - index, // Tanda 1 es la más antigua
    }));
  }

  /**
   * Abre un diálogo para reimprimir boletos de una tanda.
   */
  async reprintTickets(batch: PrintBatch) {
    const series = this.series();
    if (!series) return;

    const confirm = window.confirm(
      `¿Deseas reimprimir los boletos de la tanda ${batch.startIndex} - ${batch.endIndex}?`
    );
    if (!confirm) return;

    this.isLoading.set(true);

    // Obtener los boletos de la tanda exactos por ID
    const tickets = await this.firestoreService.getTickets(series.id);
    const ticketsToPrint = tickets.filter((ticket) =>
      batch.ticketIds.includes(ticket.id ?? '')
    );

    if (ticketsToPrint.length === 0) {
      alert('No se encontraron boletos para reimprimir.');
      this.isLoading.set(false);
      return;
    }

    // Simulación de impresión
    this.pdfticket.generateTicketsPdf(series, ticketsToPrint);

    this.isLoading.set(false);
  }

  async loadTicketImage(series: any) {
    const canvas = document.createElement('canvas');
    const canvasRef = {
      nativeElement: canvas,
    } as ElementRef<HTMLCanvasElement>;

    this.ticketDrawingService.setupCanvas(canvasRef);

    await this.ticketDrawingService.drawTicket(
      canvasRef,
      series.fontColors,
      series.ticketBackground,
      series.ticketTitle,
      series.ticketDescription,
      series.date,
      series.contact,
      series.ticketLogo,
      series.opportunities,
      series.figures
    );

    const imageUrl = canvas.toDataURL('image/png');
    this.ticketFrontImage.set(imageUrl);

    // Creamos el canvas del reverso
    const backCanvas = document.createElement('canvas');
    const backCanvasRef = {
      nativeElement: backCanvas,
    } as ElementRef<HTMLCanvasElement>;

    this.ticketDrawingService.setupCanvas(backCanvasRef);

    const hasBackContent =
      series.ticketClause?.trim() !== '' &&
      series.gracePeriodUnit?.trim() !== '' &&
      series.gracePeriodValue != null;

    if (hasBackContent) {
      await this.ticketDrawingService.drawTicketBack(
        backCanvasRef,
        series.fontColors,
        series.ticketBackBackground,
        series.ticketClause,
        series.gracePeriodUnit,
        series.gracePeriodValue,
        false // no rotar (para preview)
      );

      this.ticketBackAvailable = true;
    } else {
      // Si no hay contenido, dibujamos un fondo por defecto claro
      const ctx = backCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#f2f2f2'; // gris claro
        ctx.fillRect(0, 0, backCanvas.width, backCanvas.height);
      }
    }

    const backImageUrl = backCanvas.toDataURL('image/png');
    this.ticketBackImage.set(backImageUrl);
  }

  printNewBackTickets() {
    const series = this.series();
    if (!series) return;

    this.pdfticket.generateTicketsBackPdf(series);
  }
}
