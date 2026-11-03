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
  FormsModule
} from '@angular/forms';

import {
  Router
} from '@angular/router';

import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonSpinner
} from '@ionic/angular';

import {
  addIcons
} from 'ionicons';

import {
  arrowBackOutline,
  checkmarkCircleOutline,
  copyOutline,
  keyOutline,
  mailOutline,
  shieldCheckmarkOutline
} from 'ionicons/icons';

import {
  MfaService,
  MfaStatus
} from '../../core/services/mfa.service';


@Component({
  selector:
    'app-security',

  templateUrl:
    './security.page.html',

  styleUrls: [
    './security.page.scss'
  ],

  standalone:
    true,

  imports: [
    CommonModule,
    FormsModule,
    IonButton,
    IonContent,
    IonIcon,
    IonInput,
    IonSpinner
  ]
})
export class SecurityPage
  implements OnInit {


  private readonly mfaService =
    inject(
      MfaService
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
    true;


  actionLoading =
    false;


  status:
    MfaStatus | null =
      null;


  password =
    '';


  verificationCode =
    '';


  secretKey =
    '';


  qrCodeUrl =
    '';


  enrollmentStarted =
    false;


  successMessage =
    '';


  errorMessage =
    '';


  constructor() {

    addIcons({
      arrowBackOutline,
      checkmarkCircleOutline,
      copyOutline,
      keyOutline,
      mailOutline,
      shieldCheckmarkOutline
    });
  }


  async ngOnInit():
    Promise<void> {


    await this.loadStatus();
  }


  async loadStatus():
    Promise<void> {


    this.loading =
      true;


    this.errorMessage =
      '';


    try {

      this.status =
        await this.mfaService
          .getStatus();


    } catch (error) {

      console.error(
        '[ServiGo MFA] Error consultando estado:',
        error
      );


      this.errorMessage =
        'No pudimos consultar la configuración de seguridad.';


} finally {

  this.loading =
    false;


  this.cdr
    .detectChanges();
}
  }


  async sendVerification():
    Promise<void> {


    if (
      this.actionLoading
    ) {

      return;
    }


    this.clearMessages();


    this.actionLoading =
      true;


    try {

      await this.mfaService
        .sendVerificationEmail();


      this.successMessage =
        'Enviamos un correo de verificación. Revisa tu bandeja de entrada.';


    } catch (error) {

      console.error(
        '[ServiGo MFA] Error enviando verificación:',
        error
      );


      this.errorMessage =
        'No pudimos enviar el correo de verificación.';


    } finally {

      this.actionLoading =
        false;

  this.cdr
    .detectChanges();
    }
  }


  async refreshVerification():
    Promise<void> {


    this.clearMessages();


    this.actionLoading =
      true;


    try {

      this.status =
        await this.mfaService
          .refreshUser();


      if (
        this.status.emailVerified
      ) {

        this.successMessage =
          'Correo verificado correctamente. Ya puedes activar MFA.';

      } else {

        this.errorMessage =
          'El correo todavía no aparece como verificado.';
      }


    } catch (error) {

      console.error(
        '[ServiGo MFA] Error actualizando usuario:',
        error
      );


      this.errorMessage =
        'No pudimos actualizar el estado del correo.';


    } finally {

      this.actionLoading =
        false;
          this.cdr
    .detectChanges();
    }
  }


  async startEnrollment():
    Promise<void> {


    this.clearMessages();


    if (
      !this.password
    ) {

      this.errorMessage =
        'Ingresa tu contraseña actual.';

      return;
    }


    this.actionLoading =
      true;


    try {

      const enrollment =
        await this.mfaService
          .beginTotpEnrollment(
            this.password
          );


      this.secretKey =
        enrollment.secretKey;


      this.qrCodeUrl =
        enrollment.qrCodeUrl;


      this.enrollmentStarted =
        true;


      this.password =
        '';


    } catch (error: any) {

      console.error(
        '[ServiGo MFA] Error iniciando enrolamiento:',
        error
      );


      if (
        error?.code ===
        'auth/wrong-password'
        ||
        error?.code ===
        'auth/invalid-credential'
      ) {

        this.errorMessage =
          'La contraseña ingresada no es correcta.';

      } else if (
        error?.message ===
        'email-not-verified'
      ) {

        this.errorMessage =
          'Debes verificar tu correo antes de activar MFA.';

      } else {

        this.errorMessage =
          'No pudimos iniciar la configuración MFA.';
      }


    } finally {

      this.actionLoading =
        false;


  this.cdr
    .detectChanges();
    }
  }


  async confirmEnrollment():
    Promise<void> {


    this.clearMessages();


    if (
      !/^\d{6}$/
        .test(
          this.verificationCode
            .trim()
        )
    ) {

      this.errorMessage =
        'Ingresa el código de 6 dígitos de tu aplicación Authenticator.';

      return;
    }


    this.actionLoading =
      true;


    try {

      await this.mfaService
        .confirmTotpEnrollment(
          this.verificationCode
        );


      this.enrollmentStarted =
        false;


      this.verificationCode =
        '';


      this.secretKey =
        '';


      this.qrCodeUrl =
        '';


      await this.loadStatus();


      this.successMessage =
        'Autenticación en dos pasos activada correctamente.';


    } catch (error) {

      console.error(
        '[ServiGo MFA] Código TOTP inválido:',
        error
      );


      this.errorMessage =
        'El código es incorrecto o expiró. Ingresa el código actual de tu aplicación.';


    } finally {

      this.actionLoading =
        false;

          this.cdr
    .detectChanges();
    }
  }


  cancelEnrollment():
    void {


    this.mfaService
      .cancelEnrollment();


    this.enrollmentStarted =
      false;


    this.verificationCode =
      '';


    this.secretKey =
      '';


    this.qrCodeUrl =
      '';


    this.clearMessages();
  }


  async copySecret():
    Promise<void> {


    if (
      !this.secretKey
    ) {

      return;
    }


    try {

      await navigator.clipboard
        .writeText(
          this.secretKey
        );


      this.successMessage =
        'Clave copiada.';


    } catch {

      this.errorMessage =
        'No pudimos copiar la clave automáticamente.';
    }
  }


  goBack():
    void {


    void this.router
      .navigateByUrl(
        '/app/profile'
      );
  }


  private clearMessages():
    void {


    this.successMessage =
      '';


    this.errorMessage =
      '';
  }
}