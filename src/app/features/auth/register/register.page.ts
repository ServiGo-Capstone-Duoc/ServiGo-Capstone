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
  IonSpinner
} from '@ionic/angular';

import {
  AuthService
} from '../../../core/services/auth.service';


@Component({
  selector:
    'app-register',

  templateUrl:
    './register.page.html',

  styleUrls: [
    './register.page.scss'
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
    IonSpinner
  ]
})
export class RegisterPage {


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


  form =
    this.fb
      .nonNullable
      .group({

        displayName: [
          '',
          [
            Validators.required,
            Validators.minLength(
              2
            )
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
            Validators.minLength(
              6
            )
          ]
        ],

        confirmPassword: [
          '',
          Validators.required
        ]
      });


  get busy():
    boolean {


    return this.loading
      || this.googleLoading;
  }


  /*
   * =========================================
   * GOOGLE: CREAR CUENTA O INICIAR SESIÓN
   * =========================================
   */

  async registerWithGoogle():
    Promise<void> {


    if (
      this.busy
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

        /*
         * AuthService conserva temporalmente
         * el resolver. LoginPage detectará
         * el desafío y mostrará el código TOTP.
         */

        await this.router
          .navigateByUrl(
            '/login',
            {
              replaceUrl:
                true
            }
          );


        return;
      }


      await this.navigateHome();


    } catch (
      error: any
    ) {

      console.error(
        '[ServiGo] Error registro Google:',
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
   * REGISTRO CORREO / CONTRASEÑA
   * =========================================
   */

  async register():
    Promise<void> {


    if (
      this.form.invalid
      || this.busy
    ) {

      this.form
        .markAllAsTouched();

      return;
    }


    const {
      displayName,
      email,
      password,
      confirmPassword
    } =
      this.form
        .getRawValue();


    if (
      password !==
      confirmPassword
    ) {

      this.errorMessage =
        'Las contraseñas no coinciden.';

      return;
    }


    this.loading =
      true;


    this.errorMessage =
      '';


    try {

      await this.authService
        .register(
          email.trim(),
          password,
          displayName.trim()
        );


      await this.navigateHome();


    } catch (
      error: any
    ) {

      console.error(
        '[ServiGo] Error registro:',
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


  private getAuthError(
    code?:
      string
  ): string {


    switch (
      code
    ) {

      case 'auth/email-already-in-use':

        return 'Ya existe una cuenta asociada a ese correo.';


      case 'auth/invalid-email':

        return 'El correo ingresado no es válido.';


      case 'auth/weak-password':

        return 'La contraseña no cumple los requisitos de seguridad.';


      case 'auth/network-request-failed':

        return 'No pudimos conectarnos. Revisa tu conexión a internet.';


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

        return 'No pudimos crear la cuenta. Intenta nuevamente.';
    }
  }
}
