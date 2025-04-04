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
    console.log('QR escaneado:', qrData);

    const ticketDetails = await this.qrValidator.validateQr(qrData);

    if (ticketDetails) {
      // Traer las tandas y ordenarlas por fecha (más reciente primero)
      const rawBatches = await this.firestoreService.getPrintBatches(
        ticketDetails.seriesId
      );

      const sortedBatches: NumberedPrintBatch[] = rawBatches
        .sort(
          (a, b) =>
            new Date(b.printedAt).getTime() - new Date(a.printedAt).getTime()
        )
        .map((batch, index, arr) => ({
          ...batch,
          batchNumber: arr.length - index, // Tanda 1 = más antigua
        }));

      let foundBatch: NumberedPrintBatch | null = null;
      let positionInBatch = -1;

      for (const batch of sortedBatches) {
        const index = batch.ticketIds.indexOf(ticketDetails.id);
        if (index !== -1) {
          foundBatch = batch;
          positionInBatch = index;
          break;
        }
      }

      if (foundBatch) {
        const printBatchInfo = {
          batchId: foundBatch.id!,
          printedAt: foundBatch.printedAt!,
          ticketNumberInBatch: positionInBatch + 1,
          totalInBatch: foundBatch.ticketIds.length,
          batchNumber: foundBatch.batchNumber,
        } satisfies PrintBatchInfo;

        ticketDetails.printBatchInfo = printBatchInfo;
      }

      this.validationMessage = '✅ Boleto válido';
      this.ticketInfo = ticketDetails;
      this.isScanning = false;
    } else {
      this.validationMessage = '❌ Boleto inválido';
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
