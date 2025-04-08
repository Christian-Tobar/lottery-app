import { Injectable, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

/**
 * AuthGuard: Previene el acceso a rutas si el usuario no ha iniciado sesión.
 * Utiliza AuthService para verificar el estado de autenticación.
 */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Espera a que se resuelva la verificación del estado de autenticación de Firebase
  await auth.authReady;

  // Si el usuario no está autenticado, redirige al login
  if (!auth.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  // Usuario autenticado, permite acceso
  return true;
};
