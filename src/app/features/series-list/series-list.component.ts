import { Component } from '@angular/core';
import { FirestoreService } from '../../services/firestore.service';
import { Router } from '@angular/router';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { MATERIAL_COMPONENTS } from '../../core/material.components';

interface Series {
  id: string;
  createdAt: string;
  title: string;
  description: string;
  date: string;
  printedTickets: number;
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
  loading: boolean = true;
  errorMessage: string | null = null;

  constructor(
    private firestoreService: FirestoreService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadSeries();
  }

  async loadSeries() {
    try {
      const seriesData = await this.firestoreService.getAllSeries();

      console.log('Datos obtenidos de Firestore:', seriesData);

      // Ordenar por fecha de creación de la más reciente a la más antigua
      this.seriesList = seriesData
        .filter((series) => series.createdAt) // Filtramos las series con fecha válida
        .sort(
          (a, b) =>
            new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
        ) // Ordenamos por createdAt

        .map((series) => ({
          id: series.id ?? '',
          createdAt: series.createdAt ?? '',
          title: series.title,
          description: series.description ?? '',
          date: series.date,
          printedTickets: series.printedTickets ?? 0,
        }));

      console.log('Lista ordenada:', this.seriesList);
    } catch (error) {
      this.errorMessage = 'Error al cargar las series';
      console.error(error);
    } finally {
      this.loading = false;
    }
  }

  viewSeriesDetails(seriesId: string) {
    this.router.navigate(['/series', seriesId]); // Redirige a la página de detalles
  }
}
