import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { MATERIAL_COMPONENTS } from '../../core/material.components';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [MATERIAL_COMPONENTS, CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  hide = signal(true);

  clickEvent(event: MouseEvent): void {
    this.hide.set(!this.hide());
    event.stopPropagation();
  }

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  loading = false;
  errorMessage = '';

  async ngOnInit() {
    // Esperar a que Firebase nos diga si hay un usuario logueado o no
    await this.authService.authReady;

    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/']);
    }
  }

  async onSubmit() {
    if (this.form.invalid) return;

    this.loading = true;
    this.errorMessage = '';

    const { email, password } = this.form.value;

    const success = await this.authService.login(email!, password!);
    this.loading = false;

    if (success) {
      this.router.navigate(['/']);
    } else {
      this.errorMessage = 'Credenciales inválidas o usuario no autorizado';
    }
  }
}
