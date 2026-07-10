# Calistenia Accesible

Aplicación móvil de calistenia con rutinas personalizadas por un motor
de reglas, diseñada desde cero para personas con discapacidad visual.
Trabajo Final de Grado, Análisis de Sistemas Informáticos, UCA Asunción,
2026-2027.

## Qué hace

- Evaluación inicial por patrones de movimiento (empuje, tracción,
  piernas, core) y plan de sesiones según objetivo, días disponibles y
  duración elegida.
- Sesión guiada paso a paso: series, descansos con temporizador,
  ejercicios por tiempo con cronómetro, y descripción propioceptiva de
  cada ejercicio (cómo colocarse y qué sentir, sin depender de ver una
  imagen).
- Gestión de dolor: reporte por zonas, bloqueo temporal del ejercicio y
  sustitución inmediata por una alternativa segura del mismo patrón.
- Progresión sugerida a variantes más difíciles cuando el chequeo
  semanal muestra que el ejercicio quedó fácil.
- Racha semanal, historial de sesiones, exportación e importación de
  datos. Todo funciona sin conexión: los datos viven en el teléfono.
- Accesibilidad primero: pensada para TalkBack (y lectores de pantalla
  en general), con anuncios de voz, foco controlado, avisos visibles,
  sonidos de interfaz y vibración.

## Cómo correrla

Requiere Node 20+.

    npm install
    npm run dev

La app es una PWA (SvelteKit + Vite). Para el APK de Android se usa
Capacitor; la carpeta `android/` no está versionada y se regenera con
`npx cap add android`.

Otros comandos:

    npm run build     # build de produccion
    npm run check     # chequeo de tipos (svelte-check)
    npm run lint      # eslint
    npx vitest run    # tests

## Estructura

- `src/lib/motor/`: el motor de reglas (generación de sesión, selección,
  progresión, dolor, racha). Funciones puras y deterministas, con tests.
- `motor/schema.ts`: el modelo de datos del dominio, del que importa el
  resto del código.
- `src/lib/`: base de datos local (Dexie/IndexedDB), accesibilidad,
  sonido, componentes de interfaz.
- `src/routes/`: pantallas (onboarding, inicio, sesión, ejercicios,
  racha, perfil).
- `static/data/`: catálogo de ejercicios, reglas y plantillas en JSON.
- `tests/`: fixtures compartidas de los tests.

Las carpetas `static/sonidos/` y `static/musica/` pueden estar vacías:
la app funciona igual y simplemente no suena (los archivos de audio se
agregan aparte por su licencia).
