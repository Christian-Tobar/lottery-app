import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  TemplateRef,
} from '@angular/core';
import { MATERIAL_COMPONENTS } from '../../core/material.components';
import { FormsModule } from '@angular/forms';
import { SeriesService } from '../../services/series.service';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';

@Component({
  selector: 'app-parameterizer',
  standalone: true,
  imports: [MATERIAL_COMPONENTS, FormsModule],
  templateUrl: './parameterizer.component.html',
  styleUrl: './parameterizer.component.scss',
})
export class ParameterizerComponent implements AfterViewInit {
  @ViewChild('loadingDialog') loadingDialog!: TemplateRef<any>;
  @ViewChild('ticketCanvas', { static: false })
  canvas!: ElementRef<HTMLCanvasElement>;

  opportunities = [1, 2, 3, 4, 5, 6];
  figures = [1, 2, 3, 4, 5];

  ticketTitle = 'Loteria Millonaria';
  ticketPrice = 1000;
  ticketSerial = '123456';
  ticketDate = new Date().toLocaleDateString();
  ticketDescription = '¡Participa para ganar grandes premios!';
  ticketContact = '';
  selectedOpportunity: number = 1;
  selectedFigure: number = 1;

  // Conversión de cm a píxeles para 300 DPI
  readonly CM_TO_PX = 300 / 2.54;
  readonly CANVAS_WIDTH = Math.round(8 * this.CM_TO_PX);
  readonly CANVAS_HEIGHT = Math.round(5 * this.CM_TO_PX);
  readonly SCALE_FACTOR = 0.4; // Reducimos el tamaño en pantalla al 40%

  constructor(
    public ticketService: SeriesService,
    private dialog: MatDialog,
    private router: Router
  ) {}

  ngAfterViewInit() {
    this.setupCanvas();
  }

  setupCanvas() {
    if (!this.canvas) return;

    const canvasEl = this.canvas.nativeElement;
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
      this.drawTicket();
    }
  }

  drawTicket() {
    if (!this.canvas) return;

    const canvas = this.canvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = this.CANVAS_WIDTH;
    const height = this.CANVAS_HEIGHT;

    ctx.clearRect(0, 0, width, height);

    // Fondo y borde
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#000';
    ctx.strokeRect(0, 0, width, height);

    ctx.fillStyle = '#000';
    ctx.textBaseline = 'top';

    const margin = width * 0.05;
    const lineSpacing = width * 0.03;
    let y = margin;

    // Título
    ctx.font = `bold ${width * 0.08}px Arial`;
    ctx.textAlign = 'left';
    ctx.fillText(this.ticketTitle, margin, y);
    y += width * 0.1;

    // Recuadro QR
    const qrSize = width * 0.14;
    const qrX = width - margin - qrSize;
    const qrY = margin;
    ctx.strokeStyle = '#000';
    ctx.strokeRect(qrX, qrY, qrSize, qrSize);

    // Serial debajo del QR
    ctx.font = `bold ${width * 0.04}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(
      `${this.ticketSerial}`,
      qrX + qrSize / 2,
      qrY + qrSize + lineSpacing
    );

    // Datos principales alineados a la izquierda
    ctx.textAlign = 'left';
    y += lineSpacing;
    ctx.fillText(
      `Valor: $${this.ticketPrice} Contacto: ${this.ticketContact}`,
      margin,
      y
    );
    y += lineSpacing * 1.5;
    ctx.fillText(`Fecha: ${this.ticketDate}`, margin, y);

    y += lineSpacing * 2;

    // Línea divisoria
    ctx.strokeStyle = '#000';
    ctx.beginPath();
    ctx.moveTo(margin, y);
    ctx.lineTo(width - margin, y);
    ctx.stroke();
    y += lineSpacing;

    // Descripción
    ctx.font = `bold ${width * 0.045}px Arial`;
    ctx.fillText(this.ticketDescription, margin, y, width - 2 * margin);
    y += lineSpacing * 2;

    // Oportunidades en filas
    const maxCols = 3; // Máximo de columnas por fila
    const opportunitySize = width * 0.08;
    let x = margin;

    ctx.font = `bold ${opportunitySize}px Arial`;
    for (let i = 0; i < this.selectedOpportunity; i++) {
      if (x + opportunitySize * this.selectedFigure > width - margin) {
        x = margin;
        y += opportunitySize + 5;
      }
      ctx.fillText('X'.repeat(this.selectedFigure), x, y);
      x += opportunitySize * this.selectedFigure + 10;
    }
  }

  async generateSeries() {
    const dialogRef = this.dialog.open(this.loadingDialog, {
      disableClose: true, // Evita que el usuario lo cierre manualmente
    });

    dialogRef.afterOpened().subscribe(async () => {
      try {
        const seriesId = await this.ticketService.generateAndSaveSeries(
          this.ticketTitle,
          this.ticketPrice,
          this.ticketDate,
          this.selectedOpportunity,
          this.selectedFigure
        );

        console.log('Serie generada y guardada en Firestore.');

        if (!seriesId) {
          console.error('Error: No se obtuvo el ID de la serie.');
          return;
        }

        console.log('Redirigiendo a la serie:', seriesId);

        // Redireccionar al detalle de la serie
        this.router.navigate(['/series', seriesId]);
      } catch (error) {
        console.error('Error al generar la serie:', error);
      } finally {
        dialogRef.close();
      }
    });
  }
}
