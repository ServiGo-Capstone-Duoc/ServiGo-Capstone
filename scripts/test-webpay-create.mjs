import {
  initializeApp
} from 'firebase/app';

import {
  connectAuthEmulator,
  getAuth,
  signInWithEmailAndPassword
} from 'firebase/auth';

import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable
} from 'firebase/functions';


const firebaseConfig = {

  apiKey:
    'demo-key',

  authDomain:
    'servigo-dev.firebaseapp.com',

  projectId:
    'servigo-dev',

  appId:
    '1:123456789:web:test'
};


const app =
  initializeApp(
    firebaseConfig,
    'webpay-create-test'
  );


const auth =
  getAuth(
    app
  );


connectAuthEmulator(
  auth,
  'http://127.0.0.1:9099',
  {
    disableWarnings:
      true
  }
);


const functions =
  getFunctions(
    app,
    'southamerica-west1'
  );


connectFunctionsEmulator(
  functions,
  '127.0.0.1',
  5001
);


/*
 * =========================================
 * CLIENTE TEST
 * =========================================
 *
 * Usa las mismas credenciales que utilizas
 * para Cliente Test en ServiGo.
 */

const email =
  process.env[
    'SERVIGO_TEST_CLIENT_EMAIL'
  ];


const password =
  process.env[
    'SERVIGO_TEST_CLIENT_PASSWORD'
  ];


if (
  !email
  ||
  !password
) {

  throw new Error(
    'Define SERVIGO_TEST_CLIENT_EMAIL y SERVIGO_TEST_CLIENT_PASSWORD.'
  );
}


console.log(
  'Autenticando Cliente Test...'
);


const credential =
  await signInWithEmailAndPassword(
    auth,
    email,
    password
  );


console.log(
  'OK - UID:',
  credential.user.uid
);


const requestId =
  '657agEMhvGY9i9GIF5qM';


console.log();
console.log(
  'Invocando createWebpayTransaction...'
);


const createWebpayTransaction =
  httpsCallable(
    functions,
    'createWebpayTransaction'
  );


try {

  const response =
    await createWebpayTransaction({
      requestId
    });


  console.log();
  console.log(
    '=============================================='
  );

  console.log(
    ' WEBPAY CREATE OK'
  );

  console.log(
    '=============================================='
  );

  console.log(
    JSON.stringify(
      response.data,
      null,
      2
    )
  );


} catch (error) {

  console.error();
  console.error(
    '=============================================='
  );

  console.error(
    ' WEBPAY CREATE ERROR'
  );

  console.error(
    '=============================================='
  );

  console.error(
    'code:',
    error?.code
  );

  console.error(
    'message:',
    error?.message
  );

  console.error(
    'details:',
    error?.details
  );


  process.exitCode =
    1;
}