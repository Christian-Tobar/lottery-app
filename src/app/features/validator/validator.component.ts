import { Component } from '@angular/core';
import { QrValidatorService } from '../../services/qr-validator.service';
import { FirestoreService } from '../../services/firestore.service';
import { CommonModule } from '@angular/common';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { MATERIAL_COMPONENTS } from '../../core/material.components';
import { Router } from '@angular/router';

// 👇 Interfaz extendida local para incluir batchNumber
interface NumberedPrintBatch {
  id?: string;
  printedAt: string;
  ticketIds: string[];
  batchNumber: number;
}

interface PrintBatchInfo {
  batchId: string;
  printedAt: string;
  ticketNumberInBatch: number;
  totalInBatch: number;
  batchNumber: number;
}

@Component({
  selector: 'app-validator',
  standalone: true,
  imports: [CommonModule, ZXingScannerModule, MATERIAL_COMPONENTS],
  templateUrl: './validator.component.html',
  styleUrl: './validator.component.scss',
})
export class ValidatorComponent {
  isScanning = true;
  validationMessage = '';
  ticketInfo: any = null;

  constructor(
    private qrValidator: QrValidatorService,
    private firestoreService: FirestoreService,
    private router: Router
  ) {}

  async onQrScanned(qrData: string) {
    const result = await this.qrValidator.validateQr(qrData);

    if (result.valid) {
      const ticketDetails = result.ticket;

      // Obtener todas las tandas de la serie
      const rawBatches = await this.firestoreService.getPrintBatches(
        ticketDetails.seriesId
      );

      // Ordenar las tandas por fecha descendente y calcular batchNumber (Tanda 1 = más antigua)
      const sortedBatches: NumberedPrintBatch[] = rawBatches
        .sort(
          (a, b) =>
            new Date(b.printedAt).getTime() - new Date(a.printedAt).getTime()
        )
        .map((batch, index, arr) => ({
          ...batch,
          batchNumber: arr.length - index,
        }));

      let foundBatch: NumberedPrintBatch | null = null;
      let positionInBatch = -1;

      // Buscar el ticket en cada tanda
      for (const batch of sortedBatches) {
        const index = batch.ticketIds.indexOf(ticketDetails.id);
        if (index !== -1) {
          foundBatch = batch;
          positionInBatch = index;
          break;
        }
      }

      // Si se encontró la tanda correspondiente, construir printBatchInfo
      if (foundBatch) {
        const printBatchInfo: PrintBatchInfo = {
          batchId: foundBatch.id!,
          printedAt: foundBatch.printedAt,
          ticketNumberInBatch: positionInBatch + 1,
          totalInBatch: foundBatch.ticketIds.length,
          batchNumber: foundBatch.batchNumber,
        };

        ticketDetails.printBatchInfo = printBatchInfo;
      }

      this.ticketInfo = ticketDetails;
      this.isScanning = false;
      this.validationMessage = '';
    } else {
      // Mostrar mensajes claros según el error
      switch (result.reason) {
        case 'malformed':
          this.validationMessage =
            'El código QR no contiene información valida, y por tanto no se pueden obtener datos del sistema.';
          break;
        case 'series-not-found':
          this.validationMessage =
            'La serie grabada en el QR no ha sido encontrada';
          break;
        case 'ticket-not-found':
          this.validationMessage =
            'El boleto no hace parte de la serie especificada por el QR';
          break;
      }
      this.ticketInfo = null;
      this.isScanning = false;
    }
  }

  startScanning() {
    this.isScanning = true;
    this.validationMessage = '';
    this.ticketInfo = null;
  }

  goToSeriesDetails() {
    if (this.ticketInfo?.seriesId) {
      this.router.navigate(['/series', this.ticketInfo.seriesId]);
    }
  }
}
