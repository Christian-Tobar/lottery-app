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
import { FontColors } from '../../models/models';

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
  @ViewChild('warningDialog') warningDialog!: TemplateRef<any>; // Referencia al diálogo de carga
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
  minDate: Date = new Date();
  sectionFontColors: { [key: string]: string } = {};
  thumbnails: string[] = [];
  originalBackgroundImages: string[] = [
    'assets/images/bg1.jpg',
    'assets/images/bg2.jpg',
    'assets/images/bg3.jpg',
    'assets/images/bg4.jpg',
    'assets/images/bg5.jpg',
    'assets/images/bg6.jpg',
    'assets/images/bg7.jpg',
    'assets/images/bg8.jpg',
  ];

  fontColors: FontColors = {
    title: '#000000',
    description: '#000000',
    border: '#000000',
    clause: '#000000',
    opportunities: '#000000',
    date: '#000000',
    contact: '#000000',
    qr: '#000000',
  };

  // Campos del formulario
  ticketTitle = '';
  ticketDescription = '';
  ticketDate = this.formatDate(new Date()); // Fecha en formato DD/MM/YYYY
  ticketContact = '';
  ticketLogo: boolean = false;
  selectedOpportunities: null = null;
  selectedFigures: null = null;

  ticketBackground: string = '';
  gracePeriodValue: number | null = null;
  gracePeriodUnit: 'Días' | 'Horas' | '' = '';

  // Coordenadas del área de oportunidades en el boleto
  startRectAreaY: number = 0;
  endRectAreaY: number = 0;

  async ngAfterViewInit() {
    this.ticketDrawingService.setupCanvas(this.canvas);
    this.drawTicket();

    // Carga los thumbnails en segundo plano
    this.thumbnails = await Promise.all(
      this.originalBackgroundImages.map((img) => this.generateThumbnail(img))
    );
  }

  // DIBUJA EL BOLETO EN EL CANVAS USANDO LOS VALORES ACTUALES DEL FORMULARIO
  drawTicket() {
    const parsedDate = this.parseDateFromString(this.ticketDate);
    const formattedDate = this.formatDate(parsedDate);

    this.ticketDrawingService.drawTicket(
      this.canvas,
      this.fontColors,
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
    const validation = await this.validateForm();
    if (!validation) {
      this.showWarningDialog();
      return;
    }

    const dialogRef = this.dialog.open(this.loadingDialog, {
      disableClose: true, // Impide que el usuario cierre el diálogo
    });

    const parsedDate = this.parseDateFromString(this.ticketDate);
    const formattedDate = this.formatDate(parsedDate);

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
          this.fontColors,
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

    sheetRef
      .afterDismissed()
      .subscribe((result: { color: string; element: keyof FontColors }) => {
        if (result?.color && result?.element) {
          this.fontColors[result.element] = result.color;
          this.drawTicket();
        }
      });
  }

  openBackgroundPicker() {
    const sheetRef = this.bottomSheet.open(BackgroundPickerComponent, {
      data: {
        thumbnails: this.thumbnails,
        originals: this.originalBackgroundImages,
      },
    });

    sheetRef.afterDismissed().subscribe((background: string) => {
      if (background) {
        this.ticketBackground = background;
        this.drawTicket();
      }
    });
  }

  async generateThumbnail(url: string, size = 60): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = url;
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, size, size);
          const thumbnail = canvas.toDataURL('image/jpg', 0.7);
          resolve(thumbnail);
        }
      };
    });
  }

  showWarningDialog() {
    this.dialog.open(this.warningDialog, {});
  }

  private validateForm(): boolean {
    if (
      !this.selectedFigures ||
      !this.selectedOpportunities ||
      !this.ticketContact
    ) {
      return false;
    }

    return true;
  }

  // FORMATEA UNA FECHA AL FORMATO DD/MM/YYYY
  formatDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  parseDateFromString(dateStr: any): Date {
    if (dateStr instanceof Date) {
      return dateStr;
    }

    if (typeof dateStr === 'string' && dateStr.includes('/')) {
      const [day, month, year] = dateStr.split('/').map(Number);
      return new Date(year, month - 1, day);
    }

    console.warn('Fecha no válida:', dateStr);
    return new Date();
  }
}
