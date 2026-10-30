import {
  createRequire
} from 'node:module';

import {
  initializeApp
} from 'firebase/app';

import {
  connectAuthEmulator,
  getAuth,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';

import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable
} from 'firebase/functions';


/*
 * ============================================================
 * SERVIGO - CANCEL SERVICE SECURITY TEST V2
 * ============================================================
 *
 * Firebase Admin SDK:
 * - crea fixtures
 * - verifica documentos
 * - limpia fixtures
 *
 * Firebase Client SDK:
 * - autentica Cliente Test / Tecnico Test
 * - ejecuta cancelService mediante httpsCallable()
 *
 * Todo trabaja EXCLUSIVAMENTE contra Firebase Emulator Suite.
 */


/*
 * ============================================================
 * FIREBASE ADMIN
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
    'servigo-cancel-admin-test'
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
    `${PROJECT_ID}.firebaseapp.com`,

  projectId:
    PROJECT_ID
};


const clientApp =
  initializeApp(
    firebaseConfig,
    'servigo-cancel-client-test'
  );


const auth =
  getAuth(
    clientApp
  );


const functions =
  getFunctions(
    clientApp,
    'southamerica-west1'
  );


connectAuthEmulator(
  auth,
  'http://127.0.0.1:9099',
  {
    disableWarnings:
      true
  }
);


connectFunctionsEmulator(
  functions,
  '127.0.0.1',
  5001
);


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
 * ============================================================
 * IDS TEMPORALES
 * ============================================================
 */

const IDS = {

  publishedClient:
    'cancel_test_published_client',

  technicianBeforeAssignment:
    'cancel_test_technician_before_assignment',

  acceptedClient:
    'cancel_test_accepted_client',

  acceptedTechnician:
    'cancel_test_accepted_technician',

  enRouteClient:
    'cancel_test_en_route_client',

  inProgress:
    'cancel_test_in_progress',

  completed:
    'cancel_test_completed',

  alreadyCancelled:
    'cancel_test_already_cancelled',

  shortReason:
    'cancel_test_short_reason'
};


/*
 * ============================================================
 * FIXTURES ADMIN
 * ============================================================
 */

function baseRequest(
  id,
  status,
  {
    assignedTechnicianId =
      null,

    acceptedQuoteId =
      null
  } = {}
) {

  return {

    id,

    clientId:
      CLIENT_UID,

    clientName:
      'Cliente Test',

    category:
      'Electricidad',

    description:
      'Solicitud temporal para probar cancelaciones ServiGo.',

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

    assignedTechnicianId,

    acceptedQuoteId,

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


async function putRequest(
  requestId,
  data
) {

  await adminDb
    .collection(
      'serviceRequests'
    )
    .doc(
      requestId
    )
    .set(
      data
    );
}


async function getRequest(
  requestId
) {

  return await adminDb
    .collection(
      'serviceRequests'
    )
    .doc(
      requestId
    )
    .get();
}


async function putTechnicianLocation(
  requestId
) {

  await adminDb
    .collection(
      'technicianLocations'
    )
    .doc(
      TECHNICIAN_UID
    )
    .set({

      technicianId:
        TECHNICIAN_UID,

      requestId,

      latitude:
        -33.5855,

      longitude:
        -70.7005,

      accuracy:
        5,

      heading:
        null,

      speed:
        null,

      active:
        true,

      updatedAt:
        admin.firestore.FieldValue
          .serverTimestamp()
    });
}


async function getTechnicianLocation() {

  return await adminDb
    .collection(
      'technicianLocations'
    )
    .doc(
      TECHNICIAN_UID
    )
    .get();
}


/*
 * ============================================================
 * AUTH
 * ============================================================
 */

async function loginClient() {

  await signOut(
    auth
  );


  const credential =
    await signInWithEmailAndPassword(
      auth,
      CLIENT_EMAIL,
      CLIENT_PASSWORD
    );


  if (
    credential.user.uid !==
    CLIENT_UID
  ) {

    throw new Error(
      `UID cliente inesperado. Esperado: ${CLIENT_UID} / Recibido: ${credential.user.uid}`
    );
  }
}


async function loginTechnician() {

  await signOut(
    auth
  );


  const credential =
    await signInWithEmailAndPassword(
      auth,
      TECHNICIAN_EMAIL,
      TECHNICIAN_PASSWORD
    );


  if (
    credential.user.uid !==
    TECHNICIAN_UID
  ) {

    throw new Error(
      `UID tecnico inesperado. Esperado: ${TECHNICIAN_UID} / Recibido: ${credential.user.uid}`
    );
  }
}


/*
 * ============================================================
 * CALLABLE
 * ============================================================
 */

const cancelService =
  httpsCallable(
    functions,
    'cancelService'
  );


async function callCancel(
  requestId,
  reason
) {

  const response =
    await cancelService({
      requestId,
      reason
    });


  return response.data;
}


/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function errorCode(
  error
) {

  return (
    error?.code
    ??
    ''
  );
}


async function expectError(
  callback,
  expectedCode
) {

  try {

    await callback();


    return {

      ok:
        false,

      message:
        'La operacion fue permitida cuando debia ser bloqueada.'
    };


  } catch (error) {


    const receivedCode =
      errorCode(
        error
      );


    if (
      receivedCode ===
      expectedCode
    ) {

      return {
        ok:
          true
      };
    }


    return {

      ok:
        false,

      message:
        `Codigo inesperado. Esperado: ${expectedCode} / Recibido: ${receivedCode || '(vacio)'}`,

      error
    };
  }
}


/*
 * ============================================================
 * LIMPIEZA
 * ============================================================
 */

async function cleanup() {


  for (
    const requestId
    of Object.values(
      IDS
    )
  ) {

    try {

      await adminDb
        .collection(
          'serviceRequests'
        )
        .doc(
          requestId
        )
        .delete();


    } catch (error) {

      console.warn(
        `[cleanup] serviceRequests/${requestId}:`,
        error instanceof Error
          ? error.message
          : String(
              error
            )
      );
    }
  }


  try {

    await adminDb
      .collection(
        'technicianLocations'
      )
      .doc(
        TECHNICIAN_UID
      )
      .delete();


  } catch (error) {

    console.warn(
      '[cleanup] technicianLocations:',
      error instanceof Error
        ? error.message
        : String(
            error
          )
    );
  }
}


/*
 * ============================================================
 * TEST PRINCIPAL
 * ============================================================
 */

async function run() {


  let testsPassed =
    0;


  let testsFailed =
    0;


  function pass(
    message
  ) {

    testsPassed +=
      1;


    console.log(
      `   PASS - ${message}`
    );
  }


  function fail(
    message,
    error =
      null
  ) {

    testsFailed +=
      1;


    console.error(
      `   FAIL - ${message}`
    );


    if (
      error
    ) {

      console.error(
        error
      );
    }
  }


  console.log('');
  console.log(
    '=============================================='
  );
  console.log(
    ' ServiGo - Cancel Service Security Test V2'
  );
  console.log(
    '=============================================='
  );
  console.log('');


  /*
   * Limpieza inicial.
   */

  await cleanup();


  try {


    /*
     * =========================================
     * 1. CLIENTE CANCELA PUBLISHED
     * =========================================
     */

    console.log(
      '1. Cliente cancela solicitud published...'
    );


    await putRequest(
      IDS.publishedClient,
      baseRequest(
        IDS.publishedClient,
        'published'
      )
    );


    await loginClient();


    const publishedResult =
      await callCancel(
        IDS.publishedClient,
        'Ya no necesito el servicio.'
      );


    const publishedSnapshot =
      await getRequest(
        IDS.publishedClient
      );


    const publishedData =
      publishedSnapshot.data();


    if (
      publishedResult?.ok ===
        true
      &&
      publishedResult?.status ===
        'cancelled'
      &&
      publishedSnapshot.exists
      &&
      publishedData?.[
        'status'
      ] ===
        'cancelled'
      &&
      publishedData?.[
        'previousStatus'
      ] ===
        'published'
      &&
      publishedData?.[
        'cancelledBy'
      ] ===
        'client'
      &&
      publishedData?.[
        'cancelledByUserId'
      ] ===
        CLIENT_UID
      &&
      publishedData?.[
        'cancellationReason'
      ] ===
        'Ya no necesito el servicio.'
    ) {

      pass(
        'Cliente propietario cancela published y queda auditoria.'
      );


    } else {

      fail(
        'La cancelacion published no dejo estado/auditoria esperados.'
      );
    }


    /*
     * =========================================
     * 2. TECNICO NO ASIGNADO BLOQUEADO
     * =========================================
     */

    console.log('');
    console.log(
      '2. Tecnico intenta cancelar antes de estar asignado...'
    );


    await putRequest(
      IDS.technicianBeforeAssignment,
      baseRequest(
        IDS.technicianBeforeAssignment,
        'quoted'
      )
    );


    await loginTechnician();


    const unauthorizedTechnician =
      await expectError(
        () =>
          callCancel(
            IDS.technicianBeforeAssignment,
            'No puedo realizar este servicio.'
          ),
        'functions/permission-denied'
      );


    if (
      unauthorizedTechnician.ok
    ) {

      pass(
        'Tecnico no asignado fue bloqueado.'
      );


    } else {

      fail(
        unauthorizedTechnician.message,
        unauthorizedTechnician.error
      );
    }


    /*
     * =========================================
     * 3. CLIENTE CANCELA ACCEPTED
     * =========================================
     */

    console.log('');
    console.log(
      '3. Cliente cancela servicio accepted...'
    );


    await putRequest(
      IDS.acceptedClient,
      baseRequest(
        IDS.acceptedClient,
        'accepted',
        {
          assignedTechnicianId:
            TECHNICIAN_UID,

          acceptedQuoteId:
            'cancel_test_quote_client'
        }
      )
    );


    await loginClient();


    const acceptedClientResult =
      await callCancel(
        IDS.acceptedClient,
        'Necesito cancelar la visita.'
      );


    const acceptedClientSnapshot =
      await getRequest(
        IDS.acceptedClient
      );


    const acceptedClientData =
      acceptedClientSnapshot.data();


    if (
      acceptedClientResult?.status ===
        'cancelled'
      &&
      acceptedClientData?.[
        'status'
      ] ===
        'cancelled'
      &&
      acceptedClientData?.[
        'previousStatus'
      ] ===
        'accepted'
      &&
      acceptedClientData?.[
        'cancelledBy'
      ] ===
        'client'
      &&
      acceptedClientData?.[
        'assignedTechnicianId'
      ] ===
        TECHNICIAN_UID
      &&
      acceptedClientData?.[
        'acceptedQuoteId'
      ] ===
        'cancel_test_quote_client'
    ) {

      pass(
        'Cliente cancela accepted conservando tecnico y presupuesto.'
      );


    } else {

      fail(
        'La cancelacion accepted del cliente no fue consistente.'
      );
    }


    /*
     * =========================================
     * 4. TECNICO CANCELA ACCEPTED
     * =========================================
     */

    console.log('');
    console.log(
      '4. Tecnico asignado cancela servicio accepted...'
    );


    await putRequest(
      IDS.acceptedTechnician,
      baseRequest(
        IDS.acceptedTechnician,
        'accepted',
        {
          assignedTechnicianId:
            TECHNICIAN_UID,

          acceptedQuoteId:
            'cancel_test_quote_technician'
        }
      )
    );


    await loginTechnician();


    const acceptedTechnicianResult =
      await callCancel(
        IDS.acceptedTechnician,
        'No podre asistir al servicio.'
      );


    const acceptedTechnicianSnapshot =
      await getRequest(
        IDS.acceptedTechnician
      );


    const acceptedTechnicianData =
      acceptedTechnicianSnapshot.data();


    if (
      acceptedTechnicianResult?.status ===
        'cancelled'
      &&
      acceptedTechnicianData?.[
        'status'
      ] ===
        'cancelled'
      &&
      acceptedTechnicianData?.[
        'previousStatus'
      ] ===
        'accepted'
      &&
      acceptedTechnicianData?.[
        'cancelledBy'
      ] ===
        'technician'
      &&
      acceptedTechnicianData?.[
        'cancelledByUserId'
      ] ===
        TECHNICIAN_UID
    ) {

      pass(
        'Tecnico asignado puede cancelar accepted.'
      );


    } else {

      fail(
        'La cancelacion accepted del tecnico no fue consistente.'
      );
    }


    /*
     * =========================================
     * 5. CLIENTE CANCELA EN_ROUTE
     * =========================================
     */

    console.log('');
    console.log(
      '5. Cliente cancela servicio en_route...'
    );


    await putRequest(
      IDS.enRouteClient,
      baseRequest(
        IDS.enRouteClient,
        'en_route',
        {
          assignedTechnicianId:
            TECHNICIAN_UID,

          acceptedQuoteId:
            'cancel_test_quote_en_route'
        }
      )
    );


    await putTechnicianLocation(
      IDS.enRouteClient
    );


    await loginClient();


    const enRouteResult =
      await callCancel(
        IDS.enRouteClient,
        'Necesito cancelar antes de la llegada.'
      );


    const enRouteSnapshot =
      await getRequest(
        IDS.enRouteClient
      );


    const enRouteData =
      enRouteSnapshot.data();


    if (
      enRouteResult?.status ===
        'cancelled'
      &&
      enRouteData?.[
        'status'
      ] ===
        'cancelled'
      &&
      enRouteData?.[
        'previousStatus'
      ] ===
        'en_route'
    ) {

      pass(
        'Cliente puede cancelar en_route.'
      );


    } else {

      fail(
        'La cancelacion en_route no produjo el estado esperado.'
      );
    }


    /*
     * =========================================
     * 6. GPS ELIMINADO
     * =========================================
     */

    console.log('');
    console.log(
      '6. Verificando eliminacion de ubicacion compartida...'
    );


    const locationSnapshot =
      await getTechnicianLocation();


    if (
      !locationSnapshot.exists
    ) {

      pass(
        'technicianLocations fue eliminado por privacidad.'
      );


    } else {

      fail(
        'La ubicacion del tecnico sigue existiendo despues de cancelar.'
      );
    }


    /*
     * =========================================
     * 7. IN_PROGRESS BLOQUEADO
     * =========================================
     */

    console.log('');
    console.log(
      '7. Cliente intenta cancelar in_progress...'
    );


    await putRequest(
      IDS.inProgress,
      baseRequest(
        IDS.inProgress,
        'in_progress',
        {
          assignedTechnicianId:
            TECHNICIAN_UID,

          acceptedQuoteId:
            'cancel_test_quote_in_progress'
        }
      )
    );


    await loginClient();


    const inProgressResult =
      await expectError(
        () =>
          callCancel(
            IDS.inProgress,
            'Quiero cancelar el trabajo iniciado.'
          ),
        'functions/failed-precondition'
      );


    if (
      inProgressResult.ok
    ) {

      pass(
        'Cancelacion in_progress fue bloqueada.'
      );


    } else {

      fail(
        inProgressResult.message,
        inProgressResult.error
      );
    }


    /*
     * =========================================
     * 8. COMPLETED BLOQUEADO
     * =========================================
     */

    console.log('');
    console.log(
      '8. Cliente intenta cancelar completed...'
    );


    await putRequest(
      IDS.completed,
      baseRequest(
        IDS.completed,
        'completed',
        {
          assignedTechnicianId:
            TECHNICIAN_UID,

          acceptedQuoteId:
            'cancel_test_quote_completed'
        }
      )
    );


    await loginClient();


    const completedResult =
      await expectError(
        () =>
          callCancel(
            IDS.completed,
            'Quiero cancelar un servicio terminado.'
          ),
        'functions/failed-precondition'
      );


    if (
      completedResult.ok
    ) {

      pass(
        'Cancelacion completed fue bloqueada.'
      );


    } else {

      fail(
        completedResult.message,
        completedResult.error
      );
    }


    /*
     * =========================================
     * 9. DOBLE CANCELACION BLOQUEADA
     * =========================================
     */

    console.log('');
    console.log(
      '9. Cliente intenta cancelar un servicio ya cancelled...'
    );


    await putRequest(
      IDS.alreadyCancelled,
      {
        ...baseRequest(
          IDS.alreadyCancelled,
          'cancelled',
          {
            assignedTechnicianId:
              TECHNICIAN_UID,

            acceptedQuoteId:
              'cancel_test_quote_cancelled'
          }
        ),

        previousStatus:
          'accepted',

        cancelledAt:
          admin.firestore.FieldValue
            .serverTimestamp(),

        cancelledBy:
          'client',

        cancelledByUserId:
          CLIENT_UID,

        cancellationReason:
          'Cancelacion anterior.'
      }
    );


    await loginClient();


    const alreadyCancelledResult =
      await expectError(
        () =>
          callCancel(
            IDS.alreadyCancelled,
            'Intento cancelar nuevamente.'
          ),
        'functions/failed-precondition'
      );


    if (
      alreadyCancelledResult.ok
    ) {

      pass(
        'Doble cancelacion fue bloqueada.'
      );


    } else {

      fail(
        alreadyCancelledResult.message,
        alreadyCancelledResult.error
      );
    }


    /*
     * =========================================
     * 10. MOTIVO CORTO BLOQUEADO
     * =========================================
     */

    console.log('');
    console.log(
      '10. Cliente intenta cancelar con motivo invalido...'
    );


    await putRequest(
      IDS.shortReason,
      baseRequest(
        IDS.shortReason,
        'published'
      )
    );


    await loginClient();


    const shortReasonResult =
      await expectError(
        () =>
          callCancel(
            IDS.shortReason,
            'No'
          ),
        'functions/invalid-argument'
      );


    if (
      shortReasonResult.ok
    ) {

      pass(
        'Motivo demasiado corto fue bloqueado.'
      );


    } else {

      fail(
        shortReasonResult.message,
        shortReasonResult.error
      );
    }


    /*
     * =========================================
     * 11. INTENTO BLOQUEADO NO MODIFICA
     * =========================================
     */

    console.log('');
    console.log(
      '11. Verificando que un intento bloqueado no modifique el servicio...'
    );


    const blockedSnapshot =
      await getRequest(
        IDS.inProgress
      );


    const blockedData =
      blockedSnapshot.data();


    if (
      blockedSnapshot.exists
      &&
      blockedData?.[
        'status'
      ] ===
        'in_progress'
      &&
      blockedData?.[
        'cancelledAt'
      ] ===
        undefined
      &&
      blockedData?.[
        'cancelledBy'
      ] ===
        undefined
    ) {

      pass(
        'Intento bloqueado no altero el documento.'
      );


    } else {

      fail(
        'Un intento de cancelacion bloqueado modifico el servicio.'
      );
    }


  } catch (error) {

    fail(
      'Error general inesperado durante la bateria de pruebas.',
      error
    );


  } finally {


    console.log('');
    console.log(
      'Limpiando fixtures temporales...'
    );


    await cleanup();


    try {

      await signOut(
        auth
      );

    } catch {
      // Sin accion adicional.
    }


    try {

      await adminApp
        .delete();

    } catch {
      // Sin accion adicional.
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
    ' RESULTADO'
  );
  console.log(
    '=============================================='
  );


  console.log(
    ` PASS: ${testsPassed}`
  );


  console.log(
    ` FAIL: ${testsFailed}`
  );


  console.log('');


  if (
    testsFailed ===
    0
  ) {

    console.log(
      ' CANCEL SERVICE: OK'
    );


    console.log(
      ' Todas las pruebas finalizaron correctamente.'
    );


  } else {

    console.error(
      ' CANCEL SERVICE: FAIL'
    );


    console.error(
      ' Existen pruebas que requieren revision.'
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
 * =========================================
 * EJECUCION
 * =========================================
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

        await cleanup();

      } catch {
        // Sin accion adicional.
      }


      try {

        await adminApp
          .delete();

      } catch {
        // Sin accion adicional.
      }


      process.exitCode =
        1;
    }
  );