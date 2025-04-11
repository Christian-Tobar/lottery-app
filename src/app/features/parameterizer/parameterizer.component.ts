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
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { FontColorPickerComponent } from '../font-color-picker/font-color-picker.component';
import { BackgroundPickerComponent } from '../background-picker/background-picker.component';

// REGISTRA EL IDIOMA ESPAÑOL PARA FORMATEO DE FECHAS
registerLocaleData(localeEs, 'es');

// ADAPTADOR DE FECHA PERSONALIZADO PARA FORMATO DD/MM/YYYY
@Injectable()
export class CustomDateAdapter extends NativeDateAdapter {
  // PARSEA UNA FECHA DESDE FORMATO DD/MM/YYYY A OBJETO Date
  override parse(value: any): Date | null {
    if (typeof value === 'string' && value.includes('/')) {
      const [day, month, year] = value.split('/').map(Number);
      return new Date(year, month - 1, day);
    }
    return super.parse(value);
  }

  // FORMATEA UNA FECHA EN FORMATO DD/MM/YYYY PARA MOSTRARLA
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

// FORMATOS PERSONALIZADOS PARA EL DATEPICKER DE ANGULAR MATERIAL
export const MY_DATE_FORMATS = {
  parse: { dateInput: 'DD/MM/YYYY' },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

// COMPONENTE PRINCIPAL PARA CONFIGURACIÓN Y GENERACIÓN DE BOLETOS
@Component({
  selector: 'app-parameterizer',
  standalone: true,
  imports: [MATERIAL_COMPONENTS, FormsModule, MatNativeDateModule],
  templateUrl: './parameterizer.component.html',
  styleUrl: './parameterizer.component.scss',
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'es-ES' }, // Idioma del datepicker
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS }, // Formato de fecha
    { provide: DateAdapter, useClass: CustomDateAdapter }, // Adaptador personalizado
    { provide: LOCALE_ID, useValue: 'es' }, // Localización general en español
  ],
})
export class ParameterizerComponent implements AfterViewInit {
  @ViewChild('loadingDialog') loadingDialog!: TemplateRef<any>; // Referencia al diálogo de carga
  @ViewChild('ticketCanvas') canvas!: ElementRef<HTMLCanvasElement>; // Referencia al canvas del boleto

  // INYECCIÓN DE SERVICIOS NECESARIOS
  private ticketService = inject(SeriesService);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private ticketDrawingService = inject(TicketDrawingService);
  private bottomSheet = inject(MatBottomSheet);

  // PROPIEDADES DEL COMPONENTE
  backgroundImage: string | null = null; // Imagen de fondo (actualmente no utilizada)
  opportunities = [1, 2, 3, 4, 5, 6]; // Opciones de oportunidades disponibles
  figures = [1, 2, 3, 4, 5]; // Figuras disponibles
  graceUnits = ['Horas', 'Días']; // Unidades de periodo de gracia

  // Campos del formulario
  ticketTitle = '';
  ticketDescription = '';
  ticketDate = this.formatDate(new Date()); // Fecha en formato DD/MM/YYYY
  ticketContact = '';
  ticketLogo: boolean = false;
  selectedOpportunities: null = null;
  selectedFigures: null = null;
  selectedFontColor: string = '#000000';
  ticketBackground: string = '';
  gracePeriodValue: number | null = null;
  gracePeriodUnit: 'Días' | 'Horas' | '' = '';

  // Coordenadas del área de oportunidades en el boleto
  startRectAreaY: number = 0;
  endRectAreaY: number = 0;

  // SE EJECUTA DESPUÉS DE LA INICIALIZACIÓN DE LA VISTA
  ngAfterViewInit() {
    this.ticketDrawingService.setupCanvas(this.canvas); // Inicializa el canvas
    this.drawTicket(); // Dibuja el boleto con los valores iniciales
  }

  // DIBUJA EL BOLETO EN EL CANVAS USANDO LOS VALORES ACTUALES DEL FORMULARIO
  drawTicket() {
    const formattedDate = this.formatDate(new Date(this.ticketDate)); // Asegura formato correcto

    this.ticketDrawingService.drawTicket(
      this.canvas,
      this.selectedFontColor,
      this.ticketBackground,
      this.ticketTitle,
      this.ticketDescription,
      formattedDate,
      this.ticketContact,
      this.ticketLogo,
      this.selectedOpportunities,
      this.selectedFigures,
      this.gracePeriodValue,
      this.gracePeriodUnit
    );

    // ACTUALIZA LOS LÍMITES DEL ÁREA DE NÚMEROS SI SE DETECTA
    const rect = this.ticketDrawingService.getOpportunityRect();
    if (rect) {
      this.startRectAreaY = rect.startY;
      this.endRectAreaY = rect.endY;
    }
  }

  // GENERA Y GUARDA UNA NUEVA SERIE EN FIRESTORE
  async generateSeries() {
    const dialogRef = this.dialog.open(this.loadingDialog, {
      disableClose: true, // Impide que el usuario cierre el diálogo
    });

    const formattedDate = this.formatDate(new Date(this.ticketDate));

    dialogRef.afterOpened().subscribe(async () => {
      try {
        // LLAMADA AL SERVICIO PARA CREAR Y GUARDAR LA SERIE
        const seriesId = await this.ticketService.generateAndSaveSeries(
          this.ticketTitle,
          this.ticketDescription,
          formattedDate,
          this.ticketContact,
          this.selectedOpportunities,
          this.selectedFigures,
          this.selectedFontColor,
          this.ticketBackground,
          this.ticketLogo,
          this.gracePeriodValue,
          this.gracePeriodUnit,
          this.startRectAreaY,
          this.endRectAreaY
        );

        // VALIDACIÓN DE RESPUESTA DEL SERVICIO
        if (!seriesId) {
          console.error('Error: No se obtuvo el ID de la serie.');
          return;
        }

        // NAVEGA A LA VISTA DE DETALLES DE LA SERIE GENERADA
        this.router.navigate(['/series', seriesId]);
      } catch (error) {
        console.error('Error al generar la serie:', error);
      } finally {
        dialogRef.close(); // Cierra el diálogo independientemente del resultado
      }
    });
  }

  // ACTIVA O DESACTIVA LA INCLUSIÓN DE LOGO EN EL BOLETO
  includeLogo() {
    this.ticketLogo = !this.ticketLogo;
    this.drawTicket(); // Redibuja con el nuevo estado del logo
  }

  // ABRE EL SELECTOR DE COLOR DE FUENTE DESDE UNA BOTTOM SHEET
  openFontColorPicker() {
    const sheetRef = this.bottomSheet.open(FontColorPickerComponent);

    sheetRef.afterDismissed().subscribe((color: string) => {
      if (color) {
        this.selectedFontColor = color;
        this.drawTicket(); // Redibuja el boleto con el nuevo color
      }
    });
  }

  openBackgroundPicker() {
    const sheetRef = this.bottomSheet.open(BackgroundPickerComponent);

    sheetRef.afterDismissed().subscribe((background: string) => {
      if (background) {
        this.ticketBackground = background;
        this.drawTicket();
      }
    });
  }

  // FORMATEA UNA FECHA AL FORMATO DD/MM/YYYY
  formatDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
}
