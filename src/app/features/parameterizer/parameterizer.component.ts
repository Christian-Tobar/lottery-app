import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  TemplateRef,
  inject,
  Injectable,
} from '@angular/core';
import { MATERIAL_COMPONENTS } from '../../core/material.components';
import { FormsModule } from '@angular/forms';
import { SeriesService } from '../../services/series.service';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { TicketDrawingService } from '../../services/ticket-drawing.service';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import {
  MAT_DATE_LOCALE,
  MAT_DATE_FORMATS,
  DateAdapter,
  MatNativeDateModule,
} from '@angular/material/core';
import { NativeDateAdapter } from '@angular/material/core';
import { LOCALE_ID } from '@angular/core';

// Registrar el idioma español para formateo de fechas
registerLocaleData(localeEs, 'es');

// Adaptador de fecha personalizado para manejar el formato DD/MM/YYYY
@Injectable()
export class CustomDateAdapter extends NativeDateAdapter {
  // Método para analizar una fecha en formato DD/MM/YYYY y convertirla a un objeto Date
  override parse(value: any): Date | null {
    if (typeof value === 'string' && value.includes('/')) {
      const [day, month, year] = value.split('/').map(Number);
      return new Date(year, month - 1, day);
    }
    return super.parse(value);
  }

  // Método para formatear una fecha en el formato DD/MM/YYYY antes de mostrarla
  override format(date: Date, displayFormat: string): string {
    if (displayFormat === 'DD/MM/YYYY') {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return super.format(date, displayFormat);
  }
}

// Definición de formatos personalizados para el selector de fechas de Angular Material
export const MY_DATE_FORMATS = {
  parse: { dateInput: 'DD/MM/YYYY' },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

@Component({
  selector: 'app-parameterizer',
  standalone: true,
  imports: [MATERIAL_COMPONENTS, FormsModule, MatNativeDateModule],
  templateUrl: './parameterizer.component.html',
  styleUrl: './parameterizer.component.scss',
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'es-ES' }, // Configura el idioma del datepicker
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS }, // Usa los formatos personalizados
    { provide: DateAdapter, useClass: CustomDateAdapter }, // Usa el adaptador de fecha personalizado
    { provide: LOCALE_ID, useValue: 'es' }, // Configura la localización a español
  ],
})
export class ParameterizerComponent implements AfterViewInit {
  @ViewChild('loadingDialog') loadingDialog!: TemplateRef<any>;
  @ViewChild('ticketCanvas') canvas!: ElementRef<HTMLCanvasElement>;

  // Inyección de servicios necesarios
  private ticketService = inject(SeriesService);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private ticketDrawingService = inject(TicketDrawingService);

  // Propiedades del componente
  backgroundImage: string | null = null;
  opportunities = [1, 2, 3, 4, 5, 6];
  figures = [1, 2, 3, 4, 5];

  ticketTitle = '';
  ticketPrice: number | null = null;
  ticketSerial = '';
  ticketDate = this.formatDate(new Date());
  ticketDescription = '';
  ticketContact = '';
  selectedOpportunities: number = 1;
  selectedFigures: number = 1;

  // Método que se ejecuta después de que la vista ha sido inicializada
  ngAfterViewInit() {
    this.ticketDrawingService.setupCanvas(this.canvas);
    this.drawTicket(); // Dibuja el boleto al iniciar
  }

  // Método para dibujar el boleto con la información actual
  drawTicket() {
    const formattedDate = this.formatDate(new Date(this.ticketDate)); // Asegura que la fecha esté en el formato correcto

    this.ticketDrawingService.drawTicket(
      this.canvas,
      this.ticketTitle,
      this.ticketDescription,
      this.ticketPrice ?? 0,
      formattedDate, // Se pasa la fecha como cadena en formato DD/MM/YYYY
      this.ticketContact,
      this.selectedOpportunities,
      this.selectedFigures
    );
  }

  // Método asíncrono para generar la serie del boleto
  async generateSeries() {
    const dialogRef = this.dialog.open(this.loadingDialog, {
      disableClose: true, // Evita que el usuario cierre el diálogo manualmente
    });

    const formattedDate = this.formatDate(new Date(this.ticketDate));

    dialogRef.afterOpened().subscribe(async () => {
      try {
        // Llamar al servicio para generar y guardar la serie en Firestore
        const seriesId = await this.ticketService.generateAndSaveSeries(
          this.ticketTitle,
          this.ticketDescription,
          this.ticketPrice ?? 0,
          formattedDate,
          this.ticketContact,
          this.selectedOpportunities,
          this.selectedFigures
        );

        console.log('Serie generada y guardada en Firestore.');

        if (!seriesId) {
          console.error('Error: No se obtuvo el ID de la serie.');
          return;
        }

        console.log('Redirigiendo a la serie:', seriesId);
        this.router.navigate(['/series', seriesId]); // Redirecciona a la página de detalles de la serie
      } catch (error) {
        console.error('Error al generar la serie:', error);
      } finally {
        dialogRef.close(); // Cierra el diálogo de carga
      }
    });
  }

  // Método para formatear una fecha en DD/MM/YYYY
  formatDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
}
