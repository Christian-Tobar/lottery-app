import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FirestoreService } from '../../services/firestore.service';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { MATERIAL_COMPONENTS } from '../../core/material.components';
import { MatDialog } from '@angular/material/dialog';
import { FormControl } from '@angular/forms';
import { PrintBatch, Ticket } from '../../models/models';
import { PdfticketService } from '../../services/pdfticket.service';

@Component({
  selector: 'app-series-detail',
  standalone: true,
  imports: [MATERIAL_COMPONENTS, CommonModule, CurrencyPipe],
  templateUrl: './series-detail.component.html',
  styleUrl: './series-detail.component.scss',
})
export class SeriesDetailComponent {
  private route = inject(ActivatedRoute);
  private firestoreService = inject(FirestoreService);
  private pdfticket = inject(PdfticketService);

  series = signal<any>(null);
  isLoading = signal(true);
  availableTickets: Ticket[] = [];
  selectedTicketCount = new FormControl(1);
  printBatches: PrintBatch[] = [];
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

    console.log('Imprimiendo boletos:', ticketsToPrint);
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
    this.printBatches = await this.firestoreService.getPrintBatches(seriesId);
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
    console.log('Reimprimiendo boletos:', ticketsToPrint);
    this.pdfticket.generateTicketsPdf(series, ticketsToPrint);

    this.isLoading.set(false);
  }
}
