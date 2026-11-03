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
  IonSpinner,
  IonText
} from '@ionic/angular';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    IonButton,
    IonContent,
    IonInput,
    IonItem,
    IonSpinner,
    IonText
  ]
})
export class RegisterPage {

  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  loading = false;
  errorMessage = '';

  form = this.fb.nonNullable.group({
    displayName: [
      '',
      [
        Validators.required,
        Validators.minLength(2)
      ]
    ],

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
    ],

    confirmPassword: [
      '',
      Validators.required
    ]
  });

  async register(): Promise<void> {

    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    const {
      displayName,
      email,
      password,
      confirmPassword
    } = this.form.getRawValue();

    if (password !== confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    try {

      await this.authService.register(
        email.trim(),
        password,
        displayName.trim()
      );

      await this.router.navigateByUrl(
        '/app/home', 
        {
        replaceUrl: true
      });

    } catch (error: any) {

      this.errorMessage =
        this.getAuthError(error?.code);

    } finally {

      this.loading = false;
    }
  }

  private getAuthError(code?: string): string {

    switch (code) {

      case 'auth/email-already-in-use':
        return 'Ya existe una cuenta asociada a ese correo.';

      case 'auth/invalid-email':
        return 'El correo ingresado no es válido.';

      case 'auth/weak-password':
        return 'La contraseña no cumple los requisitos de seguridad.';

      case 'auth/network-request-failed':
        return 'No pudimos conectarnos. Revisa tu conexión a internet.';

      default:
        return 'No pudimos crear la cuenta. Intenta nuevamente.';
    }
  }
}