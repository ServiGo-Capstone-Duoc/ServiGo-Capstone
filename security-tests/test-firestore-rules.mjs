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
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  setDoc,
  updateDoc,
  where,
  collection
} from 'firebase/firestore';


/*
 * =========================================
 * CONFIGURACIÓN
 * =========================================
 */

const firebaseConfig = {

  apiKey:
    'demo-key',

  authDomain:
    'servigo-dev.firebaseapp.com',

  projectId:
    'servigo-dev'
};


/*
 * =========================================
 * USUARIOS TEST
 * =========================================
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
 * Usuario ficticio para intentar escribir
 * una ubicación con otro UID.
 */

const FOREIGN_TECHNICIAN_UID =
  'usuario-tecnico-ajeno';


const OPPORTUNITY_ID =
  'EZogxRRHudxR1VUbSB5IWRtKPjqt_Mp2Nx41E25SD58yTYwD8';


/*
 * =========================================
 * CREAR CONTEXTO FIREBASE
 * =========================================
 *
 * Cada usuario necesita su propia instancia.
 */

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
 * =========================================
 * HELPERS
 * =========================================
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

  console.log(
    `   PASS - ${message}`
  );


  counters.passed +=
    1;
}


function fail(
  message,
  counters,
  error = null
) {

  console.error(
    `   FAIL - ${message}`
  );


  if (
    error
  ) {

    console.error(
      '   Código:',
      error?.code
    );


    console.error(
      '   Error:',
      error?.message
    );
  }


  counters.failed +=
    1;
}


/*
 * =========================================
 * TEST PRINCIPAL
 * =========================================
 */

async function run() {


  const counters = {

    passed:
      0,

    failed:
      0
  };


  const clientContext =
    createFirebaseContext(
      'servigo-security-client'
    );


  const technicianContext =
    createFirebaseContext(
      'servigo-security-technician'
    );


  console.log('');

  console.log(
    '=============================================='
  );

  console.log(
    ' ServiGo - Firestore Security Test'
  );

  console.log(
    '=============================================='
  );


  /*
   * =====================================
   * AUTENTICACIÓN CLIENTE
   * =====================================
   */

  console.log('');

  console.log(
    '1. Autenticando Cliente Test...'
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
    '   OK - UID:',
    clientCredential.user.uid
  );


  /*
   * =====================================
   * AUTENTICACIÓN TÉCNICO
   * =====================================
   */

  console.log('');

  console.log(
    '2. Autenticando Técnico Test...'
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
    '   OK - UID:',
    technicianCredential.user.uid
  );


  /*
   * =====================================
   * PERFIL PROPIO
   * =====================================
   */

  console.log('');

  console.log(
    '3. Cliente lee SU perfil...'
  );


  try {

    const snapshot =
      await getDoc(
        doc(
          clientContext.firestore,
          'users',
          CLIENT_UID
        )
      );


    if (
      snapshot.exists()
    ) {

      pass(
        'Acceso propio permitido.',
        counters
      );


    } else {

      fail(
        'El perfil propio no existe.',
        counters
      );
    }


  } catch (error) {

    fail(
      'Cliente no pudo leer su perfil.',
      counters,
      error
    );
  }


  /*
   * =====================================
   * PERFIL DEL TÉCNICO
   * =====================================
   */

  console.log('');

  console.log(
    '4. Cliente intenta leer perfil del técnico...'
  );


  try {

    await getDoc(
      doc(
        clientContext.firestore,
        'users',
        TECHNICIAN_UID
      )
    );


    fail(
      'Firestore permitió leer perfil ajeno.',
      counters
    );


  } catch (error) {

    if (
      isPermissionDenied(
        error
      )
    ) {

      pass(
        'Perfil técnico protegido.',
        counters
      );


    } else {

      fail(
        'Error inesperado.',
        counters,
        error
      );
    }
  }


  /*
   * =====================================
   * OPORTUNIDAD DEL TÉCNICO
   * =====================================
   */

  console.log('');

  console.log(
    '5. Cliente intenta leer oportunidad del técnico...'
  );


  try {

    await getDoc(
      doc(
        clientContext.firestore,
        'technicianOpportunities',
        OPPORTUNITY_ID
      )
    );


    fail(
      'Firestore permitió leer oportunidad ajena.',
      counters
    );


  } catch (error) {

    if (
      isPermissionDenied(
        error
      )
    ) {

      pass(
        'Oportunidad técnica protegida.',
        counters
      );


    } else {

      fail(
        'Error inesperado.',
        counters,
        error
      );
    }
  }


  /*
   * =====================================
   * LOCALIZAR TRABAJO EN_ROUTE
   * =====================================
   */

  console.log('');

  console.log(
    '6. Buscando trabajo en estado en_route...'
  );


  const jobsQuery =
    query(
      collection(
        technicianContext.firestore,
        'serviceRequests'
      ),

      where(
        'assignedTechnicianId',
        '==',
        TECHNICIAN_UID
      ),

      where(
        'status',
        '==',
        'en_route'
      )
    );


  const jobsSnapshot =
    await getDocs(
      jobsQuery
    );


  if (
    jobsSnapshot.empty
  ) {

    console.log('');

    console.log(
      '   ATENCIÓN: no existe un trabajo en_route.'
    );


    console.log(
      '   Para ejecutar las pruebas GPS:'
    );


    console.log(
      '   1. Entra como Técnico Test.'
    );


    console.log(
      '   2. Abre un trabajo accepted.'
    );


    console.log(
      '   3. Pulsa "Ir al domicilio".'
    );


    console.log(
      '   4. NO pulses "He llegado".'
    );


    console.log(
      '   5. Ejecuta nuevamente este test.'
    );


    console.log('');

    console.log(
      '   Las pruebas generales anteriores sí fueron ejecutadas.'
    );


    await deleteApp(
      clientContext.app
    );


    await deleteApp(
      technicianContext.app
    );


    return;
  }


  const jobDocument =
    jobsSnapshot.docs[0];


  const requestId =
    jobDocument.id;


  console.log(
    '   OK - Trabajo:',
    requestId
  );


  /*
   * =====================================
   * REFERENCIA UBICACIÓN
   * =====================================
   */

  const technicianLocationRef =
    doc(
      technicianContext.firestore,
      'technicianLocations',
      TECHNICIAN_UID
    );


  /*
   * =====================================
   * LIMPIEZA PREVIA
   * =====================================
   */

  try {

    await deleteDoc(
      technicianLocationRef
    );

  } catch {

    /*
     * Puede no existir.
     */
  }


  /*
   * =====================================
   * TÉCNICO CREA SU UBICACIÓN
   * =====================================
   */

  console.log('');

  console.log(
    '7. Técnico publica SU ubicación...'
  );


  try {

    await setDoc(
      technicianLocationRef,
      {

        technicianId:
          TECHNICIAN_UID,

        requestId,

        latitude:
          -33.4489,

        longitude:
          -70.6693,

        accuracy:
          10,

        heading:
          0,

        speed:
          0,

        active:
          true,

        updatedAt:
          new Date()
      }
    );


    pass(
      'Técnico puede publicar su ubicación.',
      counters
    );


  } catch (error) {

    fail(
      'Técnico no pudo publicar su ubicación.',
      counters,
      error
    );
  }


  /*
   * =====================================
   * CLIENTE LEE UBICACIÓN
   * =====================================
   */

  console.log('');

  console.log(
    '8. Cliente propietario lee ubicación...'
  );


  try {

    const snapshot =
      await getDoc(
        doc(
          clientContext.firestore,
          'technicianLocations',
          TECHNICIAN_UID
        )
      );


    if (
      snapshot.exists()
    ) {

      pass(
        'Cliente propietario puede ver ubicación.',
        counters
      );


    } else {

      fail(
        'Documento de ubicación no existe.',
        counters
      );
    }


  } catch (error) {

    fail(
      'Cliente propietario no pudo leer ubicación.',
      counters,
      error
    );
  }


  /*
   * =====================================
   * CLIENTE INTENTA MODIFICAR
   * =====================================
   */

  console.log('');

  console.log(
    '9. Cliente intenta modificar ubicación...'
  );


  try {

    await updateDoc(
      doc(
        clientContext.firestore,
        'technicianLocations',
        TECHNICIAN_UID
      ),
      {
        latitude:
          -33.45
      }
    );


    fail(
      'Cliente pudo modificar ubicación.',
      counters
    );


  } catch (error) {

    if (
      isPermissionDenied(
        error
      )
    ) {

      pass(
        'Cliente no puede modificar ubicación.',
        counters
      );


    } else {

      fail(
        'Error inesperado.',
        counters,
        error
      );
    }
  }


  /*
   * =====================================
   * TÉCNICO CAMBIA REQUEST ID
   * =====================================
   */

  console.log('');

  console.log(
    '10. Técnico intenta cambiar requestId...'
  );


  try {

    await updateDoc(
      technicianLocationRef,
      {
        requestId:
          'request-fraudulento'
      }
    );


    fail(
      'Técnico pudo cambiar requestId.',
      counters
    );


  } catch (error) {

    if (
      isPermissionDenied(
        error
      )
    ) {

      pass(
        'requestId protegido.',
        counters
      );


    } else {

      fail(
        'Error inesperado.',
        counters,
        error
      );
    }
  }


  /*
   * =====================================
   * COORDENADA INVÁLIDA
   * =====================================
   */

  console.log('');

  console.log(
    '11. Técnico intenta guardar latitude=999...'
  );


  try {

    await updateDoc(
      technicianLocationRef,
      {
        latitude:
          999
      }
    );


    fail(
      'Firestore aceptó coordenada inválida.',
      counters
    );


  } catch (error) {

    if (
      isPermissionDenied(
        error
      )
    ) {

      pass(
        'Coordenada inválida bloqueada.',
        counters
      );


    } else {

      fail(
        'Error inesperado.',
        counters,
        error
      );
    }
  }


  /*
   * =====================================
   * DOCUMENTO DE OTRO TÉCNICO
   * =====================================
   */

  console.log('');

  console.log(
    '12. Técnico intenta escribir ubicación de otro UID...'
  );


  try {

    await setDoc(
      doc(
        technicianContext.firestore,
        'technicianLocations',
        FOREIGN_TECHNICIAN_UID
      ),
      {

        technicianId:
          FOREIGN_TECHNICIAN_UID,

        requestId,

        latitude:
          -33.4489,

        longitude:
          -70.6693,

        accuracy:
          10,

        heading:
          0,

        speed:
          0,

        active:
          true,

        updatedAt:
          new Date()
      }
    );


    fail(
      'Técnico pudo escribir ubicación ajena.',
      counters
    );


  } catch (error) {

    if (
      isPermissionDenied(
        error
      )
    ) {

      pass(
        'Ubicación de otro UID protegida.',
        counters
      );


    } else {

      fail(
        'Error inesperado.',
        counters,
        error
      );
    }
  }


  /*
   * =====================================
   * ACTUALIZACIÓN LEGÍTIMA
   * =====================================
   */

  console.log('');

  console.log(
    '13. Técnico actualiza su posición...'
  );


  try {

    await updateDoc(
      technicianLocationRef,
      {

        latitude:
          -33.4495,

        longitude:
          -70.6685,

        accuracy:
          8,

        heading:
          45,

        speed:
          6,

        active:
          true,

        updatedAt:
          new Date()
      }
    );


    pass(
      'Actualización GPS legítima permitida.',
      counters
    );


  } catch (error) {

    fail(
      'Actualización GPS legítima bloqueada.',
      counters,
      error
    );
  }


  /*
   * =====================================
   * TÉCNICO ELIMINA UBICACIÓN
   * =====================================
   */

  console.log('');

  console.log(
    '14. Técnico elimina ubicación compartida...'
  );


  try {

    await deleteDoc(
      technicianLocationRef
    );


    pass(
      'Técnico puede retirar su ubicación.',
      counters
    );


  } catch (error) {

    fail(
      'No se pudo retirar ubicación.',
      counters,
      error
    );
  }


  /*
   * =====================================
   * RESULTADO
   * =====================================
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
      ' SEGURIDAD FIRESTORE: OK'
    );


  } else {

    console.error(
      ' SEGURIDAD FIRESTORE: FAIL'
    );


    process.exitCode =
      1;
  }


  /*
   * =====================================
   * CERRAR APPS
   * =====================================
   */

  await deleteApp(
    clientContext.app
  );


  await deleteApp(
    technicianContext.app
  );


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
 * EJECUCIÓN
 * =========================================
 */

run()
  .catch(
    error => {

      console.error('');

      console.error(
        'ERROR GENERAL:'
      );


      console.error(
        error
      );


      process.exitCode =
        1;
    }
  );