import {
  applicationDefault,
  initializeApp
} from 'firebase-admin/app';

import {
  getAuth
} from 'firebase-admin/auth';


/*
 * ============================================================
 * SERVIGO - HABILITAR TOTP MFA
 * ============================================================
 *
 * Configuración administrativa de Firebase Authentication
 * with Identity Platform.
 *
 * Ejecutar solamente contra el proyecto ServiGo DEV.
 */


const PROJECT_ID =
  'servigo-dev';


console.log(
  '=============================================='
);

console.log(
  ' SERVIGO - CONFIGURACION TOTP MFA'
);

console.log(
  '=============================================='
);

console.log(
  `Proyecto: ${PROJECT_ID}`
);


initializeApp({
  credential:
    applicationDefault(),

  projectId:
    PROJECT_ID
});


const auth =
  getAuth();


try {

  console.log(
    '\nConsultando configuración actual...'
  );


  const currentConfig =
    await auth
      .projectConfigManager()
      .getProjectConfig();


  console.log(
    '\nMFA actual:'
  );

  console.dir(
    currentConfig.multiFactorConfig,
    {
      depth:
        null
    }
  );


  console.log(
    '\nHabilitando TOTP...'
  );


  const updatedConfig =
    await auth
      .projectConfigManager()
      .updateProjectConfig({

        multiFactorConfig: {

          state:
            'ENABLED',

          providerConfigs: [

            {
              state:
                'ENABLED',

              totpProviderConfig: {

                adjacentIntervals:
                  5
              }
            }
          ]
        }
      });


  console.log(
    '\n=============================================='
  );

  console.log(
    ' TOTP MFA HABILITADO'
  );

  console.log(
    '=============================================='
  );


  console.dir(
    updatedConfig.multiFactorConfig,
    {
      depth:
        null
    }
  );


} catch (error) {

  console.error(
    '\n=============================================='
  );

  console.error(
    ' ERROR CONFIGURANDO TOTP MFA'
  );

  console.error(
    '=============================================='
  );


  console.error(
    error
  );


  process.exitCode =
    1;
}