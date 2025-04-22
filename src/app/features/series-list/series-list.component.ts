import { Component, ElementRef } from '@angular/core';
import { FirestoreService } from '../../services/firestore.service';
import { Router } from '@angular/router';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { MATERIAL_COMPONENTS } from '../../core/material.components';
import { TicketDrawingService } from '../../services/ticket-drawing.service';
import { FontColors, LotterySeriesStatus } from '../../models/models';
import { ContextService } from '../../services/context.service';

interface Series {
  id: string;
  status: LotterySeriesStatus;
  date: string;
  ticketTitle: string;
  ticketDescription: string;
  contact: string;
  opportunities: number | null;
  figures: number | null;
  fontColors: FontColors;
  ticketBackground: string;
  totalTickets: number | undefined;
  printedTickets: number | undefined;
  availableTickets: number | undefined;
  gracePeriodValue: number | null;
  gracePeriodUnit: string;
  ticketLogo: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-series-list',
  standalone: true,
  imports: [CommonModule, MATERIAL_COMPONENTS],
  templateUrl: './series-list.component.html',
  styleUrl: './series-list.component.scss',
})
export class SeriesListComponent {
  seriesList: Series[] = [];
  archivedSeriesList: Series[] = [];

  loading: boolean = true;
  errorMessage: string | null = null;
  seriesImages: { [id: string]: string } = {};

  stateColors: { [key in LotterySeriesStatus]: string } = {
    Activa: '#4CAF50', // Verde
    Sorteada: '#2196F3', // Azul
    Cancelada: '#F44336', // Rojo
    Archivada: '#9E9E9E', // Gris
  };

  constructor(
    private firestoreService: FirestoreService,
    private router: Router,
    private ticketDrawingService: TicketDrawingService,
    public contextService: ContextService
  ) {}

  ngOnInit(): void {
    this.loadSeries();
  }

  async loadSeries() {
    try {
      const now = new Date();

      // Cargar series no archivadas
      const seriesData = await this.firestoreService.getNonArchivedSeries();

      this.seriesList = seriesData
        .filter((series) => series.createdAt)
        .sort(
          (a, b) =>
            new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
        )
        .map((series) => {
          const [day, month, year] = series.date.split('/').map(Number);
          const seriesDate = new Date(year, month - 1, day);

          const today = new Date();
          today.setHours(0, 0, 0, 0); // Elimina hora, min, seg, ms

          seriesDate.setHours(0, 0, 0, 0); // Elimina hora de la fecha de la serie

          const shouldUpdate = series.status === 'Activa' && seriesDate < today;

          // Si debe cambiar el estado, lo actualizamos localmente
          if (shouldUpdate) {
            series.status = 'Sorteada';

            // Llamamos a la función para actualizar el estado en Firebase, sin bloquear la interfaz
            this.firestoreService
              .updateSeriesStatus(series.id!, 'Sorteada')
              .catch((err) =>
                console.error(
                  `Error al actualizar estado de la serie ${series.id}:`,
                  err
                )
              );
          }

          return {
            id: series.id ?? '',
            status: series.status,
            date: series.date,
            ticketTitle: series.ticketTitle,
            ticketDescription: series.ticketDescription,
            contact: series.contact,
            opportunities: series.opportunities,
            figures: series.figures,
            fontColors: series.fontColors,
            ticketBackground: series.ticketBackground,
            totalTickets: series.totalTickets,
            printedTickets: series.printedTickets,
            availableTickets: series.availableTickets,
            gracePeriodValue: series.gracePeriodValue,
            gracePeriodUnit: series.gracePeriodUnit,
            ticketLogo: series.ticketLogo,
            createdAt: series.createdAt ?? '',
          };
        });

      this.loading = false;

      // Cargar series archivadas
      const archivedData = await this.firestoreService.getArchivedSeries();

      this.archivedSeriesList = archivedData
        .filter((series) => series.createdAt)
        .sort(
          (a, b) =>
            new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
        )
        .map((series) => {
          return {
            id: series.id ?? '',
            status: series.status,
            date: series.date,
            ticketTitle: series.ticketTitle,
            ticketDescription: series.ticketDescription,
            contact: series.contact,
            opportunities: series.opportunities,
            figures: series.figures,
            fontColors: series.fontColors,
            ticketBackground: series.ticketBackground,
            totalTickets: series.totalTickets,
            printedTickets: series.printedTickets,
            availableTickets: series.availableTickets,
            gracePeriodValue: series.gracePeriodValue,
            gracePeriodUnit: series.gracePeriodUnit,
            ticketLogo: series.ticketLogo,
            createdAt: series.createdAt ?? '',
          };
        });

      // Generar imágenes para ambas listas
      await this.generateImagesInBatches(this.seriesList);

      await this.generateImagesInBatches(this.archivedSeriesList);
    } catch (error) {
      this.errorMessage = 'Error al cargar las series';
      console.error(error);
    } finally {
    }
  }

  async generateImagesInBatches(seriesList: Series[], batchSize = 3) {
    for (let i = 0; i < seriesList.length; i += batchSize) {
      const batch = seriesList.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (series) => {
          await this.generateTicketImage(series);
        })
      );

      // Esperar un frame para no congelar la UI
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  async generateTicketImage(series: Series) {
    // Crear un canvas fuera de la vista
    const canvas = document.createElement('canvas');
    const canvasRef = {
      nativeElement: canvas,
    } as ElementRef<HTMLCanvasElement>;

    // Preparar el canvas
    this.ticketDrawingService.setupCanvas(canvasRef);

    // Dibujar el ticket
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

    // Obtener imagen como base64
    const imageUrl = canvas.toDataURL('image/png');

    // Guardarla por ID de serie
    this.seriesImages[series.id] = imageUrl;
  }

  viewSeriesDetails(seriesId: string) {
    this.router.navigate(['/series', seriesId]); // Redirige a la página de detalles
  }

  getStatusColor(status: string): string {
    return this.stateColors[status as LotterySeriesStatus] || '#000';
  }
}
