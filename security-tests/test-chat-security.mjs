import {
  createRequire
} from 'node:module';

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
  addDoc,
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  getDocs,
  getFirestore,
  serverTimestamp,
  updateDoc,
  doc
} from 'firebase/firestore';


/*
 * ============================================================
 * SERVIGO - CHAT SECURITY TEST
 * ============================================================
 *
 * Fixtures:
 * Firebase Admin SDK
 *
 * Pruebas:
 * Firebase Client SDK autenticado
 *
 * Emulators:
 *
 * Auth:
 * 127.0.0.1:9099
 *
 * Firestore:
 * 127.0.0.1:8080
 */


/*
 * ============================================================
 * ADMIN SDK
 * ============================================================
 */

const require =
  createRequire(
    import.meta.url
  );


const admin =
  require(
    '../functions/node_modules/firebase-admin'
  );


process.env[
  'FIRESTORE_EMULATOR_HOST'
] =
  '127.0.0.1:8080';


const PROJECT_ID =
  'servigo-dev';


const adminApp =
  admin.initializeApp(
    {
      projectId:
        PROJECT_ID
    },
    'servigo-chat-security-admin'
  );


const adminDb =
  admin.firestore(
    adminApp
  );


/*
 * ============================================================
 * FIREBASE CLIENT
 * ============================================================
 */

const firebaseConfig = {

  apiKey:
    'demo-key',

  authDomain:
    'servigo-dev.firebaseapp.com',

  projectId:
    PROJECT_ID
};


function createFirebaseContext(
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
 * USUARIOS TEST
 * ============================================================
 */

const CLIENT_EMAIL =
  'cliente@servigo.test';


const CLIENT_PASSWORD =
  'ServiGo123!';


const CLIENT_UID =
  '9ocL3r7z2v0JzlkPsvAWwaurP42e';


const TECHNICIAN_EMAIL =
  'tecnico@servigo.test';


const TECHNICIAN_PASSWORD =
  'ServiGo123!';


const TECHNICIAN_UID =
  'EZogxRRHudxR1VUbSB5IWRtKPjqt';


/*
 * Usuario ajeno.
 *
 * Si todavía no existe en Auth Emulator,
 * solamente se omitirá esa prueba.
 */

const FOREIGN_EMAIL =
  'ajeno@servigo.test';


const FOREIGN_PASSWORD =
  'ServiGo123!';


/*
 * ============================================================
 * FIXTURES
 * ============================================================
 */

const TEST_PREFIX =
  'chat_security_test_';


const STATES = [
  'accepted',
  'en_route',
  'arrived',
  'in_progress',
  'completed',
  'cancelled'
];


function requestIdFor(
  status
) {

  return `${TEST_PREFIX}${status}`;
}


function baseRequest(
  status
) {

  return {

    id:
      requestIdFor(
        status
      ),

    clientId:
      CLIENT_UID,

    clientName:
      'Cliente Test',

    category:
      'Electricidad',

    description:
      'Fixture temporal para pruebas de seguridad del chat.',

    address:
      'Direccion Test 123',

    commune:
      'Puente Alto',

    latitude:
      -33.60,

    longitude:
      -70.57,

    preferredDate:
      null,

    timeSlot:
      'Flexible',

    urgency:
      'normal',

    photoUrls:
      [],

    status,

    assignedTechnicianId:
      TECHNICIAN_UID,

    acceptedQuoteId:
      `quote_${status}`,

    paymentStatus:
      'pending',

    paymentId:
      null,

    createdAt:
      admin.firestore.FieldValue
        .serverTimestamp(),

    updatedAt:
      admin.firestore.FieldValue
        .serverTimestamp()
  };
}


async function prepareFixtures() {

  for (
    const status
    of STATES
  ) {

    const requestId =
      requestIdFor(
        status
      );


    const requestRef =
      adminDb
        .collection(
          'serviceRequests'
        )
        .doc(
          requestId
        );


    await requestRef
      .set(
        baseRequest(
          status
        )
      );


    await requestRef
      .collection(
        'messages'
      )
      .doc(
        'seed'
      )
      .set({

        id:
          'seed',

        requestId,

        senderId:
          CLIENT_UID,

        senderName:
          'Cliente Test',

        text:
          `Mensaje inicial ${status}`,

        createdAt:
          admin.firestore.FieldValue
            .serverTimestamp()
      });
  }
}


/*
 * ============================================================
 * LIMPIEZA
 * ============================================================
 */

async function cleanupFixtures() {

  for (
    const status
    of STATES
  ) {

    const requestId =
      requestIdFor(
        status
      );


    try {

      const requestRef =
        adminDb
          .collection(
            'serviceRequests'
          )
          .doc(
            requestId
          );


      const messagesSnapshot =
        await requestRef
          .collection(
            'messages'
          )
          .get();


      for (
        const message
        of messagesSnapshot.docs
      ) {

        await message.ref
          .delete();
      }


      await requestRef
        .delete();


    } catch (error) {

      console.warn(
        `[cleanup] ${requestId}:`,
        error instanceof Error
          ? error.message
          : String(
              error
            )
      );
    }
  }
}


/*
 * ============================================================
 * HELPERS RESULTADO
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


function skip(
  message,
  counters
) {

  counters.skipped +=
    1;


  console.warn(
    `   SKIP - ${message}`
  );
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
 * REFERENCIAS CHAT
 * ============================================================
 */

function messagesCollection(
  firestore,
  status
) {

  return collection(
    firestore,
    'serviceRequests',
    requestIdFor(
      status
    ),
    'messages'
  );
}


function seedMessageRef(
  firestore,
  status
) {

  return doc(
    firestore,
    'serviceRequests',
    requestIdFor(
      status
    ),
    'messages',
    'seed'
  );
}


/*
 * ============================================================
 * ENVIAR MENSAJE VÁLIDO
 * ============================================================
 */

async function sendValidMessage(
  firestore,
  status,
  senderId,
  senderName
) {

  const requestId =
    requestIdFor(
      status
    );


  return await addDoc(
    messagesCollection(
      firestore,
      status
    ),
    {

      requestId,

      senderId,

      senderName,

      text:
        `Mensaje permitido ${status}`,

      createdAt:
        serverTimestamp()
    }
  );
}


/*
 * ============================================================
 * TEST PRINCIPAL
 * ============================================================
 */

async function run() {

  const counters = {

    passed:
      0,

    failed:
      0,

    skipped:
      0
  };


  const clientContext =
    createFirebaseContext(
      'servigo-chat-security-client'
    );


  const technicianContext =
    createFirebaseContext(
      'servigo-chat-security-technician'
    );


  const foreignContext =
    createFirebaseContext(
      'servigo-chat-security-foreign'
    );


  let foreignAuthenticated =
    false;


  console.log('');
  console.log(
    '=============================================='
  );
  console.log(
    ' ServiGo - Chat Security Test'
  );
  console.log(
    '=============================================='
  );
  console.log('');


  /*
   * Limpieza de residuos de ejecuciones
   * anteriores.
   */

  await cleanupFixtures();


  try {

    /*
     * =========================================
     * PREPARAR FIXTURES
     * =========================================
     */

    console.log(
      'Preparando fixtures temporales...'
    );


    await prepareFixtures();


    console.log(
      '   OK - Fixtures preparados.'
    );


    /*
     * =========================================
     * AUTENTICAR CLIENTE
     * =========================================
     */

    console.log('');
    console.log(
      'Autenticando Cliente Test...'
    );


    const clientCredential =
      await signInWithEmailAndPassword(
        clientContext.auth,
        CLIENT_EMAIL,
        CLIENT_PASSWORD
      );


    if (
      clientCredential.user.uid !==
      CLIENT_UID
    ) {

      throw new Error(
        `UID cliente inesperado: ${clientCredential.user.uid}`
      );
    }


    console.log(
      '   OK - Cliente autenticado.'
    );


    /*
     * =========================================
     * AUTENTICAR TÉCNICO
     * =========================================
     */

    console.log(
      'Autenticando Técnico Test...'
    );


    const technicianCredential =
      await signInWithEmailAndPassword(
        technicianContext.auth,
        TECHNICIAN_EMAIL,
        TECHNICIAN_PASSWORD
      );


    if (
      technicianCredential.user.uid !==
      TECHNICIAN_UID
    ) {

      throw new Error(
        `UID técnico inesperado: ${technicianCredential.user.uid}`
      );
    }


    console.log(
      '   OK - Técnico autenticado.'
    );


    /*
     * =========================================
     * USUARIO AJENO
     * =========================================
     */

    try {

      await signInWithEmailAndPassword(
        foreignContext.auth,
        FOREIGN_EMAIL,
        FOREIGN_PASSWORD
      );


      foreignAuthenticated =
        true;


      console.log(
        '   OK - Usuario ajeno autenticado.'
      );


    } catch {

      console.log(
        '   INFO - ajeno@servigo.test todavía no existe.'
      );


      console.log(
        '   La prueba de lectura ajena será omitida.'
      );
    }


    /*
     * =========================================
     * LECTURA
     * =========================================
     */

    console.log('');
    console.log(
      '----------------------------------------------'
    );
    console.log(
      ' LECTURA'
    );
    console.log(
      '----------------------------------------------'
    );


    await expectAllowed(
      'Cliente puede leer su conversación.',
      () =>
        getDocs(
          messagesCollection(
            clientContext.firestore,
            'accepted'
          )
        ),
      counters
    );


    await expectAllowed(
      'Técnico asignado puede leer la conversación.',
      () =>
        getDocs(
          messagesCollection(
            technicianContext.firestore,
            'accepted'
          )
        ),
      counters
    );


    /*
     * =========================================
     * USUARIO AJENO NO LEE
     * =========================================
     */

    if (
      foreignAuthenticated
    ) {

      await expectDenied(
        'Usuario ajeno no puede leer la conversación.',
        () =>
          getDocs(
            messagesCollection(
              foreignContext.firestore,
              'accepted'
            )
          ),
        counters
      );


    } else {

      skip(
        'Usuario ajeno no puede leer la conversación.',
        counters
      );
    }


    /*
     * =========================================
     * ESTADOS CON ESCRITURA
     * =========================================
     */

    console.log('');
    console.log(
      '----------------------------------------------'
    );
    console.log(
      ' ESTADOS CON ESCRITURA'
    );
    console.log(
      '----------------------------------------------'
    );


    await expectAllowed(
      'Cliente puede enviar mensaje en accepted.',
      () =>
        sendValidMessage(
          clientContext.firestore,
          'accepted',
          CLIENT_UID,
          'Cliente Test'
        ),
      counters
    );


    await expectAllowed(
      'Técnico puede enviar mensaje en en_route.',
      () =>
        sendValidMessage(
          technicianContext.firestore,
          'en_route',
          TECHNICIAN_UID,
          'Técnico Test'
        ),
      counters
    );


    await expectAllowed(
      'Cliente puede enviar mensaje en arrived.',
      () =>
        sendValidMessage(
          clientContext.firestore,
          'arrived',
          CLIENT_UID,
          'Cliente Test'
        ),
      counters
    );


    await expectAllowed(
      'Técnico puede enviar mensaje en in_progress.',
      () =>
        sendValidMessage(
          technicianContext.firestore,
          'in_progress',
          TECHNICIAN_UID,
          'Técnico Test'
        ),
      counters
    );


    await expectAllowed(
      'Cliente puede enviar mensaje en completed.',
      () =>
        sendValidMessage(
          clientContext.firestore,
          'completed',
          CLIENT_UID,
          'Cliente Test'
        ),
      counters
    );


    /*
     * =========================================
     * CANCELLED SOLO LECTURA
     * =========================================
     */

    console.log('');
    console.log(
      '----------------------------------------------'
    );
    console.log(
      ' CANCELLED - SOLO LECTURA'
    );
    console.log(
      '----------------------------------------------'
    );


    await expectAllowed(
      'Cliente puede leer historial cancelled.',
      () =>
        getDocs(
          messagesCollection(
            clientContext.firestore,
            'cancelled'
          )
        ),
      counters
    );


    await expectAllowed(
      'Técnico puede leer historial cancelled.',
      () =>
        getDocs(
          messagesCollection(
            technicianContext.firestore,
            'cancelled'
          )
        ),
      counters
    );


    await expectDenied(
      'Cliente no puede enviar mensaje en cancelled.',
      () =>
        sendValidMessage(
          clientContext.firestore,
          'cancelled',
          CLIENT_UID,
          'Cliente Test'
        ),
      counters
    );


    await expectDenied(
      'Técnico no puede enviar mensaje en cancelled.',
      () =>
        sendValidMessage(
          technicianContext.firestore,
          'cancelled',
          TECHNICIAN_UID,
          'Técnico Test'
        ),
      counters
    );


    /*
     * =========================================
     * SENDER ID FALSIFICADO
     * =========================================
     */

    console.log('');
    console.log(
      '----------------------------------------------'
    );
    console.log(
      ' IDENTIDAD Y REQUEST'
    );
    console.log(
      '----------------------------------------------'
    );


    await expectDenied(
      'Cliente no puede falsificar senderId.',
      () =>
        addDoc(
          messagesCollection(
            clientContext.firestore,
            'accepted'
          ),
          {

            requestId:
              requestIdFor(
                'accepted'
              ),

            senderId:
              TECHNICIAN_UID,

            senderName:
              'Técnico falso',

            text:
              'Intento de suplantación.',

            createdAt:
              serverTimestamp()
          }
        ),
      counters
    );


    /*
     * =========================================
     * REQUEST ID FALSIFICADO
     * =========================================
     */

    await expectDenied(
      'Cliente no puede falsificar requestId.',
      () =>
        addDoc(
          messagesCollection(
            clientContext.firestore,
            'accepted'
          ),
          {

            requestId:
              'request-fraudulento',

            senderId:
              CLIENT_UID,

            senderName:
              'Cliente Test',

            text:
              'Intento con requestId incorrecto.',

            createdAt:
              serverTimestamp()
          }
        ),
      counters
    );


    /*
     * =========================================
     * MENSAJE VACÍO
     * =========================================
     */

    console.log('');
    console.log(
      '----------------------------------------------'
    );
    console.log(
      ' VALIDACIÓN DE CONTENIDO'
    );
    console.log(
      '----------------------------------------------'
    );


    await expectDenied(
      'Mensaje vacío fue bloqueado.',
      () =>
        addDoc(
          messagesCollection(
            clientContext.firestore,
            'accepted'
          ),
          {

            requestId:
              requestIdFor(
                'accepted'
              ),

            senderId:
              CLIENT_UID,

            senderName:
              'Cliente Test',

            text:
              '',

            createdAt:
              serverTimestamp()
          }
        ),
      counters
    );


    /*
     * =========================================
     * MENSAJE > 1000
     * =========================================
     */

    await expectDenied(
      'Mensaje mayor a 1000 caracteres fue bloqueado.',
      () =>
        addDoc(
          messagesCollection(
            clientContext.firestore,
            'accepted'
          ),
          {

            requestId:
              requestIdFor(
                'accepted'
              ),

            senderId:
              CLIENT_UID,

            senderName:
              'Cliente Test',

            text:
              'x'.repeat(
                1001
              ),

            createdAt:
              serverTimestamp()
          }
        ),
      counters
    );


    /*
     * =========================================
     * INMUTABILIDAD
     * =========================================
     */

    console.log('');
    console.log(
      '----------------------------------------------'
    );
    console.log(
      ' INMUTABILIDAD'
    );
    console.log(
      '----------------------------------------------'
    );


    await expectDenied(
      'Mensaje existente no puede editarse.',
      () =>
        updateDoc(
          seedMessageRef(
            clientContext.firestore,
            'accepted'
          ),
          {
            text:
              'Mensaje editado'
          }
        ),
      counters
    );


    await expectDenied(
      'Mensaje existente no puede eliminarse.',
      () =>
        deleteDoc(
          seedMessageRef(
            clientContext.firestore,
            'accepted'
          )
        ),
      counters
    );


  } catch (error) {

    fail(
      'Error general inesperado durante la batería.',
      counters,
      error
    );


  } finally {

    /*
     * =========================================
     * LIMPIEZA
     * =========================================
     */

    console.log('');
    console.log(
      'Limpiando fixtures temporales...'
    );


    await cleanupFixtures();


    await Promise.allSettled([

      deleteApp(
        clientContext.app
      ),

      deleteApp(
        technicianContext.app
      ),

      deleteApp(
        foreignContext.app
      )
    ]);


    try {

      await adminApp
        .delete();

    } catch {
      // Sin acción adicional.
    }
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
    ' RESULTADO CHAT SECURITY'
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


  console.log(
    ` SKIP: ${counters.skipped}`
  );


  console.log('');


  if (
    counters.failed ===
    0
  ) {

    console.log(
      ' CHAT SECURITY: OK'
    );


  } else {

    console.error(
      ' CHAT SECURITY: FAIL'
    );


    process.exitCode =
      1;
  }


  console.log('');
  console.log(
    '=============================================='
  );
  console.log(
    ' Prueba terminada'
  );
  console.log(
    '=============================================='
  );
  console.log('');
}


/*
 * ============================================================
 * EJECUCIÓN
 * ============================================================
 */

run()
  .catch(
    async error => {

      console.error('');
      console.error(
        'ERROR GENERAL:'
      );


      console.error(
        error
      );


      try {

        await cleanupFixtures();

      } catch {
        // Sin acción adicional.
      }


      try {

        await adminApp
          .delete();

      } catch {
        // Sin acción adicional.
      }


      process.exitCode =
        1;
    }
  );