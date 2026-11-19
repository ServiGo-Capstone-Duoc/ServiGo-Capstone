import {
  Capacitor
} from '@capacitor/core';

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
  environment
} from '../../../environments/environment';

import {
  firebaseConfig
} from './firebase.config';

export const firebaseApp =
  initializeApp(
    firebaseConfig
  );

export const firebaseAuth =
  getAuth(
    firebaseApp
  );

export const firestore =
  getFirestore(
    firebaseApp
  );

export const firebaseFunctions =
  getFunctions(
    firebaseApp,
    'southamerica-west1'
  );

export const firebaseStorage =
  getStorage(
    firebaseApp
  );

if (
  environment.useFirebaseEmulators
) {

  const emulatorHost =
    Capacitor.isNativePlatform()
      ? '10.0.2.2'
      : '127.0.0.1';

  connectAuthEmulator(
    firebaseAuth,
    `http://${emulatorHost}:9099`,
    {
      disableWarnings: true
    }
  );

  connectFirestoreEmulator(
    firestore,
    emulatorHost,
    8080
  );

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
}
