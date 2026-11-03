import {
  CommonModule
} from '@angular/common';

import {
  ChangeDetectorRef,
  Component,
  inject
} from '@angular/core';

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

import {
  AuthService
} from '../../../core/services/auth.service';


@Component({
  selector:
    'app-login',

  templateUrl:
    './login.page.html',

  styleUrls: [
    './login.page.scss'
  ],

  standalone:
    true,

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


  private readonly fb =
    inject(
      FormBuilder
    );


  private readonly authService =
    inject(
      AuthService
    );


  private readonly router =
    inject(
      Router
    );
private readonly cdr =
  inject(
    ChangeDetectorRef
  );

  loading =
    false;


  errorMessage =
    '';


  /*
   * false = email/password
   * true  = desafío TOTP
   */

  mfaRequired =
    false;


  form =
    this.fb
      .nonNullable
      .group({

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
            Validators.minLength(
              6
            )
          ]
        ]
      });


  mfaForm =
    this.fb
      .nonNullable
      .group({

        code: [
          '',
          [
            Validators.required,
            Validators.pattern(
              /^\d{6}$/
            )
          ]
        ]
      });


  /*
   * =========================================
   * LOGIN PRIMER FACTOR
   * =========================================
   */

  async login():
    Promise<void> {


    if (
      this.loading
      ||
      this.mfaRequired
    ) {

      return;
    }


    this.errorMessage =
      '';


    if (
      this.form.invalid
    ) {

      this.form
        .markAllAsTouched();

      return;
    }


    this.loading =
      true;


    try {

      const {
        email,
        password
      } =
        this.form
          .getRawValue();


      const result =
        await this.authService
          .login(
            email.trim(),
            password
          );


      /*
       * =====================================
       * MFA
       * =====================================
       */

      if (
  result.status ===
  'mfa-required'
) {

  this.mfaRequired =
    true;


  this.mfaForm
    .reset();


  this.cdr
    .detectChanges();


  return;
}


      /*
       * =====================================
       * LOGIN COMPLETO
       * =====================================
       */

      await this.navigateHome();


    } catch (
      error: any
    ) {

      console.error(
        '[ServiGo] Error login:',
        error
      );


      this.errorMessage =
        this.getAuthError(
          error?.code
        );


    } finally {

      this.loading =
        false;


  this.cdr
    .detectChanges();
    }
  }


  /*
   * =========================================
   * VALIDAR TOTP
   * =========================================
   */

  async verifyMfa():
    Promise<void> {


    if (
      this.loading
    ) {

      return;
    }


    this.errorMessage =
      '';


    if (
      this.mfaForm.invalid
    ) {

      this.mfaForm
        .markAllAsTouched();

      return;
    }


    this.loading =
      true;


    try {

      const {
        code
      } =
        this.mfaForm
          .getRawValue();


      await this.authService
        .resolveTotpLogin(
          code
        );


      await this.navigateHome();


    } catch (
      error: any
    ) {

      console.error(
        '[ServiGo MFA] Error verificando TOTP:',
        error
      );


      this.errorMessage =
        this.getMfaError(
          error
        );


    } finally {

      this.loading =
        false;


  this.cdr
    .detectChanges();
    }
  }


  /*
   * =========================================
   * USAR OTRA CUENTA
   * =========================================
   */

  cancelMfa():
    void {


    this.authService
      .cancelMfaLogin();


    this.mfaRequired =
      false;


    this.errorMessage =
      '';


    this.mfaForm
      .reset();


    this.form.controls
      .password
      .reset();
  }


  /*
   * =========================================
   * NAVEGACIÓN
   * =========================================
   */

  private async navigateHome():
    Promise<void> {


    await this.router
      .navigateByUrl(
        '/app/home',
        {
          replaceUrl:
            true
        }
      );
  }


  /*
   * =========================================
   * ERRORES PRIMER FACTOR
   * =========================================
   */

  private getAuthError(
    code?:
      string
  ): string {


    switch (
      code
    ) {

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


  /*
   * =========================================
   * ERRORES MFA
   * =========================================
   */

  private getMfaError(
    error:
      any
  ): string {


    if (
      error?.message ===
      'mfa-session-missing'
    ) {

      return 'La sesión de verificación expiró. Inicia sesión nuevamente.';
    }


    if (
      error?.message ===
      'invalid-totp-format'
    ) {

      return 'Ingresa un código de seis dígitos.';
    }


    switch (
      error?.code
    ) {

      case 'auth/invalid-verification-code':

        return 'El código ingresado es incorrecto o expiró.';


      case 'auth/code-expired':

        return 'El código expiró. Ingresa el código actual de tu aplicación.';


      case 'auth/too-many-requests':

        return 'Demasiados intentos. Espera un momento antes de volver a intentar.';


      default:

        return 'No pudimos validar el segundo factor. Intenta nuevamente.';
    }
  }
}