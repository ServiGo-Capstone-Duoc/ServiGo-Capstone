import type {
  CapacitorConfig
} from '@capacitor/cli';


const config:
  CapacitorConfig = {

  appId:
    'cl.servigo.app',

  appName:
    'ServiGo',

  webDir:
    'www',

  /*
   * =========================================
   * DESARROLLO ANDROID
   * =========================================
   *
   * Firebase Emulator Suite utiliza HTTP.
   *
   * Android Emulator accede al PC mediante:
   * 10.0.2.2
   *
   * Usamos HTTP también para el WebView local
   * y así evitamos el bloqueo Mixed Content:
   *
   * https://localhost
   *      -> http://10.0.2.2  BLOQUEADO
   *
   * http://localhost
   *      -> http://10.0.2.2  PERMITIDO
   */

  server: {

    androidScheme:
      'http'
  }
};


export default config;