import { Component, ViewChild } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { MATERIAL_COMPONENTS } from './core/material.components';
import { MatSidenav } from '@angular/material/sidenav';
import { AuthService } from './services/auth.service';
import { CommonModule } from '@angular/common';

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

  constructor(public authService: AuthService) {}

  logout() {
    this.authService.logout();
  }
}
