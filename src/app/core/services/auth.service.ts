import { Injectable } from '@angular/core';

import {
  User,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
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

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  /**
   * Configuración de persistencia local.
   */
  private readonly persistenceReady =
    setPersistence(
      firebaseAuth,
      browserLocalPersistence
    );

  /**
   * Esta promesa SOLO espera a que Firebase determine
   * cuál es la sesión inicial.
   *
   * Importante:
   * NO guarda para siempre el usuario inicial.
   */
  private readonly initializationReady: Promise<void>;

  constructor() {

    this.initializationReady =
      new Promise<void>(
        async (resolve) => {

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

  /**
   * Espera a que Firebase restaure la sesión inicial
   * y luego devuelve SIEMPRE el usuario actual.
   */
  async waitForAuthReady(): Promise<User | null> {

    await this.initializationReady;

    return firebaseAuth.currentUser;
  }

  async register(
    email: string,
    password: string,
    displayName: string
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

      return user;

    } catch (error) {

      /**
       * Evita dejar un usuario en Authentication
       * sin su correspondiente perfil Firestore.
       */
      try {

        await deleteUser(
          user
        );

      } catch (rollbackError) {

        console.error(
          'No fue posible revertir el usuario:',
          rollbackError
        );
      }

      throw error;
    }
  }

  async login(
    email: string,
    password: string
  ): Promise<User> {

    await this.persistenceReady;

    console.log(
      '[ServiGo] Iniciando autenticación...'
    );

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

    /**
     * La actualización de actividad NO debe bloquear
     * el inicio de sesión.
     *
     * Si Firestore tarda o tiene un problema puntual,
     * el usuario igual puede entrar.
     */
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
        (error) => {

          console.warn(
            '[ServiGo] No se pudo actualizar lastLoginAt:',
            error
          );
        }
      );

    return user;
  }

  async logout(): Promise<void> {

    await signOut(
      firebaseAuth
    );
  }

  getCurrentUser(): User | null {

    return firebaseAuth.currentUser;
  }

  onAuthStateChanged(
    callback: (
      user: User | null
    ) => void
  ): () => void {

    return onAuthStateChanged(
      firebaseAuth,
      callback
    );
  }
}