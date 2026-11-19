import {
  createRequire
} from 'node:module';

import {
  deleteApp,
  initializeApp
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
  getFirestore,
  serverTimestamp,
  Timestamp,
  setDoc,
  updateDoc,
  writeBatch
} from 'firebase/firestore';

const require =
  createRequire(
    import.meta.url
  );

const admin =
  require(
    '../functions/node_modules/firebase-admin'
  );

process.env['FIRESTORE_EMULATOR_HOST'] =
  '127.0.0.1:8080';
process.env['FIREBASE_AUTH_EMULATOR_HOST'] =
  '127.0.0.1:9099';

const projectId =
  'servigo-dev';

const firebaseConfig = {
  apiKey: 'demo-key',
  authDomain: `${projectId}.firebaseapp.com`,
  projectId
};

const identities = {
  client: {
    uid: 'profile_security_client',
    email: 'profile-security-client@servigo.test',
    password: 'ServiGo123!'
  },
  technician: {
    uid: 'profile_security_technician',
    email: 'profile-security-technician@servigo.test',
    password: 'ServiGo123!'
  },
  admin: {
    uid: 'profile_security_admin',
    email: 'profile-security-admin@servigo.test',
    password: 'ServiGo123!'
  },
  suspendedAdmin: {
    uid: 'profile_security_suspended_admin',
    email: 'profile-security-suspended-admin@servigo.test',
    password: 'ServiGo123!'
  }
};

const adminApp =
  admin.initializeApp(
    {
      projectId
    },
    'servigo-profile-security-admin'
  );

const adminDb =
  admin.firestore(
    adminApp
  );

const adminAuth =
  admin.auth(
    adminApp
  );

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
      disableWarnings: true
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

function baseUser(
  identity,
  roles
) {
  const now =
    admin.firestore.Timestamp.now();

  return {
    uid: identity.uid,
    email: identity.email,
    displayName: `Usuario ${identity.uid}`,
    phone: null,
    photoUrl: null,
    commune: 'Santiago',
    address: null,
    preferredContact: 'chat',
    profileVersion: 2,
    roles,
    status: 'active',
    averageRating: null,
    ratingCount: 0,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now
  };
}

function technicianProfile() {
  return {
    userId: identities.technician.uid,
    displayName: 'Técnico Seguridad',
    photoUrl: null,
    specialties: [
      'Electricidad'
    ],
    experienceYears: 5,
    experienceDescription: 'Experiencia validada para pruebas de seguridad.',
    baseCommune: 'Santiago',
    serviceRadiusKm: 20,
    hasCertifications: true,
    publicDescription: 'Perfil técnico verificado.',
    status: 'active',
    accountStatus: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: identities.admin.uid,
    updatedBy: identities.admin.uid,
    sourceApplicationId: null
  };
}

function isPermissionDenied(
  error
) {
  return error?.code === 'permission-denied'
    || error?.code === 'firestore/permission-denied';
}

async function expectAllowed(
  label,
  operation,
  counters
) {
  try {
    await operation();
    counters.passed += 1;
    console.log(`PASS - ${label}`);
  } catch (error) {
    counters.failed += 1;
    console.error(`FAIL - ${label}`, error);
  }
}

async function expectDenied(
  label,
  operation,
  counters
) {
  try {
    await operation();
    counters.failed += 1;
    console.error(`FAIL - ${label}: la operación fue permitida.`);
  } catch (error) {
    if (isPermissionDenied(error)) {
      counters.passed += 1;
      console.log(`PASS - ${label}`);
      return;
    }

    counters.failed += 1;
    console.error(`FAIL - ${label}: error inesperado.`, error);
  }
}

async function ensureAuthUser(
  identity
) {
  try {
    await adminAuth.deleteUser(
      identity.uid
    );
  } catch {
    // El usuario puede no existir en una ejecución nueva.
  }

  await adminAuth.createUser({
    uid: identity.uid,
    email: identity.email,
    password: identity.password,
    emailVerified: true,
    displayName: identity.uid
  });
}

async function cleanup(
  contexts
) {
  await Promise.allSettled([
    adminDb
      .collection('technicianProfiles')
      .doc(identities.technician.uid)
      .delete(),
    ...Object.values(identities)
      .map(
        identity =>
          adminDb
            .collection('users')
            .doc(identity.uid)
            .delete()
      ),
    ...Object.values(identities)
      .map(
        identity =>
          adminAuth.deleteUser(
            identity.uid
          )
      )
  ]);

  await Promise.allSettled(
    contexts.map(
      context =>
        deleteApp(
          context.app
        )
    )
  );

  await adminApp.delete();
}

async function run() {
  const counters = {
    passed: 0,
    failed: 0
  };

  const contexts = [
    createContext('profile-security-client'),
    createContext('profile-security-technician'),
    createContext('profile-security-admin'),
    createContext('profile-security-suspended-admin')
  ];

  const [
    clientContext,
    technicianContext,
    adminContext,
    suspendedAdminContext
  ] = contexts;

  try {
    await Promise.all(
      Object.values(identities)
        .map(
          ensureAuthUser
        )
    );

    await Promise.all([
      adminDb
        .collection('users')
        .doc(identities.client.uid)
        .set(
          baseUser(
            identities.client,
            [
              'cliente'
            ]
          )
        ),
      adminDb
        .collection('users')
        .doc(identities.technician.uid)
        .set(
          baseUser(
            identities.technician,
            [
              'cliente',
              'tecnico'
            ]
          )
        ),
      adminDb
        .collection('users')
        .doc(identities.admin.uid)
        .set(
          baseUser(
            identities.admin,
            [
              'cliente',
              'administrador'
            ]
          )
        ),
      adminDb
        .collection('users')
        .doc(identities.suspendedAdmin.uid)
        .set({
          ...baseUser(
            identities.suspendedAdmin,
            [
              'cliente',
              'administrador'
            ]
          ),
          status: 'suspended'
        })
    ]);

    await Promise.all([
      signInWithEmailAndPassword(
        clientContext.auth,
        identities.client.email,
        identities.client.password
      ),
      signInWithEmailAndPassword(
        technicianContext.auth,
        identities.technician.email,
        identities.technician.password
      ),
      signInWithEmailAndPassword(
        adminContext.auth,
        identities.admin.email,
        identities.admin.password
      ),
      signInWithEmailAndPassword(
        suspendedAdminContext.auth,
        identities.suspendedAdmin.email,
        identities.suspendedAdmin.password
      )
    ]);

    const clientUserRef =
      doc(
        clientContext.firestore,
        'users',
        identities.client.uid
      );

    await expectAllowed(
      'el cliente actualiza únicamente sus datos personales',
      () =>
        updateDoc(
          clientUserRef,
          {
            displayName: 'Cliente Actualizado',
            phone: '+56 9 1111 2222',
            updatedAt: serverTimestamp()
          }
        ),
      counters
    );

    await expectDenied(
      'el cliente no puede agregarse el rol técnico',
      () =>
        updateDoc(
          clientUserRef,
          {
            roles: [
              'cliente',
              'tecnico'
            ],
            updatedAt: serverTimestamp()
          }
        ),
      counters
    );

    await expectDenied(
      'el cliente no puede borrar directamente su documento de usuario',
      () =>
        deleteDoc(
          clientUserRef
        ),
      counters
    );


    await expectDenied(
      'el cliente no puede falsificar la fecha de último acceso',
      () =>
        updateDoc(
          clientUserRef,
          {
            lastLoginAt:
              Timestamp.fromMillis(0),
            updatedAt:
              serverTimestamp()
          }
        ),
      counters
    );

    const technicianProfileRef =
      doc(
        technicianContext.firestore,
        'technicianProfiles',
        identities.technician.uid
      );

    await expectDenied(
      'el técnico no puede crear su propia ficha profesional',
      () =>
        setDoc(
          technicianProfileRef,
          technicianProfile()
        ),
      counters
    );

    const adminTechnicianProfileRef =
      doc(
        adminContext.firestore,
        'technicianProfiles',
        identities.technician.uid
      );

    await expectAllowed(
      'el administrador puede crear la ficha de un técnico aprobado',
      () =>
        setDoc(
          adminTechnicianProfileRef,
          technicianProfile()
        ),
      counters
    );

    await expectAllowed(
      'un usuario autenticado puede consultar un perfil técnico activo',
      async () => {
        const snapshot =
          await getDoc(
            doc(
              clientContext.firestore,
              'technicianProfiles',
              identities.technician.uid
            )
          );

        if (
          !snapshot.exists()
        ) {
          throw new Error(
            'profile-not-found'
          );
        }
      },
      counters
    );

    await expectDenied(
      'el técnico no puede modificar especialidades ni cobertura',
      () =>
        updateDoc(
          technicianProfileRef,
          {
            specialties: [
              'Gasfitería'
            ],
            updatedAt: serverTimestamp(),
            updatedBy: identities.technician.uid
          }
        ),
      counters
    );

    await expectAllowed(
      'el administrador puede actualizar la ficha profesional',
      () =>
        updateDoc(
          adminTechnicianProfileRef,
          {
            publicDescription: 'Descripción validada por administración.',
            updatedAt: serverTimestamp(),
            updatedBy: identities.admin.uid
          }
        ),
      counters
    );


    await expectDenied(
      'el administrador no puede falsificar el estado de cuenta del técnico',
      () =>
        updateDoc(
          adminTechnicianProfileRef,
          {
            accountStatus: 'suspended',
            updatedAt: serverTimestamp(),
            updatedBy: identities.admin.uid
          }
        ),
      counters
    );

    await expectDenied(
      'un administrador suspendido no conserva privilegios administrativos',
      () =>
        updateDoc(
          doc(
            suspendedAdminContext.firestore,
            'technicianProfiles',
            identities.technician.uid
          ),
          {
            publicDescription: 'Cambio no autorizado.',
            updatedAt: serverTimestamp(),
            updatedBy: identities.suspendedAdmin.uid
          }
        ),
      counters
    );

    await expectDenied(
      'un administrador común no puede promover usuarios a superadministrador',
      () =>
        updateDoc(
          doc(
            adminContext.firestore,
            'users',
            identities.client.uid
          ),
          {
            roles: [
              'cliente',
              'superadmin'
            ],
            updatedAt: serverTimestamp()
          }
        ),
      counters
    );

    await expectDenied(
      'el perfil técnico no puede borrarse sin retirar simultáneamente el rol',
      () =>
        deleteDoc(
          adminTechnicianProfileRef
        ),
      counters
    );

    await expectAllowed(
      'el administrador elimina la ficha y retira el rol técnico en un lote atómico',
      async () => {
        const batch =
          writeBatch(
            adminContext.firestore
          );

        batch.delete(
          adminTechnicianProfileRef
        );

        batch.update(
          doc(
            adminContext.firestore,
            'users',
            identities.technician.uid
          ),
          {
            roles: [
              'cliente'
            ],
            updatedAt: serverTimestamp()
          }
        );

        await batch.commit();
      },
      counters
    );

    console.log(
      `\nResultado: ${counters.passed} aprobadas, ${counters.failed} fallidas.`
    );

    if (
      counters.failed > 0
    ) {
      process.exitCode = 1;
    }
  } finally {
    await cleanup(
      contexts
    );
  }
}

await run();
