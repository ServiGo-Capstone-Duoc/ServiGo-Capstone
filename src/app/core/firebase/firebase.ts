import {
  initializeApp
} from 'firebase/app';

import {
  connectAuthEmulator,
  getAuth
} from 'firebase/auth';

import {
  connectFirestoreEmulator,
  getFirestore
} from 'firebase/firestore';

import {
  connectFunctionsEmulator,
  getFunctions
} from 'firebase/functions';

import {
  connectStorageEmulator,
  getStorage
} from 'firebase/storage';

import {
  Capacitor
} from '@capacitor/core';

import {
  environment
} from '../../../environments/environment';

import {
  firebaseConfig
} from './firebase.config';


/*
 * =========================================
 * FIREBASE APP
 * =========================================
 */

export const firebaseApp =
  initializeApp(
    firebaseConfig
  );


/*
 * =========================================
 * FIREBASE AUTH
 * =========================================
 */

export const firebaseAuth =
  getAuth(
    firebaseApp
  );


/*
 * =========================================
 * FIRESTORE
 * =========================================
 */

export const firestore =
  getFirestore(
    firebaseApp
  );


/*
 * =========================================
 * CLOUD FUNCTIONS
 * =========================================
 *
 * IMPORTANTE:
 *
 * Debe utilizar la misma región
 * configurada en Functions backend.
 */

export const firebaseFunctions =
  getFunctions(
    firebaseApp,
    'southamerica-west1'
  );


/*
 * =========================================
 * FIREBASE STORAGE
 * =========================================
 */

export const firebaseStorage =
  getStorage(
    firebaseApp
  );


/*
 * =========================================
 * FIREBASE EMULATORS
 * =========================================
 */

if (
  environment.useFirebaseEmulators
) {


  const emulatorHost =
    Capacitor.isNativePlatform()
      ? '10.0.2.2'
      : '127.0.0.1';


  /*
   * =====================================
   * AUTHENTICATION
   * =====================================
   */

  connectAuthEmulator(
    firebaseAuth,
    `http://${emulatorHost}:9099`,
    {
      disableWarnings:
        true
    }
  );


  /*
   * =====================================
   * FIRESTORE
   * =====================================
   */

  connectFirestoreEmulator(
    firestore,
    emulatorHost,
    8080
  );


  /*
   * =====================================
   * FUNCTIONS
   * =====================================
   */

  connectFunctionsEmulator(
    firebaseFunctions,
    emulatorHost,
    5001
  );


  connectStorageEmulator(
    firebaseStorage,
    emulatorHost,
    9199
  );


  console.log(
    '[ServiGo] Firebase Emulator Suite activo'
  );


  console.log(
    '[ServiGo] Auth Emulator:',
    `${emulatorHost}:9099`
  );


  console.log(
    '[ServiGo] Firestore Emulator:',
    `${emulatorHost}:8080`
  );


  console.log(
    '[ServiGo] Functions Emulator:',
    `${emulatorHost}:5001`
  );


  console.log(
    '[ServiGo] Storage Emulator:',
    `${emulatorHost}:9199`
  );
}