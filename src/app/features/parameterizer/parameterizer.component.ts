import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  TemplateRef,
  Inject,
} from '@angular/core';
import { MATERIAL_COMPONENTS } from '../../core/material.components';
import { FormsModule } from '@angular/forms';
import { SeriesService } from '../../services/series.service';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { PdfticketService } from '../../services/pdfticket.service';
import { TicketDrawingService } from '../../services/ticket-drawing.service';

@Component({
  selector: 'app-parameterizer',
  standalone: true,
  imports: [MATERIAL_COMPONENTS, FormsModule],
  templateUrl: './parameterizer.component.html',
  styleUrl: './parameterizer.component.scss',
})
export class ParameterizerComponent implements AfterViewInit {
  @ViewChild('loadingDialog') loadingDialog!: TemplateRef<any>;
  @ViewChild('ticketCanvas') canvas!: ElementRef<HTMLCanvasElement>;

  backgroundImage: string | null = null;

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

  constructor(
    public ticketService: SeriesService,
    private dialog: MatDialog,
    private router: Router,
    private pdfService: PdfticketService,
    private ticketDrawingService: TicketDrawingService
  ) {}

  ngAfterViewInit() {
    this.ticketDrawingService.setupCanvas(this.canvas);
    this.drawTicket();
  }

  drawTicket() {
    this.ticketDrawingService.drawTicket(
      this.canvas,
      this.ticketTitle,
      this.ticketDescription,
      this.ticketPrice,
      this.ticketDate,
      this.ticketContact,
      this.selectedOpportunity,
      this.selectedFigure
    );
  }

  async generateSeries() {
    const dialogRef = this.dialog.open(this.loadingDialog, {
      disableClose: true, // Evita que el usuario lo cierre manualmente
    });

    dialogRef.afterOpened().subscribe(async () => {
      try {
        const seriesId = await this.ticketService.generateAndSaveSeries(
          this.ticketTitle,
          this.ticketDescription,
          this.ticketPrice,
          this.ticketDate,
          this.ticketContact,
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
