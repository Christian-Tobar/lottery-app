import { Injectable, inject, NgZone } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  signOut,
  User,
  onAuthStateChanged,
} from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  currentUser: User | null = null;

  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);

  private authReadyResolve?: () => void;
  authReady: Promise<void>;

  constructor() {
    // PROMESA PARA SABER CUÁNDO EL ESTADO DE AUTENTICACIÓN ESTÁ DISPONIBLE
    this.authReady = new Promise<void>((resolve) => {
      this.authReadyResolve = resolve;
    });

    // ESCUCHA LOS CAMBIOS EN EL ESTADO DE AUTENTICACIÓN
    onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user;

      // RESUELVE LA PROMESA SOLO UNA VEZ TRAS OBTENER RESPUESTA
      if (this.authReadyResolve) {
        this.authReadyResolve();
        this.authReadyResolve = undefined;
      }
    });

    // DETECTA CIERRE DE PESTAÑA/NAVEGADOR Y CIERRA SESIÓN
    window.addEventListener('beforeunload', () => {
      if (this.currentUser) {
        signOut(this.auth);
      }
    });
  }

  // INICIA SESIÓN CON EMAIL Y CONTRASEÑA
  async login(email: string, password: string): Promise<boolean> {
    try {
      const credential = await signInWithEmailAndPassword(
        this.auth,
        email,
        password
      );

      this.currentUser = credential.user;

      // VERIFICA AUTORIZACIÓN DEL USUARIO EN FIRESTORE
      const docRef = doc(this.firestore, 'authorization', credential.user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists() && docSnap.data()['authorized'] === true) {
        return true;
      } else {
        // Cierra sesión si el usuario no está autorizado
        await this.logout();
        throw new Error('Usuario no autorizado');
      }
    } catch (err) {
      console.error('[Login error]', err);
      return false;
    }
  }

  // CIERRA SESIÓN Y REDIRIGE A /login
  logout() {
    this.currentUser = null;
    return signOut(this.auth).then(() => this.router.navigate(['/login']));
  }

  // RETORNA TRUE SI HAY UN USUARIO AUTENTICADO
  isLoggedIn(): boolean {
    return this.currentUser !== null;
  }
}
