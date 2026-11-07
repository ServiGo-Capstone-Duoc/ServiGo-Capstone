import {
  CommonModule
} from '@angular/common';

import {
  ChangeDetectorRef,
  Component,
  OnInit,
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
export class LoginPage implements OnInit {


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


  googleLoading =
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


  get busy():
    boolean {


    return this.loading
      || this.googleLoading;
  }


  ngOnInit():
    void {


    /*
     * Permite continuar aquí un desafío MFA
     * iniciado desde el botón Google de registro.
     */

    if (
      this.authService
        .hasPendingMfaLogin()
    ) {

      this.mfaRequired =
        true;


      this.mfaForm
        .reset();
    }
  }


  /*
   * =========================================
   * LOGIN GOOGLE
   * =========================================
   */

  async loginWithGoogle():
    Promise<void> {


    if (
      this.busy
      || this.mfaRequired
    ) {

      return;
    }


    this.errorMessage =
      '';


    this.googleLoading =
      true;


    try {

      const result =
        await this.authService
          .loginWithGoogle();


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


      await this.navigateHome();


    } catch (
      error: any
    ) {

      console.error(
        '[ServiGo] Error Google login:',
        error
      );


      this.errorMessage =
        this.getAuthError(
          error?.code
        );


    } finally {

      this.googleLoading =
        false;


      this.cdr
        .detectChanges();
    }
  }


  /*
   * =========================================
   * LOGIN PRIMER FACTOR
   * =========================================
   */

  async login():
    Promise<void> {


    if (
      this.busy
      || this.mfaRequired
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
      this.busy
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
   * ERRORES AUTENTICACIÓN
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


      case 'auth/popup-closed-by-user':

        return 'El acceso con Google fue cancelado.';


      case 'auth/cancelled-popup-request':

        return 'Se canceló la solicitud anterior de acceso con Google.';


      case 'auth/popup-blocked':

        return 'El navegador bloqueó la ventana de Google. Habilita las ventanas emergentes e intenta nuevamente.';


      case 'auth/account-exists-with-different-credential':

        return 'Ya existe una cuenta con ese correo. Inicia sesión con el método utilizado originalmente.';


      case 'auth/unauthorized-domain':

        return 'Este dominio todavía no está autorizado en Firebase Authentication.';


      case 'auth/operation-not-supported-in-this-environment':

        return 'El acceso con Google no está disponible en este entorno.';


      case 'servigo/profile-bootstrap-failed':

        return 'Google validó tu cuenta, pero no pudimos preparar tu perfil. Intenta nuevamente.';


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
