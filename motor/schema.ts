// Modelo de Datos del MVP
//
// Esquema completo de los almacenes IndexedDB.
// Es la fuente de verdad unica del schema. Sustituye al motor-biomecanico-00-schema.md.
//
// Solo almacenes del MVP. Panteon, paquetes de sonido, trofeos
// y todo lo relacionado con gamificacion avanzada se añade cuando
// se implemente (v1.3).

// ============================================================
// Tipos compartidos
// ============================================================
//
// Las uniones de strings literales se exportan como constantes `as const`
// con el tipo derivado por `(typeof X)[number]`. Esto permite que los
// schemas Zod (ver src/lib/catalogo/schema.ts y src/lib/importar/schema.ts)
// reusen la lista de valores con `z.enum(VALORES)` sin duplicar los
// strings literales. Una sola fuente, imposible desincronizar.
// Justificacion completa: docs/arquitectura.md ADR-0003.

export const NIVELES = ["principiante", "intermedio", "avanzado"] as const;
export type Nivel = (typeof NIVELES)[number];

export const OBJETIVOS = ["fuerza", "hipertrofia", "resistencia", "perdida_peso"] as const;
export type Objetivo = (typeof OBJETIVOS)[number];

export const SPLITS = ["FULL_BODY", "UPPER_LOWER"] as const;
export type Split = (typeof SPLITS)[number];

export const PATRONES = ["PUSH_H", "PUSH_V", "PULL_H", "PULL_V", "SQUAT", "HINGE", "UNILATERAL", "CORE"] as const;
export type Patron = (typeof PATRONES)[number];

export const SUBPATRONES_CORE = ["ANTI_EXTENSION", "ANTI_ROTATION", "FLEXION", "ROTATION"] as const;
export type SubpatronCore = (typeof SUBPATRONES_CORE)[number];

export const TIPOS_SESION = ["FULL_BODY", "UPPER", "LOWER"] as const;
export type TipoSesion = (typeof TIPOS_SESION)[number];

export const ZONAS = ["hombros", "codos", "muñecas", "lumbar", "rodillas", "tobillos", "cuello", "cadera"] as const;
export type Zona = (typeof ZONAS)[number];

// ============================================================
// Almacen: Perfil (singleton, id = 1)
// ============================================================

export interface Perfil {
  id: 1;
  nombre: string;
  anio_nacimiento: number;
  peso_kg: number;
  altura_cm?: number;

  disclaimer_aceptado: boolean;
  fecha_aceptacion_disclaimer: number;

  objetivo: Objetivo;
  nivel_experiencia: Nivel;
  evaluacion_por_patron: Record<"PUSH" | "PULL" | "LEGS" | "CORE", Nivel>;

  // Solo se compensa el patron mas debil. Si hay mas de uno debil,
  // se toma el de mayor diferencia con el nivel global.
  ajuste_desbalance_activo: AjusteDesbalance | null;

  fecha_evaluacion: number;

  dias_semana: number;        // 2 a 5
  duracion_sesion_min: number; // 20, 30 o 45
  split: Split;

  zonas_dolor_preexistente: Zona[];
  // Barra o anclaje de suspension para el patron de traccion.
  tiene_anclaje: boolean;

  fecha_primera_sesion: number | null;
}

export interface AjusteDesbalance {
  patron: "PUSH" | "PULL" | "LEGS" | "CORE";
  porcentaje: number;        // ver RULE-DESB-PORCENTAJE
  fecha_inicio: number;
  fecha_revision: number;     // fecha_inicio + RULE-DESB-DURACION-SEMANAS
}

// ============================================================
// Almacen: Ejercicios (catalogo inmutable)
// ============================================================

export interface Ejercicio {
  id: string;                // slug estable del catalogo, ej. "ej-001-push-h-flexion-pared"
  nombre: string;
  patron: Patron;
  subpatron?: SubpatronCore; // solo para CORE
  nivel_requerido: Nivel;
  zonas_involucradas: Zona[];

  reps_iniciales: number;    // cuando el usuario llega a esta variante por primera vez

  // Unidad de medida del ejercicio. Ausente = 'repeticiones'. Para
  // 'segundos' (isometricos: planchas, dead hang, hollow) los campos
  // reps_* de todo el sistema cuentan segundos sostenidos; el motor es
  // agnostico a la unidad, solo la UI cambia cronometro y rotulos.
  medido_en?: 'repeticiones' | 'segundos';

  // Cadena de progresion lineal: cada ejercicio apunta al siguiente y al anterior.
  // null si es el extremo de la cadena.
  progresion_id: string | null;
  regresion_id: string | null;

  // Sustituciones seguras: mapa zona -> id de ejercicio alternativo
  // que no involucra esa zona.
  sustituciones: Partial<Record<Zona, string>>;

  // Contenido descriptivo accesible. Cada campo es una lista de pasos
  // o claves cortas; la UI los presenta como listas nativas.
  descripcion: DescripcionPropioceptiva;
}

export interface DescripcionPropioceptiva {
  posicion_inicial: string[];
  ejecucion: string[];
  referencias_propioceptivas: string[];
  errores_comunes: string[];
}

// ============================================================
// Sesion en curso: plan generado por ALG-04
// ============================================================
// EjercicioPlanificado es lo que devuelve `generarSesion` (ALG-04)
// y lo que consume el store `lib/stores/sesion.svelte.ts` (ADR-0007)
// como entrada para crear la sesion en memoria. No se persiste como
// tal; se transforma en `EjercicioEjecutado` al cerrar la sesion.
// Justificacion: docs/arquitectura.md ADR-0007.

export interface EjercicioPlanificado {
  ejercicio_id: string;
  series: number;
  reps_objetivo: number;
  rir_objetivo: number;
  descanso_segundos: number;
}

// ============================================================
// Sesion en curso: estado volatil del flujo F-03 (ADR-0007)
// ============================================================
// Vive solo en memoria, dentro del store lib/stores/sesion.svelte.ts.
// NO se persiste: si el usuario recarga, se pierde (contrato explicito
// del MVP, ADR-0007 regla 3). Al terminar (completa o cancelada por
// dolor) se convierte en SesionCompletada via cerrarSesionEnCurso
// (src/lib/motor/cierre.ts), que tambien devuelve los EstadoEjercicio
// actualizados para que la capa db los persista juntos.

export interface SesionEnCurso {
  tipo: TipoSesion;
  fecha_inicio: number;

  // Plan generado por ALG-04. Una sustitucion por dolor (ALG-06)
  // reemplaza la entrada del ejercicio actual por la del sustituto.
  plan: EjercicioPlanificado[];

  indice_ejercicio: number;  // posicion del ejercicio actual en plan, desde 0
  indice_serie: number;      // serie en curso del ejercicio actual, desde 0

  // Resultados acumulados: una entrada por ejercicio iniciado, en el
  // orden del plan. Se completa serie a serie (ALG-05).
  ejecutados: EjercicioEjecutado[];

  cancelada_por_dolor: boolean;
}

// ============================================================
// Almacen: Estado de Ejercicios (estado actual por ejercicio)
// ============================================================

export interface EstadoEjercicio {
  ejercicio_id: string;
  series_objetivo: number;
  reps_objetivo: number;
  bloqueado: boolean;
  razon_bloqueo: string | null;
  fecha_bloqueo: number | null;
  fecha_revision: number | null;
  fecha_ultimo_uso: number | null;

  // Reintroduccion gradual post-dolor (ALG-08). null = no esta en
  // reintroduccion (volumen normal). N > 0 = quedan N sesiones a volumen
  // reducido (RULE-DOLOR-REINTRO-PORCENTAJE) antes de volver al completo;
  // se decrementa cada sesion en que el ejercicio se usa, hasta llegar a 0
  // (que se normaliza a null). Los EstadoEjercicio previos a esta version no
  // tienen el campo: tratar `undefined` igual que `null`.
  reintroduccion_sesiones_restantes?: number | null;
}

// ============================================================
// Almacen: Sesiones Completadas (historial inmutable)
// ============================================================

export interface SesionCompletada {
  id: string;                // UUID
  fecha: number;
  tipo: TipoSesion;
  ejercicios: EjercicioEjecutado[];
  duracion_minutos: number;
  cancelada_por_dolor: boolean;
}

export interface EjercicioEjecutado {
  ejercicio_id: string;
  series_planificadas: number;
  series_completadas: number;
  reps_planificadas: number;
  reps_reales: number[];     // una entrada por serie completada
  // Una entrada por serie completada. null = en esa serie no se pregunto
  // el esfuerzo (la pregunta sale solo en la sesion de chequeo semanal,
  // ultima serie de cada ejercicio; ver src/lib/motor/chequeo.ts).
  rir_declarado: (number | null)[];
  // Si hubo reporte de dolor durante este ejercicio, las zonas reportadas.
  // Lista vacia si no hubo. El registro completo del evento (con fecha,
  // estado bloqueado/resuelto, etc.) vive en historial_dolor.
  zonas_dolor_reportadas: Zona[];
}

// ============================================================
// Almacen: Historial de Dolor (registro inmutable)
// ============================================================

export interface RegistroDolor {
  id: string;
  ejercicio_id: string;
  zonas: Zona[];
  fecha: number;
  estado: "bloqueado" | "resuelto";
}

// ============================================================
// Resumen de almacenes Dexie
// ============================================================
// CUATRO almacenes. El catalogo de ejercicios NO es un almacen Dexie:
// vive en static/data/catalogo.json y se carga en memoria al iniciar
// la app. Decision tomada para mantener una sola fuente de verdad del
// contenido (el JSON) y evitar desincronizacion al actualizar la app.
// Los IDs de ejercicios que aparecen en EstadoEjercicio, EjercicioEjecutado
// y RegistroDolor son referencias al catalogo en memoria, resueltas en
// codigo (no son foreign keys de Dexie).

export interface SchemaDB {
  perfil: Perfil;             // un solo registro con id=1
  estado_ejercicios: EstadoEjercicio;
  sesiones: SesionCompletada;
  historial_dolor: RegistroDolor;
}

// Los indices que Dexie necesita:
// perfil:           id (siempre 1)
// estado_ejercicios: ejercicio_id, bloqueado
// sesiones:         id, fecha
// historial_dolor:  id, ejercicio_id, fecha
