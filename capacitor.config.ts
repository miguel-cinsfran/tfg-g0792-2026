import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.miguelinsfran.calistenia',
  appName: 'Calistenia Accesible',
  webDir: 'build',
  // Fondo de ventana con el color de superficie: evita el fogonazo
  // claro entre el splash y el primer pintado web.
  backgroundColor: '#0f1413',
  plugins: {
    StatusBar: {
      // Mismo color de superficie; el tinte en runtime (ver
      // +layout.svelte) cubre los dispositivos donde la config no aplica.
      backgroundColor: '#0f1413'
    },
    Keyboard: {
      // WebView completa redimensionada con el teclado: la barra fixed
      // del pie queda visible por encima, sin JS propio de resize.
      resize: 'native'
    }
  }
};

export default config;
