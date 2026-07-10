// Re-export desde motor/schema.ts (raiz) para que el codigo importe
// desde $lib/motor/schema sin rutas relativas largas.

export type {
	Nivel,
	Objetivo,
	Split,
	Patron,
	SubpatronCore,
	TipoSesion,
	Zona,
	Perfil,
	AjusteDesbalance,
	Ejercicio,
	DescripcionPropioceptiva,
	EjercicioPlanificado,
	SesionEnCurso,
	EstadoEjercicio,
	SesionCompletada,
	EjercicioEjecutado,
	RegistroDolor,
	SchemaDB,
} from '../../../motor/schema.js';

export {
	NIVELES,
	OBJETIVOS,
	SPLITS,
	PATRONES,
	SUBPATRONES_CORE,
	TIPOS_SESION,
	ZONAS,
} from '../../../motor/schema.js';
