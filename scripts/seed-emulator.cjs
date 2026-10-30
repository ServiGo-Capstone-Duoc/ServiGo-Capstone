const {
  initializeApp
} = require('firebase-admin/app');

const {
  getAuth
} = require('firebase-admin/auth');

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
 * contra Firebase Emulator Suite.
 *
 * Exigimos:
 *
 * - Authentication Emulator
 * - Firestore Emulator
 *
 * Si falta cualquiera, cancelamos.
 */

if (
  !process.env.FIRESTORE_EMULATOR_HOST
) {

  console.error(
    '[ServiGo Seed] ERROR: FIRESTORE_EMULATOR_HOST no está definido.'
  );

  console.error(
    '[ServiGo Seed] Ejecución cancelada para proteger Firestore real.'
  );

  process.exit(1);
}


if (
  !process.env.FIREBASE_AUTH_EMULATOR_HOST
) {

  console.error(
    '[ServiGo Seed] ERROR: FIREBASE_AUTH_EMULATOR_HOST no está definido.'
  );

  console.error(
    '[ServiGo Seed] Ejecución cancelada para proteger Authentication real.'
  );

  process.exit(1);
}


console.log(
  '[ServiGo Seed] Firestore Emulator:',
  process.env.FIRESTORE_EMULATOR_HOST
);


console.log(
  '[ServiGo Seed] Authentication Emulator:',
  process.env.FIREBASE_AUTH_EMULATOR_HOST
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


const auth =
  getAuth();


/*
 * =========================================
 * CONFIGURACIÓN DE USUARIOS TEST
 * =========================================
 */

const TEST_PASSWORD =
  'ServiGo123!';


const CLIENT_EMAIL =
  'cliente@servigo.test';


const TECHNICIAN_EMAIL =
  'tecnico@servigo.test';


/*
 * =========================================
 * CREAR O RECUPERAR USUARIO AUTH
 * =========================================
 *
 * Esto permite ejecutar el seed varias
 * veces sin generar usuarios duplicados.
 */

async function ensureAuthUser(
  email,
  displayName
) {


  try {

    const existingUser =
      await auth
        .getUserByEmail(
          email
        );


    /*
     * Aseguramos que la contraseña
     * y nombre vuelvan al valor de test.
     */

    await auth.updateUser(
      existingUser.uid,
      {
        displayName,
        password:
          TEST_PASSWORD
      }
    );


    console.log(
      '[ServiGo Seed] Usuario Auth existente:',
      email,
      existingUser.uid
    );


    return existingUser;


  } catch (error) {


    if (
      error?.code !==
      'auth/user-not-found'
    ) {

      throw error;
    }


    const newUser =
      await auth.createUser({

        email,

        password:
          TEST_PASSWORD,

        displayName,

        emailVerified:
          true,

        disabled:
          false
      });


    console.log(
      '[ServiGo Seed] Usuario Auth creado:',
      email,
      newUser.uid
    );


    return newUser;
  }
}


/*
 * =========================================
 * SEED PRINCIPAL
 * =========================================
 */

async function seed() {


  console.log('');

  console.log(
    '========================================='
  );

  console.log(
    ' SERVIGO - INICIANDO SEED LOCAL'
  );

  console.log(
    '========================================='
  );


  /*
   * =========================================
   * 1. CREAR USUARIO CLIENTE EN AUTH
   * =========================================
   */

  const clientAuthUser =
    await ensureAuthUser(
      CLIENT_EMAIL,
      'Cliente Test'
    );


  const clientId =
    clientAuthUser.uid;


  /*
   * =========================================
   * 2. PERFIL CLIENTE EN FIRESTORE
   * =========================================
   */

  await db
    .collection(
      'users'
    )
    .doc(
      clientId
    )
    .set(
      {

        uid:
          clientId,

        email:
          CLIENT_EMAIL,

        displayName:
          'Cliente Test',

        phone:
          null,

        photoUrl:
          null,

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
          Timestamp.now(),

        lastLoginAt:
          Timestamp.now()
      },
      {
        merge:
          true
      }
    );


  console.log(
    '[ServiGo Seed] Perfil cliente creado:',
    clientId
  );


  /*
   * =========================================
   * 3. CREAR TÉCNICO EN AUTH
   * =========================================
   */

  const technicianAuthUser =
    await ensureAuthUser(
      TECHNICIAN_EMAIL,
      'Técnico Test'
    );


  const technicianId =
    technicianAuthUser.uid;


  /*
   * =========================================
   * 4. PERFIL TÉCNICO EN FIRESTORE
   * =========================================
   */

  await db
    .collection(
      'users'
    )
    .doc(
      technicianId
    )
    .set(
      {

        uid:
          technicianId,

        email:
          TECHNICIAN_EMAIL,

        displayName:
          'Técnico Test',

        phone:
          '+56911111111',

        photoUrl:
          null,

        roles: [
          'cliente',
          'tecnico'
        ],

        status:
          'active',

        /*
         * Técnico nuevo.
         *
         * Esto mantiene nuestra regla:
         *
         * ratingCount === 0
         * -> eligibleForPush = true
         */

        averageRating:
          null,

        ratingCount:
          0,

        createdAt:
          Timestamp.now(),

        updatedAt:
          Timestamp.now(),

        lastLoginAt:
          Timestamp.now()
      },
      {
        merge:
          true
      }
    );


  console.log(
    '[ServiGo Seed] Perfil técnico creado:',
    technicianId
  );


  /*
   * =========================================
   * 5. POSTULACIÓN TÉCNICA APROBADA
   * =========================================
   */

  const applicationId =
    `application-${technicianId}`;


  await db
    .collection(
      'technicianApplications'
    )
    .doc(
      applicationId
    )
    .set(
      {

        id:
          applicationId,

        userId:
          technicianId,

        fullName:
          'Técnico Test',

        rut:
          '11.111.111-1',

        phone:
          '+56911111111',

        experienceYears:
          5,

        experienceDescription:
          'Técnico de prueba para validar el flujo completo de ServiGo.',

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
      },
      {
        merge:
          true
      }
    );


  console.log(
    '[ServiGo Seed] Postulación técnica aprobada:',
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


  console.log('');

  console.log(
    'CLIENTE TEST'
  );

  console.log(
    'Email:',
    CLIENT_EMAIL
  );

  console.log(
    'Password:',
    TEST_PASSWORD
  );

  console.log(
    'UID:',
    clientId
  );


  console.log('');

  console.log(
    'TÉCNICO TEST'
  );

  console.log(
    'Email:',
    TECHNICIAN_EMAIL
  );

  console.log(
    'Password:',
    TEST_PASSWORD
  );

  console.log(
    'UID:',
    technicianId
  );


  console.log('');

  console.log(
    'Especialidad: Electricidad'
  );

  console.log(
    'Comuna: Puente Alto'
  );

  console.log(
    'Rating: nuevo técnico'
  );


  console.log('');

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