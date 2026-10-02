const {
  initializeApp
} = require('firebase-admin/app');

const {
  getFirestore,
  Timestamp
} = require('firebase-admin/firestore');


/*
 * =========================================
 * PROTECCIÓN
 * =========================================
 *
 * Este script SOLO puede ejecutarse
 * contra Firestore Emulator.
 *
 * Si FIRESTORE_EMULATOR_HOST no existe,
 * cancelamos inmediatamente para evitar
 * escribir accidentalmente en producción.
 * =========================================
 */

if (!process.env.FIRESTORE_EMULATOR_HOST) {

  console.error(
    '[ServiGo Seed] ERROR: FIRESTORE_EMULATOR_HOST no está definido.'
  );

  console.error(
    '[ServiGo Seed] Ejecución cancelada para proteger Firestore real.'
  );

  process.exit(1);
}


console.log(
  '[ServiGo Seed] Firestore Emulator:',
  process.env.FIRESTORE_EMULATOR_HOST
);


/*
 * =========================================
 * FIREBASE ADMIN
 * =========================================
 */

initializeApp({
  projectId:
    'servigo-dev'
});


const db =
  getFirestore();


/*
 * =========================================
 * SEED
 * =========================================
 */

async function seed() {


  /*
   * -----------------------------------------
   * IDENTIFICADORES
   * -----------------------------------------
   */

  const technicianId =
    'virgilio-test';


  const clientId =
    'julio-test';


  const applicationId =
    'application-virgilio-test';


  /*
   * =========================================
   * USUARIO TÉCNICO
   * =========================================
   */

  await db
    .collection(
      'users'
    )
    .doc(
      technicianId
    )
    .set({

      uid:
        technicianId,

      displayName:
        'Virgilio Test',

      email:
        'virgilio@test.servigo.cl',

      roles: [
        'cliente',
        'tecnico'
      ],

      status:
        'active',

      /*
       * Técnico nuevo.
       *
       * Esto permite probar nuestra regla:
       *
       * ratingCount === 0
       * → eligibleForPush = true
       */

      averageRating:
        null,

      ratingCount:
        0,

      createdAt:
        Timestamp.now(),

      updatedAt:
        Timestamp.now()
    });


  console.log(
    '[ServiGo Seed] Técnico creado:',
    technicianId
  );


  /*
   * =========================================
   * USUARIO CLIENTE
   * =========================================
   */

  await db
    .collection(
      'users'
    )
    .doc(
      clientId
    )
    .set({

      uid:
        clientId,

      displayName:
        'Julio Test',

      email:
        'julio@test.servigo.cl',

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
        Timestamp.now(),

      updatedAt:
        Timestamp.now()
    });


  console.log(
    '[ServiGo Seed] Cliente creado:',
    clientId
  );


  /*
   * =========================================
   * POSTULACIÓN TÉCNICA APROBADA
   * =========================================
   *
   * Esto simula que Virgilio ya pasó
   * por el proceso administrativo y fue
   * aprobado como técnico.
   */

  await db
    .collection(
      'technicianApplications'
    )
    .doc(
      applicationId
    )
    .set({

      id:
        applicationId,

      userId:
        technicianId,

      fullName:
        'Virgilio Test',

      rut:
        '11.111.111-1',

      phone:
        '+56911111111',

      experienceYears:
        5,

      experienceDescription:
        'Técnico de prueba para validar el motor de matching de ServiGo.',

      specialties: [
        'Electricidad'
      ],

      baseCommune:
        'Puente Alto',

      serviceRadiusKm:
        10,

      hasIdentification:
        true,

      hasCertifications:
        false,

      termsAccepted:
        true,

      status:
        'approved',

      reviewedBy:
        'admin-test',

      reviewedAt:
        Timestamp.now(),

      rejectionReason:
        null,

      createdAt:
        Timestamp.now(),

      updatedAt:
        Timestamp.now()
    });


  console.log(
    '[ServiGo Seed] Postulación aprobada creada:',
    applicationId
  );


  /*
   * =========================================
   * RESUMEN
   * =========================================
   */

  console.log('');
  console.log(
    '========================================='
  );

  console.log(
    ' SERVIGO EMULATOR SEED COMPLETADO'
  );

  console.log(
    '========================================='
  );

  console.log(
    'Técnico:',
    technicianId
  );

  console.log(
    'Cliente:',
    clientId
  );

  console.log(
    'Especialidad: Electricidad'
  );

  console.log(
    'Comuna base: Puente Alto'
  );

  console.log(
    'Rating: nuevo técnico (0 evaluaciones)'
  );

  console.log(
    '========================================='
  );
}


/*
 * =========================================
 * EJECUCIÓN
 * =========================================
 */

seed()

  .then(
    () => {

      console.log(
        '[ServiGo Seed] Finalizado correctamente.'
      );

      process.exit(0);
    }
  )

  .catch(
    error => {

      console.error(
        '[ServiGo Seed] ERROR:',
        error
      );

      process.exit(1);
    }
  );