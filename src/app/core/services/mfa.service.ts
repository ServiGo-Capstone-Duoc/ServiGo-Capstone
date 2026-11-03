import {
  Injectable
} from '@angular/core';

import {
  EmailAuthProvider,
  MultiFactorInfo,
  TotpMultiFactorGenerator,
  TotpSecret,
  multiFactor,
  reauthenticateWithCredential,
  reload,
  sendEmailVerification
} from 'firebase/auth';

import QRCode from 'qrcode';

import {
  firebaseAuth
} from '../firebase/firebase';


export interface MfaStatus {

  emailVerified: boolean;

  enrolled: boolean;

  factors: MultiFactorInfo[];
}


export interface TotpEnrollment {

  secretKey: string;

  qrCodeUrl: string;
}


@Injectable({
  providedIn:
    'root'
})
export class MfaService {


  private pendingSecret:
    TotpSecret | null =
      null;


  /*
   * =========================================
   * USUARIO ACTUAL
   * =========================================
   */

  private requireUser() {

    const user =
      firebaseAuth.currentUser;


    if (
      !user
    ) {

      throw new Error(
        'auth-required'
      );
    }


    return user;
  }


  /*
   * =========================================
   * ESTADO MFA
   * =========================================
   */

  async getStatus():
  Promise<MfaStatus> {


  const user =
    this.requireUser();


  console.log(
    '[ServiGo MFA] Usuario actual:',
    {
      uid:
        user.uid,

      email:
        user.email,

      emailVerified:
        user.emailVerified
    }
  );


  const factors =
    multiFactor(
      user
    )
      .enrolledFactors;


  console.log(
    '[ServiGo MFA] Factores enrolados:',
    factors.length
  );


  return {

    emailVerified:
      user.emailVerified,

    enrolled:
      factors.length >
      0,

    factors
  };
}


  /*
   * =========================================
   * VERIFICACIÓN DE CORREO
   * =========================================
   */

  async sendVerificationEmail():
    Promise<void> {


    const user =
      this.requireUser();


    if (
      user.emailVerified
    ) {

      return;
    }


    await sendEmailVerification(
      user
    );
  }


  async refreshUser():
    Promise<MfaStatus> {


    const user =
      this.requireUser();


    await reload(
      user
    );


    return this.getStatus();
  }


  /*
   * =========================================
   * REAUTENTICACIÓN
   * =========================================
   */

  async reauthenticate(
    password:
      string
  ): Promise<void> {


    const user =
      this.requireUser();


    if (
      !user.email
    ) {

      throw new Error(
        'email-required'
      );
    }


    const credential =
      EmailAuthProvider
        .credential(
          user.email,
          password
        );


    await reauthenticateWithCredential(
      user,
      credential
    );
  }


  /*
   * =========================================
   * GENERAR TOTP
   * =========================================
   */

  async beginTotpEnrollment(
    password:
      string
  ): Promise<TotpEnrollment> {


    const user =
      this.requireUser();


    await reload(
      user
    );


    if (
      !user.emailVerified
    ) {

      throw new Error(
        'email-not-verified'
      );
    }


    await this.reauthenticate(
      password
    );


    const session =
      await multiFactor(
        user
      )
        .getSession();


    const secret =
      await TotpMultiFactorGenerator
        .generateSecret(
          session
        );


    this.pendingSecret =
      secret;


    const accountName =
      user.email
      ??
      'ServiGo';


    const totpUri =
      secret
        .generateQrCodeUrl(
          accountName,
          'ServiGo'
        );


    const qrCodeUrl =
      await QRCode
        .toDataURL(
          totpUri,
          {
            width:
              280,

            margin:
              2
          }
        );


    return {

      secretKey:
        secret.secretKey,

      qrCodeUrl
    };
  }


  /*
   * =========================================
   * CONFIRMAR TOTP
   * =========================================
   */

  async confirmTotpEnrollment(
    verificationCode:
      string
  ): Promise<void> {


    const user =
      this.requireUser();


    if (
      !this.pendingSecret
    ) {

      throw new Error(
        'totp-session-missing'
      );
    }


    const code =
      verificationCode
        .trim();


    if (
      !/^\d{6}$/
        .test(
          code
        )
    ) {

      throw new Error(
        'invalid-totp-format'
      );
    }


    const assertion =
      TotpMultiFactorGenerator
        .assertionForEnrollment(
          this.pendingSecret,
          code
        );


    await multiFactor(
      user
    )
      .enroll(
        assertion,
        'Aplicación Authenticator'
      );


    this.pendingSecret =
      null;


    await reload(
      user
    );
  }


  /*
   * =========================================
   * CANCELAR ENROLAMIENTO
   * =========================================
   */

  cancelEnrollment():
    void {


    this.pendingSecret =
      null;
  }


  /*
   * =========================================
   * DESACTIVAR MFA
   * =========================================
   */

  async unenroll(
    factorUid:
      string,
    password:
      string
  ): Promise<void> {


    const user =
      this.requireUser();


    await this.reauthenticate(
      password
    );


    await multiFactor(
      user
    )
      .unenroll(
        factorUid
      );


    await reload(
      user
    );
  }
}