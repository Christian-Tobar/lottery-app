import { Component } from '@angular/core';
import { QrValidatorService } from '../../services/qr-validator.service';
import { CommonModule } from '@angular/common';
import { ZXingScannerModule } from '@zxing/ngx-scanner';

@Component({
  selector: 'app-validator',
  standalone: true,
  imports: [CommonModule, ZXingScannerModule],
  templateUrl: './validator.component.html',
  styleUrl: './validator.component.scss',
})
export class ValidatorComponent {
  isScanning = true; // 📸 Controla si la cámara está activa
  validationMessage = '';
  ticketInfo: any = null; // 📄 Guarda la info del boleto

  constructor(private qrValidator: QrValidatorService) {}

  async onQrScanned(qrData: string) {
    console.log('QR escaneado:', qrData);

    const ticketDetails = await this.qrValidator.validateQr(qrData);

    if (ticketDetails) {
      this.validationMessage = '✅ Boleto válido';
      this.ticketInfo = ticketDetails; // Ahora contiene los datos de la serie y el ticket
      this.isScanning = false; // 🔴 Apaga la cámara
    } else {
      this.validationMessage = '❌ Boleto inválido';
    }
  }

  startScanning() {
    this.isScanning = true; // 🔄 Reactivar la cámara
    this.validationMessage = '';
    this.ticketInfo = null;
  }
}
