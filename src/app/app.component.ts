import { Component, inject, ViewChild } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { MATERIAL_COMPONENTS } from './core/material.components';
import { MatSidenav } from '@angular/material/sidenav';
import { AuthService } from './services/auth.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ContextService } from './services/context.service';
import { LotterySeriesStatus } from './models/models';
import { FirestoreService } from './services/firestore.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [MATERIAL_COMPONENTS, RouterModule, RouterOutlet, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  @ViewChild(MatSidenav, { static: true })
  sidenav!: MatSidenav;

  public router = inject(Router);
  public authService = inject(AuthService);
  public contextService = inject(ContextService);
  private firestoreService = inject(FirestoreService);

  constructor() {}

  isInRoute(pattern: string): boolean {
    // Comprobamos si el patrón está presente en la URL
    return this.router.url.match(new RegExp(`^${pattern}$`)) !== null;
  }

  async changeStatus(newStatus: LotterySeriesStatus): Promise<void> {
    try {
      await this.firestoreService.updateSeriesStatus(
        this.contextService.selectedSeriesId,
        newStatus
      );
      // Solo si fue exitosa la actualización en Firestore
      this.contextService.selectedSeriesCurrentStatus = newStatus;
    } catch (error) {
      console.error('Error al actualizar el estado de la serie:', error);
      // Aquí podrías mostrar una notificación o mensaje de error si lo deseas
    }
  }

  changeSeriesListWiew() {
    this.contextService.viewSeriesArchive =
      !this.contextService.viewSeriesArchive;
  }

  get hasMenuOptions(): boolean {
    const status = this.contextService.selectedSeriesCurrentStatus;
    return (
      status === 'Activa' || status === 'Cancelada' || status === 'Sorteada'
    );
  }

  logout() {
    this.authService.logout();
  }
}
