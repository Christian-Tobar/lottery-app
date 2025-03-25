import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FirestoreService } from '../../services/firestore.service';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { MATERIAL_COMPONENTS } from '../../core/material.components';
import { MatDialog } from '@angular/material/dialog';
import { FormControl } from '@angular/forms';
import { PrintBatch } from '../../models/models';

interface Ticket {
  id?: string;
  numbers: string[];
  printed: boolean;
}

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
   * 📌 Carga la serie y sus detalles basicos.
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

    // Pedir al usuario cuántos boletos imprimir
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

    // Obtener el último boleto impreso para saber desde dónde comenzar
    const lastPrintedIndex = await this.firestoreService.getLastPrintedIndex(
      series.id
    );
    const startIndex = lastPrintedIndex + 1;
    const endIndex = startIndex + count - 1;

    // Obtener los boletos a imprimir
    const tickets = await this.firestoreService.getTickets(series.id);
    const ticketsToPrint = tickets.slice(startIndex, endIndex + 1);

    // Simulación de impresión (Aquí iría la lógica de impresión real)
    console.log('Imprimiendo boletos:', ticketsToPrint);

    // Registrar la tanda de impresión en Firestore
    await this.firestoreService.registerPrintBatch(
      series.id,
      startIndex,
      endIndex
    );

    // Refrescar los datos
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

    // Obtener los boletos de la tanda seleccionada
    const tickets = await this.firestoreService.getTickets(series.id);
    const ticketsToPrint = tickets.slice(batch.startIndex, batch.endIndex + 1);

    // Simulación de impresión (Aquí iría la lógica de impresión real)
    console.log('Reimprimiendo boletos:', ticketsToPrint);

    this.isLoading.set(false);
  }
}
