import {
  Injectable
} from '@angular/core';

import {
  MultiFactorError,
  MultiFactorResolver,
  TotpMultiFactorGenerator,
  User,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  deleteUser,
  getMultiFactorResolver,
  onAuthStateChanged,
  sendEmailVerification,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';

import {
  doc,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'firebase/firestore';

import {
  firebaseAuth,
  firestore
} from '../firebase/firebase';


export type LoginResult =
  | {
      status:
        'authenticated';

      user:
        User;
    }
  | {
      status:
        'mfa-required';

      factorCount:
        number;
    };


@Injectable({
  providedIn:
    'root'
})
export class AuthService {


  private readonly persistenceReady =
    setPersistence(
      firebaseAuth,
      browserLocalPersistence
    );


  private readonly initializationReady:
    Promise<void>;


  /*
   * Resolver MFA temporal.
   *
   * Existe solamente mientras se completa
   * el segundo factor del login.
   */
  private pendingMfaResolver:
    MultiFactorResolver | null =
      null;


  constructor() {

    this.initializationReady =
      new Promise<void>(
        async resolve => {

          try {

            await this.persistenceReady;

          } catch (error) {

            console.error(
              'Error configurando persistencia Firebase:',
              error
            );
          }


          const unsubscribe =
            onAuthStateChanged(
              firebaseAuth,
              () => {

                unsubscribe();

                resolve();
              }
            );
        }
      );
  }


  /*
   * =========================================
   * AUTH READY
   * =========================================
   */

  async waitForAuthReady():
    Promise<User | null> {


    await this.initializationReady;

    return firebaseAuth.currentUser;
  }


  /*
   * =========================================
   * REGISTRO
   * =========================================
   */

  async register(
    email:
      string,
    password:
      string,
    displayName:
      string
  ): Promise<User> {


    await this.persistenceReady;


    const credential =
      await createUserWithEmailAndPassword(
        firebaseAuth,
        email.trim(),
        password
      );


    const user =
      credential.user;


    try {

      await updateProfile(
        user,
        {
          displayName:
            displayName.trim()
        }
      );


      await setDoc(
        doc(
          firestore,
          'users',
          user.uid
        ),
        {
          uid:
            user.uid,

          email:
            user.email ??
            email.trim(),

          displayName:
            displayName.trim(),

          phone:
            null,

          photoUrl:
            null,

          roles: [
            'cliente'
          ],

          status:
            'active',

          averageRating:
            null,

          ratingCount:
            0,

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),

          lastLoginAt:
            serverTimestamp()
        }
      );


      /*
       * La verificación de correo es necesaria
       * para permitir posteriormente TOTP MFA.
       *
       * Un fallo de envío no elimina la cuenta.
       */

      try {

        await sendEmailVerification(
          user
        );

      } catch (
        verificationError
      ) {

        console.warn(
          '[ServiGo] No fue posible enviar verificación de correo:',
          verificationError
        );
      }


      return user;


    } catch (error) {


      try {

        await deleteUser(
          user
        );

      } catch (
        rollbackError
      ) {

        console.error(
          'No fue posible revertir el usuario:',
          rollbackError
        );
      }


      throw error;
    }
  }


  /*
   * =========================================
   * LOGIN - PRIMER FACTOR
   * =========================================
   */

  async login(
    email:
      string,
    password:
      string
  ): Promise<LoginResult> {


    await this.persistenceReady;


    /*
     * Elimina cualquier desafío MFA anterior.
     */

    this.pendingMfaResolver =
      null;


    console.log(
      '[ServiGo] Iniciando autenticación...'
    );


    try {

      const credential =
        await signInWithEmailAndPassword(
          firebaseAuth,
          email.trim(),
          password
        );


      const user =
        credential.user;


      console.log(
        '[ServiGo] Authentication OK:',
        user.uid
      );


      this.updateLastLogin(
        user
      );


      return {
        status:
          'authenticated',

        user
      };


    } catch (
      error: any
    ) {


      /*
       * =====================================
       * MFA REQUERIDO
       * =====================================
       */

      if (
        error?.code ===
        'auth/multi-factor-auth-required'
      ) {


        const resolver =
          getMultiFactorResolver(
            firebaseAuth,
            error as MultiFactorError
          );


        this.pendingMfaResolver =
          resolver;


        console.log(
          '[ServiGo MFA] Segundo factor requerido.'
        );


        console.log(
          '[ServiGo MFA] Factores disponibles:',
          resolver.hints.length
        );


        return {
          status:
            'mfa-required',

          factorCount:
            resolver.hints.length
        };
      }


      throw error;
    }
  }


  /*
   * =========================================
   * LOGIN - SEGUNDO FACTOR TOTP
   * =========================================
   */

  async resolveTotpLogin(
    verificationCode:
      string
  ): Promise<User> {


    const resolver =
      this.pendingMfaResolver;


    if (
      !resolver
    ) {

      throw new Error(
        'mfa-session-missing'
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


    /*
     * En ServiGo enrolaremos actualmente
     * un único factor TOTP.
     */

    const hint =
      resolver.hints[0];


    if (
      !hint
    ) {

      throw new Error(
        'mfa-factor-missing'
      );
    }


    const assertion =
      TotpMultiFactorGenerator
        .assertionForSignIn(
          hint.uid,
          code
        );


    const credential =
      await resolver
        .resolveSignIn(
          assertion
        );


    const user =
      credential.user;


    this.pendingMfaResolver =
      null;


    console.log(
      '[ServiGo MFA] Segundo factor validado:',
      user.uid
    );


    this.updateLastLogin(
      user
    );


    return user;
  }


  /*
   * =========================================
   * CANCELAR DESAFÍO MFA
   * =========================================
   */

  cancelMfaLogin():
    void {


    this.pendingMfaResolver =
      null;
  }


  /*
   * =========================================
   * LAST LOGIN
   * =========================================
   */

  private updateLastLogin(
    user:
      User
  ): void {


    updateDoc(
      doc(
        firestore,
        'users',
        user.uid
      ),
      {
        lastLoginAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp()
      }
    )
      .catch(
        error => {

          console.warn(
            '[ServiGo] No se pudo actualizar lastLoginAt:',
            error
          );
        }
      );
  }


  /*
   * =========================================
   * LOGOUT
   * =========================================
   */

  async logout():
    Promise<void> {


    this.pendingMfaResolver =
      null;


    await signOut(
      firebaseAuth
    );
  }


  /*
   * =========================================
   * USUARIO ACTUAL
   * =========================================
   */

  getCurrentUser():
    User | null {


    return firebaseAuth.currentUser;
  }


  onAuthStateChanged(
    callback:
      (
        user:
          User | null
      ) => void
  ): () => void {


    return onAuthStateChanged(
      firebaseAuth,
      callback
    );
  }
}