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
    'webpay-commit-test'
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
 * CREDENCIALES CLIENTE TEST
 * =========================================
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
    'Faltan las credenciales del Cliente Test.'
  );
}


/*
 * =========================================
 * TOKEN DE LA TRANSACCIÓN REALIZADA
 * =========================================
 */

const token =
  '01abf6960b61dc0db3a036cd6997558aa41b1557d8e1a41119e94fb51de1a287';


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


console.log();

console.log(
  'Invocando commitWebpayTransaction...'
);


const commitWebpayTransaction =
  httpsCallable(
    functions,
    'commitWebpayTransaction'
  );


try {

  const response =
    await commitWebpayTransaction({
      token
    });


  console.log();

  console.log(
    '=============================================='
  );

  console.log(
    ' WEBPAY COMMIT RESULT'
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
    ' WEBPAY COMMIT ERROR'
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