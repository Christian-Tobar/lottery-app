import { Component } from '@angular/core';
import { FirestoreService } from '../../services/firestore.service';
import { Router } from '@angular/router';
import { CurrencyPipe } from '@angular/common';

interface Series {
  id: string;
  title: string;
  price: number;
  date: string;
  opportunities: number;
  figures: number;
  totalTickets: number;
}

@Component({
  selector: 'app-series-list',
  standalone: true,
  imports: [],
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

      // Aseguramos que id nunca sea undefined
      this.seriesList = seriesData.map((series) => ({
        id: series.id ?? '', // Si Firestore aún no asignó ID, se usa ""
        title: series.title,
        price: series.price,
        date: series.date,
        opportunities: series.opportunities,
        figures: series.figures,
        totalTickets: series.totalTickets ?? 0,
      }));
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
