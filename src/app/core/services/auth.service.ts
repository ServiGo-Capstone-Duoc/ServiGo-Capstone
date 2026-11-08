import {
  Injectable
} from '@angular/core';

import {
  GoogleAuthProvider,
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
  signInWithPopup,
  signOut,
  updateProfile
} from 'firebase/auth';

import {
  doc,
  getDoc,
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


  private readonly googleProvider =
    new GoogleAuthProvider();


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

    this.googleProvider
      .setCustomParameters({
        prompt:
          'select_account'
      });


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
   * REGISTRO CORREO / CONTRASEÑA
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

          commune:
            null,

          address:
            null,

          preferredContact:
            'chat',

          profileVersion:
            2,

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
   * LOGIN CORREO / CONTRASEÑA
   * =========================================
   */

  async login(
    email:
      string,
    password:
      string
  ): Promise<LoginResult> {


    await this.persistenceReady;


    this.pendingMfaResolver =
      null;


    


    try {

      const credential =
        await signInWithEmailAndPassword(
          firebaseAuth,
          email.trim(),
          password
        );


      const user =
        credential.user;


      


      this.updateLastLogin(
        user
      );


      return {
        status:
          'authenticated',

        user
      };


    } catch (
      error: unknown
    ) {

      const mfaResult =
        this.captureMfaChallenge(
          error
        );


      if (
        mfaResult
      ) {

        return mfaResult;
      }


      throw error;
    }
  }


  /*
   * =========================================
   * GOOGLE SIGN-IN / REGISTRO AUTOMÁTICO
   * =========================================
   *
   * El mismo flujo sirve para:
   *
   * - iniciar sesión si el usuario ya existe
   * - crear la identidad Firebase si es nuevo
   * - crear users/{uid} solo si aún no existe
   *
   * Para perfiles existentes se conservan
   * roles, estado, rating y datos personalizados.
   */

  async loginWithGoogle():
    Promise<LoginResult> {


    await this.persistenceReady;


    this.pendingMfaResolver =
      null;


    try {

      const credential =
        await signInWithPopup(
          firebaseAuth,
          this.googleProvider
        );


      const user =
        credential.user;


      try {

        await this.ensureGoogleProfile(
          user
        );

      } catch (
        profileError
      ) {

        console.error(
          '[ServiGo] No fue posible preparar el perfil Google:',
          profileError
        );


        try {

          await signOut(
            firebaseAuth
          );

        } catch (
          signOutError
        ) {

          console.warn(
            '[ServiGo] No fue posible cerrar la sesión incompleta:',
            signOutError
          );
        }


        const error =
          new Error(
            'profile-bootstrap-failed'
          ) as Error & {
            code:
              string;
          };


        error.code =
          'servigo/profile-bootstrap-failed';


        throw error;
      }


      


      return {
        status:
          'authenticated',

        user
      };


    } catch (
      error: unknown
    ) {

      const mfaResult =
        this.captureMfaChallenge(
          error
        );


      if (
        mfaResult
      ) {

        return mfaResult;
      }


      throw error;
    }
  }


  /*
   * =========================================
   * PERFIL GOOGLE
   * =========================================
   */

  private async ensureGoogleProfile(
    user:
      User
  ): Promise<void> {


    const profileReference =
      doc(
        firestore,
        'users',
        user.uid
      );


    const profileSnapshot =
      await getDoc(
        profileReference
      );


    const email =
      user.email?.trim() ??
      '';


    const displayName =
      user.displayName?.trim()
      || email
        .split('@')[0]
      || 'Usuario ServiGo';


    if (
      !profileSnapshot.exists()
    ) {

      await setDoc(
        profileReference,
        {
          uid:
            user.uid,

          email,

          displayName,

          phone:
            null,

          photoUrl:
            user.photoURL ??
            null,

          commune:
            null,

          address:
            null,

          preferredContact:
            'chat',

          profileVersion:
            2,

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


      return;
    }


    const currentProfile =
      profileSnapshot.data();


    /*
     * Las cuentas suspendidas o bloqueadas conservan su sesión el tiempo
     * suficiente para que el guard muestre el estado correcto y cierre el
     * acceso. No intentamos escribir sobre perfiles inactivos.
     */
    if (
      currentProfile['status'] !== 'active'
    ) {
      return;
    }


    const changes:
      Record<string, unknown> = {
        email:
          email
          || currentProfile['email']
          || '',

        updatedAt:
          serverTimestamp(),

        lastLoginAt:
          serverTimestamp(),

        profileVersion:
          2
      };


    if (
      !currentProfile['displayName']
      && displayName
    ) {

      changes['displayName'] =
        displayName;
    }


    if (
      !currentProfile['photoUrl']
      && user.photoURL
    ) {

      changes['photoUrl'] =
        user.photoURL;
    }


    await setDoc(
      profileReference,
      changes,
      {
        merge:
          true
      }
    );
  }


  /*
   * =========================================
   * CAPTURAR DESAFÍO MFA
   * =========================================
   */

  private captureMfaChallenge(
    error:
      unknown
  ): Extract<
    LoginResult,
    {
      status:
        'mfa-required';
    }
  > | null {


    const authError =
      error as {
        code?:
          string;
      };


    if (
      authError?.code !==
      'auth/multi-factor-auth-required'
    ) {

      return null;
    }


    const resolver =
      getMultiFactorResolver(
        firebaseAuth,
        error as MultiFactorError
      );


    this.pendingMfaResolver =
      resolver;


    


    


    return {
      status:
        'mfa-required',

      factorCount:
        resolver.hints.length
    };
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


    


    this.updateLastLogin(
      user
    );


    return user;
  }


  /*
   * =========================================
   * ESTADO DESAFÍO MFA
   * =========================================
   */

  hasPendingMfaLogin():
    boolean {


    return this.pendingMfaResolver !==
      null;
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
