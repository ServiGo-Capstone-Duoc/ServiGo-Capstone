export const environment = {

  production:
    false,

  /*
   * ServiGo - entorno local de pruebas.
   *
   * Esta versión está preparada explícitamente para Firebase Emulator Suite:
   * Authentication + Firestore + Functions + Storage.
   *
   * De esta forma ninguna prueba local escribe accidentalmente en Firebase real.
   */
  useFirebaseEmulators:
    true,
};
