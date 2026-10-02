const {
  initializeApp
} = require('firebase-admin/app');

const {
  getFirestore,
  Timestamp
} = require('firebase-admin/firestore');


/*
 * SEGURIDAD:
 * jamás ejecutar este script
 * contra Firestore real.
 */

if (!process.env.FIRESTORE_EMULATOR_HOST) {

  console.error(
    '[ServiGo Test] FIRESTORE_EMULATOR_HOST no está definido.'
  );

  console.error(
    '[ServiGo Test] Ejecución cancelada.'
  );

  process.exit(1);
}


initializeApp({
  projectId:
    'servigo-dev'
});


const db =
  getFirestore();


async function createRequest() {

  const requestId =
    'request-test-001';


  await db
    .collection(
      'serviceRequests'
    )
    .doc(
      requestId
    )
    .set({

      id:
        requestId,

      clientId:
        'julio-test',

      clientName:
        'Julio Test',

      category:
        'Electricidad',

      description:
        'Necesito revisar una instalación eléctrica de prueba.',

      address:
        'Av. Test 1234',

      commune:
        'Puente Alto',

      latitude:
        null,

      longitude:
        null,

      preferredDate:
        Timestamp.now(),

      timeSlot:
        'Tarde',

      urgency:
        'urgent',

      photoUrls:
        [],

      status:
        'published',

      assignedTechnicianId:
        null,

      acceptedQuoteId:
        null,

      createdAt:
        Timestamp.now(),

      updatedAt:
        Timestamp.now()
    });


  console.log(
    '[ServiGo Test] Solicitud creada:',
    requestId
  );
}


createRequest()

  .then(
    () => {

      console.log(
        '[ServiGo Test] Finalizado.'
      );

      process.exit(0);
    }
  )

  .catch(
    error => {

      console.error(
        '[ServiGo Test] ERROR:',
        error
      );

      process.exit(1);
    }
  );
  