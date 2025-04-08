import { Injectable, inject } from '@angular/core';
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
    // Creamos una promesa para saber cuándo se resuelve el estado de autenticación
    this.authReady = new Promise<void>((resolve) => {
      this.authReadyResolve = resolve;
    });

    // Escuchamos los cambios en el estado de autenticación
    onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user;

      // Resolvemos la promesa solo una vez cuando obtenemos respuesta
      if (this.authReadyResolve) {
        this.authReadyResolve();
        this.authReadyResolve = undefined;
      }
    });
  }

  /**
   * Inicia sesión con email y contraseña.
   * Solo permite el acceso si el usuario está marcado como autorizado en Firestore.
   */
  async login(email: string, password: string): Promise<boolean> {
    try {
      const credential = await signInWithEmailAndPassword(
        this.auth,
        email,
        password
      );

      this.currentUser = credential.user;

      const docRef = doc(this.firestore, 'authorization', credential.user.uid);
      const docSnap = await getDoc(docRef);

      // Verifica si el usuario está autorizado en la colección 'authorization'
      if (docSnap.exists() && docSnap.data()['authorized'] === true) {
        return true;
      } else {
        await this.logout();
        throw new Error('Usuario no autorizado');
      }
    } catch (err) {
      // En caso de error en login o autorización, retorna false
      console.error('[Login error]', err);
      return false;
    }
  }

  /**
   * Cierra la sesión del usuario y redirige a /login
   */
  logout() {
    this.currentUser = null;
    return signOut(this.auth).then(() => this.router.navigate(['/login']));
  }

  /**
   * Retorna true si hay un usuario autenticado
   */
  isLoggedIn(): boolean {
    return this.currentUser !== null;
  }
}
