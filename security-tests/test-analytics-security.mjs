import {
  initializeApp,
  deleteApp
} from 'firebase/app';

import {
  connectAuthEmulator,
  getAuth,
  signInWithEmailAndPassword
} from 'firebase/auth';

import {
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  setDoc,
  updateDoc
} from 'firebase/firestore';


/*
 * ============================================================
 * SERVIGO - ANALYTICS DEMAND SECURITY TEST
 * ============================================================
 */

const PROJECT_ID =
  'servigo-dev';


const PREDICTION_ID =
  '2026-10-28_electricidad_manana';


const firebaseConfig = {

  apiKey:
    'demo-key',

  authDomain:
    'servigo-dev.firebaseapp.com',

  projectId:
    PROJECT_ID
};


/*
 * ============================================================
 * USUARIOS
 * ============================================================
 */

const CLIENT_EMAIL =
  'cliente@servigo.test';


const CLIENT_PASSWORD =
  'ServiGo123!';


const TECHNICIAN_EMAIL =
  'tecnico@servigo.test';


const TECHNICIAN_PASSWORD =
  'ServiGo123!';


const FOREIGN_EMAIL =
  'ajeno@servigo.test';


const FOREIGN_PASSWORD =
  'ServiGo123!';


/*
 * ============================================================
 * CONTEXTO FIREBASE
 * ============================================================
 */

function createContext(
  name
) {

  const app =
    initializeApp(
      firebaseConfig,
      name
    );


  const auth =
    getAuth(
      app
    );


  const firestore =
    getFirestore(
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


  connectFirestoreEmulator(
    firestore,
    '127.0.0.1',
    8080
  );


  return {
    app,
    auth,
    firestore
  };
}


/*
 * ============================================================
 * RESULTADOS
 * ============================================================
 */

function isPermissionDenied(
  error
) {

  return (
    error?.code ===
      'permission-denied'
    ||
    error?.code ===
      'firestore/permission-denied'
  );
}


function pass(
  message,
  counters
) {

  counters.passed +=
    1;


  console.log(
    `   PASS - ${message}`
  );
}


function fail(
  message,
  counters,
  error =
    null
) {

  counters.failed +=
    1;


  console.error(
    `   FAIL - ${message}`
  );


  if (
    error
  ) {

    console.error(
      '          Código:',
      error?.code
    );


    console.error(
      '          Error:',
      error?.message
    );
  }
}


async function expectAllowed(
  label,
  operation,
  counters
) {

  try {

    await operation();


    pass(
      label,
      counters
    );


  } catch (error) {

    fail(
      label,
      counters,
      error
    );
  }
}


async function expectDenied(
  label,
  operation,
  counters
) {

  try {

    await operation();


    fail(
      `${label} - Firestore permitió la operación.`,
      counters
    );


  } catch (error) {

    if (
      isPermissionDenied(
        error
      )
    ) {

      pass(
        label,
        counters
      );


    } else {

      fail(
        `${label} - Error inesperado.`,
        counters,
        error
      );
    }
  }
}


/*
 * ============================================================
 * TEST
 * ============================================================
 */

async function run() {

  const counters = {

    passed:
      0,

    failed:
      0
  };


  const client =
    createContext(
      'analytics-client'
    );


  const technician =
    createContext(
      'analytics-technician'
    );


  const foreign =
    createContext(
      'analytics-foreign'
    );


  console.log('');
  console.log(
    '=============================================='
  );
  console.log(
    ' ServiGo - Analytics Security Test'
  );
  console.log(
    '=============================================='
  );


  try {

    /*
     * =========================================
     * AUTENTICACIÓN
     * =========================================
     */

    console.log('');
    console.log(
      'Autenticando usuarios...'
    );


    await signInWithEmailAndPassword(
      client.auth,
      CLIENT_EMAIL,
      CLIENT_PASSWORD
    );


    await signInWithEmailAndPassword(
      technician.auth,
      TECHNICIAN_EMAIL,
      TECHNICIAN_PASSWORD
    );


    await signInWithEmailAndPassword(
      foreign.auth,
      FOREIGN_EMAIL,
      FOREIGN_PASSWORD
    );


    console.log(
      '   OK - Usuarios autenticados.'
    );


    /*
     * =========================================
     * 1. TÉCNICO LEE DOCUMENTO
     * =========================================
     */

    console.log('');
    console.log(
      'LECTURA'
    );


    await expectAllowed(
      'Técnico puede leer analyticsDemand.',
      async () => {

        const snapshot =
          await getDoc(
            doc(
              technician.firestore,
              'analyticsDemand',
              PREDICTION_ID
            )
          );


        if (
          !snapshot.exists()
        ) {

          throw new Error(
            'prediction-not-found'
          );
        }
      },
      counters
    );


    /*
     * =========================================
     * 2. TÉCNICO PUEDE CONSULTAR COLECCIÓN
     * =========================================
     */

    await expectAllowed(
      'Técnico puede consultar analyticsDemand.',
      () =>
        getDocs(
          collection(
            technician.firestore,
            'analyticsDemand'
          )
        ),
      counters
    );


    /*
     * =========================================
     * 3. CLIENTE BLOQUEADO
     * =========================================
     */

    await expectDenied(
      'Cliente no puede leer analyticsDemand.',
      () =>
        getDoc(
          doc(
            client.firestore,
            'analyticsDemand',
            PREDICTION_ID
          )
        ),
      counters
    );


    /*
     * =========================================
     * 4. USUARIO AJENO BLOQUEADO
     * =========================================
     */

    await expectDenied(
      'Usuario ajeno no puede leer analyticsDemand.',
      () =>
        getDoc(
          doc(
            foreign.firestore,
            'analyticsDemand',
            PREDICTION_ID
          )
        ),
      counters
    );


    /*
     * =========================================
     * 5. CREATE BLOQUEADO
     * =========================================
     */

    console.log('');
    console.log(
      'ESCRITURA'
    );


    await expectDenied(
      'Técnico no puede crear predicciones.',
      () =>
        setDoc(
          doc(
            technician.firestore,
            'analyticsDemand',
            'security_test_prediction'
          ),
          {

            category:
              'Electricidad',

            experimental:
              false,

            recommendations:
              []
          }
        ),
      counters
    );


    /*
     * =========================================
     * 6. UPDATE BLOQUEADO
     * =========================================
     */

    await expectDenied(
      'Técnico no puede modificar predicciones.',
      () =>
        updateDoc(
          doc(
            technician.firestore,
            'analyticsDemand',
            PREDICTION_ID
          ),
          {

            experimental:
              false
          }
        ),
      counters
    );


    /*
     * =========================================
     * 7. DELETE BLOQUEADO
     * =========================================
     */

    await expectDenied(
      'Técnico no puede eliminar predicciones.',
      () =>
        deleteDoc(
          doc(
            technician.firestore,
            'analyticsDemand',
            PREDICTION_ID
          )
        ),
      counters
    );


  } catch (error) {

    fail(
      'Error general inesperado.',
      counters,
      error
    );


  } finally {

    await Promise.allSettled([

      deleteApp(
        client.app
      ),

      deleteApp(
        technician.app
      ),

      deleteApp(
        foreign.app
      )
    ]);
  }


  /*
   * =========================================
   * RESULTADO
   * =========================================
   */

  console.log('');
  console.log(
    '=============================================='
  );
  console.log(
    ' RESULTADO ANALYTICS SECURITY'
  );
  console.log(
    '=============================================='
  );


  console.log(
    ` PASS: ${counters.passed}`
  );


  console.log(
    ` FAIL: ${counters.failed}`
  );


  console.log('');


  if (
    counters.failed ===
      0
  ) {

    console.log(
      ' ANALYTICS SECURITY: OK'
    );


  } else {

    console.error(
      ' ANALYTICS SECURITY: FAIL'
    );


    process.exitCode =
      1;
  }


  console.log('');
  console.log(
    '=============================================='
  );
}


run()
  .catch(
    error => {

      console.error(
        'ERROR GENERAL:',
        error
      );


      process.exitCode =
        1;
    }
  );