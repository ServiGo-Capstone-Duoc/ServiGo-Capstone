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

const emulatorProjectId =
  process.env.GCLOUD_PROJECT
  || process.env.GOOGLE_CLOUD_PROJECT
  || 'servigo-dev';

initializeApp({
  projectId:
    emulatorProjectId
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


const ADMIN_EMAIL =
  'admin@servigo.test';


const SERVICE_CATALOG = [
  ['gasfiteria-fugas', 'Hogar y Reparaciones Generales', 'Gasfitería y fugas de agua', 20000, 35000, 10],
  ['electricidad-basica', 'Hogar y Reparaciones Generales', 'Electricidad básica', 20000, 45000, 20],
  ['cerrajeria-accesos', 'Hogar y Reparaciones Generales', 'Cerrajería y accesos', 15000, 30000, 30],
  ['carpinteria-reparaciones', 'Hogar y Reparaciones Generales', 'Carpintería y reparaciones menores', 15000, 25000, 40],
  ['linea-blanca-mayor', 'Electrodomésticos y Línea Blanca', 'Lavadoras, secadoras y refrigeradores', 15000, 25000, 50],
  ['cocinas-hornos', 'Electrodomésticos y Línea Blanca', 'Cocinas, hornos y encimeras', 15000, 25000, 60],
  ['electrodomesticos-menores', 'Electrodomésticos y Línea Blanca', 'Electrodomésticos menores', 10000, 15000, 70],
  ['aire-acondicionado', 'Climatización y Calefacción', 'Aire acondicionado', 25000, 40000, 80],
  ['calefont-termos', 'Climatización y Calefacción', 'Calefont y termos eléctricos', 20000, 35000, 90],
  ['calderas-calefaccion', 'Climatización y Calefacción', 'Calderas y calefacción central', 30000, 50000, 100],
  ['soporte-computacional', 'Tecnología y Redes', 'Soporte computacional a domicilio', 20000, 35000, 110],
  ['redes-wifi', 'Tecnología y Redes', 'Redes Wi-Fi y cableado', 25000, 45000, 120],
  ['camaras-alarmas', 'Tecnología y Redes', 'Cámaras de seguridad y alarmas', 25000, 40000, 130],
  ['techumbres-impermeabilizacion', 'Construcción e Inspecciones Especializadas', 'Techumbres, canaletas e impermeabilización', 25000, 40000, 140],
  ['certificacion-electrica-te1', 'Construcción e Inspecciones Especializadas', 'Certificación eléctrica TE1 / SEC', 50000, 120000, 150],
  ['inspeccion-vivienda', 'Construcción e Inspecciones Especializadas', 'Inspección técnica de vivienda', 120000, 300000, 160]
];


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

        commune:
          'Puente Alto',

        address:
          'Av. Concha y Toro 1234',

        preferredContact:
          'chat',

        profileVersion:
          2,

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

        commune:
          'Puente Alto',

        address:
          null,

        preferredContact:
          'chat',

        profileVersion:
          2,

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
   * 6. PERFIL PROFESIONAL ADMINISTRADO
   * =========================================
   */

  await db
    .collection(
      'technicianProfiles'
    )
    .doc(
      technicianId
    )
    .set(
      {
        userId:
          technicianId,
        displayName:
          'Técnico Test',
        photoUrl:
          null,
        specialties: [
          'Electricidad'
        ],
        experienceYears:
          5,
        experienceDescription:
          'Técnico de prueba para validar el flujo completo de ServiGo.',
        baseCommune:
          'Puente Alto',
        serviceRadiusKm:
          10,
        hasCertifications:
          false,
        publicDescription:
          'Especialista en instalaciones y reparaciones eléctricas domiciliarias.',
        status:
          'active',
        accountStatus:
          'active',
        createdAt:
          Timestamp.now(),
        updatedAt:
          Timestamp.now(),
        createdBy:
          'admin-test',
        updatedBy:
          'admin-test',
        sourceApplicationId:
          applicationId
      },
      {
        merge:
          true
      }
    );


  console.log(
    '[ServiGo Seed] Perfil profesional creado:',
    technicianId
  );


  /*
   * =========================================
   * 7. USUARIO ADMINISTRADOR DE PRUEBA
   * =========================================
   */

  const adminAuthUser =
    await ensureAuthUser(
      ADMIN_EMAIL,
      'Administrador Test'
    );


  await db
    .collection(
      'users'
    )
    .doc(
      adminAuthUser.uid
    )
    .set(
      {
        uid:
          adminAuthUser.uid,
        email:
          ADMIN_EMAIL,
        displayName:
          'Administrador Test',
        phone:
          null,
        photoUrl:
          null,
        commune:
          null,
        address:
          null,
        preferredContact:
          'email',
        profileVersion:
          2,
        roles: [
          'cliente',
          'administrador'
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
    '[ServiGo Seed] Administrador de prueba creado:',
    adminAuthUser.uid
  );


  /*
   * =========================================
   * 8. TARIFARIO EDITABLE
   * =========================================
   */

  for (const [id, group, name, visitFeeMin, visitFeeMax, sortOrder] of SERVICE_CATALOG) {
    await db
      .collection('serviceCatalog')
      .doc(id)
      .set(
        {
          id,
          group,
          name,
          visitFeeMin,
          visitFeeMax,
          active: true,
          sortOrder,
          updatedAt: Timestamp.now()
        },
        { merge: true }
      );
  }

  console.log(
    '[ServiGo Seed] Tarifario cargado:',
    SERVICE_CATALOG.length,
    'categorías'
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
    'ADMINISTRADOR TEST'
  );

  console.log(
    'Email:',
    ADMIN_EMAIL
  );

  console.log(
    'Password:',
    TEST_PASSWORD
  );

  console.log(
    'UID:',
    adminAuthUser.uid
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