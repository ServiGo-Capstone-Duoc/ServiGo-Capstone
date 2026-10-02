import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import {
  Router,
  RouterLink
} from '@angular/router';

import {
  IonButton,
  IonContent,
  IonInput,
  IonItem,
  IonNote,
  IonSpinner
} from '@ionic/angular';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    IonButton,
    IonContent,
    IonInput,
    IonItem,
    IonNote,
    IonSpinner
  ]
})
export class LoginPage {

  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  loading = false;
  errorMessage = '';

  form = this.fb.nonNullable.group({
    email: [
      '',
      [
        Validators.required,
        Validators.email
      ]
    ],

    password: [
      '',
      [
        Validators.required,
        Validators.minLength(6)
      ]
    ]
  });

  async login(): Promise<void> {

    if (this.loading) {
      return;
    }

    this.errorMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    try {

      const {
        email,
        password
      } = this.form.getRawValue();

      await this.authService.login(
        email.trim(),
        password
      );

      await this.router.navigateByUrl(
        '/app/home',
        {
          replaceUrl: true
        }
      );

    } catch (error: any) {

      console.error(
        '[ServiGo] Error login:',
        error
      );

      this.errorMessage =
        this.getAuthError(
          error?.code
        );

    } finally {

      this.loading = false;
    }
  }

  private getAuthError(
    code?: string
  ): string {

    switch (code) {

      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Correo o contraseña incorrectos.';

      case 'auth/invalid-email':
        return 'El correo ingresado no es válido.';

      case 'auth/user-disabled':
        return 'Esta cuenta se encuentra deshabilitada.';

      case 'auth/too-many-requests':
        return 'Demasiados intentos fallidos. Intenta nuevamente más tarde.';

      case 'auth/network-request-failed':
        return 'No fue posible conectarse. Revisa tu conexión a internet.';

      default:
        return 'No pudimos iniciar sesión. Verifica tus datos e intenta nuevamente.';
    }
  }
}